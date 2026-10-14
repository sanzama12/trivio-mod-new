# TROVIO REMEDIATION — BASELINE REPORT

**Ngày khảo sát:** 2026-10-11  
**Worktree:** `c:\Users\Admin\Videos\trovio-web\trovio-web`  
**Múi giờ nghiệp vụ:** Asia/Saigon  
**Mùa tuyển sinh trọng tâm:** 2026

---

## 1. KẾT QUẢ BASELINE — BUILD & TEST

### 1.1. Tests (`npm test`)
```
✅ PASSED: 97/97 tests
⏱ Duration: 2770ms
📁 Coverage: services, features, improvements, content, admin-ops, regression, new-features, work-style
```

**Chi tiết:**
- Authentication & authorization: PASS
- Priority rules & scoring: PASS  
- Program search & filtering: PASS
- RIASEC matching: PASS
- Wishlist strategy: PASS
- Admin operations: PASS
- Chatbot & content moderation: PASS
- Teacher class management: PASS
- School verification: PASS
- Work style mini-test & MBTI: PASS

### 1.2. Type Checking (`npm run typecheck`)
```
✅ PASSED: No TypeScript errors
```

### 1.3. Production Build (`npm run build`)
```
✅ PASSED: Build succeeded
⚠️ No warnings about dynamic JSON filesystem access detected in console output
```

**Kết luận baseline:** Hệ thống hiện tại đang ở trạng thái **functional và stable**. Tests comprehensive và build clean. Đây là nền tảng vững chắc để tiến hành remediation mà không sợ phá vỡ chức năng đang hoạt động.

---

## 2. KIẾN TRÚC & CẤU TRÚC DỰ ÁN

### 2.1. Tech Stack
- **Framework:** Next.js 16.0.0 (App Router, React 19.2.0)
- **Language:** TypeScript 5.6.0
- **Styling:** Tailwind CSS 4.1.0
- **Runtime:** Node.js ≥ 20.9.0
- **Test:** `tsx --test` (Node native test runner)
- **Package Manager:** npm

### 2.2. Architecture Pattern: Layered (MVC-inspired)

```
┌─────────────────────────────────────────────────────┐
│ PRESENTATION: src/app (pages, API routes)          │
│               src/components (UI React components)  │
└──────────────────▲──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│ SERVICE: src/services (business logic, pure TS)     │
└──────────────────▲──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│ REPOSITORY: src/repositories (data interfaces)      │
│   - types.ts (interfaces)                           │
│   - memory.ts (in-memory for catalogs)              │
│   - json-file.ts (JSON file for user/dynamic data) │
│   - postgres.ts (PostgreSQL adapters — EXISTS)      │
│   - index.ts (wiring)                               │
└──────────────────▲──────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────┐
│ DATA: src/data (mock/seed data for demo)           │
│ DOMAIN: src/domain (types, constants, pure logic)  │
└─────────────────────────────────────────────────────┘
```

**Quan sát quan trọng:**
- ✅ Service layer KHÔNG phụ thuộc Next.js → testable
- ✅ Repository interfaces đã tách biệt implementation
- ✅ PostgreSQL adapters ĐÃ TỒN TẠI (`src/repositories/postgres.ts`)
- ⚠️ JSON file repository đang là default cho production

### 2.3. Cấu trúc thư mục chính

```
src/
├── app/                    # Next.js App Router pages & API routes
├── components/             # React UI components (auth, admin, program, etc.)
├── controllers/            # MVC controllers (scoring.controller.ts)
├── data/                   # Static mock data (schools, majors, programs, etc.)
├── domain/                 # Pure domain types & logic (types.ts, riasec.ts, reviews.ts, etc.)
├── lib/                    # Utilities (rate-limit, cost, share-card, etc.)
├── repositories/           # Data access interfaces & implementations
│   ├── types.ts           # Repository interfaces
│   ├── memory.ts          # In-memory catalog repo
│   ├── json-file.ts       # JSON file repo (CURRENT DEFAULT for users/dynamic data)
│   ├── postgres.ts        # PostgreSQL repo (EXISTS, not active)
│   └── index.ts           # Repository wiring
├── services/              # Business logic services (60+ service files)
└── views/                 # (Does not exist — README mentions it incorrectly)

tests/                     # 97 unit tests (Node native test runner)
scripts/                   # Migration scripts (migrate-pg.ts exists)
docs/                      # Documentation (Word docs mentioned in README)
.data/                     # Runtime JSON database file (trovio-db.json)
```

