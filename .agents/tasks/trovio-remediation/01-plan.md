# TROVIO REMEDIATION — IMPLEMENTATION PLAN

**Baseline:** `00-baseline.md`  
**Mục tiêu:** Đưa hệ thống từ demo sang production-ready với quy tắc tuyển sinh 2026 chính xác, có nguồn gốc và có kiểm tra nghiệp vụ đầy đủ.

---

## NGUYÊN TẮC THỰC THI

1. **Mỗi giai đoạn phải để lại codebase buildable:** `npm test && npm run typecheck && npm run build` pass
2. **Không xóa test để qua:** Fix root cause, không lower standards
3. **Mọi thay đổi có migration:** Schema changes cần migration scripts
4. **Verify sau mỗi giai đoạn:** Run full test suite + manual smoke test critical flows
5. **Commit per giai đoạn:** Mỗi giai đoạn = 1 logical commit (or feature branch if parallel work needed)

---

## THỨ TỰ ƯU TIÊN: P0 → P1 → P2 → Final Verification

---

## GIAI ĐOẠN 1: POLICY ENGINE FOUNDATION (P0.1, P0.2, P0.3)

**Mục tiêu:** Tạo policy engine để quản lý quy tắc tuyển sinh theo mùa, thay thế hard-coded constants.

### 1.1. Design Policy Schema
**Files:** 
- Create `src/domain/admission-policy.ts`

**Nội dung:**
```typescript
export interface AdmissionPolicy {
  season: string;              // "2026", "2027"
  effectiveFrom: string;       // ISO date
  effectiveTo: string | null;  // null = ongoing
  status: 'draft' | 'official' | 'expired';
  
  // Legal provenance
  issuer: string;              // "Bộ GD&ĐT"
  legalDocumentNumber: string; // "26/2025/TT-BGDĐT"
  officialSourceUrl: string;   // https URL to official document
  publishedAt: string;         // ISO date
  accessedAt: string;          // When we fetched/verified
  
  // Core rules
  maxWishlistItems: number;                    // 15 for 2026
  teacherTrainingAllowedRanks: number[];      // [1,2,3,4,5] for 2026
  transcriptSemesterCount: number;             // 6 for học bạ 2026
  transcriptMinimumSubjectCount: number;       // 3
  mandatoryWeightedSubjects: string[];         // ["Toán", "Ngữ văn"]
  minimumWeightedSubjectRatio: number;         // 1/3
  
  // Priority rules
  priorityRules: {
    regions: Record<string, number>;  // KV1: 0.75, ...
    groups: Record<string, number>;   // UT1: 2, UT2: 1, none: 0
    reductionThreshold: number;       // 22.5 (thang 30)
    reductionFormula: string;         // "[(max - total) / (max - threshold)] * priority"
  };
  
  // Certificate conversion (default, can be overridden per school)
  certificatePolicyMode: 'global' | 'per-school';
  defaultIeltsConversion: Record<string, number> | null;
  defaultToeflConversion: Record<number, number> | null;
  
  notes: string;  // Human-readable summary of key changes
}
```

**Verification:**
- TypeScript compiles
- Schema documented in code comments

---

### 1.2. Implement Policy Service
**Files:**
- Create `src/services/policy.service.ts`
- Create `src/data/admission-policies/`
  - `policy-2026.ts`
  - (optionally `policy-2027-draft.ts` as example)

**Logic:**
```typescript
// policy.service.ts
export const policyService = {
  async getPolicy(season: string): Promise<AdmissionPolicy | null>
  async getCurrentPolicy(asOf: Date = now): Promise<AdmissionPolicy>
  async listPolicies(): Promise<AdmissionPolicy[]>
  
  // For specific rules
  getMaxWishlist(season: string): Promise<number>
  getPriorityRules(season: string): Promise<PriorityRules>
  getIeltsConversion(season: string, schoolId?: string): Promise<Record<string, number>>
}
```

**Policy-2026.ts content:**
- `season: "2026"`
- `maxWishlistItems: 15`
- `teacherTrainingAllowedRanks: [1,2,3,4,5]`
- `priorityRules`: copy current constants from `scoring.service.ts`
- `legalDocumentNumber: "26/2025/TT-BGDĐT"`
- `officialSourceUrl: "https://vanban.chinhphu.vn/?classid=1&docid=217071&orggroupid=4&pageid=27160"`
- `publishedAt: "2025-12-26"`
- `accessedAt: "2026-10-11"` (today)
- `notes: "Quy chế tuyển sinh đại học năm 2026..."`

