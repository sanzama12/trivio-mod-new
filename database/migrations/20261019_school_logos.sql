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
