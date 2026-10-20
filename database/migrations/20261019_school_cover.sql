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