**Verification:**
- `npm test` — add test: `policy.service.test.ts`
  - Load policy-2026
  - Verify maxWishlist = 15
  - Verify priority rules match documented regulation
  - Test getCurrentPolicy returns 2026 when date = 2026-10-11
- TypeScript compiles

---

### 1.3. Refactor Scoring Service to Use Policy
**Files:**
- Modify `src/services/scoring.service.ts`

**Changes:**
- Export OLD constants as `LEGACY_*` (for backward compat during transition)
- Add new functions:
  ```typescript
  export async function getPriorityRegionPoints(season: string): Promise<Record<PriorityRegion, number>>
  export async function getPriorityGroupPoints(season: string): Promise<Record<PriorityGroup, number>>
  export async function getReductionThreshold(season: string): Promise<number>
  ```
- Refactor `computeAdmissionScore` signature:
  ```typescript
  export function computeAdmissionScore(
    rawTotal: number,
    region: PriorityRegion,
    group: PriorityGroup,
    method: AdmissionMethodKey = "thpt",
    policy: AdmissionPolicy  // NEW PARAM
  ): AdmissionScore
  ```
- Internal logic uses `policy.priorityRules` instead of constants

**Migration path:**
- Keep old signature as deprecated wrapper:
  ```typescript
  /** @deprecated Use version with policy parameter */
  export function computeAdmissionScore(...) {
    const policy = await policyService.getCurrentPolicy();
    return computeAdmissionScoreWithPolicy(..., policy);
  }
  ```

**Verification:**
- All existing tests pass (using policy-2026 data)
- New tests verify policy parameter is used
- `npm run typecheck` passes

---

### 1.4. Update Wishlist Service to Use Policy
**Files:**
- Modify `src/services/user-data.service.ts`

**Changes:**
- Change `MAX_WISHLIST = 50` → `const MAX_WISHLIST_LEGACY = 50; // Deprecated`
- Add:
  ```typescript
  export async function getMaxWishlist(season: string = "2026"): Promise<number> {
    return policyService.getMaxWishlist(season);
  }
  ```
- Update `sanitizeUserData` to accept optional season param and enforce limit
- API routes (`/api/account/data`) pass current season to validation

**Verification:**
- Test: `sanitizeUserData` truncates wishlist to 15 when season=2026
- Test: Verify old constant still works for backward compat (deprecated path)
- `npm test` passes

---

### 1.5. Update FAQ & Chatbot to Reference Policy
**Files:**
- Modify `src/data/faq.ts`
- Modify `src/services/chatbot.service.ts`

**Changes:**
- FAQ: Change hard-coded answer to:
  ```typescript
  { q: "Điểm ưu tiên được tính như thế nào?",
    a: "Theo quy chế tuyển sinh 2026 (TT 26/2025/TT-BGDĐT): KV1 +0,75; KV2-NT +0,5; KV2 +0,25; KV3 +0. Đối tượng: UT1 +2, UT2 +1. Thí sinh đạt từ 22,5 điểm (thang 30) được cộng ưu tiên giảm dần theo công thức: [(30 − tổng điểm) / 7,5] × mức ưu tiên. Nguồn: https://vanban.chinhphu.vn/?classid=1&docid=217071" }
  ```
- Chatbot: Load policy dynamically when answering priority questions:
  ```typescript
  if (has(n, I.priority)) {
    const policy = await policyService.getCurrentPolicy();
    return base("rules-priority", "answer",
      `Theo quy chế tuyển sinh ${policy.season} (${policy.legalDocumentNumber}): ...`,
      { sources: [{ label: "Văn bản chính thức", href: policy.officialSourceUrl }] }
    );
  }
  ```

**Verification:**
- Chatbot test: Question "Điểm ưu tiên tính thế nào?" returns answer with policy 2026 reference
- Test: sourceUrl in response = official URL
- `npm test` passes

---

### 1.6. Update Timeline Service to Use Policy
**Files:**
- Modify `src/services/timeline.service.ts`
- Modify `src/data/admission-timeline.ts`

**Changes:**
- Refactor `TIMELINE_SEASON` constant → load from policy
- Timeline config stored in DB should reference policy season
- When admin updates timeline, they select which policy/season it applies to

**Verification:**
- Test: Timeline service returns season from active policy
- Test: Admin can update timeline and associate with season "2026"
- `npm test` passes

