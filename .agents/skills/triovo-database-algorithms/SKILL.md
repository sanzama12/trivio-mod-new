---
name: triovo-database-algorithms
description: >-
  Cẩm nang chuyên sâu và chuẩn xác nhất về kiến trúc cơ sở dữ liệu PostgreSQL (Neon Serverless)
  và các thuật toán cốt lõi của dự án TriOVO: tính điểm thi THPT theo quy chế Bộ GD&ĐT 2023+,
  hệ số môn chính, tiêu chí phụ, quy đổi chứng chỉ ngoại ngữ, hướng nghiệp Holland RIASEC,
  phân tầng cơ hội trúng tuyển (An toàn/Vừa sức/Thử sức), gợi ý đa tiêu chí MCDA,
  chỉ mục RAM O(1) CatalogIndex, và chuẩn kết nối Node.js pg connection pool tốc độ cao.
---

# TriOVO Database Architecture & Core Algorithms

Tài liệu chuẩn mực kỹ thuật cao cấp dành cho việc thiết kế, vận hành, tối ưu hóa truy vấn cơ sở dữ liệu và hiện thực các thuật toán cốt lõi trong hệ thống tuyển sinh đại học **TriOVO**.

---

## 1. Kiến Trúc Cơ Sở Dữ Liệu & Node.js Connection Pool

TriOVO sử dụng **PostgreSQL** (chạy trên hạ tầng Serverless AWS Neon `us-east-2`, schema `trovio`) với kiến trúc 3 lớp nghiêm ngặt (3-Layer Architecture: Controller → Service → Repository).

### 1.1. Cấu hình Connection Pool tiêu chuẩn (`database/client.ts`)

Để giải quyết triệt để bài toán trễ mạng xuyên lục địa (150ms – 250ms RTT) và hiện tượng lạnh kết nối (cold-start) của Serverless DB:

```typescript
// Cấu hình chuẩn trong getPool()
const pool = new Pool({
  connectionString: dbUrl,
  max: 16,                         // Giới hạn connection bound chống quá tải Neon
  min: 2,                          // Giữ 2 connection ấm, triệt tiêu 150-200ms cold-start
  idleTimeoutMillis: 30000,        // Đóng client nhàn rỗi sau 30s
  connectionTimeoutMillis: 10000,  // Timeout kết nối 10s
  
  // Timeout bảo vệ chống treo connection & deadlock
  statement_timeout: 10000,        // 10s ngắt câu query server-side
  query_timeout: 10000,            // 10s ngắt phía Node.js client
  lock_timeout: 5000,              // 5s ngắt tranh chấp khóa (deadlock)

  // TCP Keep-Alive chống rớt socket qua Cloud NAT / Firewalls
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,

  application_name: "trovio-web-api",
  ssl: isCloud ? { rejectUnauthorized: false } : undefined,
});
```

### 1.2. Kỹ thuật Single-Query CTE JSON Aggregation (Chống N+1 Query)

Không chạy tuần tự 5-6 câu SQL để lấy chương trình, tổ hợp, điểm chuẩn và phương thức xét tuyển. Sử dụng CTE gom nhóm toàn bộ dữ liệu trong **1 round-trip duy nhất**:

```sql
WITH matched AS (
  SELECT p.id, p.slug, p.school_id AS "schoolId", p.major_id AS "majorId",
         p.name, p.admission_code AS "admissionCode", p.tuition_min AS "tuitionMin"
  FROM trovio.public_programs p
  WHERE p.school_id = $1
)
SELECT
  COALESCE((SELECT json_agg(to_jsonb(m)) FROM matched m), '[]'::json) AS programs,
  COALESCE((
    SELECT json_agg(json_build_object('programId', c.program_id, 'comboCode', c.combo_code))
    FROM trovio.program_combos c
    WHERE c.program_id IN (SELECT id FROM matched)
  ), '[]'::json) AS combos,
  COALESCE((
    SELECT json_agg(json_build_object('programId', cu.program_id, 'year', cu.year, 'score', cu.score))
    FROM trovio.program_cutoffs cu
    WHERE cu.program_id IN (SELECT id FROM matched) AND NOT cu.is_estimated
  ), '[]'::json) AS cutoffs;
```

### 1.3. Chỉ mục bộ nhớ RAM $O(1)$ (`src/lib/catalog-index.ts`)

