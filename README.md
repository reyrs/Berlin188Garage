# Berlin188 Garage — Web App (Revisi v2)

Sistem manajemen bengkel internal Berlin188 Garage.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.local` dan isi Gemini API key (opsional, hanya untuk fitur AI):
   ```
   GEMINI_API_KEY=your_key_here
   ```

3. Jalankan dev server:
   ```
   npm run dev
   ```

4. Buka: http://localhost:3000

## Login Demo

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@berlin188.com | password |
| Service Advisor | sa@berlin188.com | password |
| Akunting/Kasir | kasir@berlin188.com | password |
| Gudang | gudang@berlin188.com | password |
| Customer | (tracking via nomor HP) | - |

## Perubahan v2 (sesuai feedback)
- Mekanik tidak lagi punya akun — hanya terima SPK cetak
- SA menjadi hub utama: input temuan, foto, update progress
- Panel Akunting diperluas: catat pengeluaran + tools akuntansi
- Monitor display (view-only) untuk antrian bengkel
- Format invoice diperbarui ke standar Berlin188
