-- Berlin188 Garage — portofolio manual marketing di landing page
-- Jalankan sekali di Supabase Dashboard → SQL Editor, SETELAH
-- supabase-schema-hero-content.sql. Reuse bucket `landing-assets` yang
-- udah dibikin buat Banner Promosi — nggak perlu bucket/policy storage baru.

CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_brand TEXT NOT NULL,
  car_model TEXT NOT NULL,
  service_type TEXT NOT NULL,
  work_description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_items_select_anyone" ON portfolio_items;
CREATE POLICY "portfolio_items_select_anyone"
  ON portfolio_items FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "portfolio_items_write_marketing" ON portfolio_items;
CREATE POLICY "portfolio_items_write_marketing"
  ON portfolio_items FOR ALL TO authenticated
  USING (current_staff_role() IN ('marketing', 'owner'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner'));

CREATE INDEX IF NOT EXISTS idx_portfolio_items_created_at ON portfolio_items(created_at DESC);