Dữ liệu danh mục trường/ngành/chương trình được nạp vào bộ nhớ RAM và lập chỉ mục đảo:
* `schoolById`, `schoolBySlug` $\to$ Truy xuất trường học $O(1)$.
* `majorById`, `majorBySlug` $\to$ Truy xuất ngành $O(1)$.
* `programById`, `programBySlug` $\to$ Truy xuất chương trình $O(1)$.
* `programsBySchool`, `programsByMajor` $\to$ Nhóm danh sách chương trình $O(1)$.
* **Stale-While-Revalidate (SWR)**: Bộ nhớ RAM phục vụ client < 1ms, tiến trình nền tự làm mới sau mỗi `CATALOG_FRESH_MS = 2 * 60 * 1000` (2 phút).

---

## 2. Các Thuật Toán Tính Điểm Xét Tuyển (Scoring Algorithms)

Toàn bộ thuật toán được định nghĩa tại `src/services/scoring.service.ts` dưới dạng hàm thuần túy (pure functions), độc lập với framework.

### 2.1. Quy chế tuyển sinh Bộ GD&ĐT từ năm 2023 (Giảm dần điểm ưu tiên)

Từ năm 2023, điểm ưu tiên (Khu vực + Đối tượng) không còn được cộng nguyên vẹn nếu tổng điểm đạt từ 22.5 trở lên trên thang 30.

#### Công thức toán học:
$$\text{Điểm Ưu Tiên Áp Dụng} = \begin{cases} 
\text{Mức Ưu Tiên Gốc}, & \text{nếu } \text{Tổng 3 Môn} < 22.5 \\
\left[ \dfrac{30 - \text{Tổng 3 Môn}}{7.5} \right] \times \text{Mức Ưu Tiên Gốc}, & \text{nếu } \text{Tổng 3 Môn} \ge 22.5 
\end{cases}$$

$$\text{Điểm Xét Tuyển Cuối Cùng} = \min(30.0, \text{Tổng 3 Môn} + \text{Điểm Ưu Tiên Áp Dụng})$$

#### Bảng điểm ưu tiên gốc:
* **Khu vực**:
  * KV1: `+0.75`
  * KV2-NT: `+0.50`
  * KV2: `+0.25`
  * KV3: `+0.00`
* **Đối tượng**:
  * UT1 (Nhóm đối tượng 01–03): `+2.00`
  * UT2 (Nhóm đối tượng 04–06): `+1.00`
  * None: `+0.00`

### 2.2. Thuật toán nhân hệ số môn chính (Weighted Combos)

Một số trường/ngành (như Ngoại ngữ nhân hệ số tiếng Anh, Sư phạm Toán nhân hệ số Toán):

* **Quy về thang 30 chuẩn Bộ GD&ĐT**:
  $$\text{Tổng Thang 30} = \text{round}_2 \left( \frac{(M_1 + M_2 + M_{\text{chính}} \times 2) \times 3}{4} \right)$$
* **Giữ nguyên thang 40**:
  $$\text{Tổng Thang 40} = \text{round}_2 (M_1 + M_2 + M_{\text{chính}} \times 2)$$

### 2.3. Đánh giá tiêu chí phụ (Tie-Breaker Evaluation)

Khi thí sinh có điểm xét tuyển bằng đúng điểm chuẩn ở ngưỡng cuối chỉ tiêu:
1. **Kiểm tra điểm môn tiêu chí phụ**: $S_{\text{main}} \ge S_{\text{min\_required}}$
2. **Kiểm tra thứ tự nguyện vọng**: $\text{WishOrder} \le \text{MaxAllowed}$

### 2.4. Quy đổi chứng chỉ Ngoại ngữ (Certificate Policy)

Quy đổi linh hoạt theo đề án từng trường (`certificatePolicyService`), không áp đặt bảng cố định toàn quốc:
* IELTS 6.5: Có trường quy đổi thành 9.5 điểm (môn Anh), có trường quy đổi thành 10.0 điểm.
* Hỗ trợ chuẩn: IELTS, TOEFL iBT, TOEIC 4 kỹ năng, VSTEP.

---

## 3. Thuật Toán Hướng Nghiệp & Phân Tầng Gợi Ý (Recommendation & Fit Engine)

