-- Consolidated migration history. Use npm run db:migrate; do not run this entire file directly.
-- Keep each @migration ID unchanged: deployed databases track these original IDs.

-- @migration 20261013_postgres_runtime.sql
BEGIN;
SET search_path TO trovio, public;

-- Aggregate không phù hợp để tách nhỏ ngay (cấu hình quản trị và một số workflow)
-- vẫn được lưu bền vững trong PostgreSQL. Không có dữ liệu mẫu được tạo tại đây.
CREATE TABLE IF NOT EXISTS app_documents (
  collection TEXT NOT NULL,
  id          TEXT NOT NULL,
  owner_id    TEXT,
  parent_id   TEXT,
  status      TEXT,
  payload     JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS app_documents_owner_idx
  ON app_documents (collection, owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS app_documents_parent_idx
  ON app_documents (collection, parent_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS app_documents_status_idx
  ON app_documents (collection, status, updated_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_verification_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_verification_id TEXT;

COMMIT;

-- @migration 20261018_edudecision_foundation.sql
BEGIN;
SET search_path TO trovio, public;

-- Nền tảng nghiệp vụ EduDecision/Trovio. Migration chỉ cộng thêm cấu trúc,
-- không sinh dữ liệu mẫu và không sửa/xoá dữ liệu tuyển sinh hiện có.

ALTER TABLE IF EXISTS quiz_results ADD COLUMN IF NOT EXISTS assessment_version TEXT;
ALTER TABLE IF EXISTS quiz_results ADD COLUMN IF NOT EXISTS scoring_model_version TEXT;
ALTER TABLE IF EXISTS quiz_results ADD COLUMN IF NOT EXISTS question_count SMALLINT CHECK (question_count > 0);
ALTER TABLE IF EXISTS quiz_results ADD COLUMN IF NOT EXISTS confidence_score SMALLINT CHECK (confidence_score BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS assessment_definitions (
  id                    TEXT PRIMARY KEY,
  kind                  TEXT NOT NULL CHECK (kind IN ('riasec', 'work-style', 'skills', 'values')),
  version               TEXT NOT NULL,
  title                 TEXT NOT NULL,
  instructions          TEXT NOT NULL DEFAULT '',
  scoring_model_version TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('draft', 'published', 'retired')),
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, version)
);

CREATE TABLE IF NOT EXISTS assessment_items (
  id            TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL REFERENCES assessment_definitions (id) ON DELETE CASCADE,
  dimension     TEXT NOT NULL,
  prompt        TEXT NOT NULL,
  position      INTEGER NOT NULL CHECK (position >= 0),
  active        BOOLEAN NOT NULL DEFAULT true,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (definition_id, position)
);

CREATE TABLE IF NOT EXISTS assessment_sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users (id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES assessment_definitions (id),
  status        TEXT NOT NULL CHECK (status IN ('in-progress', 'completed', 'abandoned')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  consent_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(consent_snapshot) = 'object'),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS assessment_sessions_user_idx ON assessment_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS assessment_responses (
  session_id  TEXT NOT NULL REFERENCES assessment_sessions (id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL REFERENCES assessment_items (id),
  value       NUMERIC(8, 3) NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, item_id)
);

CREATE TABLE IF NOT EXISTS assessment_results (
  session_id       TEXT PRIMARY KEY REFERENCES assessment_sessions (id) ON DELETE CASCADE,
  result_payload   JSONB NOT NULL CHECK (jsonb_typeof(result_payload) = 'object'),
  completeness     NUMERIC(5, 4) NOT NULL CHECK (completeness BETWEEN 0 AND 1),
  confidence_score SMALLINT CHECK (confidence_score BETWEEN 0 AND 100),
  caveat           TEXT NOT NULL DEFAULT '',
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS career_clusters (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  source_url        TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  source_checked_at DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS occupations (
  id                TEXT PRIMARY KEY,
  cluster_id        TEXT REFERENCES career_clusters (id) ON DELETE SET NULL,
  external_code     TEXT,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  outlook_status    TEXT NOT NULL DEFAULT 'unknown' CHECK (outlook_status IN ('unknown', 'verified')),
  source_url        TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  source_checked_at DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS occupations_external_code_uq ON occupations (external_code) WHERE external_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS major_occupations (
  major_id      TEXT NOT NULL REFERENCES majors (id) ON DELETE CASCADE,
  occupation_id TEXT NOT NULL REFERENCES occupations (id) ON DELETE CASCADE,
  relevance     NUMERIC(5, 4) CHECK (relevance BETWEEN 0 AND 1),
  rationale     TEXT NOT NULL DEFAULT '',
  source_url    TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  PRIMARY KEY (major_id, occupation_id)
);

CREATE TABLE IF NOT EXISTS admission_cycles (
  year         SMALLINT PRIMARY KEY CHECK (year BETWEEN 2000 AND 2100),
  status       TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  source_url   TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  published_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS program_offerings (
  id             TEXT PRIMARY KEY,
  program_id     TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  admission_year SMALLINT NOT NULL REFERENCES admission_cycles (year),
  campus         TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL CHECK (status IN ('draft', 'published', 'closed', 'withdrawn')),
  source_url     TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  source_checked_at DATE,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, admission_year, campus)
);
CREATE INDEX IF NOT EXISTS program_offerings_year_idx ON program_offerings (admission_year, status);

CREATE TABLE IF NOT EXISTS program_offering_methods (
  offering_id TEXT NOT NULL REFERENCES program_offerings (id) ON DELETE CASCADE,
  method_code TEXT NOT NULL REFERENCES admission_methods (code),
  quota       INTEGER CHECK (quota >= 0),
  rules       JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(rules) = 'object'),
  PRIMARY KEY (offering_id, method_code)
);

CREATE TABLE IF NOT EXISTS program_tuition_records (
  id                TEXT PRIMARY KEY,
  offering_id       TEXT NOT NULL REFERENCES program_offerings (id) ON DELETE CASCADE,
  amount_min        NUMERIC(12, 2) CHECK (amount_min IS NULL OR amount_min >= 0),
  amount_max        NUMERIC(12, 2) CHECK (amount_max IS NULL OR amount_max >= 0),
  unit              TEXT NOT NULL DEFAULT 'million-vnd-per-year' CHECK (unit IN ('million-vnd-per-year', 'vnd-per-credit', 'vnd-per-year')),
  data_status       TEXT NOT NULL CHECK (data_status IN ('unknown', 'sourced', 'reviewed', 'verified')),
  source_url        TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  source_checked_at DATE,
  note              TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (amount_min IS NULL OR amount_max IS NULL OR amount_max >= amount_min),
  CHECK (data_status = 'unknown' OR (amount_min IS NOT NULL AND amount_max IS NOT NULL AND source_url IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS program_tuition_offering_idx ON program_tuition_records (offering_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admission_plans (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  cycle_year  SMALLINT REFERENCES admission_cycles (year),
  status      TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admission_plan_items (
  plan_id       TEXT NOT NULL REFERENCES admission_plans (id) ON DELETE CASCADE,
  offering_id   TEXT NOT NULL REFERENCES program_offerings (id) ON DELETE CASCADE,
  position      SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 99),
  strategy_band TEXT CHECK (strategy_band IN ('safe', 'target', 'reach', 'unknown')),
  note          TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (plan_id, offering_id),
  UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS model_configs (
  id          TEXT PRIMARY KEY,
  model_kind  TEXT NOT NULL CHECK (model_kind IN ('recommendation', 'decision-matrix', 'assessment-scoring')),
  version     TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('draft', 'active', 'retired')),
  config      JSONB NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  explanation TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  UNIQUE (model_kind, version)
);

CREATE TABLE IF NOT EXISTS recommendation_runs (
  id               TEXT PRIMARY KEY,
  user_id          TEXT REFERENCES users (id) ON DELETE SET NULL,
  model_config_id  TEXT REFERENCES model_configs (id),
  input_snapshot   JSONB NOT NULL CHECK (jsonb_typeof(input_snapshot) = 'object'),
  missing_fields   JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(missing_fields) = 'array'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recommendation_runs_user_idx ON recommendation_runs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recommendation_matches (
  run_id          TEXT NOT NULL REFERENCES recommendation_runs (id) ON DELETE CASCADE,
  program_id      TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  rank            INTEGER NOT NULL CHECK (rank > 0),
  score           NUMERIC(6, 3) CHECK (score BETWEEN 0 AND 100),
  data_coverage   NUMERIC(5, 4) NOT NULL CHECK (data_coverage BETWEEN 0 AND 1),
  strategy_band   TEXT NOT NULL CHECK (strategy_band IN ('safe', 'target', 'reach', 'unknown')),
  explanation     JSONB NOT NULL CHECK (jsonb_typeof(explanation) = 'object'),
  PRIMARY KEY (run_id, program_id),
  UNIQUE (run_id, rank)
);

CREATE TABLE IF NOT EXISTS decision_scenarios (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  weights     JSONB NOT NULL CHECK (jsonb_typeof(weights) = 'object'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decision_scenario_items (
  scenario_id  TEXT NOT NULL REFERENCES decision_scenarios (id) ON DELETE CASCADE,
  program_id   TEXT NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  score        NUMERIC(6, 3) CHECK (score BETWEEN 0 AND 100),
  data_coverage NUMERIC(5, 4) NOT NULL CHECK (data_coverage BETWEEN 0 AND 1),
  explanation  JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(explanation) = 'object'),
  PRIMARY KEY (scenario_id, program_id)
);

CREATE TABLE IF NOT EXISTS action_items (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_id     TEXT REFERENCES admission_plans (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  due_at      TIMESTAMPTZ,
  status      TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done', 'cancelled')),
  source_url  TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS action_items_user_idx ON action_items (user_id, status, due_at);

CREATE TABLE IF NOT EXISTS progress_logs (
  id             TEXT PRIMARY KEY,
  action_item_id TEXT NOT NULL REFERENCES action_items (id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  note           TEXT NOT NULL DEFAULT '',
  progress       SMALLINT NOT NULL CHECK (progress BETWEEN 0 AND 100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_evidence_records (
  id                TEXT PRIMARY KEY,
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('school', 'major', 'program', 'offering', 'occupation', 'timeline')),
  entity_id         TEXT NOT NULL,
  field             TEXT NOT NULL,
  data_year         SMALLINT CHECK (data_year BETWEEN 2000 AND 2100),
  status            TEXT NOT NULL CHECK (status IN ('missing', 'sourced', 'reviewed', 'verified', 'rejected')),
  source_url        TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  source_title      TEXT,
  source_checked_at DATE,
  verified_by       TEXT REFERENCES users (id) ON DELETE SET NULL,
  verified_at       TIMESTAMPTZ,
  note              TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status = 'missing' OR source_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS data_evidence_lookup_idx ON data_evidence_records (entity_type, entity_id, field, data_year DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  config      JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config) = 'object'),
  description TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT REFERENCES users (id) ON DELETE SET NULL
);

COMMENT ON TABLE assessment_definitions IS 'Bộ đánh giá có phiên bản; RIASEC chỉ đo sở thích nghề nghiệp, không chẩn đoán năng lực.';
COMMENT ON TABLE program_offerings IS 'Phiên bản chương trình tuyển sinh theo năm và cơ sở.';
COMMENT ON TABLE program_tuition_records IS 'Học phí theo năm; unknown cho phép lưu trạng thái thiếu mà không dùng số 0 làm dữ liệu.';
COMMENT ON TABLE recommendation_matches IS 'Kết quả gợi ý có điểm, độ phủ dữ liệu và giải thích tại thời điểm chạy.';
COMMENT ON TABLE data_evidence_records IS 'Dấu vết nguồn và trạng thái xác minh theo từng trường dữ liệu.';

COMMIT;

-- @migration 20261019_catalog_taxonomy.sql
BEGIN;
SET search_path TO trovio, public;

-- Nâng nhóm ngành từ nhãn lọc thành taxonomy biên tập có vòng đời rõ ràng.
ALTER TABLE major_groups ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE major_groups ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE major_groups ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE major_groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE major_groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE major_groups AS target
SET description = source.description,
    featured = true,
    updated_at = now()
FROM (VALUES
  ('cntt', 'Phần mềm, dữ liệu, trí tuệ nhân tạo và các hệ thống số.'),
  ('kinh-te', 'Kinh doanh, tài chính, marketing, quản trị và thương mại.'),
  ('y-duoc', 'Chăm sóc sức khỏe, dược học, y khoa và khoa học sự sống.'),
  ('ky-thuat', 'Cơ khí, điện, tự động hóa, xây dựng và công nghệ sản xuất.'),
  ('xa-hoi', 'Luật, truyền thông, ngôn ngữ, tâm lý và nghiên cứu xã hội.'),
  ('nghe-thuat', 'Thiết kế, mỹ thuật, kiến trúc sáng tạo và nghệ thuật ứng dụng.'),
  ('giao-duc', 'Giảng dạy, quản lý giáo dục và phát triển người học.'),
  ('nong-lam', 'Nông nghiệp, lâm nghiệp, tài nguyên và phát triển bền vững.')
) AS source(id, description)
WHERE target.id = source.id
  AND target.description = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'major_groups'::regclass
      AND conname = 'major_groups_description_length_ck'
  ) THEN
    ALTER TABLE major_groups
      ADD CONSTRAINT major_groups_description_length_ck CHECK (length(description) <= 320);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'major_groups'::regclass
      AND conname = 'major_groups_position_ck'
  ) THEN
    ALTER TABLE major_groups
      ADD CONSTRAINT major_groups_position_ck CHECK (position >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS major_groups_public_order_idx
  ON major_groups (featured DESC, position, name) WHERE NOT hidden;
-- Một mã ngành quốc gia có thể có nhiều biến thể/chuyên ngành hoặc chương trình
-- do các trường công bố, nên code là khóa tra cứu chứ không phải định danh duy nhất.
CREATE INDEX IF NOT EXISTS majors_code_idx ON majors (code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'major_groups'::regclass
      AND tgname = 'major_groups_touch'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER major_groups_touch
      BEFORE UPDATE ON major_groups
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;

COMMENT ON TABLE major_groups IS 'Taxonomy nhóm ngành dùng chung cho lọc, định hướng và trình bày danh mục.';
COMMENT ON COLUMN major_groups.featured IS 'Ưu tiên biên tập trên bề mặt khám phá; không phải nội dung quảng cáo.';

COMMIT;

-- @migration 20261019_school_cover.sql
BEGIN;
SET search_path TO trovio, public;

ALTER TABLE schools ADD COLUMN IF NOT EXISTS cover_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'schools'::regclass
      AND conname = 'schools_cover_url_https_ck'
  ) THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_cover_url_https_ck
      CHECK (cover_url IS NULL OR cover_url ~ '^https://');
  END IF;
END $$;

COMMENT ON COLUMN schools.cover_url IS 'URL HTTPS của ảnh bìa trường đã được kiểm duyệt; null khi chưa có.';

COMMIT;

-- @migration 20261019_school_logos.sql
BEGIN;
SET search_path TO trovio, public;

-- Logo là thuộc tính của trường, không phải của giao diện, để mọi bề mặt dùng cùng dữ liệu.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'schools'::regclass
      AND conname = 'schools_logo_url_https_ck'
  ) THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_logo_url_https_ck
      CHECK (logo_url IS NULL OR logo_url ~ '^https://');
  END IF;
END $$;

-- Chỉ seed các mã trường khớp chắc chắn với bộ logo công khai của VNOI-Admin.
-- Dữ liệu quản trị đã nhập luôn được giữ nguyên.
UPDATE schools AS target
SET logo_url = 'https://raw.githubusercontent.com/VNOI-Admin/uni-logo/master/logo/' || source.file_name,
    updated_at = now()
FROM (VALUES
  ('BKA', '3.png'),
  ('FPT', '5.png'),
  ('QSB', '6.png'),
  ('SPS', '8.png'),
  ('SPK', '9.png'),
  ('SPH', '10.png'),
  ('QSC', '13.png'),
  ('QHT', '18.png'),
  ('PKA', '19.png'),
  ('DDK', '24.png'),
  ('VKU', '26.png'),
  ('FUV', '27.png'),
  ('KHA', '28.png'),
  ('VIN', '34.png'),
  ('BVH', '35.png'),
  ('TCT', '40.png'),
  ('KQH', '41.png'),
  ('CSH', '43.png'),
  ('QSQ', '44.png'),
  ('QSX', '51.png'),
  ('DCN', 'haui.png'),
  ('DHT', '55.png'),
  ('NTH', '56.png'),
  ('HUI', '57.png'),
  ('BVS', '58.png'),
  ('RMU', '59.png'),
  ('TDM', '61.png'),
  ('DTL', '63.png'),
  ('HQH', '65.png'),
  ('MBS', '67.png'),
  ('TLA', '68.png'),
  ('MHN', '70.png'),
  ('DTT', '71.png'),
  ('DDL', '72.png'),
  ('DNT', '73.png'),
  ('EIU', '74.png'),
  ('GTS', '75.png'),
  ('HDT', '76.png'),
  ('SIU', '78.png'),
  ('HHA', '79.png'),
  ('GHA', '81.png'),
  ('DVT', '82.png'),
  ('DKC', '83.png'),
  ('TCU', '84.png'),
  ('HIU', '85.png'),
  ('DDT', '87.png'),
  ('DCT', '88.png'),
  ('DTC', '89.png'),
  ('PCH', '90.png'),
  ('DDS', '91.png'),
  ('HTC', '92.png'),
  ('ANH', '93.png'),
  ('TSN', '94.png'),
  ('SGD', '96.png'),
  ('UMT', '101.png'),
  ('TTG', '102.png'),
  ('DDQ', '104.png'),
  ('DVH', '105.png'),
  ('SPD', '106.png'),
  ('DQN', '107.png'),
  ('NHH', '108.png'),
  ('VLU', '109.png'),
  ('KTD', '111.png'),
  ('DVL', '112.png'),
  ('TDV', '113.png'),
  ('KTA', 'HAU.png'),
  ('XDA', 'HUCE.png'),
  ('DSK', 'ute-udn.png'),
  ('CMC', 'cmc.png'),
  ('NLS', 'HCMUAF.png')
) AS source(code, file_name)
WHERE target.code = source.code
  AND (target.logo_url IS NULL OR target.logo_url = '');

COMMENT ON COLUMN schools.logo_url IS 'URL HTTPS của logo trường đã được kiểm duyệt; null khi chưa có để UI dùng fallback mã trường.';

COMMIT;

-- @migration 20261020_identity_integrity.sql
BEGIN;
SET search_path TO trovio, public;

-- ID là định danh nội bộ bất biến. Mã nghiệp vụ và slug không phải ID.
ALTER TABLE schools ALTER COLUMN id SET DEFAULT ('sch-' || gen_random_uuid()::text);
ALTER TABLE majors ALTER COLUMN id SET DEFAULT ('maj-' || gen_random_uuid()::text);
ALTER TABLE programs ALTER COLUMN id SET DEFAULT ('prg-' || gen_random_uuid()::text);
ALTER TABLE users ALTER COLUMN id SET DEFAULT ('u-' || gen_random_uuid()::text);

CREATE FUNCTION prevent_identity_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'ID của % là bất biến; cập nhật code/slug thay vì đổi ID', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER schools_identity BEFORE UPDATE OF id ON schools FOR EACH ROW EXECUTE FUNCTION prevent_identity_change();
CREATE TRIGGER majors_identity BEFORE UPDATE OF id ON majors FOR EACH ROW EXECUTE FUNCTION prevent_identity_change();
CREATE TRIGGER programs_identity BEFORE UPDATE OF id ON programs FOR EACH ROW EXECUTE FUNCTION prevent_identity_change();
CREATE TRIGGER users_identity BEFORE UPDATE OF id ON users FOR EACH ROW EXECUTE FUNCTION prevent_identity_change();

-- Không chọn ngẫu nhiên một ngành khi mã cũ đã bị dùng cho nhiều chuyên ngành.
-- Lưu nguyên chứng cứ; NULL nghĩa là chưa xác định, không phải mã giả mới.
CREATE TABLE major_code_review (
  major_id TEXT PRIMARY KEY REFERENCES majors(id) ON DELETE CASCADE,
  original_code TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('generated_or_nonstandard', 'duplicate')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO major_code_review (major_id, original_code, reason)
SELECT id, code,
  CASE WHEN code !~ '^[0-9]{7}$' OR code LIKE '799%' THEN 'generated_or_nonstandard' ELSE 'duplicate' END
FROM majors
WHERE code !~ '^[0-9]{7}$' OR code LIKE '799%'
   OR upper(btrim(code)) IN (SELECT upper(btrim(code)) FROM majors GROUP BY 1 HAVING count(*) > 1);
ALTER TABLE majors ALTER COLUMN code DROP NOT NULL;
UPDATE majors SET code = NULL WHERE id IN (SELECT major_id FROM major_code_review);
ALTER TABLE majors DROP CONSTRAINT IF EXISTS majors_code_check;
ALTER TABLE majors ADD CONSTRAINT majors_code_check CHECK (code IS NULL OR (code ~ '^[0-9]{7}$' AND code NOT LIKE '799%'));
CREATE UNIQUE INDEX IF NOT EXISTS majors_code_uq ON majors(code);
CREATE UNIQUE INDEX schools_code_normalized_uq ON schools(upper(btrim(code)));
CREATE UNIQUE INDEX programs_admission_normalized_uq ON programs(school_id, upper(btrim(admission_code)));
ALTER TABLE schools ADD CONSTRAINT schools_code_nonempty CHECK (btrim(code) <> '');
ALTER TABLE programs ADD CONSTRAINT programs_admission_nonempty CHECK (btrim(admission_code) <> '');

-- Khoá ngoại cần index kể cả bản ghi ẩn (admin, kiểm tra quan hệ, khôi phục).
CREATE INDEX programs_major_all_idx ON programs(major_id);
CREATE INDEX app_documents_recent_idx ON app_documents(collection, updated_at DESC);
ALTER TABLE app_documents ADD CONSTRAINT app_documents_identity_check
  CHECK (btrim(collection) <> '' AND btrim(id) <> '' AND
    (NOT payload ? 'id' OR payload->>'id' = id));

COMMENT ON COLUMN majors.code IS 'Mã ngành đã xác định, duy nhất; NULL khi cần đối soát. Tên chuyên ngành nằm ở programs.name.';
COMMENT ON TABLE major_code_review IS 'Chứng cứ mã cũ chưa xác định; không dùng làm khoá tra cứu hoặc tự gộp ngành.';
COMMIT;

-- @migration 20261020_learning_materials.sql
BEGIN;
CREATE TABLE trovio.material_files (
 id TEXT PRIMARY KEY DEFAULT ('file-'||gen_random_uuid()::text),
 filename TEXT NOT NULL CHECK(length(filename) BETWEEN 1 AND 180),
 mime_type TEXT NOT NULL DEFAULT 'application/pdf' CHECK(mime_type='application/pdf'),
 bytes BYTEA NOT NULL CHECK(octet_length(bytes) BETWEEN 8 AND 10485760),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE trovio.learning_materials (
 id TEXT PRIMARY KEY DEFAULT ('material-'||gen_random_uuid()::text),
 slug TEXT NOT NULL UNIQUE CHECK(length(slug) BETWEEN 3 AND 180 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 5 AND 180),
 description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=3000),
 subject_id TEXT NOT NULL REFERENCES trovio.subjects(id),
 kind TEXT NOT NULL CHECK(kind IN ('pdf','video','image')),
 media_url TEXT CHECK(media_url IS NULL OR media_url ~ '^https://'),
 pdf_file_id TEXT UNIQUE REFERENCES trovio.material_files(id),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 created_by TEXT REFERENCES trovio.users(id) ON DELETE SET NULL,
 updated_by TEXT REFERENCES trovio.users(id) ON DELETE SET NULL,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 published_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((kind='pdf' AND media_url IS NULL) OR (kind<>'pdf' AND pdf_file_id IS NULL)),
 CHECK(status<>'published' OR (published_at IS NOT NULL AND
   ((kind='pdf' AND pdf_file_id IS NOT NULL) OR (kind<>'pdf' AND media_url IS NOT NULL))))
);
CREATE INDEX learning_materials_subject_public_idx ON trovio.learning_materials(subject_id,published_at DESC,id) WHERE status='published';
CREATE INDEX learning_materials_public_idx ON trovio.learning_materials(published_at DESC,id) WHERE status='published';
CREATE INDEX learning_materials_admin_idx ON trovio.learning_materials(status,updated_at DESC,id);
CREATE FUNCTION trovio.material_update_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=trovio,public AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Material ID is immutable'; END IF;
 IF OLD.published_at IS NOT NULL AND NEW.slug IS DISTINCT FROM OLD.slug THEN RAISE EXCEPTION 'Published material slug is immutable'; END IF;
 NEW.version := OLD.version+1;
 NEW.updated_at := now();
 RETURN NEW;
END $$;
CREATE TRIGGER learning_materials_guard BEFORE UPDATE ON trovio.learning_materials FOR EACH ROW EXECUTE FUNCTION trovio.material_update_guard();
CREATE TABLE trovio.material_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 material_id TEXT NOT NULL REFERENCES trovio.learning_materials(id),
 actor_id TEXT REFERENCES trovio.users(id) ON DELETE SET NULL,
 version INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('draft','published','archived')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(material_id,version)
);
CREATE VIEW trovio.published_materials AS SELECT * FROM trovio.learning_materials WHERE status='published' AND published_at<=now();
COMMIT;

-- @migration 20261020_news_content.sql
BEGIN;
SET search_path TO trovio, public;

CREATE TABLE news_categories (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL,
  position SMALLINT NOT NULL DEFAULT 0
);
INSERT INTO news_categories(code,name,position) VALUES
 ('tuyen-sinh','Tuyển sinh',1),
 ('huong-dan-nguyen-vong','Hướng dẫn nguyện vọng',2),
 ('tin-giao-duc','Tin giáo dục',3);

CREATE TABLE news_posts (
  id TEXT PRIMARY KEY DEFAULT ('news-' || gen_random_uuid()::text),
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 3 AND 180 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 5 AND 180),
  summary TEXT NOT NULL DEFAULT '' CHECK (length(summary)<=500),
  body TEXT NOT NULL DEFAULT '' CHECK (length(body)<=50000),
  category_code TEXT NOT NULL REFERENCES news_categories(code),
  content_type TEXT NOT NULL CHECK (content_type IN ('article','video')),
  video_url TEXT CHECK (video_url IS NULL OR video_url ~ '^https://'),
  cover_url TEXT CHECK (cover_url IS NULL OR cover_url ~ '^https://'),
  source_url TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  season SMALLINT CHECK (season BETWEEN 2000 AND 2100),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version>0),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (content_type='video' OR video_url IS NULL),
  CHECK (status <> 'published' OR (published_at IS NOT NULL AND length(btrim(summary))>=20
    AND ((content_type='article' AND length(btrim(body))>=20) OR (content_type='video' AND video_url IS NOT NULL))))
);
CREATE INDEX news_posts_public_recent_idx ON news_posts(published_at DESC,id) WHERE status='published';
CREATE INDEX news_posts_public_category_idx ON news_posts(category_code,published_at DESC,id) WHERE status='published';
CREATE INDEX news_posts_admin_idx ON news_posts(status,updated_at DESC,id);

CREATE FUNCTION news_post_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=trovio,public AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'News ID is immutable'; END IF;
  IF OLD.published_at IS NOT NULL AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'Published news slug is immutable';
  END IF;
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER news_post_update BEFORE UPDATE ON news_posts FOR EACH ROW EXECUTE FUNCTION news_post_guard();

CREATE TABLE news_post_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES news_posts(id) ON DELETE RESTRICT,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  version INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created','updated')),
  previous_status TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft','published','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id,version)
);
CREATE VIEW published_news AS SELECT * FROM news_posts WHERE status='published' AND published_at<=now();
COMMENT ON TABLE news_posts IS 'Bài viết/video biên tập; body là văn bản thuần có quy ước tiêu đề, không phải HTML. Video lưu URL, không lưu binary.';
COMMIT;

-- @migration 20261020_news_rich_text.sql
BEGIN;
ALTER TABLE trovio.news_posts ADD COLUMN body_format TEXT NOT NULL DEFAULT 'plain'
  CHECK (body_format IN ('plain','html'));
COMMENT ON COLUMN trovio.news_posts.body_format IS 'plain: văn bản cũ; html: rich text được làm sạch ở server trước khi lưu và khi render.';
CREATE OR REPLACE VIEW trovio.published_news AS SELECT * FROM trovio.news_posts
  WHERE status='published' AND published_at<=now();
COMMIT;

-- @migration 20261020_program_storage.sql
BEGIN;
SET search_path TO trovio, public;

-- Bản gốc chỉ phục vụ reset. Mọi truy vấn runtime đọc bảng quan hệ hiện hành.
CREATE TABLE program_baselines (
  program_id TEXT PRIMARY KEY REFERENCES programs(id) ON DELETE CASCADE,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION program_snapshot(target_id TEXT) RETURNS JSONB LANGUAGE sql STABLE
SET search_path = trovio, public AS $$
  SELECT jsonb_build_object(
    'name', p.name,
    'admissionCode', p.admission_code,
    'trainingType', p.training_type,
    'campus', p.campus,
    'tuitionMin', p.tuition_min,
    'tuitionMax', p.tuition_max,
    'durationYears', p.duration_years,
    'quota', p.quota,
    'source', p.source,
    'updatedAt', p.data_updated,
    'sourceUrl', p.source_url,
    'sourceCheckedAt', p.source_checked_at::text,
    'sourceNote', p.source_note,
    'adminVerifiedAt', p.admin_verified_at::text,
    'schoolVerifiedAt', p.school_verified_at::text,
    'schoolVerifiedNote', p.school_verified_note,
    'hidden', p.hidden,
    'competition', p.competition,
    'combos', COALESCE((SELECT jsonb_agg(combo_code ORDER BY combo_code) FROM program_combos WHERE program_id=p.id), '[]'),
    'methods', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', method_code, 'name', name, 'desc', description, 'requirement', requirement, 'tag', tag) ORDER BY position, id) FROM program_admission_methods WHERE program_id=p.id), '[]'),
    'cutoffs', COALESCE((SELECT jsonb_agg(jsonb_build_object('year', year, 'score', score, 'estimated', is_estimated) ORDER BY year DESC) FROM program_cutoffs WHERE program_id=p.id AND method_code='thpt'), '[]'),
    'altCutoffs', COALESCE((SELECT jsonb_agg(jsonb_build_object('method', method_code, 'year', year, 'score', score, 'estimated', is_estimated) ORDER BY year DESC, method_code) FROM program_cutoffs WHERE program_id=p.id AND method_code<>'thpt'), '[]'),
    'verifiedFields', COALESCE((SELECT jsonb_object_agg(field, verified_at::text) FROM program_verified_fields WHERE program_id=p.id), '{}')
  ) FROM programs p WHERE p.id=target_id
$$;

CREATE FUNCTION apply_program_patch(target_id TEXT, patch JSONB) RETURNS VOID LANGUAGE plpgsql
SET search_path = trovio, public AS $$
DECLARE unknown_key TEXT;
BEGIN
  PERFORM 1 FROM programs WHERE id=target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chương trình không tồn tại: %', target_id; END IF;
  IF patch IS NULL OR jsonb_typeof(patch) <> 'object' THEN RAISE EXCEPTION 'Patch phải là object'; END IF;
  SELECT key INTO unknown_key FROM jsonb_object_keys(patch) key WHERE key <> ALL(ARRAY['name','admissionCode','trainingType','campus','tuitionMin','tuitionMax','durationYears','quota','source','updatedAt','sourceUrl','sourceCheckedAt','sourceNote','adminVerifiedAt','schoolVerifiedAt','schoolVerifiedNote','hidden','competition','combos','cutoffs','altCutoffs','methods','verifiedFields']) LIMIT 1;
  IF unknown_key IS NOT NULL THEN RAISE EXCEPTION 'Trường patch không hợp lệ: %', unknown_key; END IF;
  UPDATE programs SET
    name = CASE WHEN patch ? 'name' THEN (patch->>'name')::text ELSE name END,
    admission_code = CASE WHEN patch ? 'admissionCode' THEN (patch->>'admissionCode')::text ELSE admission_code END,
    training_type = CASE WHEN patch ? 'trainingType' THEN (patch->>'trainingType')::text ELSE training_type END,
    campus = CASE WHEN patch ? 'campus' THEN (patch->>'campus')::text ELSE campus END,
    tuition_min = CASE WHEN patch ? 'tuitionMin' THEN (patch->>'tuitionMin')::numeric ELSE tuition_min END,
    tuition_max = CASE WHEN patch ? 'tuitionMax' THEN (patch->>'tuitionMax')::numeric ELSE tuition_max END,
    duration_years = CASE WHEN patch ? 'durationYears' THEN (patch->>'durationYears')::numeric ELSE duration_years END,
    quota = CASE WHEN patch ? 'quota' THEN (patch->>'quota')::integer ELSE quota END,
    source = CASE WHEN patch ? 'source' THEN (patch->>'source')::text ELSE source END,
    data_updated = CASE WHEN patch ? 'updatedAt' THEN (patch->>'updatedAt')::text ELSE data_updated END,
    source_url = CASE WHEN patch ? 'sourceUrl' THEN (patch->>'sourceUrl')::text ELSE source_url END,
    source_checked_at = CASE WHEN patch ? 'sourceCheckedAt' THEN (patch->>'sourceCheckedAt')::date ELSE source_checked_at END,
    source_note = CASE WHEN patch ? 'sourceNote' THEN (patch->>'sourceNote')::text ELSE source_note END,
    admin_verified_at = CASE WHEN patch ? 'adminVerifiedAt' THEN (patch->>'adminVerifiedAt')::date ELSE admin_verified_at END,
    school_verified_at = CASE WHEN patch ? 'schoolVerifiedAt' THEN (patch->>'schoolVerifiedAt')::date ELSE school_verified_at END,
    school_verified_note = CASE WHEN patch ? 'schoolVerifiedNote' THEN (patch->>'schoolVerifiedNote')::text ELSE school_verified_note END,
    hidden = CASE WHEN patch ? 'hidden' THEN (patch->>'hidden')::boolean ELSE hidden END,
    competition = CASE WHEN patch ? 'competition' THEN (patch->>'competition')::text ELSE competition END
  WHERE id=target_id;
  IF patch ? 'combos' THEN
    DELETE FROM program_combos WHERE program_id=target_id;
    INSERT INTO program_combos(program_id, combo_code)
    SELECT target_id, value FROM jsonb_array_elements_text(patch->'combos');
  END IF;
  IF patch ? 'methods' THEN
    DELETE FROM program_admission_methods WHERE program_id=target_id;
    INSERT INTO program_admission_methods(program_id, method_code, name, description, requirement, tag, position)
    SELECT target_id, NULLIF(item->>'key',''), item->>'name', COALESCE(item->>'desc',''), COALESCE(item->>'requirement',''), COALESCE(item->>'tag',''), (pos-1)::smallint
    FROM jsonb_array_elements(patch->'methods') WITH ORDINALITY items(item,pos);
  END IF;
  IF patch ? 'cutoffs' THEN
    DELETE FROM program_cutoffs WHERE program_id=target_id AND method_code='thpt';
    INSERT INTO program_cutoffs(program_id, method_code, year, score, is_estimated)
    SELECT target_id, 'thpt', (item->>'year')::smallint, (item->>'score')::numeric, COALESCE((item->>'estimated')::boolean,false)
    FROM jsonb_array_elements(patch->'cutoffs') items(item);
  END IF;
  IF patch ? 'altCutoffs' THEN
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(patch->'altCutoffs') items(item) WHERE item->>'method'='thpt') THEN
      RAISE EXCEPTION 'Điểm THPT phải nằm trong cutoffs';
    END IF;
    DELETE FROM program_cutoffs WHERE program_id=target_id AND method_code<>'thpt';
    INSERT INTO program_cutoffs(program_id, method_code, year, score, is_estimated)
    SELECT target_id, item->>'method', (item->>'year')::smallint, (item->>'score')::numeric, COALESCE((item->>'estimated')::boolean,false)
    FROM jsonb_array_elements(patch->'altCutoffs') items(item);
  END IF;
  IF patch ? 'verifiedFields' THEN
    DELETE FROM program_verified_fields WHERE program_id=target_id;
    INSERT INTO program_verified_fields(program_id, field, verified_at)
    SELECT target_id, key, value::date FROM jsonb_each_text(patch->'verifiedFields');
  END IF;
  IF NOT patch ? 'competition' AND (patch ? 'cutoffs' OR patch ? 'quota') THEN
    UPDATE programs SET competition = CASE
      WHEN (SELECT score FROM program_cutoffs WHERE program_id=target_id AND method_code='thpt' AND NOT is_estimated ORDER BY year DESC LIMIT 1)>=25 THEN 'Cao'
      WHEN (SELECT score FROM program_cutoffs WHERE program_id=target_id AND method_code='thpt' AND NOT is_estimated ORDER BY year DESC LIMIT 1)>=20 THEN 'Trung bình'
      WHEN quota>0 AND quota<=50 THEN 'Cao' ELSE 'Thấp' END WHERE id=target_id;
  END IF;
END $$;

-- Khoá chương trình trước khi chụp bản gốc và sửa; cả batch + audit cùng transaction.
CREATE FUNCTION save_program_patch(target_id TEXT, patch JSONB) RETURNS VOID LANGUAGE plpgsql
SET search_path = trovio, public AS $$
DECLARE original JSONB;
BEGIN
  PERFORM 1 FROM programs WHERE id=target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chương trình không tồn tại: %', target_id; END IF;
  IF patch IS NULL THEN
    SELECT payload INTO original FROM program_baselines WHERE program_id=target_id;
    IF original IS NOT NULL THEN
      PERFORM apply_program_patch(target_id, original);
      DELETE FROM program_baselines WHERE program_id=target_id;
    END IF;
  ELSE
    INSERT INTO program_baselines(program_id,payload) VALUES (target_id,program_snapshot(target_id)) ON CONFLICT DO NOTHING;
    PERFORM apply_program_patch(target_id, patch);
  END IF;
END $$;

-- Migrate tất cả patch trong cùng transaction; vi phạm dữ liệu sẽ rollback toàn bộ.
DO $$ DECLARE entry RECORD; BEGIN
  FOR entry IN SELECT id,payload FROM app_documents WHERE collection='program-patch' ORDER BY id LOOP
    PERFORM save_program_patch(entry.id, entry.payload);
  END LOOP;
END $$;
DELETE FROM app_documents WHERE collection='program-patch';
ALTER TABLE app_documents ADD CONSTRAINT app_documents_no_program_patch CHECK (collection <> 'program-patch');

CREATE VIEW public_programs AS
SELECT p.* FROM programs p
JOIN schools s ON s.id=p.school_id AND NOT s.hidden
JOIN majors m ON m.id=p.major_id AND NOT m.hidden
JOIN major_groups g ON g.id=m.group_id AND NOT g.hidden
WHERE NOT p.hidden;
COMMIT;

-- @migration 20261020_schema_search_path.sql
BEGIN;
SET search_path TO trovio, public;

-- Runtime SQL đã qualified; trigger/hàm cũ cũng phải tự xác định schema.
-- Không phụ thuộc SET theo session vì transaction pooling có thể đổi backend.
DO $$
DECLARE fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='trovio' AND p.prokind='f'
  LOOP
    EXECUTE format('ALTER FUNCTION trovio.%I(%s) SET search_path = trovio, public', fn.proname, fn.arguments);
  END LOOP;
END $$;
COMMIT;

-- @migration 20261020_two_account_roles.sql
BEGIN;
SET search_path TO trovio, public;

-- One account has exactly one application role. Preserve all existing admins;
-- former moderator/school/teacher/persona roles become ordinary users.
ALTER TABLE users ADD COLUMN access_role TEXT NOT NULL DEFAULT 'user'
  CHECK (access_role IN ('user', 'admin'));
UPDATE users u SET access_role='admin'
WHERE EXISTS (SELECT 1 FROM user_system_roles r WHERE r.user_id=u.id AND r.role_code='admin');

COMMENT ON COLUMN users.access_role IS 'Only two application actors: user and admin. Review authors are users.';
-- Legacy role tables/columns are retained until the separately reviewed compaction.
COMMIT;

-- @migration 20261020_z_archive_retired_tables.sql
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE SCHEMA IF NOT EXISTS trovio_archive;
-- Reversible retirement: retain historical data, identities and dependencies.
LOCK TABLE trovio.school_staff, trovio.user_system_roles, trovio.system_roles IN ACCESS EXCLUSIVE MODE;
DO $$ DECLARE target TEXT; occupied BOOLEAN; BEGIN
FOREACH target IN ARRAY ARRAY['action_items', 'admission_cycles', 'admission_plan_items', 'admission_plans', 'assessment_definitions', 'assessment_items', 'assessment_responses', 'assessment_results', 'assessment_sessions', 'audit_changes', 'audit_logs', 'career_clusters', 'chat_aliases', 'chat_logs', 'class_members', 'data_evidence_records', 'data_reports', 'deadline_reminders', 'decision_scenario_items', 'decision_scenarios', 'feature_flags', 'goal_regions', 'goals', 'import_batches', 'major_careers', 'major_curriculum_blocks', 'major_curriculum_items', 'major_occupations', 'major_outcomes', 'major_work_styles', 'mbti_codes', 'model_configs', 'occupations', 'outcome_surveys', 'program_offering_methods', 'program_offerings', 'program_tuition_records', 'progress_logs', 'qa_answer_helpful_votes', 'qa_answer_reports', 'qa_answers', 'qa_questions', 'quiz_result_scores', 'quiz_results', 'recommendation_matches', 'recommendation_runs', 'review_flags', 'review_helpful_votes', 'review_reports', 'saved_programs', 'school_outcomes', 'school_reviews', 'school_submissions', 'score_profile_major_groups', 'score_profile_regions', 'score_profile_school_types', 'score_profile_subjects', 'score_profiles', 'share_comments', 'sus_responses', 'teacher_classes', 'user_sessions', 'wishlist_items', 'work_styles'] LOOP
-- Some historical installations had extra tables absent on a fresh database.
IF to_regclass(format('trovio.%I', target)) IS NULL THEN CONTINUE; END IF;
EXECUTE format('LOCK TABLE trovio.%I IN ACCESS EXCLUSIVE MODE', target);
EXECUTE format('SELECT EXISTS(SELECT 1 FROM trovio.%I)',target) INTO occupied;
IF occupied THEN RAISE EXCEPTION 'Retirement stopped: expected empty table % now has data',target; END IF;
END LOOP;
IF EXISTS (SELECT 1 FROM trovio.user_system_roles r JOIN trovio.users u ON u.id=r.user_id WHERE r.role_code='admin' AND u.access_role<>'admin') THEN RAISE EXCEPTION 'Admin roles have not been migrated'; END IF;
END $$;
ALTER VIEW trovio.v_wishlists SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.action_items SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.admission_cycles SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.admission_plan_items SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.admission_plans SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.assessment_definitions SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.assessment_items SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.assessment_responses SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.assessment_results SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.assessment_sessions SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.audit_changes SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.audit_logs SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.career_clusters SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.chat_aliases SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.chat_logs SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.class_members SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.data_evidence_records SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.data_reports SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.deadline_reminders SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.decision_scenario_items SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.decision_scenarios SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.feature_flags SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.goal_regions SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.goals SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.import_batches SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.major_careers SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.major_curriculum_blocks SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.major_curriculum_items SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.major_occupations SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.major_outcomes SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.major_work_styles SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.mbti_codes SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.model_configs SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.occupations SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.outcome_surveys SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.program_offering_methods SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.program_offerings SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.program_tuition_records SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.progress_logs SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.qa_answer_helpful_votes SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.qa_answer_reports SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.qa_answers SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.qa_questions SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.quiz_result_scores SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.quiz_results SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.recommendation_matches SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.recommendation_runs SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.review_flags SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.review_helpful_votes SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.review_reports SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.saved_programs SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.school_outcomes SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.school_reviews SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.school_submissions SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.score_profile_major_groups SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.score_profile_regions SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.score_profile_school_types SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.score_profile_subjects SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.score_profiles SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.share_comments SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.sus_responses SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.teacher_classes SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.user_sessions SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.wishlist_items SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.work_styles SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.school_staff SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.user_system_roles SET SCHEMA trovio_archive;
ALTER TABLE IF EXISTS trovio.system_roles SET SCHEMA trovio_archive;
COMMIT;

-- @migration 20261020_zz_finalize_account_roles.sql
BEGIN;
SET search_path TO trovio, public;

-- Preserve the legacy fields before removing obsolete role/persona columns.
CREATE TABLE trovio_archive.user_role_history (
  user_id TEXT PRIMARY KEY,
  legacy_profile JSONB NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO trovio_archive.user_role_history(user_id, legacy_profile)
SELECT id, jsonb_build_object(
  'user_role', user_role,
  'teacher_verification_status', teacher_verification_status,
  'teacher_verification_id', teacher_verification_id
) FROM users;

-- Materialize only privileges already granted by the old verified-email policy.
-- The migration runner supplies the existing ADMIN_EMAILS list as a local setting.
UPDATE users SET access_role='admin'
WHERE verified AND lower(email) IN (
  SELECT lower(btrim(value))
  FROM unnest(string_to_array(COALESCE(current_setting('trovio.legacy_admin_emails', true), ''), ',')) value
  WHERE btrim(value) <> ''
);

ALTER TABLE users DROP COLUMN user_role,
  DROP COLUMN teacher_verification_status,
  DROP COLUMN teacher_verification_id;

-- Retire stored records for features whose UI and API have already been removed.
-- Copy exact records first; the INSERT and DELETE share the same transaction.
CREATE TABLE trovio_archive.retired_role_documents (LIKE app_documents INCLUDING ALL);
INSERT INTO trovio_archive.retired_role_documents
SELECT * FROM app_documents WHERE collection IN ('teacher-class', 'teacher-verification', 'school-submission');
DELETE FROM app_documents WHERE collection IN ('teacher-class', 'teacher-verification', 'school-submission');

COMMENT ON COLUMN users.access_role IS 'Single source of authorization: user or admin. Review authors are users.';
COMMIT;

-- @migration 20261021_remove_additional_work_style_tables.sql
BEGIN;
SET search_path TO trovio, public;

DROP TABLE IF EXISTS major_group_work_styles CASCADE;
DROP TABLE IF EXISTS work_style_questions CASCADE;
DROP TABLE IF EXISTS work_axes CASCADE;

DO $archive$
DECLARE
  target TEXT;
BEGIN
  IF to_regnamespace('trovio_archive') IS NOT NULL THEN
    FOREACH target IN ARRAY ARRAY['major_group_work_styles', 'work_style_questions', 'work_axes'] LOOP
      EXECUTE format('DROP TABLE IF EXISTS trovio_archive.%I CASCADE', target);
    END LOOP;
  END IF;
END
$archive$;

COMMIT;

-- @migration 20261021_remove_quiz_teacher_channel.sql
BEGIN;
SET search_path TO trovio, public;

-- Hai tính năng đã bị gỡ khỏi sản phẩm: trắc nghiệm và kênh lớp giáo viên.
DROP TABLE IF EXISTS assessment_responses CASCADE;
DROP TABLE IF EXISTS assessment_results CASCADE;
DROP TABLE IF EXISTS assessment_sessions CASCADE;
DROP TABLE IF EXISTS assessment_items CASCADE;
DROP TABLE IF EXISTS assessment_definitions CASCADE;
DROP TABLE IF EXISTS quiz_result_scores CASCADE;
DROP TABLE IF EXISTS quiz_results CASCADE;
DROP TABLE IF EXISTS riasec_questions CASCADE;
DROP TABLE IF EXISTS riasec_type_weights CASCADE;
DROP TABLE IF EXISTS major_riasec CASCADE;
DROP TABLE IF EXISTS riasec_types CASCADE;
DROP TABLE IF EXISTS work_styles CASCADE;
DROP TABLE IF EXISTS mbti_codes CASCADE;
DROP TABLE IF EXISTS class_members CASCADE;
DROP TABLE IF EXISTS teacher_classes CASCADE;

DO $archive$
DECLARE
  target TEXT;
BEGIN
  IF to_regnamespace('trovio_archive') IS NOT NULL THEN
    FOREACH target IN ARRAY ARRAY[
      'assessment_responses', 'assessment_results', 'assessment_sessions', 'assessment_items', 'assessment_definitions',
      'quiz_result_scores', 'quiz_results', 'riasec_questions', 'riasec_type_weights', 'major_riasec', 'riasec_types',
      'work_styles', 'mbti_codes', 'class_members', 'teacher_classes'
    ] LOOP
      EXECUTE format('DROP TABLE IF EXISTS trovio_archive.%I CASCADE', target);
    END LOOP;
  END IF;
END
$archive$;

DELETE FROM app_documents
WHERE collection IN ('teacher-class', 'teacher-verification', 'quiz-config', 'riasec');

DELETE FROM analytics_events
WHERE event IN ('quiz_done', 'quiz_started', 'style_done', 'mbti_added');
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_check;
ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_event_check
  CHECK (event IN ('visit', 'score_saved', 'program_saved', 'wishlist_added', 'share_created', 'chat_asked'));

DELETE FROM notifications WHERE kind = 'class-reminder';
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN ('reminder', 'supplementary', 'qa-answer', 'school-submission'));

DELETE FROM recommend_rules WHERE kind = 'riasec-match';
ALTER TABLE recommend_rules DROP CONSTRAINT IF EXISTS recommend_rules_kind_check;
ALTER TABLE recommend_rules ADD CONSTRAINT recommend_rules_kind_check
  CHECK (kind IN ('budget', 'diversity', 'goal-priority', 'min-years', 'boost-cutoff', 'boost-school-type'));

ALTER TABLE IF EXISTS audit_logs DROP CONSTRAINT IF EXISTS audit_logs_target_type_check;
ALTER TABLE IF EXISTS audit_logs ADD CONSTRAINT audit_logs_target_type_check
  CHECK (target_type IN ('program', 'qa', 'timeline', 'chat-alias', 'school', 'major', 'rules', 'import', 'user', 'school-submission'));

ALTER TABLE users
  DROP COLUMN IF EXISTS teacher_verification_status,
  DROP COLUMN IF EXISTS teacher_verification_id;

COMMIT;

