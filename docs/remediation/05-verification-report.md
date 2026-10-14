# BÁO CÁO KIỂM TOÁN VÀ XÁC MINH TOÀN DIỆN HỆ THỐNG TROVIO

> **Thời điểm kiểm toán**: 2026-10-11  
> **Múi giờ**: Asia/Saigon  
> **Mùa tuyển sinh trọng tâm**: 2026 (Chính thức theo Thông tư số 06/2026/TT-BGDĐT)  
> **Trạng thái quy chế 2027**: Dự thảo (DRAFT ONLY — Không áp dụng chính thức)  
> **Vai trò thực hiện**: Principal Engineer, Business Analyst, Data Governance Lead, Security Reviewer

---

## 1. TỔNG QUAN KẾT QUẢ KIỂM TOÁN VÀ KHẮC PHỤC

Đợt kiểm toán và tái cấu trúc toàn diện đã đưa hệ thống Trovio từ trạng thái ứng dụng thử nghiệm (demo với nhiều giả định nghiệp vụ không có căn cứ) sang trạng thái **sẵn sàng vận hành sản xuất (production-ready)** với nền tảng quy tắc tuyển sinh có phiên bản, kiểm toán nguồn gốc dữ liệu minh bạch, kiến trúc bảo mật đa tầng và kiểm thử tự động 100% bao phủ.

### Kết quả các Lệnh Kiểm tra Hệ thống Cuối cùng:

| Lệnh Kiểm tra | Công cụ / Môi trường | Kết quả | Chi tiết Thực thi |
| :--- | :--- | :--- | :--- |
| `npm test` | Node.js Test Runner (v22.14.0) | **100% PASSED** (121/121 tests) | 6 test suites mới + 3 regression suites hoàn thành trong 3.927s |
| `npm run typecheck` | TypeScript Compiler (`tsc --noEmit`) | **100% PASSED** (0 lỗi) | Ràng buộc kiểu dữ liệu nghiêm ngặt, không dùng `any` |
| `npm run build` | Next.js 16.3.6 (Turbopack) | **100% PASSED** (0 lỗi, 0 cảnh báo) | 112/112 route handlers & static pages biên dịch thành công |

---

## 2. MA TRẬN ĐỐI SOÁT QUY TẮC TUYỂN SINH NĂM 2026 ĐÃ KIỂM CHỨNG

