-- Promo popup — satu baris config (kayak hero_content), muncul di landing
-- page publik beberapa detik setelah dibuka. Dikelola marketing/owner dari
-- MarketingPanel, bareng blog & portofolio.
CREATE TABLE promo_popup (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  cta_text TEXT NOT NULL DEFAULT '',
  cta_link TEXT NOT NULL DEFAULT '',
  delay_seconds INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE promo_popup ENABLE ROW LEVEL SECURITY;

-- baca terbuka (landing page publik harus bisa cek enabled), tulis marketing/owner saja
CREATE POLICY "promo_popup_select_anyone"
  ON promo_popup FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "promo_popup_write_marketing"
  ON promo_popup FOR ALL TO authenticated
  USING (current_staff_role() IN ('marketing', 'owner'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner'));

CREATE TRIGGER promo_popup_updated_at
  BEFORE UPDATE ON promo_popup
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed satu baris kosong/nonaktif — biar UPDATE (bukan INSERT) yang dipakai
-- MarketingPanel selalu punya baris id=1 buat di-update.
INSERT INTO promo_popup (id, enabled) VALUES (1, false);