---

## 3. VẤN ĐỀ NGHIỆP VỤ — PHÂN LOẠI THEO MỨC ĐỘ

### P0 — Critical: SAI NGHIỆP VỤ / BẢO MẬT / THIẾU POLICY ENGINE

#### P0.1: Hard-coded Admission Season (2027 giả định)
**Vị trí:**
- `src/data/admission-timeline.ts:8`
  ```typescript
  export const TIMELINE_SEASON = "2027";
  ```
- `src/data/supplementary-rounds.ts:31`
  ```typescript
  export const SEASON_DEMO_DATE = "2027-08-26";
  ```

**Ảnh hưởng:** Mọi logic timeline, supplementary rounds, và hiển thị mùa tuyển sinh đều dựa trên constant này. Không có version control hay effective date.

#### P0.2: Hard-coded Priority Rules (2023 onwards, no version)
**Vị trí:**
- `src/services/scoring.service.ts:78-96`
  ```typescript
  export const PRIORITY_REGION_POINTS: Record<PriorityRegion, number> = {
    KV1: 0.75, "KV2-NT": 0.5, KV2: 0.25, KV3: 0,
  };
  export const PRIORITY_GROUP_POINTS: Record<PriorityGroup, number> = {
    none: 0, UT1: 2, UT2: 1,
  };
  export const PRIORITY_REDUCTION_THRESHOLD = 22.5;
  ```
- `src/services/chatbot.service.ts:292`
  ```typescript
  "Điểm ưu tiên khu vực: KV1 +0,75; KV2-NT +0,5; KV2 +0,25; KV3 +0. Đối tượng ưu tiên: nhóm UT1 +2, nhóm UT2 +1. Theo quy chế áp dụng từ năm 2023..."
  ```
- `src/data/faq.ts:14`
  ```typescript
  { q: "Điểm ưu tiên được tính như thế nào?", a: "...Từ năm 2023, thí sinh đạt từ 22,5 điểm..." }
  ```

**Ảnh hưởng:** Quy tắc ưu tiên được hard-code không có:
- Season/year association
- Effective date range
- Legal document reference
- Versioning

**Rủi ro:** Nếu quy chế 2027 thay đổi, phải sửa code và redeploy thay vì cập nhật policy data.

#### P0.3: Hard-coded Wishlist Limit (50, not 15 as per 2026 regulation)
**Vị trí:**
- `src/services/user-data.service.ts:11`
  ```typescript
  export const MAX_WISHLIST = 50;
  ```

**Ảnh hưởng:** Theo quy chế 2026, số nguyện vọng tối đa là 15. Hệ thống cho phép 50 → vi phạm quy chế nghiêm trọng.

**Test coverage:** Tests sử dụng giá trị 15 trong mock data nhưng constant service layer = 50.

#### P0.4: JSON File Repository in Production
**Vị trí:**
- `src/repositories/index.ts` exports `json-file` implementations
- `src/repositories/json-file.ts:136`
  ```typescript
  const dbFile = () => process.env.TROVIO_DB_FILE ?? join(process.cwd(), ".data", "trovio-db.json");
  ```

**Ảnh hưởng:**
- User accounts, user data, admin overrides, audit logs tất cả lưu trong 1 file JSON
- Không có transaction safety
- Không có concurrent write protection (có global lock nhưng single-process only)
- File I/O trên mọi read/write

**Đã có sẵn:** PostgreSQL adapters exist in `src/repositories/postgres.ts` nhưng chưa được wire vào `index.ts`.

#### P0.5: Teacher Role Self-Selection (No Verification)
**Vị trí:**
- `src/domain/types.ts:165`
  ```typescript
  export type UserRole = "student" | "parent" | "teacher" | "school";
  ```
- User profile allows selecting `role: "teacher"` without verification

**Ảnh hưởng:** Bất kỳ ai cũng có thể tự chọn role "teacher" và:
- Tạo class codes
- See student progress (aggregated)
- Send reminders to "students"

**Test coverage:** `src/services/class.service.ts:65` checks `user.role === "teacher"` nhưng role được user tự khai báo.

**Lưu ý:** "school" role CÓ verification process (admin approval), nhưng "teacher" không.

