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
