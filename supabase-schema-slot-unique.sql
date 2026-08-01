-- Berlin188 Garage — pengaman di level database buat papan slot
-- Jalankan sekali di Supabase Dashboard → SQL Editor, SETELAH
-- supabase-schema-slot-board.sql.
--
-- Penetapan slot sekarang dihitung di client (React), bukan transaksi
-- atomik di database. Kalau 2 advisor kirim SPK nyaris bersamaan, ada
-- kemungkinan kecil keduanya baca snapshot data yang sama dan sama-sama
-- ngitung slot yang sama sebagai "kosong". Index unique parsial ini bikin
-- percobaan kedua GAGAL di level database (bukan diam-diam berhasil
-- menimpa) kalau itu beneran kejadian — dua order aktif nggak akan pernah
-- bisa punya slot_number yang sama.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_active_slot_unique
  ON orders (slot_number)
  WHERE status != 'selesai' AND slot_number IS NOT NULL;