### 3.1. Phân tầng cơ hội trúng tuyển (Fit Stratification)

Chênh lệch điểm giữa điểm xét tuyển của học sinh và điểm chuẩn năm gần nhất:
$$\Delta = \text{Điểm Của Thí Sinh} - \text{Điểm Chuẩn Năm Gần Nhất}$$

| Phân tầng | Ngưỡng $\Delta$ (Thang 30) | Ý nghĩa chiến lược |
| :--- | :--- | :--- |
| **An toàn** (`an-toan`) | $\Delta \ge +1.0$ điểm | Khả năng đỗ rất cao, dùng làm nguyện vọng phòng ngừa rủi ro. |
| **Vừa sức** (`vua-suc`) | $-0.5 \le \Delta < +1.0$ điểm | Khả năng đỗ cao, là vùng mục tiêu chính đặt ở NV 1–3. |
| **Thử sức** (`thu-suc`) | $\Delta < -0.5$ điểm | Mạo hiểm, ước mơ, điểm chuẩn các năm có thể dao động. |

### 3.2. Thuật toán so khớp sở thích Holland RIASEC (`matchMajor`)

Mỗi ngành đào tạo liên kết với bộ 3 nhóm RIASEC (VD: Công nghệ Thông tin $\to$ `[I, R, C]`):
$$S = \sum_{t \in \text{MajorRiasec}} \left( 3 - \text{idx}_t + (3 - i) \times 0.5 \right)$$
$$\text{Percent} = \text{clamp}\Big(0, 100, \text{round}(40 + S \times 8)\Big)$$

### 3.3. Thuật toán gợi ý đa tiêu chí (MCDA - Multi-Criteria Decision Analysis)

Tổng điểm độ phù hợp của chương trình đào tạo:
$$\text{Score} = w_{\text{interest}} \cdot P_{\text{interest}} + w_{\text{fit}} \cdot P_{\text{fit}} + w_{\text{place}} \cdot P_{\text{place}} + w_{\text{group}} \cdot P_{\text{group}}$$

Bảng phân bổ trọng số theo định hướng của học sinh:
* **Cân bằng (`balanced`)**: Sở thích `45%`, Khả năng đỗ `35%`, Địa điểm `10%`, Nhóm ngành `10%`.
* **Đam mê (`passion`)**: Sở thích `60%`, Khả năng đỗ `25%`, Địa điểm `8%`, Nhóm ngành `7%`.
* **Trúng tuyển (`admission`)**: Khả năng đỗ `55%`, Sở thích `25%`, Địa điểm `10%`, Nhóm ngành `10%`.
* **Địa điểm & Chi phí (`location_budget`)**: Sở thích `30%`, Khả năng đỗ `30%`, Địa điểm/Ngân sách `25%`, Nhóm ngành `15%`.

---

## 4. Xử Lý Chữ Tiếng Việt Không Dấu & Tìm Kiếm Tức Thì

Sử dụng hàm tách dấu và chuẩn hóa Unicode trong `src/lib/text.ts`:
* Khử dấu tiếng Việt: Chuyển bảng mã có dấu sang ký tự Latin tiêu chuẩn (VD: `Đại học Bách Khoa` $\to$ `dai hoc bach khoa`).
* Lấy ký tự cái đầu tiên (`firstLetterVi`): Hỗ trợ phân trang bảng chữ cái A–Z.
* So khớp đa từ khóa (`matchesQuery`): Tokenize cụm từ tìm kiếm và kiểm tra tập con trong tên trường, mã trường, tên ngành, tóm tắt.

---

## 5. Nguyên Tắc An Toàn Dữ Liệu & Giao Dịch

1. **Idempotency**: Webhook IPN VNPay luôn kiểm tra trạng thái trước khi cập nhật. Nếu `status !== 'pending'` thì trả về mã `02 (Order already confirmed)` ngay lập tức.
2. **Transaction Isolation**: Các chuỗi thao tác ghi danh mục hoặc ghi dữ liệu học sinh phải được bọc trong `withTransaction(async (client) => { ... })`.
3. **Cache Invalidation**: Bất kỳ hành động commit thay đổi dữ liệu nào đều phải kích hoạt hàm xóa/làm mới cache (`invalidatePostgresCache()`, `invalidateDonationCache()`) qua hook `afterCommit()`.