---

**Giai đoạn 1 hoàn thành khi:**
- [x] Policy schema defined
- [x] Policy service implemented and tested
- [x] Scoring service refactored to use policy
- [x] Wishlist limit = 15 from policy
- [x] FAQ & chatbot reference policy with legal source URL
- [x] Timeline linked to policy season
- [x] All tests pass (npm test)
- [x] TypeScript compiles (npm run typecheck)
- [x] Build succeeds (npm run build)

**Files created:**
- `src/domain/admission-policy.ts`
- `src/services/policy.service.ts`
- `src/data/admission-policies/policy-2026.ts`
- `tests/policy.test.ts`

**Files modified:**
- `src/services/scoring.service.ts`
- `src/services/user-data.service.ts`
- `src/services/chatbot.service.ts`
- `src/services/timeline.service.ts`
- `src/data/faq.ts`

---

## GIAI ĐOẠN 2: DATABASE MIGRATION — JSON → POSTGRESQL (P0.4)

**Mục tiêu:** Wire PostgreSQL repositories vào production, giữ JSON cho demo/test.

### 2.1. Review & Complete PostgreSQL Schema
**Files:**
- Read `scripts/migrate-pg.ts`
- Read `src/repositories/postgres.ts`

**Tasks:**
- Verify schema includes all fields from `json-file.ts` DB structure
- Check for missing tables/columns
- Ensure indexes on frequently-queried fields (user email, program slug, etc.)

**Verification:**
- Run `scripts/migrate-pg.ts` against local PostgreSQL
- Inspect created schema
- Document any gaps

---

### 2.2. Add Policy Table to PostgreSQL
**Files:**
- Modify `scripts/migrate-pg.ts`

**Schema addition:**
```sql
CREATE TABLE IF NOT EXISTS admission_policies (
  season VARCHAR(10) PRIMARY KEY,
  effective_from DATE NOT NULL,
  effective_to DATE,
  status VARCHAR(20) NOT NULL,
  issuer TEXT NOT NULL,
  legal_document_number TEXT NOT NULL,
  official_source_url TEXT NOT NULL,
  published_at DATE NOT NULL,
  accessed_at DATE NOT NULL,
  max_wishlist_items INTEGER NOT NULL,
  teacher_training_allowed_ranks INTEGER[] NOT NULL,
  transcript_semester_count INTEGER NOT NULL,
  transcript_minimum_subject_count INTEGER NOT NULL,
  mandatory_weighted_subjects TEXT[] NOT NULL,
  minimum_weighted_subject_ratio NUMERIC(3,2) NOT NULL,
  priority_rules JSONB NOT NULL,
  certificate_policy_mode VARCHAR(20) NOT NULL,
  default_ielts_conversion JSONB,
  default_toefl_conversion JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Verification:**
- Run migration
- Table created successfully
- Insert policy-2026 data
- Query returns correct data

---

### 2.3. Implement PostgresPolicyRepository
**Files:**
- Modify `src/repositories/postgres.ts`

**Add:**
```typescript
class PostgresPolicyRepository implements PolicyRepository {
  async getByseason(season: string): Promise<AdmissionPolicy | null>
  async list(): Promise<AdmissionPolicy[]>
  async upsert(policy: AdmissionPolicy): Promise<void>
}
```

**Verification:**
- Unit test: Insert policy, retrieve, verify fields
- Test: List policies returns array
- Test: Upsert updates existing policy

---

### 2.4. Environment-Based Repository Wiring
**Files:**
- Modify `src/repositories/index.ts`

**Logic:**
```typescript
const USE_POSTGRES = !!process.env.DATABASE_URL;
const IS_DEMO = process.env.TROVIO_DEMO === 'true';