#### P0.6: RIASEC Labeled as "Iachan Agreement Index" Without Proper Implementation
**Vị trí:**
- `src/services/riasec-match.ts:3-4`
  ```typescript
  /**
   * Áp dụng lý thuyết Lục giác Holland (Hexagon Model) & Chỉ số tương hợp Iachan Agreement Index.
   */
  ```

**Vấn đề:**
- Comment claims "Iachan Agreement Index" but implementation is custom formula
- Actual Iachan Index has specific calculation method not implemented here
- No references to academic papers or standards
- Custom scoring: `percentBase * 0.75 + hexCongruence * 25 + bonus`

**Rủi ro:** Sai tên học thuật gây hiểu lầm về độ tin cậy của kết quả.

**Ghi nhận:** README và UI KHÔNG claim accuracy percentage, chỉ hiển thị "% phù hợp" as reference.

---

### P1 — High: QUYẾT ĐỊNH TUYỂN SINH SAI

#### P1.1: IELTS Conversion Table — Global, Not School-Specific
**Vị trí:**
- `src/services/scoring.service.ts:34-48`
  ```typescript
  export const IELTS_CONVERSION_TABLE: Record<string, number> = {
    "4.0": 7.0, "4.5": 7.5, "5.0": 8.0, "5.5": 8.5,
    "6.0": 9.0, "6.5": 9.5, "7.0": 10.0, ...
  };
  ```

**Vấn đề:**
- Bảng quy đổi IELTS → điểm môn Ngoại ngữ là GLOBAL
- Không phân biệt theo trường/năm/chương trình
- Một số trường có bảng quy đổi riêng khác với chuẩn chung

**Đề xuất:** Cần policy per school/program hoặc ít nhất là documented default with override capability.

#### P1.2: TSA Method Exists But No Programs Use It
**Vị trí:**
- `src/domain/types.ts:13`
  ```typescript
  export type AdmissionMethodKey = "thpt" | "hocba" | "dgnl-hn" | "dgnl-hcm" | "tsa";
  ```
- `src/services/scoring.service.ts:28`
  ```typescript
  tsa: { label: "Đánh giá tư duy ĐH Bách Khoa Hà Nội (TSA)", short: "ĐGTD TSA", max: 100, factor: 100/30, ... }
  ```

**Vấn đề:**
- TSA được define trong types và service
- Grep qua toàn bộ `src/data/programs.ts` không thấy program nào dùng TSA
- Không có test coverage cho TSA method

**Rủi ro:** Dead code hoặc feature incomplete.

#### P1.3: Estimated Cutoffs Not Prominently Flagged in All Contexts
**Vị trí:**
- `src/domain/types.ts:99`
  ```typescript
  export interface MethodCutoff {
    method: AltMethodKey;
    year: number;
    score: number;
    estimated?: boolean; // ✅ Field exists
  }
  ```
- Demo data in `src/data/programs.ts` has many `estimated: true` entries

**Vấn đề:**
- Schema HAS `estimated` field (good!)
- Tests check for it
- BUT: Need to verify UI prominently shows "Ước tính" labels everywhere (program cards, comparison, recommendations, chatbot)

**Kiểm tra tiếp:** Cần audit tất cả UI components hiển thị cutoff scores.

#### P1.4: Teacher Training Programs — No Enforcement of Wishlist Position 1-5
**Yêu cầu nghiệp vụ:** Theo quy chế 2026, ngành đào tạo giáo viên CHỈ được đặt ở nguyện vọng 1-5.

**Hiện trạng:** Không tìm thấy logic enforce rule này trong:
- `src/services/wishlist-strategy.ts`
- `src/services/user-data.service.ts`
- API routes

**Dữ liệu ngành:**
- `src/data/majors.ts` có nhiều ngành giáo viên (sư phạm Toán, Ngữ văn, Anh, v.v.)
- Nhưng không có field `isTeacherTraining` trong schema

**Rủi ro:** Học sinh có thể đặt ngành sư phạm ở NV 10 → không hợp lệ.

---

### P2 — Medium: CHẤT LƯỢNG DỮ LIỆU / UX / VẬN HÀNH

#### P2.1: Source Provenance — Partial Implementation
**Hiện trạng (GOOD):**
- `Program` type has: `source`, `sourceUrl`, `sourceCheckedAt`, `sourceNote`, `adminVerifiedAt`
- Admin UI allows marking programs as verified
- School verification with 12-month validity
- Audit log for all changes

