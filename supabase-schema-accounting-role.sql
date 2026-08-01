-- Berlin188 Garage — role "accounting" baru: read-only ke data keuangan.
-- Jalankan sekali di Supabase Dashboard → SQL Editor, SETELAH
-- supabase-schema-rls-roles.sql.
--
-- Accounting BUKAN gantiin kasir — kasir tetap pegang transaksi harian &
-- terima pembayaran. Accounting itu role laporan/analisis di atasnya, jadi
-- sengaja cuma ditambahin ke USING (boleh baca), TIDAK ke WITH CHECK (nggak
-- boleh nulis) di transactions/expenses/closings.

-- 1. Izinin role 'accounting' di kolom profiles.role (constraint lama
--    belum kenal role ini sama sekali)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner','manager','kasir','advisor','gudang','mekanik','marketing','accounting','customer'));

-- 2. Tambah 'accounting' ke sisi baca (USING) transactions/expenses/closings
DROP POLICY IF EXISTS "transactions_role_based" ON transactions;
CREATE POLICY "transactions_role_based"
  ON transactions FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','kasir','advisor','manager','accounting'))
  WITH CHECK (current_staff_role() IN ('owner','kasir','advisor'));

DROP POLICY IF EXISTS "expenses_role_based" ON expenses;
CREATE POLICY "expenses_role_based"
  ON expenses FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','kasir','accounting'))
  WITH CHECK (current_staff_role() IN ('owner','kasir'));

DROP POLICY IF EXISTS "closings_role_based" ON closings;
CREATE POLICY "closings_role_based"
  ON closings FOR ALL TO authenticated
  USING (current_staff_role() IN ('owner','kasir','accounting'))
  WITH CHECK (current_staff_role() IN ('owner','kasir'));
