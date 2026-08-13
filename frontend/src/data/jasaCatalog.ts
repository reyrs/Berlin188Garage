// Nama jasa umum bengkel spesialis mobil Eropa — saran nama doang buat
// mempercepat input, BUKAN katalog harga (harga tetap diketik manual tiap
// kali, supaya nggak ada harga karangan yang kepakai tanpa sadar).
export const COMMON_JASA_NAMES = [
  'Ganti Oli Mesin',
  'Ganti Filter Oli',
  'Ganti Filter Udara',
  'Ganti Filter Kabin (AC)',
  'Paket Tune Up',
  'Servis Rem (Kampas + Cakram)',
  'Ganti Kampas Rem Depan',
  'Ganti Kampas Rem Belakang',
  'Spooring & Balancing',
  'Ganti Timing Belt',
  'Ganti Timing Chain',
  'Servis AC (Isi Freon)',
  'Ganti Aki',
  'Servis Kelistrikan',
  'Ganti Busi',
  'Servis / Ganti Oli Transmisi',
  'Ganti Shockbreaker',
  'Servis Kaki-Kaki',
  'Coding & Computer (ECU)',
  'Cuci Throttle Body',
  'Ganti Radiator Coolant',
  'Balancing Roda',
];

// Dikelompokkan pakai kategori yang sama dengan Order.serviceType /
// PortfolioItem.serviceType, biar konsisten sama istilah yang udah dipakai
// di seluruh app. Cuma nama jasa buat ditampilin di landing page — TETEP
// TANPA HARGA (lihat komentar di atas), karena biaya beneran ditentukan
// dari diagnosis per kendaraan, bukan tarif tetap.
export const JASA_BY_CATEGORY: Record<string, string[]> = {
  'Servis Rutin': ['Ganti Oli Mesin', 'Ganti Filter Oli', 'Ganti Filter Udara', 'Ganti Filter Kabin (AC)', 'Paket Tune Up', 'Ganti Busi'],
  'Perbaikan Mesin': ['Ganti Timing Belt', 'Ganti Timing Chain', 'Servis / Ganti Oli Transmisi', 'Cuci Throttle Body', 'Ganti Radiator Coolant'],
  'Kelistrikan': ['Servis AC (Isi Freon)', 'Ganti Aki', 'Servis Kelistrikan', 'Coding & Computer (ECU)'],
  'Kaki-Kaki': ['Servis Rem (Kampas + Cakram)', 'Ganti Kampas Rem Depan', 'Ganti Kampas Rem Belakang', 'Spooring & Balancing', 'Ganti Shockbreaker', 'Servis Kaki-Kaki', 'Balancing Roda'],
};
