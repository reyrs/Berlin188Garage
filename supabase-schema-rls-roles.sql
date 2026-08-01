-- Berlin188 Garage — RLS berbasis role staf
-- Jalankan sekali di Supabase Dashboard → SQL Editor, SETELAH
-- supabase-schema-auth-migration.sql.
--
-- Sebelum ini, semua policy cuma bedain "login (authenticated) atau nggak
-- (anon)" — akun mekanik punya akses baca-tulis yang sama persis dengan
-- owner ke transactions/expenses/closings/warehouse_stock. Sekarang tiap
-- tabel dibatasi ke role yang beneran butuh, sesuai getTabsForRole() di
-- src/App.tsx (satu-satunya sumber kebenaran soal role→fitur di aplikasi).

-- 1. Fungsi bantu: role staf yang lagi login (NULL utk anon → otomatis
--    gagal di semua pengecekan "IN (...)" di bawah, tanpa perlu dicek eksplisit)
CREATE OR REPLACE FUNCTION current_staff_role() RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- 2. profiles — baca-saja untuk staf yang login. Nggak ada policy tulis
--    untuk `authenticated` sama sekali; akun staf baru cuma bisa dibuat
--    lewat scripts/provision-staff.mjs pakai service role key (bypass RLS).
DROP POLICY IF EXISTS "Staff access on profiles" ON profiles;
CREATE POLICY "profiles_select_staff"
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- 3. orders — baca terbuka (staf + customer TrackingPortal tanpa login),
--    tulis buat customer (approve/reject temuan) DAN staf yang relevan
--    (advisor/owner bikin & kelola WO, mekanik update status, gudang
--    update service items, kasir konfirmasi pembayaran). Manager & marketing
--    sengaja dikecualikan — mereka cuma nampilin data, nggak pernah nulis.
DROP POLICY IF EXISTS "Allow app access on orders" ON orders;
CREATE POLICY "orders_select_anyone"
  ON orders FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "orders_write_staff_or_customer"
  ON orders FOR ALL TO anon, authenticated
  USING (auth.role() = 'anon' OR current_staff_role() IN ('advisor','owner','mekanik','gudang','kasir'))
  WITH CHECK (auth.role() = 'anon' OR current_staff_role() IN ('advisor','owner','mekanik','gudang','kasir'));

-- 4. transactions — manager kebaca (dashboard pantauan) tapi nggak bisa
--    nulis; advisor bisa nulis karena Papan Kerja Advisor (track_dashboard)
--    juga bisa memicu konfirmasi pembayaran langsung, bukan cuma kasir.
DROP POLICY IF EXISTS "Staff access on transactions" ON transactions;
CREATE POLICY "transactions_role_based"
  ON transactions FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','kasir','advisor','manager'))
  WITH CHECK (current_staff_role() IN ('owner','kasir','advisor'));

-- 5. expenses & closings — kasir + owner saja (tab Akunting)
DROP POLICY IF EXISTS "Staff access on expenses" ON expenses;
CREATE POLICY "expenses_role_based"
  ON expenses FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','kasir'))
  WITH CHECK (current_staff_role() IN ('owner','kasir'));

DROP POLICY IF EXISTS "Staff access on closings" ON closings;
CREATE POLICY "closings_role_based"
  ON closings FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','kasir'))
  WITH CHECK (current_staff_role() IN ('owner','kasir'));

-- 6. warehouse_stock & stock_mutations — gudang + owner saja (tab Gudang).
--    stock_mutations belum dipakai kode apa pun sekarang, disamakan biar
--    konsisten kalau fitur audit trail-nya dibangun nanti.
DROP POLICY IF EXISTS "Staff access on warehouse_stock" ON warehouse_stock;
CREATE POLICY "warehouse_stock_role_based"
  ON warehouse_stock FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','gudang'))
  WITH CHECK (current_staff_role() IN ('owner','gudang'));

DROP POLICY IF EXISTS "Staff access on stock_mutations" ON stock_mutations;
CREATE POLICY "stock_mutations_role_based"
  ON stock_mutations FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','gudang'))
  WITH CHECK (current_staff_role() IN ('owner','gudang'));
