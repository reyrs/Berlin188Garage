-- Berlin188 Garage — kolom slot_number buat papan kerja 10 bay
-- Jalankan sekali di Supabase Dashboard → SQL Editor. Aman & aditif —
-- cuma nambah kolom nullable, nggak nyentuh data yang udah ada.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS slot_number INTEGER;