**Vấn đề:**
- Demo data in `src/data/programs.ts`: many entries have `source: "Đề án tuyển sinh 2025"` WITHOUT `sourceUrl`
- Many programs missing `sourceUrl` even for "official" sources
- No systematic enforcement of "must have HTTPS sourceUrl for non-demo data"

**Count cần thiết:**
- Số programs trong `src/data/programs.ts` thiếu `sourceUrl`: TBD (cần parse JSON)
- Số programs có `sourceUrl` nhưng không https: TBD

#### P2.2: "An toàn / Vừa sức / Thử sức" Logic — Thiếu Cutoff History
**Vị trí:**
- `src/services/scoring.service.ts:196-225` (evaluateFit function)
- Logic dựa trên latest cutoff score only

**Vấn đề:**
- Chỉ so sánh với điểm chuẩn năm gần nhất
- Không xem xét trend 3 năm → "an toàn" có thể không an toàn nếu điểm chuẩn đang tăng
- Recommendation service has `MIN_CUTOFF_YEARS` check (good) but fit logic doesn't use multi-year analysis

**Recommendation:** evaluateFit should consider volatility across years.

#### P2.3: Admission Method Descriptions — Hard-coded in Code & Data
**Vị trí:**
- `src/repositories/json-file.ts:489-494`
  ```typescript
  const KEYED_METHODS: Record<string, Omit<AdmissionMethod, "requirement">> = {
    thpt: { key: "thpt", name: "Xét điểm thi tốt nghiệp THPT", desc: "Theo tổng điểm tổ hợp cộng điểm ưu tiên.", tag: "Điểm thi" },
    ...
  }
  ```
- Also in `src/data/programs.ts` (every program has methods array with descriptions)

**Vấn đề:** Descriptions of admission methods are duplicated and hard-coded. If regulation changes wording, must update multiple places.

#### P2.4: Rate Limiting — In-Memory Only
**Vị trí:**
- `src/lib/rate-limit.ts` (in-memory store)

**Vấn đề:**
- Rate limits reset on server restart
- Không work với multiple instances / horizontal scaling
- README acknowledges: "thay rate-limit bộ nhớ bằng Redis nếu chạy nhiều instance"

**Priority:** P2 vì production deploy hiện tại likely single-instance. Nhưng MUST fix before scaling.

#### P2.5: Session Secret — Falls Back to Random on Missing ENV
**Vị trí:**
- README: "SESSION_SECRET thiếu ở production → dùng khoá ngẫu nhiên theo tiến trình"

**Vấn đề:** Random session secret per process → sessions invalid on restart. Should FAIL loudly in production instead of silent fallback.

#### P2.6: Consent for Student Data Sharing — Implicit in Teacher Class Join
**Vị trí:**
- `src/services/class.service.ts:5-6`
  ```typescript
  // Học sinh tự nhập mã để tham gia = đồng ý chia sẻ TIẾN ĐỘ
  ```

**Hiện trạng:** Consent is implied when student enters class code. 

**Question:** Is there explicit consent UI shown BEFORE joining? Need to audit `src/app/.../lop-hoc/` pages.

**GDPR/NDCP 13/2023 requirement:** Minors need parental consent. Onboarding asks for confirmation but doesn't block usage without it.

---

### P3 — Low: TỐI ƯU & NỢ KỸ THUẬT

#### P3.1: RIASEC Questions — 24/60 Rewritten, Original IDs Preserved
**Vị trí:**
- `src/domain/riasec.ts`
- Comment: "24/60 câu viết lại theo tình huống đời thường (giữ mã câu & thứ tự)"

**Hiện trạng:** Good — preserves compatibility with saved quiz progress.

**Nợ kỹ thuật:** No version field in quiz results. If questions change significantly in future, old results might be incomparable.

#### P3.2: Demo Mode OTP — Fixed Code
**Vị trí:**
- README: "Mã OTP xác thực email (S15b) 592841 (chỉ ở chế độ demo)"

**An toàn:** OK for demo. Tests verify real OTP generation when `TROVIO_DEMO=false`.

#### P3.3: Next.js Documentation Not Yet Read
**Requirement:** AGENTS.md instructs reading `node_modules/next/dist/docs/` before making changes.

**Hiện trạng:** Baseline phase → haven't read yet. MUST read before implementation:
- Route handlers
- Authentication  
- Data security
- Caching
- Production checklist

---

## 4. DANH SÁCH FILE TRỌNG YẾU CẦN SỬA

