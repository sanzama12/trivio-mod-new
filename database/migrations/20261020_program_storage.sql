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
