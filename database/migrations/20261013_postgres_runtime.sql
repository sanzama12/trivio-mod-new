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
