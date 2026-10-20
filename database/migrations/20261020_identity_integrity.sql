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
