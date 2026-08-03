-- Berlin188 Garage — hero landing page bisa diedit Marketing ("Banner Promosi")
-- Jalankan sekali di Supabase Dashboard → SQL Editor, SETELAH
-- supabase-schema-accounting-role.sql.

-- 1. Tabel singleton (selalu 1 baris — bukan banner majemuk/carousel)
CREATE TABLE IF NOT EXISTS hero_content (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  headline TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  cta_text TEXT NOT NULL,
  background_image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE hero_content ENABLE ROW LEVEL SECURITY;

-- Baca terbuka — landing page publik, harus kebaca tanpa login.
-- Tulis dibatasi marketing/owner lewat current_staff_role() (fungsi yang
-- udah ada dari supabase-schema-rls-roles.sql).
DROP POLICY IF EXISTS "hero_content_select_anyone" ON hero_content;
CREATE POLICY "hero_content_select_anyone"
  ON hero_content FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "hero_content_write_marketing" ON hero_content;
CREATE POLICY "hero_content_write_marketing"
  ON hero_content FOR ALL TO authenticated
  USING (current_staff_role() IN ('marketing', 'owner'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner'));

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hero_content_updated_at ON hero_content;
CREATE TRIGGER hero_content_updated_at
  BEFORE UPDATE ON hero_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Seed pakai teks yang SEKARANG udah hardcode di LandingPage.tsx — jadi
--    begitu ini jalan, tampilan landing page nggak berubah sama sekali
--    sampai marketing beneran ngedit lewat panel-nya.
INSERT INTO hero_content (id, headline, subtitle, cta_text)
VALUES (
  1,
  'Mobil Eropa kamu, ditangani spesialis yang ngerti mesinnya.',
  'Kami foto setiap temuan. Kami jelasin setiap biaya. Kamu ACC dulu — baru kami kerjakan.',
  'Cek servis'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy buat bucket Storage `landing-assets` (bucket-nya sendiri dibuat
--    lewat scripts/setup-landing-storage.mjs, bukan di sini — Storage bucket
--    itu bukan objek SQL biasa). Baca terbuka (gambar hero harus kebuka
--    publik), tulis dibatasi marketing/owner.
DROP POLICY IF EXISTS "landing_assets_select_anyone" ON storage.objects;
CREATE POLICY "landing_assets_select_anyone"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'landing-assets');

DROP POLICY IF EXISTS "landing_assets_write_marketing" ON storage.objects;
CREATE POLICY "landing_assets_write_marketing"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'landing-assets' AND current_staff_role() IN ('marketing', 'owner'))
  WITH CHECK (bucket_id = 'landing-assets' AND current_staff_role() IN ('marketing', 'owner'));
