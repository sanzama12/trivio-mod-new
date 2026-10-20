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