if (USE_POSTGRES) {
  // Export PostgreSQL repositories
  export const repositories = {
    users: postgresUserRepository,
    programs: postgresProgramRepository,
    policies: postgresPolicyRepository,
    // ... all PG repos
  };
} else if (IS_DEMO) {
  // Export JSON file repositories (demo/test)
  export const repositories = {
    users: jsonFileUserRepository,
    programs: memoryProgramRepository,  // catalogs still in-memory from src/data
    policies: memoryPolicyRepository,   // load from src/data/admission-policies
    // ... mixed repos
  };
} else {
  throw new Error("Production mode requires DATABASE_URL environment variable");
}
```

**Verification:**
- Test with `DATABASE_URL` set: uses PostgreSQL
- Test with `TROVIO_DEMO=true`, no DATABASE_URL: uses JSON
- Test with neither: throws error
- All existing tests still pass (with TROVIO_DEMO=true)

---

### 2.5. Migration Script for Existing JSON Data
**Files:**
- Create `scripts/migrate-json-to-pg.ts`

**Logic:**
- Read `.data/trovio-db.json`
- Parse users, shares, programs overrides, audit log, etc.
- Insert into PostgreSQL using repositories
- Preserve all IDs and timestamps

**Verification:**
- Run script with test JSON file
- Verify all records migrated
- Verify referential integrity (e.g., wishlist items reference existing programs)

---

### 2.6. Update README & .env.example
**Files:**
- Modify `README.md`
- Modify `.env.example`

**Changes:**
- Document DATABASE_URL requirement for production
- Add migration instructions
- Update deployment section

**Verification:**
- README clear and actionable
- .env.example has commented DATABASE_URL line

---

**Giai đoạn 2 hoàn thành khi:**
- [x] PostgreSQL schema complete (includes policies table)
- [x] All repositories have PostgreSQL implementations
- [x] Repository wiring switches based on env vars
- [x] Migration script tested and documented
- [x] All tests pass with both JSON (demo) and PostgreSQL (test DB)
- [x] Build succeeds
- [x] README updated

**Files created:**
- `scripts/migrate-json-to-pg.ts`
- `tests/postgres-repos.test.ts`

**Files modified:**
- `scripts/migrate-pg.ts`
- `src/repositories/postgres.ts`
- `src/repositories/index.ts`
- `README.md`
- `.env.example`

---

## GIAI ĐOẠN 3: TEACHER VERIFICATION (P0.5)

**Mục tiêu:** Teacher role phải được xác minh trước khi tạo lớp và xem dữ liệu học sinh.

### 3.1. Add Teacher Verification Status to User Schema
**Files:**
- Modify `src/domain/types.ts`
- Modify `scripts/migrate-pg.ts`

**Changes:**
- Add to User type:
  ```typescript
  teacherVerified: boolean;           // Admin approved teacher status
  teacherVerifiedAt: string | null;   // Timestamp of approval
  teacherSchool: string | null;       // School name teacher claims
  teacherProof: string | null;        // Notes on verification evidence
  ```

**Migration:**
```sql
ALTER TABLE users
  ADD COLUMN teacher_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN teacher_verified_at TIMESTAMP,
  ADD COLUMN teacher_school TEXT,
  ADD COLUMN teacher_proof TEXT;
```

**Verification:**
- Migration runs successfully
- TypeScript compiles with new fields

---

### 3.2. Add Teacher Verification Workflow
**Files:**
- Create `src/services/teacher-verification.service.ts`
- Modify `src/services/class.service.ts`

**Logic:**
```typescript
// teacher-verification.service.ts
export const teacherVerificationService = {
  async requestVerification(userId: string, school: string, proof: string): Promise<void>
  async approve(adminId: string, userId: string, note: string): Promise<void>
  async reject(adminId: string, userId: string, reason: string): Promise<void>
  async listPending(): Promise<User[]>
}

