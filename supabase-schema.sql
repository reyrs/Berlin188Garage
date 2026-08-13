-- Berlin188 Garage - Supabase Schema
-- Execute this in Supabase SQL Editor

-- 1. PROFILES (staff directory — 1:1 with a real Supabase Auth user; created
-- via scripts/provision-staff.mjs using the service role key, not public signup)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','kasir','advisor','gudang','mekanik','marketing','accounting','customer')),
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  specialization TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. ORDERS (with JSONB columns for embedded arrays)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  car_brand TEXT NOT NULL,
  car_model TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  car_vin TEXT,
  car_type TEXT,
  car_year TEXT,
  car_engine_code TEXT,
  complaint TEXT, -- deprecated, superseded by complaints (jsonb array, max 3 enforced in app)
  complaints JSONB DEFAULT '[]'::jsonb,
  service_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'antre' CHECK (status IN ('antre','dikerjakan','temuan_dilaporkan','menunggu_pembayaran','selesai')),
  created_at TIMESTAMPTZ DEFAULT now(),
  advisor_id UUID REFERENCES profiles(id),
  advisor_name TEXT,
  spk_number TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  service_items JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  payment_status TEXT DEFAULT 'belum_dibayar' CHECK (payment_status IN ('belum_dibayar','dp','lunas')),
  payment_method TEXT,
  payment_destination TEXT,
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  dp_amount NUMERIC,
  notes TEXT,
  spk_sent BOOLEAN DEFAULT false,
  assigned_mechanic_id UUID REFERENCES profiles(id),
  assigned_mechanic_name TEXT,
  slot_number INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 3. TRANSACTIONS
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('masuk','keluar')),
  method TEXT NOT NULL CHECK (method IN ('tunai','transfer','qris','edc')),
  category TEXT NOT NULL CHECK (category IN ('pendapatan_jasa','pendapatan_part','operasional','pembelian_part','gaji','lainnya')),
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. EXPENSES
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('operasional','pembelian_part','gaji','utilitas','bayar_supplier','bayar_hutang_owner','lainnya')),
  method TEXT NOT NULL CHECK (method IN ('tunai','transfer','qris','edc')),
  created_by TEXT NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 5. CLOSINGS