### 4.1. Policy Engine (NEW — P0.1, P0.2, P0.3)
Cần tạo:
- `src/domain/admission-policy.ts` — Policy types & interfaces
- `src/services/policy.service.ts` — Load policy by season
- `src/data/admission-policies/` — Policy data files per season
  - `policy-2026.ts` (or JSON)
  - `policy-2027.ts` (when available)

### 4.2. Priority Rules (P0.2)
Sửa:
- `src/services/scoring.service.ts` — Refactor to use policy engine
- `src/services/chatbot.service.ts:292` — Remove hard-coded text, query policy
- `src/data/faq.ts:14` — Generate from policy or flag as "as of 2026"

### 4.3. Season & Timeline (P0.1)
Sửa:
- `src/data/admission-timeline.ts` — Refactor constants to policy-driven
- `src/services/timeline.service.ts` — Accept season parameter
- `src/data/supplementary-rounds.ts` — Link to season

### 4.4. Wishlist Limit (P0.3)
Sửa:
- `src/services/user-data.service.ts:11` — Change MAX_WISHLIST from 50 → get from policy
- Add validation in API routes

### 4.5. Repository Wiring (P0.4)
Sửa:
- `src/repositories/index.ts` — Wire PostgreSQL adapters
- `src/repositories/postgres.ts` — Review & complete implementation
- `scripts/migrate-pg.ts` — Verify migration script
- Add environment detection logic (JSON for demo, PG for production)

### 4.6. Teacher Verification (P0.5)
Tạo mới:
- `src/services/teacher-verification.service.ts`
- Admin UI for verifying teacher accounts

Sửa:
- `src/services/class.service.ts` — Check verified status before allowing class creation

### 4.7. RIASEC Naming (P0.6)
Sửa:
- `src/services/riasec-match.ts:3-4` — Remove or clarify "Iachan Agreement Index" reference
- Add comment explaining the custom formula
- UI copy: Ensure no claims of "standard Iachan index"

### 4.8. IELTS Policy (P1.1)
Sửa:
- `src/services/scoring.service.ts` — Refactor conversion table to policy-based
- Allow per-school override in database

### 4.9. TSA Method (P1.2)
Decision needed:
- If not used: Remove from types
- If planned: Add test coverage + demo program

### 4.10. Teacher Training Wishlist Rules (P1.4)
Tạo mới:
- `src/services/teacher-training-rules.service.ts`

Sửa:
- `src/services/wishlist-strategy.ts` — Add check for teacher training positions
- Mark majors as `isTeacherTraining` in data or infer from major group

---

## 5. MIGRATION STRATEGY

### 5.1. Database Migration Path
**Hiện có:**
- `scripts/migrate-pg.ts` exists
- `src/repositories/postgres.ts` exists
- Schema appears complete

**Cần:**
1. Review `scripts/migrate-pg.ts` for completeness
2. Test migration with demo data
3. Add rollback capability
4. Document migration process

**Env-based strategy:**
```typescript
// Pseudo-code
if (process.env.DATABASE_URL) {
  // Use PostgreSQL repos
} else if (process.env.TROVIO_DEMO === 'true') {
  // Use JSON file repos
} else {
  // Fail loud: Production must have DATABASE_URL
}
```

### 5.2. Data Seed for Testing
- Keep `src/data/*.ts` as seed data
- Load into PostgreSQL for test environments
- Use for integration tests

---

## 6. TESTS & VERIFICATION PLAN

### 6.1. Test Coverage Status
**Current:** 97 tests, all passing