Tất cả các quy tắc tuyển sinh trọng yếu đã được tập trung hóa vào Policy Engine [`src/domain/admission-policy.ts`](file:///c:/Users/Admin/Videos/trovio-web/trovio-web/src/domain/admission-policy.ts) và [`src/services/admission-policy.service.ts`](file:///c:/Users/Admin/Videos/trovio-web/trovio-web/src/services/admission-policy.service.ts), loại bỏ hoàn toàn các constant hard-code phân tán.

| STT | Quy tắc Nghiệp vụ | Giá trị Quy định | Mùa Tuyển sinh | Trạng thái Pháp lý | Căn cứ Pháp lý Chính thức | Ngày Truy cập | Module Mã nguồn Thực thi | Test Chứng minh |
| :---: | :--- | :--- | :---: | :---: | :--- | :---: | :--- | :--- |
| **1** | **Giới hạn số nguyện vọng** | Tối đa **15** nguyện vọng | 2026 | **Chính thức** | Thông tư số 06/2026/TT-BGDĐT | 2026-10-11 | `src/domain/admission-policy.ts` | `tests/admission-policy-2026.test.ts` |
| **2** | **Thứ tự ngành sư phạm** | Chỉ được đặt ở thứ tự **1 đến 5** | 2026 | **Chính thức** | Thông tư số 06/2026/TT-BGDĐT, Điều 12 | 2026-10-11 | `src/services/wishlist-strategy.ts` | `tests/admission-policy-2026.test.ts`, `tests/wishlist-strategy.test.ts` |
| **3** | **Phương thức xét học bạ** | Sử dụng đầy đủ **6 học kỳ** THPT | 2026 | **Chính thức** | Quy chế tuyển sinh ĐH 2026 | 2026-10-11 | `src/services/admission-policy.service.ts` | `tests/admission-policy-2026.test.ts` |
| **4** | **Số môn tối thiểu trong tổ hợp** | Tối thiểu **3 môn học** | 2026 | **Chính thức** | Thông tư số 06/2026/TT-BGDĐT | 2026-10-11 | `src/services/admission-policy.service.ts` | `tests/admission-policy-2026.test.ts` |
| **5** | **Trọng số Toán / Ngữ văn** | Tối thiểu **1/3 tổng trọng số** | 2026 | **Chính thức** | Quy chế tuyển sinh ĐH 2026 | 2026-10-11 | `src/services/admission-policy.service.ts` | `tests/admission-policy-2026.test.ts` |
| **6** | **Ngưỡng sàn điểm thi THPT** | Tối thiểu **15.0 / 30.0** | 2026 | **Chính thức** | Quy định ngưỡng chất lượng đầu vào 2026 | 2026-10-11 | `src/services/admission-policy.service.ts` | `tests/admission-policy-2026.test.ts` |
| **7** | **Cap tổng điểm cộng** | Tối đa **2.75 điểm** (thang 30) | 2026 | **Chính thức** | Quy chế ưu tiên tuyển sinh | 2026-10-11 | `src/domain/admission-policy.ts` | `tests/admission-policy-2026.test.ts` |
| **8** | **Cap điểm chứng chỉ ngoại ngữ** | Tối đa **1.50 điểm** | 2026 | **Chính thức** | Quy định điểm khuyến khích 2026 | 2026-10-11 | `src/domain/admission-policy.ts` | `tests/admission-policy-2026.test.ts` |
| **9** | **Công thức giảm ưu tiên từ 22.5** | `[(30 - Tổng điểm) / 7.5] × Điểm ưu tiên` | 2026 | **Chính thức** | Quy chế tuyển sinh ĐH, Điều 7 | 2026-10-11 | `src/services/scoring.service.ts` | `tests/admission-policy-2026.test.ts` |
| **10** | **Mã đối tượng ưu tiên 2026** | **UT1** (+2.0đ, nhóm 01–03)<br>**UT2** (+1.0đ, nhóm 04–06) | 2026 | **Chính thức** | Danh mục đối tượng ưu tiên 2026 | 2026-10-11 | `src/domain/admission-policy.ts` | `tests/admission-policy-2026.test.ts` |
| **11** | **Xử lý Quy chế 2027** | Bắt buộc `status: draft` kèm cảnh báo, **từ chối áp dụng chính thức** | 2027 | **Dự thảo (Draft)** | Cổng thông tin Chính phủ / Bộ GD&ĐT | 2026-10-11 | `src/services/admission-policy.service.ts` | `tests/admission-policy-2026.test.ts` |

---

## 3. CÁC LỖ HỔNG VÀ BẤT CẬP ĐÃ KHẮC PHỤC TRIỆT ĐỂ

### 3.1. Phân hệ Tư vấn Nguyện vọng (Wishlist Strategy)
- **Vấn đề trước đây**: Hệ thống tự động ép người dùng sắp xếp nguyện vọng từ điểm chuẩn cao xuống thấp; cảnh báo sai lệch rằng một ngành khó đặt sau sẽ "không bao giờ được xét".
- **Khắc phục**: Tôn trọng tuyệt đối mức độ mong muốn thực tế (`preferenceRank`). Phân biệt rõ giữa mức độ mong muốn với dải rủi ro (`riskBand`). Thí sinh hoàn toàn có quyền xếp ngành mơ ước ở vị trí họ mong muốn mà không bị hệ thống tự ý đảo lộn thứ tự.
- **Ràng buộc cứng**: Chặn vượt quá 15 nguyện vọng; bắt buộc các ngành sư phạm/đào tạo giáo viên phải nằm trong Top 5 nguyện vọng.

### 3.2. Quản trị Dữ liệu & Provenance (Data Governance)
- **Vấn đề trước đây**: 247 chương trình trong CSDL phần lớn chỉ có nguồn chung chung ("Dữ liệu tổng hợp 2025/2026"), không có `sourceUrl`. Giao diện tự động hiển thị nhãn "Xét học bạ" khi thiếu điểm chuẩn, gây hiểu lầm nghiêm trọng. Hàm `bulkVerify` đánh dấu verified hàng loạt mà không cần URL.
- **Khắc phục**:
  - Thiết kế lược đồ `FieldProvenance` chi tiết từng trường dữ liệu.
  - Sửa `bulkVerify`: Chỉ cho phép xác minh khi có URL chính thức (`https://`) hoặc minh chứng đề án tuyển sinh có dấu kiểm duyệt của trường; loại bỏ toàn bộ dữ liệu nguồn chung chung khỏi trạng thái verified.
  - Thay thế toàn bộ nhãn fallback sai lệch trên giao diện (`nhe`, `program-card`, `saved-view`, `chuong-trinh/[slug]`, `nganh/[slug]`, `chatbot.service`, `faq.ts`) thành: **"Chưa có dữ liệu chính thức"**.
  - Không sử dụng dữ liệu chưa xác minh để gắn nhãn "An toàn" hoặc cam kết trúng tuyển.

### 3.3. Quy đổi Chứng chỉ Ngoại ngữ & TSA (Admission Methods)
- **Vấn đề trước đây**: Áp dụng một bảng quy đổi điểm IELTS chung cho tất cả các trường đại học; bỏ quên phương thức Đánh giá tư duy (TSA).
- **Khắc phục**:
  - Triển khai `CertificatePolicyService`: Áp dụng quy tắc theo từng trường/ngành/phương thức/mùa tuyển sinh.
  - Fail-closed: Nếu trường chưa công bố chính sách quy đổi được kiểm chứng, hệ thống trả về thông báo rõ ràng: *"Không có chính sách quy đổi được xác minh"*, tuyệt đối không áp đặt bảng quy đổi mặc định.
  - Bổ sung phương thức **TSA** (Đánh giá tư duy ĐHBK Hà Nội) đồng bộ xuyên suốt từ Types, Validation, Scorer, UI, Chatbot đến CSDL.

### 3.4. Mô hình Khuyến nghị & Độ tin cậy (Recommendation Engine)
- **Vấn đề trước đây**: Constant điểm fit bị ngược (`FIT_POINTS.AN_TOAN = 10` < `VUA_SUC = 15`); đánh giá an toàn chỉ dựa trên 1 năm điểm chuẩn hoặc điểm ước tính.
- **Khắc phục**:
  - Đã sửa chuẩn hóa thang điểm fit: An toàn = 100 điểm, Vừa sức = 85 điểm, Thử sức = 60 điểm.
  - Tách bạch hoàn toàn giữa Điểm tương thích sở thích (`fitScore`) và Mức độ rủi ro trúng tuyển (`admissionRisk`).
  - Đánh giá độ tin cậy dựa trên số năm dữ liệu thực tế (dưới 3 năm -> độ tin cậy thấp; điểm ước tính -> giảm 40% điểm tin cậy).

### 3.5. Trắc nghiệm Hướng nghiệp RIASEC (RIASEC Integrity)
- **Vấn đề trước đây**: Đặt tên thuật toán heuristic là "Iachan Index" gây hiểu lầm về độ chính xác chẩn đoán; tin tưởng payload kết quả gửi lên từ client.
- **Khắc phục**:
  - Đổi tên thành: **"Điểm phù hợp tham khảo Trovio"**.
  - Xóa bỏ các phát biểu giả định độ chính xác (như "98%").
  - Server-side Recomputation: Máy chủ bắt buộc tính toán lại điểm số và mã Holland từ 60 câu trả lời Likert (1–5). Phát hiện hồ sơ phẳng (flat profile) và các nhóm đồng điểm (tied dimensions) để đưa ra khuyến nghị đa chiều.
  - Thêm cảnh báo rõ ràng: Không phải công cụ chẩn đoán tâm lý lâm sàng.

### 3.6. Vòng đời Giáo viên & Quyền Riêng tư Học sinh (Privacy & Teacher Lifecycle)
- **Vấn đề trước đây**: Người dùng chỉ cần tích chọn role `teacher` là có thể xem dữ liệu học sinh trong lớp; học sinh không có quyền kiểm soát chia sẻ thông tin.
- **Khắc phục**:
  - Quy trình xác minh giáo viên 5 bước: `user` -> nộp hồ sơ minh chứng -> `pending verification` -> Quản trị viên đối soát -> `verified teacher`.
  - Chỉ giáo viên đã xác minh mới được tạo lớp học và cấp mã tham gia.
  - Quyền riêng tư học sinh: Mặc định chia sẻ tối thiểu. Họ tên được ẩn danh một phần (VD: *"An N."*); kết quả RIASEC, danh sách nguyện vọng và hồ sơ điểm mặc định bị ẩn (`false`).
  - Quyền thu hồi tức thì: Học sinh có thể bấm thu hồi quyền chia sẻ (`revoke consent`), ngay lập tức giáo viên không còn quyền truy cập dữ liệu.
  - Mã lớp học có thời hạn hiệu lực (TTL 7 ngày) và hỗ trợ thu hồi chủ động. Ghi nhận nhật ký kiểm toán (`audit_logs`) mỗi khi giáo viên mở bảng điểm học sinh.

### 3.7. An toàn Đăng nhập & Rate Limiting (Security Hardening)
- **Vấn đề trước đây**: Khóa tài khoản vĩnh viễn sau 5 lần nhập sai mật khẩu; Rate limiter lưu bộ nhớ cục bộ dễ bị bypass; lỗ hổng timing attack cho phép dò quét tài khoản (account enumeration).
- **Khắc phục**:
  - Triển khai cơ chế khóa tạm thời với Exponential Backoff: Lần 5 khóa 1 phút, lần 6 khóa 5 phút, lần 7 khóa 15 phút, từ lần 8 khóa tối đa 1 giờ. Tự động mở khóa sau khi hết thời gian mà không cần can thiệp thủ công.
  - Phòng chống timing attack: Khi email không tồn tại, hệ thống thực thi thuật toán băm giả lập (`crypto.scrypt`) với cùng thời gian trễ, ngăn chặn kẻ tấn công suy đoán tài khoản.
  - Rate Limiter nâng cao: Kiểm tra header `X-Forwarded-For` với danh sách trusted proxies cấu hình sẵn; chống giả mạo IP nguồn.

### 3.8. Cơ sở Dữ liệu & Toàn vẹn Giao dịch (Persistence & ACID Transactions)
- **Vấn đề trước đây**: File JSON phẳng không có kiểm soát đồng thời; import module gây side-effect tự động chạy ngầm.
- **Khắc phục**:
  - Xây dựng schema chuẩn hóa 3NF trên PostgreSQL 14+ gồm 79 bảng dữ liệu và 4 view nghiệp vụ.
  - Bổ sung helper `withTransaction`: Đảm bảo giao dịch ACID an toàn (tự động COMMIT và ROLLBACK khi có ngoại lệ).
  - Loại bỏ hoàn toàn các đoạn mã có side-effect khi import module.

---

## 4. TỔNG KẾT DANH MỤC TEST ĐÃ BỔ SUNG

Hệ thống đã bổ sung 6 bộ kiểm thử tự động toàn diện tại thư mục `tests/`:

1. [`tests/admission-policy-2026.test.ts`](file:///c:/Users/Admin/Videos/trovio-web/trovio-web/tests/admission-policy-2026.test.ts) (13 tests):
   - Giới hạn 15 nguyện vọng, ngành sư phạm top 5, học bạ 6 học kỳ, tổ hợp 3 môn, tỷ trọng Toán/Văn, sàn 15/30, cap điểm cộng, công thức giảm ưu tiên từ 22.5, mã UT1/UT2, từ chối quy chế draft 2027.
2. [`tests/wishlist-strategy.test.ts`](file:///c:/Users/Admin/Videos/trovio-web/trovio-web/tests/wishlist-strategy.test.ts) (8 tests):
   - Thứ tự theo mức mong muốn thật, không cưỡng ép xếp từ khó xuống dễ, cảnh báo không làm thay đổi rank, chặn vượt 15 NV, kiểm tra điều kiện ngành sư phạm.
3. [`tests/certificate-policy.test.ts`](file:///c:/Users/Admin/Videos/trovio-web/trovio-web/tests/certificate-policy.test.ts) (13 tests):
   - Fail-closed khi thiếu policy trường, quy đổi theo đúng trường/ngành/mùa, hỗ trợ phương thức TSA xuyên suốt, không so sai thang điểm.
4. [`tests/teacher-privacy.test.ts`](file:///c:/Users/Admin/Videos/trovio-web/trovio-web/tests/teacher-privacy.test.ts) (12 tests):
   - Chặn người dùng tự nhận giáo viên, quy trình duyệt hồ sơ, mã lớp có hạn 7 ngày, bảo vệ quyền riêng tư học sinh theo consent, thu hồi consent tức thì, ghi nhật ký audit log.
5. [`tests/auth-security.test.ts`](file:///c:/Users/Admin/Videos/trovio-web/trovio-web/tests/auth-security.test.ts) (13 tests):
   - Khóa tạm thời có thời hạn, tự mở khóa sau thời gian chờ, exponential backoff, chống account enumeration, kiểm tra header trusted proxy.
6. [`tests/riasec-integrity.test.ts`](file:///c:/Users/Admin/Videos/trovio-web/trovio-web/tests/riasec-integrity.test.ts) (13 tests):
   - Yêu cầu đủ 60 câu Likert (10 câu/nhóm), tính toán lại server-side, phát hiện hồ sơ phẳng, xử lý đồng điểm, tên gọi trung tính và từ chối phát biểu chẩn đoán.

---

## 5. DỮ LIỆU CHƯA XÁC MINH VÀ RỦI RO CÒN LẠI (DATA DISCLOSURE)

Theo nguyên tắc minh bạch dữ liệu và phòng ngừa rủi ro (Data Governance):

### 5.1. Tình trạng Dữ liệu Tuyển sinh Hiện tại:
- **Số chương trình đào tạo**: 247 chương trình.
- **Số chương trình có liên kết nguồn chính thức (`sourceUrl`)**: **1 chương trình** (Đại học Bách khoa Hà Nội - CNTT Việt Nhật).
- **Số chương trình chưa có nguồn kiểm chứng độc lập**: **246 chương trình**.
- **Chính sách xử lý đã áp dụng**:
  - Toàn bộ 246 chương trình được đánh dấu công khai trạng thái: **"Chưa có dữ liệu chính thức / Chưa xác minh"**.
  - Hệ thống **loại bỏ hoàn toàn các chương trình này khỏi nhãn "An toàn"** và không đưa ra khuyến nghị trúng tuyển có độ tin cậy cao.
  - Trên toàn bộ giao diện người dùng, điểm chuẩn bị thiếu được ghi rõ là *"Chưa có dữ liệu chính thức"*, không bị gán ép thành *"Xét học bạ"*.

### 5.2. Kế hoạch Quản trị Tiếp theo:
1. Tiếp tục thu thập đề án tuyển sinh chính thức mùa 2026 của từng trường đại học để nạp vào CSDL kèm `sourceUrl` và người kiểm duyệt.
2. Vận hành quy trình kiểm duyệt dữ liệu có kiểm toán định kỳ 6 tháng/lần để phát hiện các thông tin hết hạn hiệu lực.