CREATE TABLE closings (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  system_cash NUMERIC NOT NULL,
  physical_cash NUMERIC NOT NULL,
  discrepancy NUMERIC NOT NULL,
  closed_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE closings ENABLE ROW LEVEL SECURITY;

-- 6. WAREHOUSE STOCK
CREATE TABLE warehouse_stock (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  rack_location TEXT NOT NULL,
  -- Plain TEXT reference (no real FK) to a product id in the static public
  -- marketplace catalog (src/data/products.ts, not a DB table). Set
  -- explicitly by staff via WarehousePanel, never auto-matched.
  marketplace_product_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;

-- 7. STOCK MUTATIONS (audit trail)
CREATE TABLE stock_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id TEXT REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  qty_change INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('out','in','adjustment')),
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_mutations ENABLE ROW LEVEL SECURITY;

-- 8. HERO CONTENT (landing page "banner promosi" — singleton, bukan carousel)
CREATE TABLE hero_content (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  headline TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  cta_text TEXT NOT NULL,
  background_image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE hero_content ENABLE ROW LEVEL SECURITY;

-- 9. PORTFOLIO ITEMS (landing page — dikelola manual marketing)
CREATE TABLE portfolio_items (
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

-- 10. BLOG POSTS (landing page — artikel dikelola manual marketing, tiap
-- post punya URL sendiri buat SEO & share, lihat src/main.tsx routing)
CREATE TABLE blog_posts (
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

-- INDEXES
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_phone ON orders(customer_phone);
CREATE INDEX idx_orders_plate ON orders(plate_number);
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_date ON transactions(timestamp);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_closings_date ON closings(timestamp);
CREATE INDEX idx_stock_mutations_item ON stock_mutations(stock_item_id);
CREATE INDEX idx_portfolio_items_created_at ON portfolio_items(created_at DESC);

-- Papan slot kerja: cegah 2 order aktif kebagian bay fisik yang sama.
CREATE UNIQUE INDEX idx_orders_active_slot_unique
  ON orders (slot_number)
  WHERE status != 'selesai' AND slot_number IS NOT NULL;

CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

-- RLS POLICIES
-- Staff login uses real Supabase Auth (see src/lib/auth.ts). Access is
-- scoped per role (not just "logged in or not") — see getTabsForRole() in
-- src/App.tsx for the authoritative role→feature mapping this mirrors.
-- `orders` stays open to `anon` too because customers approve/reject
-- findings in TrackingPortal without ever logging in.
CREATE OR REPLACE FUNCTION current_staff_role() RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE POLICY "profiles_select_staff"
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- Anon never gets a direct table policy on orders — that would mean anyone
-- with the public anon key can dump/edit every customer's data with a raw
-- REST call, no login needed (confirmed exploitable when this was
-- `USING (true)` / `auth.role() = 'anon'`). Public "Cek Servis" self-service
-- goes through the narrow SECURITY DEFINER functions below instead, which
-- check customer_phone server-side before touching anything.
CREATE POLICY "orders_select_staff"
  ON orders FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "orders_write_staff"
  ON orders FOR ALL TO authenticated
  USING (current_staff_role() IN ('advisor','owner','mekanik','gudang','kasir'))
  WITH CHECK (current_staff_role() IN ('advisor','owner','mekanik','gudang','kasir'));

-- Public order tracking + customer self-service ACC (approve/reject their
-- own findings & service items), scoped by phone number server-side.
CREATE OR REPLACE FUNCTION track_orders_by_phone(p_phone TEXT)
RETURNS SETOF orders
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM orders WHERE customer_phone = p_phone;
$$;

-- approvedBy: 'customer' distinguishes a genuine self-service ACC (here) from
-- a staff-recorded one (orderStore.approveFinding/approveServiceItem stamps
-- 'advisor'). Both also write a timeline event now, previously only the
-- staff path did — customer ACCs used to leave no timeline trace at all.
CREATE OR REPLACE FUNCTION customer_set_finding_status(
  p_order_id TEXT, p_phone TEXT, p_finding_id TEXT, p_status TEXT
)
RETURNS SETOF orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_finding_desc TEXT;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  SELECT elem->>'description' INTO v_finding_desc
  FROM orders, jsonb_array_elements(findings) AS elem
  WHERE id = p_order_id AND customer_phone = p_phone AND elem->>'id' = p_finding_id;

  RETURN QUERY
  UPDATE orders
  SET findings = (
        SELECT jsonb_agg(
          CASE WHEN elem->>'id' = p_finding_id
               THEN elem || jsonb_build_object('status', p_status, 'approvedBy', 'customer')
               ELSE elem
          END
        )
        FROM jsonb_array_elements(findings) AS elem
      ),
      timeline = timeline || jsonb_build_array(jsonb_build_object(
        'id', 'rpc-finding-' || md5(random()::text || clock_timestamp()::text),
        'status', status,
        'timestamp', now(),
        'title', CASE WHEN p_status = 'approved' THEN 'Temuan Disetujui Pemilik' ELSE 'Temuan Ditolak Pemilik' END,
        'description', format('Pemilik %s temuan: "%s" (via portal tracking).',
          CASE WHEN p_status = 'approved' THEN 'menyetujui' ELSE 'menolak' END,
          coalesce(v_finding_desc, p_finding_id)),
        'actor', 'Pemilik Kendaraan'
      ))
  WHERE id = p_order_id AND customer_phone = p_phone
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION customer_set_service_item_status(
  p_order_id TEXT, p_phone TEXT, p_item_id TEXT, p_status TEXT
)
RETURNS SETOF orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_item_name TEXT;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  SELECT elem->>'name' INTO v_item_name
  FROM orders, jsonb_array_elements(service_items) AS elem
  WHERE id = p_order_id AND customer_phone = p_phone AND elem->>'id' = p_item_id;

  RETURN QUERY
  UPDATE orders
  SET service_items = (
        SELECT jsonb_agg(
          CASE WHEN elem->>'id' = p_item_id
               THEN elem || jsonb_build_object('status', p_status, 'approvedBy', 'customer')
               ELSE elem
          END
        )
        FROM jsonb_array_elements(service_items) AS elem
      ),
      timeline = timeline || jsonb_build_array(jsonb_build_object(
        'id', 'rpc-item-' || md5(random()::text || clock_timestamp()::text),
        'status', status,
        'timestamp', now(),
        'title', CASE WHEN p_status = 'approved' THEN 'Estimasi Disetujui Pemilik' ELSE 'Estimasi Ditolak Pemilik' END,
        'description', format('Pemilik %s item: "%s" (via portal tracking).',
          CASE WHEN p_status = 'approved' THEN 'menyetujui' ELSE 'menolak' END,
          coalesce(v_item_name, p_item_id)),
        'actor', 'Pemilik Kendaraan'
      ))
  WHERE id = p_order_id AND customer_phone = p_phone
  RETURNING *;
END;
$$;

-- Public marketplace stock badge: only exposes (product id, stock) for
-- warehouse_stock rows staff have explicitly linked, never the full
-- staff-only table (owner/gudang RLS on warehouse_stock stays unchanged).
CREATE OR REPLACE FUNCTION public_marketplace_stock_lookup()
RETURNS TABLE(marketplace_product_id TEXT, stock INTEGER)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.marketplace_product_id, w.stock
  FROM warehouse_stock w
  WHERE w.marketplace_product_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION track_orders_by_phone(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION customer_set_finding_status(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_marketplace_stock_lookup() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION customer_set_service_item_status(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE POLICY "transactions_role_based"
  ON transactions FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','kasir','advisor','manager','accounting'))
  WITH CHECK (current_staff_role() IN ('owner','kasir','advisor'));

CREATE POLICY "expenses_role_based"
  ON expenses FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','kasir','accounting'))
  WITH CHECK (current_staff_role() IN ('owner','kasir'));

CREATE POLICY "closings_role_based"
  ON closings FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','kasir','accounting'))
  WITH CHECK (current_staff_role() IN ('owner','kasir'));

CREATE POLICY "warehouse_stock_role_based"
  ON warehouse_stock FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','gudang'))
  WITH CHECK (current_staff_role() IN ('owner','gudang'));

CREATE POLICY "stock_mutations_role_based"
  ON stock_mutations FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','gudang'))
  WITH CHECK (current_staff_role() IN ('owner','gudang'));

-- warehouse_stock_role_based above locks writes to owner/gudang, but stock
-- mutations are also triggered by advisor actions (Pasang part ke WO,
-- reject-restock, resolve temuan pakai stock) — a plain UPDATE from an
-- advisor session silently matches 0 rows under RLS instead of erroring.
-- This RPC is scoped to the exact roles that can reach those UI actions and
-- does an atomic delta update, throwing loudly when unauthorized or when
-- stock would go negative.
CREATE OR REPLACE FUNCTION adjust_warehouse_stock(p_item_id TEXT, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  IF current_staff_role() NOT IN ('advisor', 'owner', 'gudang') THEN
    RAISE EXCEPTION 'Not authorized to adjust warehouse stock';
  END IF;

  UPDATE warehouse_stock
  SET stock = stock + p_delta
  WHERE id = p_item_id AND stock + p_delta >= 0
  RETURNING stock INTO v_new_stock;

  IF v_new_stock IS NULL THEN
    RAISE EXCEPTION 'Stok tidak mencukupi atau item tidak ditemukan';
  END IF;

  RETURN v_new_stock;
END;
$$;

-- hero_content: baca terbuka (landing page publik), tulis marketing/owner saja
CREATE POLICY "hero_content_select_anyone"
  ON hero_content FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "hero_content_write_marketing"
  ON hero_content FOR ALL TO authenticated
  USING (current_staff_role() IN ('marketing', 'owner'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner'));

-- portfolio_items: baca terbuka, tulis marketing/owner saja
CREATE POLICY "portfolio_items_select_anyone"
  ON portfolio_items FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "portfolio_items_write_marketing"
  ON portfolio_items FOR ALL TO authenticated
  USING (current_staff_role() IN ('marketing', 'owner'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner'));

-- blog_posts: publik cuma liat yang published, staff marketing/owner liat
-- semua (termasuk draft) + tulis penuh
CREATE POLICY "blog_posts_select_published"
  ON blog_posts FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "blog_posts_select_staff_all"
  ON blog_posts FOR SELECT TO authenticated
  USING (current_staff_role() IN ('marketing', 'owner'));

CREATE POLICY "blog_posts_write_marketing"
  ON blog_posts FOR ALL TO authenticated
  USING (current_staff_role() IN ('marketing', 'owner'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner'));

-- TRIGGER: update updated_at on orders
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER warehouse_stock_updated_at
  BEFORE UPDATE ON warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER hero_content_updated_at
  BEFORE UPDATE ON hero_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed hero_content dengan teks yang sama persis kayak yang hardcode di
-- LandingPage.tsx — biar setup baru dari nol pun landing page-nya nggak blank.
INSERT INTO hero_content (id, headline, subtitle, cta_text)
VALUES (
  1,
  'Mobil Eropa kamu, ditangani spesialis yang ngerti mesinnya.',
  'Kami foto setiap temuan. Kami jelasin setiap biaya. Kamu ACC dulu — baru kami kerjakan.',
  'Cek servis'
);
