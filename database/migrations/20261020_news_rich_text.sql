BEGIN;
ALTER TABLE trovio.news_posts ADD COLUMN body_format TEXT NOT NULL DEFAULT 'plain'
  CHECK (body_format IN ('plain','html'));
COMMENT ON COLUMN trovio.news_posts.body_format IS 'plain: văn bản cũ; html: rich text được làm sạch ở server trước khi lưu và khi render.';
CREATE OR REPLACE VIEW trovio.published_news AS SELECT * FROM trovio.news_posts
  WHERE status='published' AND published_at<=now();
COMMIT;
