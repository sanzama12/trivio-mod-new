BEGIN;
SET search_path TO trovio, public;

-- Nền tảng nghiệp vụ EduDecision/Trovio. Migration chỉ cộng thêm cấu trúc,
-- không sinh dữ liệu mẫu và không sửa/xoá dữ liệu tuyển sinh hiện có.

ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS assessment_version TEXT;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS scoring_model_version TEXT;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS question_count SMALLINT CHECK (question_count > 0);
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS confidence_score SMALLINT CHECK (confidence_score BETWEEN 0 AND 100);

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