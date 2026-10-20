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
