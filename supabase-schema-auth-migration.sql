-- Berlin188 Garage — Migrasi ke Supabase Auth sungguhan untuk login staf
-- Jalankan sekali di Supabase Dashboard → SQL Editor, SETELAH supabase-schema.sql awal.
--
-- Yang berubah:
--   1. profiles.id: TEXT lepas -> UUID yang terhubung ke auth.users(id).
--      (Skema awal pakai TEXT karena saat itu login masih mock client-side,
--      bukan Supabase Auth beneran — sekarang itu diganti, jadi id ikut pola
--      standar Supabase: profiles 1:1 dengan auth.users.)
--   2. orders.advisor_id / orders.assigned_mechanic_id: ikut jadi UUID.
--      Aman dikosongkan (SET NULL) karena project masih tahap testing, belum
--      ada data order produksi yang perlu dipertahankan.
--   3. RLS pada tabel staf-only (profiles/transactions/expenses/closings/
--      warehouse_stock/stock_mutations) dipersempit ke `authenticated` saja.
--      `orders` SENGAJA TETAP `anon, authenticated` — customer approve/reject
--      temuan di TrackingPortal tanpa login sama sekali.

-- 1. Lepas FK lama yang menunjuk ke profiles(id) versi TEXT
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_advisor_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_assigned_mechanic_id_fkey;

-- 2. Kosongkan kolom id staf di orders (data lama berupa string mock spt
--    'advisor-1', tidak bisa di-cast ke UUID) lalu ubah tipenya
UPDATE orders SET advisor_id = NULL, assigned_mechanic_id = NULL;
ALTER TABLE orders ALTER COLUMN advisor_id TYPE UUID USING NULL;
ALTER TABLE orders ALTER COLUMN assigned_mechanic_id TYPE UUID USING NULL;

-- 3. Drop & recreate profiles dengan id UUID terhubung ke auth.users
DROP TABLE IF EXISTS profiles;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','kasir','advisor','gudang','mekanik','marketing','customer')),
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Re-add FK dari orders ke profiles versi UUID
ALTER TABLE orders
  ADD CONSTRAINT orders_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES profiles(id),
  ADD CONSTRAINT orders_assigned_mechanic_id_fkey FOREIGN KEY (assigned_mechanic_id) REFERENCES profiles(id);

-- 5. Ganti semua policy lama (semuanya "Allow app access on ..." TO anon, authenticated)
--    dengan versi yang dipersempit sesuai tabel

DROP POLICY IF EXISTS "Allow app access on profiles" ON profiles;
CREATE POLICY "Staff access on profiles"
  ON profiles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- orders TETAP anon+authenticated — TrackingPortal customer (tanpa login)
-- perlu baca & approve/reject temuan di sini.
DROP POLICY IF EXISTS "Allow app access on orders" ON orders;
CREATE POLICY "Allow app access on orders"
  ON orders FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow app access on transactions" ON transactions;
CREATE POLICY "Staff access on transactions"
  ON transactions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow app access on expenses" ON expenses;
CREATE POLICY "Staff access on expenses"
  ON expenses FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow app access on closings" ON closings;
CREATE POLICY "Staff access on closings"
  ON closings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow app access on warehouse_stock" ON warehouse_stock;
CREATE POLICY "Staff access on warehouse_stock"
  ON warehouse_stock FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow app access on stock_mutations" ON stock_mutations;
CREATE POLICY "Staff access on stock_mutations"
  ON stock_mutations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