// class.service.ts — modify create()
async create(user: PublicUser, input: Record<string, unknown>): Promise<...> {
  if (user.role !== "teacher") return { ok: false, status: 403, message: "..." };
  if (!user.teacherVerified) {
    return { ok: false, status: 403, message: "Tài khoản giáo viên cần được xác minh. Vui lòng gửi yêu cầu xác minh trong Hồ sơ." };
  }
  // ... rest of logic
}
```

**Verification:**
- Test: Unverified teacher cannot create class
- Test: Verified teacher can create class
- Test: Admin can approve/reject verification requests

---

### 3.3. Add Admin UI for Teacher Verification
**Files:**
- Create `src/app/quan-tri/giao-vien/page.tsx`
- Modify admin navigation to include "Xác minh giáo viên"

**UI:**
- List pending teacher verification requests
- Show: user name, email, claimed school, proof notes
- Actions: Approve (with note), Reject (with reason)

**Verification:**
- Manual test: Login as admin
- See pending requests
- Approve one → user.teacherVerified = true
- User can now create classes

---

### 3.4. Add User Profile UI for Verification Request
**Files:**
- Modify `src/app/ho-so/page.tsx` (or equivalent profile page)

**UI:**
- If role = "teacher" and not verified:
  - Show banner: "Tài khoản giáo viên cần xác minh để tạo lớp"
  - Form: School name, upload proof (or text field for email/document reference)
  - Submit → creates verification request

**Verification:**
- User submits request
- Request appears in admin UI
- After approval, banner disappears

---

### 3.5. Update Tests
**Files:**
- Modify `tests/new-features.test.ts` (teacher class tests)

**Changes:**
- Add test: Unverified teacher gets 403 when creating class
- Add test: Verified teacher creates class successfully
- Add test: Admin verification workflow

**Verification:**
- `npm test` passes

---

**Giai đoạn 3 hoàn thành khi:**
- [x] Teacher verification fields in schema
- [x] Verification service implemented
- [x] Class creation blocked for unverified teachers
- [x] Admin UI for verification
- [x] User profile UI for requesting verification
- [x] Tests cover verification workflow
- [x] npm test passes
- [x] Build succeeds

**Files created:**
- `src/services/teacher-verification.service.ts`
- `src/app/quan-tri/giao-vien/page.tsx`
- Migration: `ALTER TABLE users ADD COLUMN ...`

**Files modified:**
- `src/domain/types.ts`
- `src/services/class.service.ts`
- `src/app/ho-so/page.tsx`
- `tests/new-features.test.ts`
- `scripts/migrate-pg.ts`

---

## GIAI ĐOẠN 4: RIASEC NAMING CORRECTION (P0.6)

**Mục tiêu:** Sửa tên sai "Iachan Agreement Index" và làm rõ công thức custom.

### 4.1. Update Code Comments
**Files:**
- Modify `src/services/riasec-match.ts`

**Changes:**
- Remove or clarify "Iachan Agreement Index" claim:
  ```typescript
  /**
   * SERVICE LAYER — so khớp sở thích nghề nghiệp RIASEC (Holland).
   * Áp dụng lý thuyết Lục giác Holland (Hexagon Model).
   * 
   * Công thức tính độ phù hợp là CUSTOM, kết hợp:
   * 1. Điểm phần trăm thực tế của học sinh ở 3 nhóm RIASEC của ngành (trọng số 75%)
   * 2. Độ tương hợp cấu trúc lục giác (hexagonal congruence) giữa mã Holland của học sinh và ngành (trọng số 25%)
   * 3. Điểm thưởng khi trùng mã (bonus points)
   * 
   * Lưu ý: Đây KHÔNG phải là chỉ số Iachan chuẩn trong tài liệu học thuật.
   * Chỉ số Iachan gốc tính toán agreement dựa trên thứ tự mã 3 chữ cái (xem Holland, 1997).
   * Trovio sử dụng công thức custom được điều chỉnh cho bối cảnh định hướng đại học Việt Nam.
   * 
   * References:
   * - Holland, J. L. (1997). Making Vocational Choices (3rd ed.). Psychological Assessment Resources.
   * - Công thức custom: internal design doc.
   */
  ```

**Verification:**
- Comment clear and honest
- No misleading academic claims

---

### 4.2. Update UI Copy (if any)
**Files:**
- Search for "Iachan" in `src/app/**/*.tsx`, `src/components/**/*.tsx`

**Changes:**
- If found: Remove or replace with "độ phù hợp sở thích" or similar
- Ensure no UI claims "standard Iachan index"

**Verification:**
- Grep confirms no "Iachan" in UI code

---

### 4.3. Update README / Documentation
**Files:**
- Modify `README.md`

**Changes:**
- If RIASEC section mentions "Iachan", clarify it's custom formula
- Add note: "Kết quả mang tính tham khảo, dựa trên lý thuyết Holland và công thức tùy chỉnh của Trovio"

**Verification:**
- README accurate

---

**Giai đoạn 4 hoàn thành khi:**
- [x] Code comments corrected
- [x] No misleading "Iachan Index" claims in UI
- [x] README/docs clarify custom formula
- [x] Tests still pass (no functional changes)

**Files modified:**
- `src/services/riasec-match.ts`
- `README.md`
- (Possibly UI files if "Iachan" found)

---

## GIAI ĐOẠN 5: IELTS POLICY & TEACHER TRAINING RULES (P1.1, P1.4)

**Mục tiêu:** IELTS conversion từ policy; teacher training programs chỉ được đặt ở NV 1-5.

### 5.1. Refactor IELTS Conversion to Policy-Based
**Files:**
- Modify `src/services/scoring.service.ts`
- Modify `src/services/policy.service.ts`

**Changes:**
- IELTS table in `scoring.service.ts` becomes default
- `policy.defaultIeltsConversion` can override
- Future: allow per-school override in database (Program table add `ieltsConversionOverride` JSON field)

**Logic:**
```typescript
export async function convertIeltsToSubjectScore(
  ieltsScore: number | string,
  season: string,
  schoolId?: string
): Promise<number> {
  const policy = await policyService.getPolicy(season);
  
  // Check per-school override first (future)
  if (schoolId) {
    const schoolOverride = await getSchoolIeltsPolicy(schoolId);
    if (schoolOverride) return applyConversion(ieltsScore, schoolOverride);
  }
  
  // Use policy default
  const table = policy.defaultIeltsConversion ?? LEGACY_IELTS_TABLE;
  return applyConversion(ieltsScore, table);
}
```

**Verification:**
- Test: IELTS conversion with policy-2026 returns correct values
- Test: Future per-school override (mock data)
- npm test passes

---

### 5.2. Identify Teacher Training Majors
**Files:**
- Modify `src/domain/types.ts`
- Modify `src/data/majors.ts`

**Changes:**
- Add to Major type:
  ```typescript
  isTeacherTraining?: boolean;  // true for sư phạm programs
  ```
- In `majors.ts`, mark teacher training majors:
  ```typescript
  { id: "su-pham-toan", ..., isTeacherTraining: true },
  { id: "su-pham-ly", ..., isTeacherTraining: true },
  // etc.
  ```

**Heuristic:** Majors in groupId "giao-duc" OR name contains "Sư phạm" → `isTeacherTraining: true`

**Verification:**
- Count: ~8-10 teacher training majors marked
- Test: `majors.filter(m => m.isTeacherTraining).length > 0`

---

### 5.3. Enforce Teacher Training Wishlist Rule
**Files:**
- Create `src/services/wishlist-validation.service.ts`
- Modify API route `/api/account/data` (wishlist update endpoint)

**Logic:**
```typescript
export async function validateWishlist(
  items: WishlistItem[],
  season: string
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const policy = await policyService.getPolicy(season);
  const allowedRanks = policy.teacherTrainingAllowedRanks; // [1,2,3,4,5]
  
  const errors: string[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const program = await repositories.programs.findById(items[i].id);
    if (!program) continue;
    
    const major = await repositories.majors.findById(program.majorId);
    if (major?.isTeacherTraining) {
      const rank = i + 1; // 1-indexed
      if (!allowedRanks.includes(rank)) {
        errors.push(`Chương trình "${program.name}" là ngành đào tạo giáo viên, chỉ được đặt ở nguyện vọng ${allowedRanks.join(", ")}. Hiện đang ở NV ${rank}.`);
      }
    }
  }
  
  return errors.length ? { ok: false, errors } : { ok: true };
}
```

**Verification:**
- Test: Teacher training major at NV 6 → validation error
- Test: Teacher training major at NV 3 → validation success
- Test: Non-teacher major at any position → OK
- npm test passes

---

### 5.4. Add UI Warnings
**Files:**
- Modify `src/components/wishlist/` components

**Logic:**
- When user adds teacher training program to wishlist position > 5:
  - Show warning: "Lưu ý: Ngành đào tạo giáo viên chỉ được đặt ở nguyện vọng 1-5 theo quy chế tuyển sinh 2026."
  - Allow saving (with warning) but validation on server blocks invalid lists

**Verification:**
- Manual test: Add teacher training program to NV 7
- Warning appears
- API returns validation error on save

---

**Giai đoạn 5 hoàn thành khi:**
- [x] IELTS conversion policy-based
- [x] Teacher training majors identified (isTeacherTraining flag)
- [x] Wishlist validation service enforces NV 1-5 rule
- [x] API endpoint validates wishlist
- [x] UI shows warnings
- [x] Tests cover validation logic
- [x] npm test passes

**Files created:**
- `src/services/wishlist-validation.service.ts`
- `tests/wishlist-validation.test.ts`

**Files modified:**
- `src/services/scoring.service.ts`
- `src/services/policy.service.ts`
- `src/domain/types.ts`
- `src/data/majors.ts`
- API route handling wishlist updates
- Wishlist UI components

---

## GIAI ĐOẠN 6: DATA QUALITY & SOURCE PROVENANCE (P2.1)

**Mục tiêu:** Audit và cải thiện source provenance cho programs.

### 6.1. Audit Programs Without SourceUrl
**Files:**
- Create `scripts/audit-sources.ts`

**Logic:**
- Parse `src/data/programs.ts`
- Count programs without `sourceUrl`
- Generate report:
  - Total programs: N
  - Programs with sourceUrl: X
  - Programs without sourceUrl: Y
  - Programs with source but URL not https: Z

**Verification:**
- Run script
- Get counts
- Document in baseline report

---

### 6.2. Add Validation in Admin UI
**Files:**
- Modify admin program edit form

**Changes:**
- When admin marks program as "Đã kiểm tra", require:
  - `sourceUrl` (must be https)
  - `sourceCheckedAt` (auto-set to today)
  - `sourceNote` (optional but recommended)

**Verification:**
- Test: Try to mark program verified without sourceUrl → error
- Test: sourceUrl = http://... → error (must be https)
- Test: Valid https sourceUrl → success

---

### 6.3. Add UI Indicators for Provenance
**Files:**
- Modify program display components

**Changes:**
- If `sourceUrl` exists: show "Nguồn chính thức" badge with link
- If `adminVerifiedAt` recent (< 6 months): show "Đã kiểm tra" badge
- If no sourceUrl: show "Chưa có nguồn chính thức" subtle warning

**Verification:**
- Manual test: View program with sourceUrl → badge appears
- View program without sourceUrl → warning appears

---

**Giai đoạn 6 hoàn thành khi:**
- [x] Source audit script run, counts documented
- [x] Admin UI enforces sourceUrl for verification
- [x] UI shows provenance indicators
- [x] Tests pass

**Files created:**
- `scripts/audit-sources.ts`

**Files modified:**
- Admin program edit UI
- Program display components

---

## GIAI ĐOẠN 7: FINAL VERIFICATION & DOCUMENTATION

**Mục tiêu:** Full system test, update docs, prepare for handoff.

### 7.1. Run Full Test Suite
**Commands:**
```bash
npm test                     # All 97+ tests
npm run typecheck            # No TypeScript errors
npm run build                # Production build succeeds
```

**Verification:**
- All tests pass
- No TypeScript errors
- Build clean, no warnings

---

### 7.2. Run E2E Smoke Tests
**Commands:**
```bash
npx next build
TROVIO_DEMO=true DATABASE_URL=postgres://... npx next start -p 3100
# (Or use test PostgreSQL DB)
BASE_URL=http://localhost:3100 node tests/e2e/smoke.mjs
```

**Verification:**
- 114 E2E checks pass
- Critical flows work:
  - Register → verify email → login
  - Take RIASEC quiz
  - Search programs
  - Add to wishlist (max 15 enforced)
  - Teacher creates class (if verified)
  - Chatbot answers with policy references

---

### 7.3. Business Logic Verification Checklist
**Manual tests:**
- [ ] Priority rules use policy-2026 data
- [ ] Wishlist limit = 15 (try adding 16th → error)
- [ ] Teacher training program at NV 7 → validation error
- [ ] IELTS conversion matches policy table
- [ ] Chatbot references quy chế 2026 with URL
- [ ] Timeline shows season from policy
- [ ] Admin can verify teacher accounts
- [ ] School verification badge shows expiry
- [ ] JSON mode (demo) and PostgreSQL mode both work

**Document results in:** `docs/final-verification-report.md`

---

### 7.4. Update Documentation
**Files:**
- Modify `README.md`
- Create `docs/POLICY-ENGINE.md`
- Create `docs/DEPLOYMENT.md`

**Contents:**
- README: Update features list, mention policy engine, PostgreSQL requirement
- POLICY-ENGINE.md: How to update admission policies for new seasons
- DEPLOYMENT.md: 
  - Environment variables
  - Database setup
  - Migration steps
  - Monitoring recommendations

**Verification:**
- Docs are clear and actionable
- Links work

---

### 7.5. Create Final Report
**File:** `docs/REMEDIATION-FINAL-REPORT.md`

**Sections:**
1. Executive Summary
2. What Was Fixed (P0, P1, P2 list with before/after)
3. Test Results (all pass)
4. Verification Evidence (screenshots, test output)
5. Migration Guide (JSON → PostgreSQL)
6. Policy Update Process (for future seasons)
7. Remaining Risks (data quality, scaling, monitoring)
8. Recommendations for Production Deployment

**Verification:**
- Report comprehensive
- Stakeholder-ready

---

**Giai đoạn 7 hoàn thành khi:**
- [x] All tests pass (unit + E2E)
- [x] Business logic verification checklist complete
- [x] Documentation updated
- [x] Final report written
- [x] Codebase ready for production review

**Files created:**
- `docs/POLICY-ENGINE.md`
- `docs/DEPLOYMENT.md`
- `docs/REMEDIATION-FINAL-REPORT.md`
- `docs/final-verification-report.md`

**Files modified:**
- `README.md`

---

## RỦI RO & MITIGATION

### Risk 1: Breaking Changes During Refactor
**Mitigation:** Incremental changes, tests pass after each giai đoạn, Git commits per phase for rollback.

### Risk 2: PostgreSQL Migration Data Loss
**Mitigation:** Test migration script on copy of `.data/trovio-db.json`, verify all records, backup before production migration.

### Risk 3: Policy Updates in Future
**Mitigation:** Policy engine designed for versioning, clear process documented, policy files in `src/data/admission-policies/`.

### Risk 4: Teacher Verification Backlog
**Mitigation:** Admin UI efficient, bulk actions possible, clear rejection reasons to reduce repeat requests.

### Risk 5: IELTS Per-School Overrides Complexity
**Mitigation:** Phase 1 uses policy default (good enough for 90% cases), per-school override is future enhancement with clear schema.

---

## EFFORT ESTIMATE

| Giai đoạn | Estimated Time | Complexity |
|-----------|----------------|------------|
| 1. Policy Engine | 3-4 days | High (design + refactor) |
| 2. PostgreSQL Migration | 2-3 days | Medium (wiring + migration script) |
| 3. Teacher Verification | 2 days | Medium (workflow + UI) |
| 4. RIASEC Naming | 0.5 day | Low (comments + docs) |
| 5. IELTS & Teacher Rules | 1.5 days | Medium (validation logic) |
| 6. Source Provenance | 1 day | Low (audit + UI badges) |
| 7. Verification & Docs | 2-3 days | Medium (thorough testing) |

**Total:** ~12-15 days (2-3 weeks) for 1 senior engineer working focused.

---

## SUCCESS CRITERIA

Remediation is COMPLETE when ALL of the following are true:

### A. Functional Requirements
- [x] Policy engine implemented, policy-2026 loaded
- [x] Priority rules come from policy (no hard-coded constants)
- [x] Wishlist limit = 15 (from policy)
- [x] Teacher training programs validated for NV 1-5
- [x] IELTS conversion policy-based
- [x] Teacher role requires verification
- [x] PostgreSQL wired for production
- [x] JSON mode works for demo/test

### B. Data Quality
- [x] Policy-2026 has official source URL
- [x] Chatbot references quy chế with URL
- [x] FAQ references quy chế 2026
- [x] Programs without sourceUrl identified (audit report exists)
- [x] Admin UI enforces sourceUrl for verification

### C. Testing
- [x] All unit tests pass (97+)
- [x] E2E smoke tests pass (114 checks)
- [x] Business logic verification checklist complete
- [x] No TypeScript errors
- [x] Production build succeeds

### D. Documentation
- [x] README updated (policy engine, PostgreSQL, deployment)
- [x] POLICY-ENGINE.md written
- [x] DEPLOYMENT.md written
- [x] Final remediation report complete

### E. Compliance
- [x] No hard-coded 2026/2027 without policy context
- [x] No hard-coded priority rules without provenance
- [x] No "Iachan Index" false claims
- [x] Teacher role cannot self-verify
- [x] Student data sharing has consent (implicit in class join)

---

## POST-REMEDIATION TASKS (NOT IN SCOPE)

These are recommended but not part of this remediation:

1. **Real-time cutoff data ingestion:** API or admin workflow to import điểm chuẩn from official sources annually
2. **Rate limiter Redis:** Replace in-memory rate limit with Redis for multi-instance scaling
3. **Monitoring & Observability:** Add logging, metrics, alerts for production
4. **Backup strategy:** Automated PostgreSQL backups
5. **Multi-year cutoff analysis:** Enhance "an toàn/vừa sức" logic to consider trend over 3 years
6. **Per-school IELTS overrides:** Database schema + admin UI for school-specific conversion tables
7. **TSA method:** Either implement fully or remove from types
8. **Session storage:** Move to Redis for multi-instance support

---

**Người lập kế hoạch:** Kiro AI Planning Agent  
**Ngày:** 2026-10-11  
**Trạng thái:** READY FOR IMPLEMENTATION
