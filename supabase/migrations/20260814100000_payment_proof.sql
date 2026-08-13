-- Revisi manager 2026-08-13, "Kelola WO #2": pembayaran via QRIS/transfer
-- wajib ada bukti (screenshot) dari customer.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Bucket privat khusus bukti pembayaran — BEDA dari landing-assets (public):
-- bisa kejebak info rekening/nominal customer, jadi nggak boleh diakses
-- tanpa login. Dibuat langsung lewat SQL (bukan manual dashboard kayak
-- landing-assets dulu).
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "payment_proofs_write_staff" ON storage.objects;
CREATE POLICY "payment_proofs_write_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND current_staff_role() IN ('owner', 'kasir', 'advisor'));

DROP POLICY IF EXISTS "payment_proofs_read_staff" ON storage.objects;
CREATE POLICY "payment_proofs_read_staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND current_staff_role() IN ('owner', 'kasir', 'advisor'));
