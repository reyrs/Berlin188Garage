-- Berlin188 Garage — fitur Blog (marketing bikin & publish artikel dengan
-- URL sendiri, /blog dan /blog/:slug). Jalankan sekali di Supabase
-- Dashboard → SQL Editor, SETELAH supabase-schema-portfolio-items.sql.
-- Reuse bucket `landing-assets` — nggak perlu bucket/policy storage baru.

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts_select_published" ON blog_posts;
CREATE POLICY "blog_posts_select_published"
  ON blog_posts FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "blog_posts_select_staff_all" ON blog_posts;
CREATE POLICY "blog_posts_select_staff_all"
  ON blog_posts FOR SELECT TO authenticated
  USING (current_staff_role() IN ('marketing', 'owner'));

DROP POLICY IF EXISTS "blog_posts_write_marketing" ON blog_posts;
CREATE POLICY "blog_posts_write_marketing"
  ON blog_posts FOR ALL TO authenticated
  USING (current_staff_role() IN ('marketing', 'owner'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner'));

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