**Gaps identified:**
- ❌ No tests for TSA admission method
- ❌ No tests for teacher training wishlist position rule
- ❌ No tests for policy engine (doesn't exist yet)
- ⚠️ Tests use MAX_WISHLIST = 50 without questioning it

**Must add:**
- Policy engine tests (loading, versioning, effective dates)
- PostgreSQL repository integration tests
- Teacher verification workflow tests
- Multi-year cutoff volatility tests

### 6.2. Verification Commands
Per phase:
```bash
npm test                     # Unit tests
npm run typecheck            # TypeScript
npm run build                # Production build
npm run demo                 # Manual smoke test
# (E2E tests exist: tests/e2e/smoke.mjs with 114 checks)
```

---

## 7. NEXT.JS DOCS ĐÃ ĐỌC (GIAI ĐOẠN 0)

**Chưa đọc** — sẽ đọc trong giai đoạn implementation:
- [ ] Route Handlers  
- [ ] Authentication
- [ ] Data Security
- [ ] Caching
- [ ] Production Checklist

**Lý do:** Giai đoạn 0 chỉ khảo sát, chưa sửa code. Đọc docs trước khi implement từng giai đoạn.

---

## 8. RỦI RO CÒN LẠI SAU KHI REMEDIATION

### 8.1. Data Quality Risks
- **Cutoff scores:** Demo data có nhiều estimated scores. Production cần process nhập liệu chính thức từng năm.
- **School info:** Descriptions, scholarships là descriptive text, không có structured validation.
- **Major career data:** Salary ranges & job growth % là estimates, not real-time labor market data.

### 8.2. Business Process Risks
- **Policy updates:** Khi Bộ GD&ĐT thay đổi quy chế, cần process update policy files và communicate changes.
- **Cutoff ingestion:** Cần automation hoặc admin workflow để nhập điểm chuẩn chính thức từ các trường sau mỗi đợt tuyển sinh.
- **School verification expiry:** 12-month validity needs monitoring + renewal reminders.

### 8.3. Technical Risks
- **Scaling:** Rate limiter, session storage cần Redis/distributed cache.
- **Backup:** PostgreSQL requires backup strategy.
- **Monitoring:** No observability stack identified (logs, metrics, alerts).

---

## 9. KẾT LUẬN BASELINE

### 9.1. Điểm Mạnh
✅ **Kiến trúc tốt:** Layered architecture, service layer testable, repository pattern  
✅ **Test coverage tốt:** 97 tests comprehensive  
✅ **Type safety:** Full TypeScript, no `any` abuse  
✅ **PostgreSQL ready:** Adapters exist, just need wiring  
✅ **Security conscious:** Password hashing, CSRF protection, rate limiting, input validation  
✅ **Build clean:** No TypeScript errors, no build warnings

### 9.2. Điểm Yếu Nghiêm Trọng
❌ **P0.1:** Admission season hard-coded (2027)  
❌ **P0.2:** Priority rules hard-coded (2023 onwards, no policy engine)  
❌ **P0.3:** Wishlist limit = 50 (should be 15 per 2026 regulation)  
❌ **P0.4:** JSON file in production (PostgreSQL exists but not wired)  
❌ **P0.5:** Teacher role self-selection (no verification)  
❌ **P0.6:** RIASEC mislabeled as "Iachan Index"

### 9.3. Mức Độ Remediation Cần Thiết
**Estimate:** ~2-3 weeks focused work cho 1 senior engineer

**Breakdown:**
- Policy engine design & implementation: 3-4 days
- Repository wiring to PostgreSQL: 2-3 days  
- Teacher verification workflow: 2 days
- IELTS policy refactor: 1 day
- Teacher training rules: 1 day
- Testing & verification: 3-4 days
- Documentation: 2 days

**Khuyến nghị:** Chia thành FEATs nhỏ, mỗi FEAT có verification step riêng.

---

## 10. DỮ LIỆU ĐẾM (COUNTS)

### 10.1. Code Statistics
- **Source files:** ~60+ TypeScript service files
- **Test files:** 8 test files (97 test cases)
- **Data files:** 
  - `src/data/schools.ts`: ~70 schools
  - `src/data/majors.ts`: ~125 majors  
  - `src/data/programs.ts`: ~1500+ programs (estimate, need to parse)

### 10.2. Hard-coded Constants Identified
- `TIMELINE_SEASON = "2027"`: 1 occurrence
- `PRIORITY_REGION_POINTS`: 1 definition, multiple references
- `PRIORITY_GROUP_POINTS`: 1 definition, multiple references  
- `PRIORITY_REDUCTION_THRESHOLD = 22.5`: 1 definition
- `MAX_WISHLIST = 50`: 1 definition
- IELTS conversion table: 1 definition
- Priority rules in chatbot: 1 hard-coded string
- Priority rules in FAQ: 1 hard-coded string

### 10.3. Programs Without SourceUrl
**TODO:** Parse `src/data/programs.ts` JSON và đếm:
```typescript
programs.filter(p => !p.sourceUrl).length
```
Estimate dựa trên sample: ~80-90% programs thiếu sourceUrl.

---

**Người khảo sát:** Kiro AI Planning Agent  
**Xác nhận:** Baseline hoàn tất, sẵn sàng viết kế hoạch triển khai (01-plan.md)
