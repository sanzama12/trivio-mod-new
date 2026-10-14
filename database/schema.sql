-- =====================================================================================================
-- TROVIO — Lược đồ cơ sở dữ liệu quan hệ (PostgreSQL 14+)
-- Chuẩn hoá theo mã nguồn hiện tại: src/domain/types.ts, src/domain/work-style.ts, src/services/*,
-- src/repositories/json-file.ts (DB_VERSION = 8). Mỗi bảng ghi rõ kiểu dữ liệu TypeScript tương ứng.
--
-- Nguyên tắc:
--   • Khoá chính dạng TEXT giữ đúng mã đang dùng trong code (VD 'neu', 'ke-toan', 'neu-ke-toan', 'u-001')
--     để nhập dữ liệu từ bản JSON sang không phải đổi mã. Bảng phát sinh nhiều dùng BIGINT IDENTITY.
--   • Dạng chuẩn 3 (3NF): mảng/đối tượng lồng trong JSON được tách thành bảng con
--     (VD Program.combos → program_combos, Program.cutoffs + altCutoffs → program_cutoffs).
--   • Ràng buộc nghiệp vụ đặt ngay trong CSDL (CHECK, trigger) khớp với kiểm tra ở service:
--     điểm môn 0–10, thang điểm theo phương thức, tối đa 3 nhóm Holland/ngành, MBTI 16 mã…
--   • "Xoá" trường/ngành/chương trình ở trang quản trị là TẠM ẨN (cột hidden), không xoá dòng.
--   • Dữ liệu chỉ để giải thích (mini-test phong cách, MBTI) nằm ở bảng riêng, KHÔNG được công thức gợi ý đọc.
--
-- Chạy:  psql -d trovio -f schema.sql  →  psql -d trovio -f seed-reference.sql  →  psql -d trovio -f seed-catalog.sql
-- =====================================================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS trovio;
SET search_path TO trovio, public;

-- Cập nhật cột updated_at tự động
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- =====================================================================================================
-- 1. DANH MỤC THAM CHIẾU (lookup) — giá trị cố định trong code, nạp bằng seed-reference.sql
-- =====================================================================================================

-- Region = 'bac' | 'trung' | 'nam'  (miền của trường, bộ lọc khu vực)
CREATE TABLE regions (
  code        TEXT PRIMARY KEY CHECK (code IN ('bac', 'trung', 'nam')),
  name        TEXT NOT NULL
);

-- PriorityRegion — khu vực ưu tiên của thí sinh (KHÁC với miền của trường) · PRIORITY_REGION_POINTS
CREATE TABLE priority_regions (
  code        TEXT PRIMARY KEY CHECK (code IN ('KV1', 'KV2-NT', 'KV2', 'KV3')),
  name        TEXT NOT NULL,
  points      NUMERIC(4, 2) NOT NULL CHECK (points BETWEEN 0 AND 1)
);

-- PriorityGroup — nhóm đối tượng ưu tiên · PRIORITY_GROUP_POINTS
CREATE TABLE priority_groups (
  code        TEXT PRIMARY KEY CHECK (code IN ('none', 'UT1', 'UT2')),
  name        TEXT NOT NULL,
  points      NUMERIC(4, 2) NOT NULL CHECK (points BETWEEN 0 AND 2)
);

-- AdmissionMethodKey + ADMISSION_METHODS (thang điểm, hệ số quy đổi ưu tiên)
CREATE TABLE admission_methods (
  code        TEXT PRIMARY KEY CHECK (code IN ('thpt', 'hocba', 'dgnl-hn', 'dgnl-hcm', 'tsa')),
  name        TEXT NOT NULL,
  short_name  TEXT NOT NULL,
  max_score   NUMERIC(7, 2) NOT NULL CHECK (max_score > 0),
  factor      NUMERIC(6, 2) NOT NULL CHECK (factor > 0),        -- hệ số quy đổi điểm ưu tiên & ngưỡng theo thang 30
  decimals    SMALLINT NOT NULL CHECK (decimals BETWEEN 0 AND 2),
  needs_combo BOOLEAN NOT NULL                                    -- true: cần tổ hợp 3 môn (THPT, học bạ)
);

-- Subject (môn học)
CREATE TABLE subjects (
  id          TEXT PRIMARY KEY,                                   -- 'toan', 'ly', 'anh'…
  name        TEXT NOT NULL,
  short_name  TEXT NOT NULL
);

-- Combo (tổ hợp xét tuyển) + Combo.subjects[3]
CREATE TABLE combos (
  code        TEXT PRIMARY KEY CHECK (code ~ '^[A-Z][0-9]{2}$')   -- 'A00', 'D01'…
);

CREATE TABLE combo_subjects (
  combo_code  TEXT NOT NULL REFERENCES combos (code) ON DELETE CASCADE,
  position    SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3),
  subject_id  TEXT NOT NULL REFERENCES subjects (id),
  PRIMARY KEY (combo_code, position),
  UNIQUE (combo_code, subject_id)
);

-- RiasecType + RIASEC_INFO
CREATE TABLE riasec_types (
  code        CHAR(1) PRIMARY KEY CHECK (code IN ('R', 'I', 'A', 'S', 'E', 'C')),
  name_en     TEXT NOT NULL,                                      -- Realistic…
  label       TEXT NOT NULL,                                      -- Thực tế…
  description TEXT NOT NULL,
  position    SMALLINT NOT NULL UNIQUE
);

-- WorkAxis — 4 trục mini-test "Phong cách làm việc" (domain/work-style.ts · AXIS_INFO)
CREATE TABLE work_axes (
  code        TEXT PRIMARY KEY CHECK (code IN ('social', 'stability', 'hands', 'detail')),
  left_label  TEXT NOT NULL,                                      -- cực +1: 'Làm cùng mọi người'…
  right_label TEXT NOT NULL,                                      -- cực −1: 'Làm độc lập'…
  position    SMALLINT NOT NULL UNIQUE
);

-- Vai trò hệ thống (code: User.admin, User.moderator, User.schoolStaff.status = 'approved')
CREATE TABLE system_roles (
  code        TEXT PRIMARY KEY CHECK (code IN ('admin', 'moderator', 'school_staff')),
  name        TEXT NOT NULL,
  description TEXT NOT NULL
);

-- =====================================================================================================
-- 2. DANH MỤC TUYỂN SINH: nhóm ngành, trường, ngành, chương trình (truong_nganh)
-- =====================================================================================================

-- MajorGroup
CREATE TABLE major_groups (
  id          TEXT PRIMARY KEY,                                   -- 'cntt', 'kinh-te'…
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL,
  tone        TEXT NOT NULL CHECK (tone IN ('primary', 'accent', 'success', 'danger', 'pink', 'teal', 'violet', 'slate')),
  position    SMALLINT NOT NULL DEFAULT 0
);

-- School (+ SchoolOverrides/customSchools của bản JSON gộp vào đây)
CREATE TABLE schools (
  id            TEXT PRIMARY KEY,                                 -- 'neu', 'hust'…
  slug          TEXT NOT NULL UNIQUE,
  code          TEXT NOT NULL UNIQUE,                             -- mã trường: 'KHA', 'BKA'…
  name          TEXT NOT NULL,
  short_name    TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('cong-lap', 'tu-thuc', 'quoc-te')),
  region_code   TEXT NOT NULL REFERENCES regions (code),
  city          TEXT NOT NULL,
  founded       SMALLINT CHECK (founded BETWEEN 1800 AND 2100),
  students      INTEGER CHECK (students >= 0),
  highlight     TEXT NOT NULL DEFAULT '',
  website       TEXT NOT NULL DEFAULT '' CHECK (website = '' OR website ~ '^https?://'),
  description   TEXT NOT NULL DEFAULT '',
  scholarships  TEXT NOT NULL DEFAULT '',
  hidden        BOOLEAN NOT NULL DEFAULT false,                   -- quản trị viên tạm ẩn
  is_custom     BOOLEAN NOT NULL DEFAULT false,                   -- do quản trị viên thêm
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX schools_region_idx ON schools (region_code) WHERE NOT hidden;
CREATE TRIGGER schools_touch BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- School.campuses[] (A02 "Trường & Cơ sở")
CREATE TABLE school_campuses (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id   TEXT NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (school_id, name)
);

-- Major
CREATE TABLE majors (
  id          TEXT PRIMARY KEY,                                   -- 'ke-toan'…
  slug        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL CHECK (code ~ '^[0-9]{7}[A-Za-z0-9_]*$'),          -- mã ngành 7 số + hậu tố (A03)
  name        TEXT NOT NULL,
  group_id    TEXT NOT NULL REFERENCES major_groups (id),
  summary     TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  demand      TEXT NOT NULL CHECK (demand IN ('Rất cao', 'Cao', 'Trung bình')),
  growth      NUMERIC(5, 2) NOT NULL DEFAULT 0,                   -- % tăng trưởng nhu cầu/năm
  hidden      BOOLEAN NOT NULL DEFAULT false,                     -- ngành mới = "Chờ duyệt" (ẩn) tới khi duyệt
  is_custom   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX majors_group_idx ON majors (group_id);
CREATE TRIGGER majors_touch BEFORE UPDATE ON majors FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Major.riasec = [3 nhóm Holland] — RIASEC gắn THEO NGÀNH (không theo nhóm ngành)
CREATE TABLE major_riasec (
  major_id    TEXT NOT NULL REFERENCES majors (id) ON DELETE CASCADE,
  rank        SMALLINT NOT NULL CHECK (rank BETWEEN 1 AND 3),
  riasec_code CHAR(1) NOT NULL REFERENCES riasec_types (code),
  PRIMARY KEY (major_id, rank),
  UNIQUE (major_id, riasec_code)
);

-- Major.curriculum[] (CurriculumBlock) và items[]
CREATE TABLE major_curriculum_blocks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  major_id    TEXT NOT NULL REFERENCES majors (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,                                      -- 'Cơ sở ngành', 'Chuyên ngành'
  position    SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE major_curriculum_items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  block_id    BIGINT NOT NULL REFERENCES major_curriculum_blocks (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position    SMALLINT NOT NULL DEFAULT 0
);

-- Major.careers[] (Career)
CREATE TABLE major_careers (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  major_id    TEXT NOT NULL REFERENCES majors (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  salary_text TEXT NOT NULL,                                      -- '15 - 22 triệu/tháng'
  description TEXT NOT NULL DEFAULT '',
  level       TEXT NOT NULL CHECK (level IN ('Quản lý & chiến lược', 'Thực thi & chuyên môn')),
  position    SMALLINT NOT NULL DEFAULT 0
);

-- Program (chương trình đào tạo = ngành × trường; ERD cũ gọi là truong_nganh)
CREATE TABLE programs (
  id                   TEXT PRIMARY KEY,                          -- 'neu-ke-toan'…
  slug                 TEXT NOT NULL UNIQUE,
  school_id            TEXT NOT NULL REFERENCES schools (id),
  major_id             TEXT NOT NULL REFERENCES majors (id),
  name                 TEXT NOT NULL,
  admission_code       TEXT NOT NULL,                             -- mã xét tuyển: 'KT01'…
  training_type        TEXT NOT NULL CHECK (training_type IN ('Chính quy', 'Chất lượng cao', 'Tiên tiến', 'Quốc tế')),
  campus               TEXT NOT NULL DEFAULT '',
  tuition_min          NUMERIC(8, 2) NOT NULL CHECK (tuition_min >= 0), -- triệu đồng/năm
  tuition_max          NUMERIC(8, 2) NOT NULL,
  duration_years       NUMERIC(3, 1) NOT NULL CHECK (duration_years BETWEEN 1 AND 8),
  quota                INTEGER NOT NULL CHECK (quota >= 0),       -- chỉ tiêu
  competition          TEXT NOT NULL CHECK (competition IN ('Cao', 'Trung bình', 'Thấp')),
  overview             TEXT NOT NULL DEFAULT '',
  data_updated         TEXT NOT NULL CHECK (data_updated ~ '^[0-9]{4}-[0-9]{2}$'), -- Program.updatedAt 'YYYY-MM'
  source               TEXT NOT NULL DEFAULT '',                  -- mô tả nguồn
  source_url           TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  source_checked_at    DATE,
  source_note          TEXT,
  admin_verified_at    DATE,                                      -- A05 "Xác minh hàng loạt"
  school_verified_at   DATE,                                      -- trường xác nhận (hiệu lực 12 tháng)
  school_verified_note TEXT,
  hidden               BOOLEAN NOT NULL DEFAULT false,
  is_custom            BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (tuition_max >= tuition_min),
  UNIQUE (school_id, admission_code)
);
CREATE INDEX programs_school_idx ON programs (school_id) WHERE NOT hidden;
CREATE INDEX programs_major_idx ON programs (major_id) WHERE NOT hidden;
CREATE TRIGGER programs_touch BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Program.combos[] — tổ hợp chương trình xét
CREATE TABLE program_combos (
  program_id  TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  combo_code  TEXT NOT NULL REFERENCES combos (code),
  PRIMARY KEY (program_id, combo_code)
);

-- Program.methods[] (AdmissionMethod) — phương thức xét tuyển hiển thị ở trang chương trình
CREATE TABLE program_admission_methods (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_id  TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  method_code TEXT REFERENCES admission_methods (code),            -- NULL = phương thức khác (xét tuyển thẳng, chứng chỉ…)
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  requirement TEXT NOT NULL DEFAULT '',
  tag         TEXT NOT NULL DEFAULT '',
  position    SMALLINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX program_admission_methods_uq ON program_admission_methods (program_id, method_code) WHERE method_code IS NOT NULL;

-- Program.cutoffs[] (THPT, nhiều năm) + Program.altCutoffs[] (học bạ/ĐGNL) — gộp một bảng theo phương thức
CREATE TABLE program_cutoffs (
  program_id   TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  method_code  TEXT NOT NULL REFERENCES admission_methods (code),
  year         SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  score        NUMERIC(7, 2) NOT NULL CHECK (score > 0),
  is_estimated BOOLEAN NOT NULL DEFAULT false,                    -- MethodCutoff.estimated: số ước tính, chưa phải trường công bố
  PRIMARY KEY (program_id, method_code, year)
);
CREATE INDEX program_cutoffs_year_idx ON program_cutoffs (method_code, year);

-- Điểm chuẩn không vượt thang của phương thức (30 / 150 / 1200)
CREATE OR REPLACE FUNCTION check_cutoff_scale() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m NUMERIC;
BEGIN
  SELECT max_score INTO m FROM admission_methods WHERE code = NEW.method_code;
  IF NEW.score > m THEN
    RAISE EXCEPTION 'Điểm chuẩn % vượt thang % của phương thức %', NEW.score, m, NEW.method_code;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER program_cutoffs_scale BEFORE INSERT OR UPDATE ON program_cutoffs FOR EACH ROW EXECUTE FUNCTION check_cutoff_scale();

-- Program.verifiedFields — trường xác nhận từng nhóm số liệu trên Cổng trường
CREATE TABLE program_verified_fields (
  program_id  TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  field       TEXT NOT NULL CHECK (field IN ('cutoff', 'tuition', 'quota', 'combos')),
  verified_at DATE NOT NULL,
  PRIMARY KEY (program_id, field)
);

-- =====================================================================================================
-- 3. TÀI KHOẢN & PHÂN QUYỀN
-- =====================================================================================================

-- User (mật khẩu chỉ lưu băm scrypt; OTP email lưu băm)
CREATE TABLE users (
  id                 TEXT PRIMARY KEY,
  email              TEXT NOT NULL CHECK (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name               TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  avatar_url         TEXT,
  password_hash      TEXT,                                        -- NULL khi chỉ đăng nhập Google
  google_id          TEXT UNIQUE,
  verified           BOOLEAN NOT NULL DEFAULT false,              -- đã xác thực email
  locked             BOOLEAN NOT NULL DEFAULT false,              -- khoá do sai mật khẩu 5 lần
  disabled           BOOLEAN NOT NULL DEFAULT false,              -- quản trị viên khoá (A08)
  failed_attempts    SMALLINT NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  session_version    INTEGER NOT NULL DEFAULT 0,                  -- tăng lên → đăng xuất mọi thiết bị
  email_otp_hash     TEXT,
  email_otp_expires  TIMESTAMPTZ,
  -- Hồ sơ onboarding (đều tuỳ chọn). Không thu giới tính / ngày sinh.
  user_role          TEXT CHECK (user_role IN ('student', 'parent', 'teacher', 'school')),
  grad_year          SMALLINT CHECK (grad_year BETWEEN 2000 AND 2100),
  province           TEXT,
  under16            BOOLEAN NOT NULL DEFAULT false,
  parent_consent     BOOLEAN NOT NULL DEFAULT false,
  onboarded          BOOLEAN NOT NULL DEFAULT false,
  email_reminders    BOOLEAN NOT NULL DEFAULT false,              -- nhận email nhắc hạn
  survey_opt_in      BOOLEAN NOT NULL DEFAULT false,              -- C4: đồng ý khảo sát sau 1 năm
  survey_opt_in_at   TIMESTAMPTZ,
  survey_invited_at  TIMESTAMPTZ,
  last_login_at      TIMESTAMPTZ,
  data_updated_at    TIMESTAMPTZ,                                 -- UserData.updatedAt (đồng bộ đa thiết bị)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT under16 OR parent_consent)
);
CREATE UNIQUE INDEX users_email_uq ON users (email);

-- Vai trò hệ thống của tài khoản (admin, moderator). Cán bộ tuyển sinh dùng bảng school_staff.
CREATE TABLE user_system_roles (
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_code   TEXT NOT NULL REFERENCES system_roles (code),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by  TEXT REFERENCES users (id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_code)
);

-- User.schoolStaff — cán bộ tuyển sinh (C5 Cổng trường), quản trị viên duyệt
CREATE TABLE school_staff (
  user_id      TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  school_id    TEXT NOT NULL REFERENCES schools (id),
  status       TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  TEXT REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX school_staff_school_idx ON school_staff (school_id) WHERE status = 'approved';

-- Phiên đăng nhập (cookie phiên ký HMAC; bảng này dùng khi chuyển sang lưu phiên phía server)
CREATE TABLE user_sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,                                   -- phải bằng users.session_version
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,                               -- SESSION_MAX_AGE = 7 ngày
  CHECK (expires_at > created_at)
);
CREATE INDEX user_sessions_user_idx ON user_sessions (user_id);

-- =====================================================================================================
-- 4. DỮ LIỆU CÁ NHÂN ĐỒNG BỘ THEO TÀI KHOẢN (UserData) — khách lưu localStorage, đăng nhập thì gộp vào đây
-- =====================================================================================================

-- StoredProfile (ScoreProfile + AdmissionScore) — hồ sơ điểm, 1 bản/tài khoản
CREATE TABLE score_profiles (
  user_id          TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  method_code      TEXT NOT NULL DEFAULT 'thpt' REFERENCES admission_methods (code),
  combo_code       TEXT REFERENCES combos (code),                 -- NULL với ĐGNL
  priority_region  TEXT NOT NULL REFERENCES priority_regions (code),
  priority_group   TEXT NOT NULL REFERENCES priority_groups (code),
  budget_max       NUMERIC(8, 2) CHECK (budget_max > 0),          -- triệu/năm, NULL = không giới hạn
  -- AdmissionScore (kết quả tính, lưu lại để so sánh nhanh)
  raw_total        NUMERIC(7, 2) NOT NULL CHECK (raw_total >= 0),
  priority_points  NUMERIC(6, 2) NOT NULL CHECK (priority_points >= 0),
  priority_applied NUMERIC(6, 2) NOT NULL CHECK (priority_applied >= 0),
  total            NUMERIC(7, 2) NOT NULL CHECK (total >= 0),
  reduced          BOOLEAN NOT NULL,                              -- tổng ≥ 22,5 → điểm ưu tiên giảm dần
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (total <= raw_total + priority_points)
);

-- ScoreProfile.scores — điểm từng môn (thang 10)
CREATE TABLE score_profile_subjects (
  user_id     TEXT NOT NULL REFERENCES score_profiles (user_id) ON DELETE CASCADE,
  subject_id  TEXT NOT NULL REFERENCES subjects (id),
  score       NUMERIC(4, 2) NOT NULL CHECK (score BETWEEN 0 AND 10),
  PRIMARY KEY (user_id, subject_id)
);

-- ScoreProfile.regions[] / schoolTypes[] / groupIds[] — điều kiện tìm kiếm đã lưu
CREATE TABLE score_profile_regions (
  user_id     TEXT NOT NULL REFERENCES score_profiles (user_id) ON DELETE CASCADE,
  region_code TEXT NOT NULL REFERENCES regions (code),
  PRIMARY KEY (user_id, region_code)
);

CREATE TABLE score_profile_school_types (
  user_id     TEXT NOT NULL REFERENCES score_profiles (user_id) ON DELETE CASCADE,
  school_type TEXT NOT NULL CHECK (school_type IN ('cong-lap', 'tu-thuc', 'quoc-te')),
  PRIMARY KEY (user_id, school_type)
);

CREATE TABLE score_profile_major_groups (
  user_id     TEXT NOT NULL REFERENCES score_profiles (user_id) ON DELETE CASCADE,
  group_id    TEXT NOT NULL REFERENCES major_groups (id),
  PRIMARY KEY (user_id, group_id)
);

-- UserData.saved[] — chương trình đã lưu (tối đa 200, có thứ tự)
CREATE TABLE saved_programs (
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  program_id  TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  position    SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 199),
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id),
  UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- UserData.wishlist[] (WishlistItem) — nguyện vọng dự kiến, thứ tự = thứ tự nguyện vọng (tối đa 50)
-- Mục nguyện vọng luôn nằm trong danh sách đã lưu (mergeUserData) → khoá ngoại tới saved_programs.
CREATE TABLE wishlist_items (
  user_id     TEXT NOT NULL,
  program_id  TEXT NOT NULL,
  position    SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 49),
  note        VARCHAR(300) NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, program_id),
  UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (user_id, program_id) REFERENCES saved_programs (user_id, program_id) ON DELETE CASCADE
);

-- StoredQuiz (RiasecResult) — kết quả RIASEC mới nhất của tài khoản
CREATE TABLE quiz_results (
  user_id           TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  code_1            CHAR(1) NOT NULL REFERENCES riasec_types (code),
  code_2            CHAR(1) NOT NULL REFERENCES riasec_types (code),
  code_3            CHAR(1) NOT NULL REFERENCES riasec_types (code),
  answered          SMALLINT NOT NULL CHECK (answered BETWEEN 1 AND 200),
  completed_at      TIMESTAMPTZ NOT NULL,
  saved_to_profile  BOOLEAN NOT NULL DEFAULT false,
  CHECK (code_1 <> code_2 AND code_1 <> code_3 AND code_2 <> code_3)
);

-- RiasecResult.percents + ranking — % từng nhóm và thứ hạng 1–6
CREATE TABLE quiz_result_scores (
  user_id     TEXT NOT NULL REFERENCES quiz_results (user_id) ON DELETE CASCADE,
  riasec_code CHAR(1) NOT NULL REFERENCES riasec_types (code),
  percent     SMALLINT NOT NULL CHECK (percent BETWEEN 0 AND 100),
  rank        SMALLINT NOT NULL CHECK (rank BETWEEN 1 AND 6),
  PRIMARY KEY (user_id, riasec_code),
  UNIQUE (user_id, rank)
);

-- Goal — mục tiêu đặt qua hội thoại (/muc-tieu)
CREATE TABLE goals (
  user_id        TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  major_id       TEXT REFERENCES majors (id) ON DELETE SET NULL,
  method_code    TEXT NOT NULL DEFAULT 'thpt' REFERENCES admission_methods (code),
  combo_code     TEXT REFERENCES combos (code),
  target_score   NUMERIC(7, 2) CHECK (target_score > 0),
  ref_program_id TEXT REFERENCES programs (id) ON DELETE SET NULL,
  budget_max     NUMERIC(8, 2) CHECK (budget_max > 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE goal_regions (
  user_id     TEXT NOT NULL REFERENCES goals (user_id) ON DELETE CASCADE,
  region_code TEXT NOT NULL REFERENCES regions (code),
  PRIMARY KEY (user_id, region_code)
);

-- StoredWorkStyle — mini-test phong cách làm việc (CHỈ để giải thích, không tính điểm gợi ý)
CREATE TABLE work_styles (
  user_id       TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  social        SMALLINT NOT NULL CHECK (social IN (-3, -1, 1, 3)),
  stability     SMALLINT NOT NULL CHECK (stability IN (-3, -1, 1, 3)),
  hands         SMALLINT NOT NULL CHECK (hands IN (-3, -1, 1, 3)),
  detail        SMALLINT NOT NULL CHECK (detail IN (-3, -1, 1, 3)),
  completed_at  TIMESTAMPTZ NOT NULL
);

-- StoredMbti — mã MBTI học sinh tự nhập (góc nhìn tham khảo, không tính điểm)
CREATE TABLE mbti_codes (
  user_id     TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  code        CHAR(4) NOT NULL CHECK (code ~ '^[EI][SN][TF][JP]$'),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================================================
-- 5. TRẮC NGHIỆM RIASEC & MINI-TEST (ngân hàng câu hỏi + cấu hình quản trị A06)
-- =====================================================================================================

-- RiasecQuestion (60 câu gốc + câu quản trị viên thêm; QuizConfig.overrides gộp thẳng vào dòng)
CREATE TABLE riasec_questions (
  id          INTEGER PRIMARY KEY,                                -- id gốc 1–60 giữ nguyên để bài làm dở không hỏng
  riasec_code CHAR(1) NOT NULL REFERENCES riasec_types (code),
  text        TEXT NOT NULL CHECK (length(text) BETWEEN 5 AND 200),
  position    SMALLINT NOT NULL,
  hidden      BOOLEAN NOT NULL DEFAULT false,
  is_custom   BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (riasec_code, position)
);
CREATE TRIGGER riasec_questions_touch BEFORE UPDATE ON riasec_questions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- QuizConfig.typeWeights — trọng số nhóm 0,5–2,0 dùng trong gợi ý
CREATE TABLE riasec_type_weights (
  riasec_code CHAR(1) PRIMARY KEY REFERENCES riasec_types (code),
  weight      NUMERIC(3, 1) NOT NULL DEFAULT 1.0 CHECK (weight BETWEEN 0.5 AND 2.0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WORK_STYLE_QUESTIONS — 12 tình huống chọn 1 trong 2 (A = cực trái +1, B = cực phải −1)
CREATE TABLE work_style_questions (
  id          TEXT PRIMARY KEY,                                   -- 'so1', 'st1'…
  axis_code   TEXT NOT NULL REFERENCES work_axes (code),
  prompt      TEXT NOT NULL,
  option_a    TEXT NOT NULL,
  option_b    TEXT NOT NULL,
  flip        BOOLEAN NOT NULL DEFAULT false,                     -- hiển thị B trước A
  position    SMALLINT NOT NULL UNIQUE
);

-- GROUP_STYLE / MAJOR_STYLE — xu hướng phong cách của nhóm ngành / ngành (1–3 trục rõ ràng)
CREATE TABLE major_group_work_styles (
  group_id    TEXT NOT NULL REFERENCES major_groups (id) ON DELETE CASCADE,
  axis_code   TEXT NOT NULL REFERENCES work_axes (code),
  pole        SMALLINT NOT NULL CHECK (pole IN (-1, 1)),
  PRIMARY KEY (group_id, axis_code)
);

CREATE TABLE major_work_styles (
  major_id    TEXT NOT NULL REFERENCES majors (id) ON DELETE CASCADE,
  axis_code   TEXT NOT NULL REFERENCES work_axes (code),
  pole        SMALLINT NOT NULL CHECK (pole IN (-1, 1)),
  PRIMARY KEY (major_id, axis_code)
);

-- =====================================================================================================
-- 6. CẤU HÌNH GỢI Ý (A09 Quy tắc gợi ý)
-- =====================================================================================================

-- RecommendConfig.weights — 4 tiêu chí, tổng = 1 (mặc định 0,45 / 0,35 / 0,10 / 0,10)
CREATE TABLE recommend_weights (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),       -- bảng 1 dòng
  interest    NUMERIC(3, 2) NOT NULL CHECK (interest BETWEEN 0 AND 1),
  fit         NUMERIC(3, 2) NOT NULL CHECK (fit BETWEEN 0 AND 1),
  place       NUMERIC(3, 2) NOT NULL CHECK (place BETWEEN 0 AND 1),
  group_match NUMERIC(3, 2) NOT NULL CHECK (group_match BETWEEN 0 AND 1),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT REFERENCES users (id) ON DELETE SET NULL,
  CHECK (interest + fit + place + group_match = 1.00)
);

-- RecRule
CREATE TABLE recommend_rules (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('riasec-match', 'budget', 'diversity', 'goal-priority', 'min-years', 'boost-cutoff', 'boost-school-type')),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version     TEXT NOT NULL DEFAULT '1.0',
  status      TEXT NOT NULL CHECK (status IN ('active', 'draft', 'disabled')),
  builtin     BOOLEAN NOT NULL DEFAULT false,
  position    SMALLINT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RecRule.params (Record<string, number | string>)
CREATE TABLE recommend_rule_params (
  rule_id     TEXT NOT NULL REFERENCES recommend_rules (id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  PRIMARY KEY (rule_id, key)
);

-- =====================================================================================================
-- 7. VIỆC LÀM & THU NHẬP — mọi con số gắn với một nguồn
-- =====================================================================================================

-- DataSource (nguồn gốc + nguồn quản trị viên thêm)
CREATE TABLE data_sources (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  publisher   TEXT NOT NULL,
  year        SMALLINT NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  url         TEXT CHECK (url IS NULL OR url ~ '^https?://'),
  kind        TEXT NOT NULL CHECK (kind IN ('van-ban', 'thong-ke', 'khao-sat-truong', 'bao-chi', 'khao-sat-doanh-nghiep', 'minh-hoa')),
  trust       TEXT NOT NULL CHECK (trust IN ('cao', 'trung-binh', 'tham-khao', 'minh-hoa')),
  note        TEXT NOT NULL DEFAULT '',
  accessed_at DATE NOT NULL,
  is_custom   BOOLEAN NOT NULL DEFAULT false
);

-- MajorOutcome (employmentRate / startingSalary / experiencedSalary) — mỗi chỉ số một dòng (OutcomeMetric)
CREATE TABLE major_outcomes (
  major_id    TEXT NOT NULL REFERENCES majors (id) ON DELETE CASCADE,
  metric      TEXT NOT NULL CHECK (metric IN ('employment_rate', 'starting_salary', 'experienced_salary')),
  value       NUMERIC(8, 2) NOT NULL CHECK (value >= 0),         -- % hoặc triệu/tháng
  low         NUMERIC(8, 2),
  high        NUMERIC(8, 2),
  year        SMALLINT NOT NULL,
  source_id   TEXT NOT NULL REFERENCES data_sources (id),
  sample_size INTEGER CHECK (sample_size > 0),
  note        TEXT,
  data_updated TEXT NOT NULL CHECK (data_updated ~ '^[0-9]{4}-[0-9]{2}$'),
  PRIMARY KEY (major_id, metric),
  CHECK (metric <> 'employment_rate' OR value <= 100),
  CHECK (low IS NULL OR high IS NULL OR low <= high)
);

-- SchoolOutcome
CREATE TABLE school_outcomes (
  school_id              TEXT PRIMARY KEY REFERENCES schools (id) ON DELETE CASCADE,
  employment_rate        NUMERIC(5, 2) CHECK (employment_rate BETWEEN 0 AND 100),
  employment_year        SMALLINT,
  employment_source_id   TEXT REFERENCES data_sources (id),
  employment_sample_size INTEGER,
  employment_note        TEXT,
  salary_note            TEXT,
  salary_year            SMALLINT,
  salary_source_id       TEXT REFERENCES data_sources (id),
  cohort                 TEXT,
  CHECK ((employment_rate IS NULL) = (employment_source_id IS NULL))
);

-- Benchmark (mốc so sánh: thu nhập bình quân cả nước…)
CREATE TABLE benchmarks (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  value       NUMERIC(10, 2) NOT NULL,
  unit        TEXT NOT NULL,
  year        SMALLINT NOT NULL,
  source_id   TEXT NOT NULL REFERENCES data_sources (id)
);

-- =====================================================================================================
-- 8. MỐC TUYỂN SINH & NHẮC HẠN
-- =====================================================================================================

-- TimelineConfig (1 mùa đang áp dụng)
CREATE TABLE timeline_config (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  season      TEXT NOT NULL,                                      -- '2027'
  official    BOOLEAN NOT NULL DEFAULT false,                     -- lịch chính thức của Bộ hay minh hoạ
  source_url  TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  note        TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT REFERENCES users (id) ON DELETE SET NULL
);

-- TimelineEvent
CREATE TABLE timeline_events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE,
  category    TEXT NOT NULL CHECK (category IN ('thi', 'dang-ky', 'ket-qua', 'nhap-hoc', 'dgnl')),
  description TEXT NOT NULL DEFAULT '',
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX timeline_events_start_idx ON timeline_events (start_date);

-- UserData.reminders[] — mốc học sinh bật "Nhắc tôi" (tối đa 50)
CREATE TABLE deadline_reminders (
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  event_id    TEXT NOT NULL REFERENCES timeline_events (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

-- reminderLog — chống gửi trùng email nhắc hạn (khoá 'user|event|ngày')
CREATE TABLE reminder_log (
  key         TEXT PRIMARY KEY,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================================================
-- 9. CỘNG ĐỒNG: cảm nhận sinh viên, hỏi đáp, khảo sát sau 1 năm
-- =====================================================================================================

-- SchoolReview (kiểm duyệt trước khi hiển thị)
CREATE TABLE school_reviews (
  id                 TEXT PRIMARY KEY,
  school_id          TEXT NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  user_id            TEXT REFERENCES users (id) ON DELETE CASCADE,         -- xoá tài khoản = xoá cảm nhận đã viết (jsonUserRepository.delete)
  author_name        TEXT NOT NULL,
  anonymous          BOOLEAN NOT NULL DEFAULT false,
  relation           TEXT NOT NULL CHECK (relation IN ('sinh-vien', 'cuu-sinh-vien')),
  cohort             SMALLINT CHECK (cohort BETWEEN 1990 AND 2100),
  major_id           TEXT REFERENCES majors (id) ON DELETE SET NULL,
  rating_teaching    SMALLINT NOT NULL CHECK (rating_teaching BETWEEN 1 AND 5),
  rating_facilities  SMALLINT NOT NULL CHECK (rating_facilities BETWEEN 1 AND 5),
  rating_activities  SMALLINT NOT NULL CHECK (rating_activities BETWEEN 1 AND 5),
  rating_career      SMALLINT NOT NULL CHECK (rating_career BETWEEN 1 AND 5),
  title              TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 120),
  content            TEXT NOT NULL CHECK (length(content) BETWEEN 20 AND 3000),
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  reject_reason      TEXT,
  school_email       BOOLEAN NOT NULL DEFAULT false,              -- xác thực bằng email trường
  is_demo            BOOLEAN NOT NULL DEFAULT false,              -- dữ liệu minh hoạ
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  moderated_at       TIMESTAMPTZ,
  moderated_by       TEXT REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX school_reviews_school_idx ON school_reviews (school_id, status);
CREATE TRIGGER school_reviews_touch BEFORE UPDATE ON school_reviews FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- SchoolReview.flags[] — cờ tự động (thông tin liên hệ, quảng cáo, ngôn từ…)
CREATE TABLE review_flags (
  review_id   TEXT NOT NULL REFERENCES school_reviews (id) ON DELETE CASCADE,
  flag        TEXT NOT NULL,
  PRIMARY KEY (review_id, flag)
);

-- SchoolReview.helpful[] — mỗi tài khoản bấm "Hữu ích" 1 lần
CREATE TABLE review_helpful_votes (
  review_id   TEXT NOT NULL REFERENCES school_reviews (id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  voted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

-- SchoolReview.reports[] — 3 tài khoản báo cáo → tự ẩn chờ duyệt lại
CREATE TABLE review_reports (
  review_id   TEXT NOT NULL REFERENCES school_reviews (id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

-- QaQuestion — hỏi đáp sinh viên theo chương trình
CREATE TABLE qa_questions (
  id          TEXT PRIMARY KEY,
  program_id  TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users (id) ON DELETE SET NULL,
  text        TEXT NOT NULL CHECK (length(text) BETWEEN 10 AND 500),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_demo     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX qa_questions_program_idx ON qa_questions (program_id, status);

-- QaAnswer — sinh viên trả lời (xác thực bằng email đuôi trường)
CREATE TABLE qa_answers (
  id            TEXT PRIMARY KEY,
  question_id   TEXT NOT NULL REFERENCES qa_questions (id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  school_domain TEXT NOT NULL,                                    -- 'st.neu.edu.vn'
  text          TEXT NOT NULL CHECK (length(text) BETWEEN 10 AND 1500),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE qa_answer_helpful_votes (
  answer_id   TEXT NOT NULL REFERENCES qa_answers (id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (answer_id, user_id)
);

CREATE TABLE qa_answer_reports (
  answer_id   TEXT NOT NULL REFERENCES qa_answers (id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (answer_id, user_id)
);

-- OutcomeSurvey — C4 khảo sát sau 1 năm học
CREATE TABLE outcome_surveys (
  id                   TEXT PRIMARY KEY,
  program_id           TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  user_id              TEXT REFERENCES users (id) ON DELETE SET NULL,
  satisfaction         SMALLINT NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  choose_again         TEXT NOT NULL CHECK (choose_again IN ('yes', 'no', 'unsure')),
  choose_school_again  TEXT CHECK (choose_school_again IN ('yes', 'no', 'unsure')),
  trovio_right         TEXT NOT NULL CHECK (trovio_right IN ('yes', 'no', 'unsure')),
  wish                 TEXT NOT NULL DEFAULT '',
  cohort               SMALLINT NOT NULL,
  is_demo              BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================================================
-- 10. CHIA SẺ VỚI PHỤ HUYNH & LỚP CỦA GIÁO VIÊN
-- =====================================================================================================

-- Share — link chỉ xem (id ngẫu nhiên 144 bit là phần bí mật trên URL)
CREATE TABLE shares (
  id          TEXT PRIMARY KEY CHECK (length(id) >= 24),
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  show_notes  BOOLEAN NOT NULL DEFAULT true,
  show_score  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);
CREATE INDEX shares_user_idx ON shares (user_id);

-- ShareComment — phụ huynh góp ý (tối đa 30/link)
CREATE TABLE share_comments (
  id          TEXT PRIMARY KEY,
  share_id    TEXT NOT NULL REFERENCES shares (id) ON DELETE CASCADE,
  owner_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        VARCHAR(40) NOT NULL,
  message     VARCHAR(500) NOT NULL,
  program_id  TEXT REFERENCES programs (id) ON DELETE SET NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TeacherClass — C1 kênh giáo viên
CREATE TABLE teacher_classes (
  id             TEXT PRIMARY KEY,
  teacher_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  school_name    TEXT NOT NULL,
  code           TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6}$'), -- mã lớp, VD 'DEMO12'
  last_remind_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TeacherClass.memberIds[] + memberRemindAt — học sinh trong lớp
CREATE TABLE class_members (
  class_id    TEXT NOT NULL REFERENCES teacher_classes (id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reminded_at TIMESTAMPTZ,                                        -- "Gửi nhắc" riêng (1 lần/24 giờ)
  PRIMARY KEY (class_id, user_id)
);

-- =====================================================================================================
-- 11. VẬN HÀNH & QUẢN TRỊ: báo lỗi, thông báo, nhật ký, nhập liệu, cổng trường, chatbot, thống kê
-- =====================================================================================================

-- DataReport — "Báo dữ liệu sai"
CREATE TABLE data_reports (
  id          TEXT PRIMARY KEY,
  program_id  TEXT REFERENCES programs (id) ON DELETE SET NULL,
  page        TEXT NOT NULL,
  topic       TEXT NOT NULL CHECK (topic IN ('diem-chuan', 'hoc-phi', 'chi-tieu', 'to-hop', 'thong-tin-truong', 'khac')),
  detail      TEXT NOT NULL CHECK (length(detail) BETWEEN 10 AND 2000),
  email       TEXT,
  user_id     TEXT REFERENCES users (id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'moi' CHECK (status IN ('moi', 'dang-xu-ly', 'da-xu-ly', 'khong-hop-le')),
  admin_note  TEXT,
  handled_by  TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX data_reports_status_idx ON data_reports (status, created_at DESC);
CREATE TRIGGER data_reports_touch BEFORE UPDATE ON data_reports FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- AppNotification — chuông thông báo
CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('review-approved', 'review-rejected', 'report-update', 'reminder', 'supplementary', 'class-reminder', 'qa-answer', 'survey-invite', 'school-submission')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  href        TEXT CHECK (href IS NULL OR href ~ '^/'),           -- chỉ đường dẫn nội bộ
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, is_read, created_at DESC);

-- AuditEntry — nhật ký thay đổi (ai, lúc nào, đối tượng nào, trước → sau)
CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    TEXT REFERENCES users (id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,                                      -- giữ lại kể cả khi tài khoản bị xoá
  target_type TEXT NOT NULL DEFAULT 'program' CHECK (target_type IN ('program', 'major-outcome', 'source', 'review', 'report', 'timeline', 'chat-alias', 'school', 'major', 'quiz', 'rules', 'import', 'user', 'school-submission')),
  target_id   TEXT NOT NULL,                                      -- AuditEntry.programId (id đối tượng)
  action      TEXT NOT NULL CHECK (action IN ('update', 'verify', 'reset', 'approve', 'reject', 'delete', 'create'))
);
CREATE INDEX audit_logs_target_idx ON audit_logs (target_type, target_id, at DESC);
CREATE INDEX audit_logs_at_idx ON audit_logs (at DESC);

-- AuditEntry.changes[]
CREATE TABLE audit_changes (
  audit_id     TEXT NOT NULL REFERENCES audit_logs (id) ON DELETE CASCADE,
  position     SMALLINT NOT NULL,
  field        TEXT NOT NULL,
  before_value TEXT NOT NULL DEFAULT '',
  after_value  TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (audit_id, position)
);

-- ImportBatch — A07 lô nhập CSV/XLSX
CREATE TABLE import_batches (
  id          TEXT PRIMARY KEY,
  file_name   TEXT NOT NULL,
  by_id       TEXT REFERENCES users (id) ON DELETE SET NULL,
  by_name     TEXT NOT NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_rows  INTEGER NOT NULL CHECK (valid_rows >= 0),
  error_rows  INTEGER NOT NULL CHECK (error_rows >= 0),
  warning_rows INTEGER NOT NULL CHECK (warning_rows >= 0),
  created_rows INTEGER NOT NULL CHECK (created_rows >= 0),
  updated_rows INTEGER NOT NULL CHECK (updated_rows >= 0)
);

-- SchoolSubmission — bản sửa cán bộ tuyển sinh gửi, quản trị viên duyệt
CREATE TABLE school_submissions (
  id           TEXT PRIMARY KEY,
  school_id    TEXT NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  program_id   TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  field        TEXT NOT NULL CHECK (field IN ('cutoff', 'tuition', 'quota', 'combos')),
  current_value TEXT NOT NULL,
  proposed_value TEXT NOT NULL,
  evidence_url TEXT NOT NULL CHECK (evidence_url ~ '^https://'),
  note         TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  TEXT REFERENCES users (id) ON DELETE SET NULL,
  CHECK ((status = 'pending') = (resolved_at IS NULL))
);
CREATE INDEX school_submissions_pending_idx ON school_submissions (status, created_at) WHERE status = 'pending';

-- ChatAlias — từ khoá chatbot do quản trị viên thêm (trỏ tới ngành hoặc trường)
CREATE TABLE chat_aliases (
  id          TEXT PRIMARY KEY,
  alias       TEXT NOT NULL,
  label       TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('major', 'school')),
  target_id   TEXT NOT NULL,                                      -- majors.id hoặc schools.id (kiểm tra bằng trigger)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT REFERENCES users (id) ON DELETE SET NULL,
  UNIQUE (alias)
);

CREATE OR REPLACE FUNCTION check_chat_alias_target() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind = 'major' AND NOT EXISTS (SELECT 1 FROM majors WHERE id = NEW.target_id) THEN
    RAISE EXCEPTION 'Ngành % không tồn tại', NEW.target_id;
  ELSIF NEW.kind = 'school' AND NOT EXISTS (SELECT 1 FROM schools WHERE id = NEW.target_id) THEN
    RAISE EXCEPTION 'Trường % không tồn tại', NEW.target_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER chat_aliases_target BEFORE INSERT OR UPDATE ON chat_aliases FOR EACH ROW EXECUTE FUNCTION check_chat_alias_target();

-- ChatLog — câu hỏi trợ lý (không lưu tài khoản)
CREATE TABLE chat_logs (
  id          TEXT PRIMARY KEY,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  question    VARCHAR(500) NOT NULL,
  intent      TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('answer', 'refusal', 'clarify', 'unknown')),
  helpful     BOOLEAN
);
CREATE INDEX chat_logs_at_idx ON chat_logs (at DESC);

-- analytics — phễu hành vi ẩn danh: mỗi mã trình duyệt tính 1 lần/sự kiện/ngày, tự xoá sau 180 ngày
CREATE TABLE analytics_events (
  day         DATE NOT NULL,
  event       TEXT NOT NULL CHECK (event IN ('visit', 'quiz_done', 'score_saved', 'program_saved', 'wishlist_added', 'share_created', 'chat_asked', 'quiz_started', 'style_done', 'mbti_added')),
  anon_id     TEXT NOT NULL CHECK (length(anon_id) BETWEEN 16 AND 64),
  PRIMARY KEY (day, event, anon_id)
);

-- SusResponse — khảo sát SUS 10 câu (thang 1–5), điểm 0–100
CREATE TABLE sus_responses (
  id          TEXT PRIMARY KEY,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  q1  SMALLINT NOT NULL CHECK (q1 BETWEEN 1 AND 5),
  q2  SMALLINT NOT NULL CHECK (q2 BETWEEN 1 AND 5),
  q3  SMALLINT NOT NULL CHECK (q3 BETWEEN 1 AND 5),
  q4  SMALLINT NOT NULL CHECK (q4 BETWEEN 1 AND 5),
  q5  SMALLINT NOT NULL CHECK (q5 BETWEEN 1 AND 5),
  q6  SMALLINT NOT NULL CHECK (q6 BETWEEN 1 AND 5),
  q7  SMALLINT NOT NULL CHECK (q7 BETWEEN 1 AND 5),
  q8  SMALLINT NOT NULL CHECK (q8 BETWEEN 1 AND 5),
  q9  SMALLINT NOT NULL CHECK (q9 BETWEEN 1 AND 5),
  q10 SMALLINT NOT NULL CHECK (q10 BETWEEN 1 AND 5),
  score       NUMERIC(5, 2) GENERATED ALWAYS AS (
                ((q1 - 1) + (5 - q2) + (q3 - 1) + (5 - q4) + (q5 - 1) + (5 - q6) + (q7 - 1) + (5 - q8) + (q9 - 1) + (5 - q10)) * 2.5
              ) STORED,
  role        TEXT,
  comment     VARCHAR(1000)
);

-- =====================================================================================================
-- 12. HÀM & VIEW nghiệp vụ (khớp services/scoring.service.ts, recommendation.service.ts)
-- =====================================================================================================

-- computeAdmissionScore: tổng 3 môn + điểm ưu tiên; tổng ≥ 22,5 (quy đổi theo thang) → ưu tiên giảm dần
CREATE OR REPLACE FUNCTION admission_score(p_raw NUMERIC, p_region TEXT, p_group TEXT, p_method TEXT DEFAULT 'thpt')
RETURNS TABLE (raw_total NUMERIC, priority_points NUMERIC, priority_applied NUMERIC, total NUMERIC, reduced BOOLEAN)
LANGUAGE sql STABLE AS $$
  WITH m AS (SELECT max_score AS mx, factor AS f FROM admission_methods WHERE code = p_method),
       p AS (
         SELECT round(((SELECT points FROM priority_regions WHERE code = p_region)
                     + (SELECT points FROM priority_groups WHERE code = p_group)) * m.f, 2) AS pts,
                22.5 * m.f AS thr, m.mx
         FROM m)
  SELECT round(p_raw, 2),
         p.pts,
         CASE WHEN p_raw >= p.thr THEN round((p.mx - p_raw) / (p.mx - p.thr) * p.pts, 2) ELSE p.pts END,
         round(least(p.mx, p_raw + CASE WHEN p_raw >= p.thr THEN round((p.mx - p_raw) / (p.mx - p.thr) * p.pts, 2) ELSE p.pts END), 2),
         p_raw >= p.thr
  FROM p;
$$;

-- fitLevelOf: An toàn (≥ +1), Vừa sức (≥ −0,5), Thử sức — quy đổi theo hệ số thang điểm
CREATE OR REPLACE FUNCTION fit_level(p_user_score NUMERIC, p_cutoff NUMERIC, p_method TEXT DEFAULT 'thpt')
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT CASE
           WHEN p_user_score - p_cutoff >= 1 * m.factor THEN 'an-toan'
           WHEN p_user_score - p_cutoff >= -0.5 * m.factor THEN 'vua-suc'
           ELSE 'thu-suc'
         END
  FROM admission_methods m WHERE m.code = p_method;
$$;

-- Điểm chuẩn gần nhất của mỗi chương trình theo từng phương thức
CREATE VIEW v_program_latest_cutoffs AS
SELECT DISTINCT ON (program_id, method_code)
       program_id, method_code, year, score, is_estimated
FROM program_cutoffs
ORDER BY program_id, method_code, year DESC;

-- Chương trình đang hiển thị cho học sinh (trường, ngành, chương trình đều không bị ẩn) + điểm THPT gần nhất
CREATE VIEW v_public_programs AS
SELECT p.id, p.slug, p.name, p.admission_code, p.training_type,
       s.id AS school_id, s.name AS school_name, s.code AS school_code, s.region_code, s.type AS school_type,
       m.id AS major_id, m.name AS major_name, m.group_id,
       p.tuition_min, p.tuition_max, p.quota, p.competition,
       c.year AS latest_cutoff_year, c.score AS latest_cutoff,
       (SELECT count(*) FROM program_cutoffs pc WHERE pc.program_id = p.id AND pc.method_code = 'thpt') AS thpt_years,
       (p.school_verified_at IS NOT NULL AND p.school_verified_at > current_date - INTERVAL '12 months') AS school_verified
FROM programs p
JOIN schools s ON s.id = p.school_id AND NOT s.hidden
JOIN majors m ON m.id = p.major_id AND NOT m.hidden
LEFT JOIN v_program_latest_cutoffs c ON c.program_id = p.id AND c.method_code = 'thpt'
WHERE NOT p.hidden;

-- Tiến độ xác minh dữ liệu (A01): đã xác minh trong 12 tháng / chờ / thiếu dữ liệu
CREATE VIEW v_verification_progress AS
SELECT p.id AS program_id,
       CASE
         WHEN NOT EXISTS (SELECT 1 FROM program_cutoffs c WHERE c.program_id = p.id) THEN 'thieu-du-lieu'
         WHEN greatest(p.admin_verified_at, p.school_verified_at) > current_date - INTERVAL '12 months' THEN 'da-xac-minh'
         ELSE 'cho-xac-minh'
       END AS status
FROM programs p
WHERE NOT p.hidden;

-- Danh sách nguyện vọng của học sinh kèm thông tin chương trình
CREATE VIEW v_wishlists AS
SELECT w.user_id, w.position + 1 AS nguyen_vong, w.note, vp.*
FROM wishlist_items w
JOIN v_public_programs vp ON vp.id = w.program_id;

-- =====================================================================================================
-- 13. CHÚ THÍCH BẢNG (hiện trong pgAdmin / DBeaver, dùng khi viết báo cáo)
-- =====================================================================================================
COMMENT ON TABLE schools IS 'Trường đại học (A02). Xoá = tạm ẩn (hidden).';
COMMENT ON TABLE majors IS 'Ngành đào tạo (A03), mã ngành 7 số, 3 nhóm Holland ở major_riasec.';
COMMENT ON TABLE programs IS 'Chương trình đào tạo = ngành tại một trường (ERD cũ: truong_nganh).';
COMMENT ON TABLE program_cutoffs IS 'Điểm chuẩn theo chương trình × phương thức × năm (ERD cũ: diem_chuan).';
COMMENT ON TABLE score_profiles IS 'Hồ sơ điểm của học sinh (S07) + kết quả tính điểm xét tuyển.';
COMMENT ON TABLE wishlist_items IS 'Nguyện vọng dự kiến, thứ tự = position + 1 (ERD cũ: nguyen_vong).';
COMMENT ON TABLE quiz_results IS 'Kết quả trắc nghiệm RIASEC mới nhất (ERD cũ: ket_qua_riasec).';
COMMENT ON TABLE work_styles IS 'Mini-test phong cách làm việc – CHỈ để giải thích, không tham gia điểm gợi ý.';
COMMENT ON TABLE mbti_codes IS 'Mã MBTI học sinh tự nhập – góc nhìn tham khảo, không tính điểm.';
COMMENT ON TABLE recommend_weights IS 'Trọng số 4 tiêu chí gợi ý: sở thích, khả năng trúng tuyển, vị trí, nhóm ngành.';
COMMENT ON TABLE audit_logs IS 'Nhật ký mọi thay đổi dữ liệu của quản trị viên / kiểm duyệt viên / cổng trường.';
COMMENT ON TABLE analytics_events IS 'Phễu hành vi ẩn danh (chỉ gửi sau khi đồng ý cookie), xoá sau 180 ngày.';

COMMIT;
