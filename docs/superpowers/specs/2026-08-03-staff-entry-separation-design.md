# Pemisahan pintu masuk staf dari landing page (Opsi B) — desain fitur

## Konteks

User melaporkan bug di kolom pilih mekanik (sudah diperbaiki di sesi ini), lalu meminta audit menyeluruh dashboard, yang berujung ke permintaan lebih besar: **landing page publik dan dashboard staf dipisah**, dengan syarat spesifik "di landing page gak ada lagi masuk staff". Alasan yang dikonfirmasi user: keamanan/kerapian — bukan performa, bukan rencana multi-tim.

Sebelum desain ini disusun, sempat ditemukan (dan sudah diperbaiki terpisah, commit `1ecc7b7`) lubang RLS serius di tabel `orders` yang membuat siapa pun tanpa login bisa baca/tulis seluruh data pelanggan lewat API Supabase langsung. Itu sudah selesai dan independen dari desain ini — poin pentingnya: **keamanan sungguhan (siapa bisa akses data apa) sudah dijamin di level database/RLS, bukan lewat sembunyi-sembunyi URL.** Desain di bawah ini murni soal kerapian permukaan (surface area) — supaya pengunjung situs publik nggak melihat/nyentuh jejak dashboard staf sama sekali — bukan lapisan keamanan tambahan yang esensial.

Dua opsi sempat diajukan:
- **Opsi A**: dua deployment Vercel terpisah (public vs staff), pemisahan bundle & URL sungguhan.
- **Opsi B** *(dipilih user)*: tetap satu deployment/domain, tapi pintu masuk staf dipindah ke URL tersembunyi + kode dashboard di-lazy-load biar nggak ikut ke-download pengunjung publik.

Opsi A tetap kandidat upgrade alami di masa depan (terutama kalau nanti beli domain sendiri) — tidak ada keputusan di desain ini yang mempersulit migrasi ke Opsi A nanti, karena batas kode (staff-only components sudah dikelompokkan & di-lazy-load) sama persis dengan yang dibutuhkan Opsi A.

### Arsitektur saat ini (relevan)

- `src/main.tsx`: `<BrowserRouter>` di root, cuma 2 route beneran (`/blog`, `/blog/:slug`, keduanya buat fitur Blog yang sudah ada). Semua path lain (`path="*"`) dilayani `<App />`.
- `src/App.tsx`: satu state machine `currentView: 'landing' | 'tracking' | 'staff_portal' | 'monitor_service' | 'monitor_tunggu' | 'marketplace'` (bukan URL-driven). Login staf sekarang adalah tombol "Masuk Staff" di `LandingPage.tsx` yang men-trigger `<LoginModal>` sebagai overlay di atas landing page; sukses login → `setCurrentView('staff_portal')`.
- Semua 9 panel staf (`OwnerPanel`, `AdvisorPanel`, `AdvisorDashboard`, `WarehousePanel`, `TechnicianPanel`, `ManagerPanel`, `MarketingPanel`, `AccountingPanel`, `FinanceReportPanel`) + `SlotBoard` (papan monitor) + `LoginModal` semua di-import langsung di kepala `App.tsx` — jadi satu bundle JS yang sama dengan landing page/marketplace, tidak ada code-splitting sama sekali hari ini.
- Restore sesi staf (Supabase Auth session via `getSession()`/`onAuthStateChange`, sudah ada di `App.tsx`) jalan independen dari `currentView` — kalau ada sesi valid, otomatis `setActiveStaffUser(profile)` + `setCurrentView('staff_portal')`. Ini harus tetap jalan persis sama di desain baru.

## Keputusan arsitektur

**Routing**: tambah satu route baru, `/staff`, di `main.tsx` — pola sama persis seperti `/blog` (menambah, bukan mengganti apa pun yang sudah ada). Path ini me-render `<App entryMode="staff" />`; path `*` (semuanya selain `/blog*` dan `/staff`) tetap `<App entryMode="public" />`. `currentView` state machine yang ada **tidak dirombak** — cuma nilai inisialnya yang sekarang bergantung ke prop `entryMode` alih-alih selalu `'landing'`.

**`App.tsx` — prop `entryMode`**:
- `entryMode="public"` (default): perilaku persis seperti sekarang. `currentView` mulai dari `'landing'`. Landing page, tracking, marketplace semua tetap di sini, tidak berubah.
- `entryMode="staff"`: `currentView` mulai dari `'staff_login'` (state baru) — bukan `'landing'`. Kalau efek restore-sesi menemukan sesi valid, dia timpa ke `'staff_portal'` seperti biasa (user yang sudah login & buka `/staff` lagi langsung masuk dashboard, tanpa layar login). Kalau tidak ada sesi, tampil halaman login penuh (bukan modal ngambang di atas apa pun, karena memang tidak ada landing page di belakangnya di route ini).

**`LoginModal.tsx` → jadi bisa dipakai dua mode**: tambah prop `variant?: 'modal' | 'page'` (default `'modal'`, dipakai di public entry — TAPI karena tombol "Masuk Staff" dihapus total dari landing page, jalur modal ini sebenarnya sudah tidak ada pemicunya lagi di UI; propnya dipertahankan cuma supaya komponennya tidak perlu dirombak formulir/validasinya, cukup ubah wrapper luarnya). Mode `'page'`: tanpa backdrop gelap/posisi `fixed inset-0 flex items-center justify-center`, langsung mengisi container halaman penuh dengan card login di tengah — dipakai di `entryMode="staff"`.

**`LandingPage.tsx`**: hapus tombol "Masuk Staff" dan prop `onOpenLogin` sepenuhnya (termasuk pemanggilan `isLoginModalOpen`/`setIsLoginModalOpen` yang jadi tidak terpakai lagi di `App.tsx` untuk entry publik — modal login lama dibuang, diganti komponen halaman baru untuk mode staff).

**Code-splitting**: 9 panel staf + `SlotBoard` + komponen login dibungkus `React.lazy()` dengan satu `<Suspense fallback={...}>` yang membungkus seluruh render `staff_portal`/`monitor_service`/`monitor_tunggu`/`staff_login`. Efeknya: bundle awal yang di-download pengunjung landing page (`entryMode="public"`) tidak lagi memuat kode 9 panel itu sama sekali — baru ke-download saat benar-benar membuka `/staff`. `LandingPage`, `ProductMarketplace`, `TrackingPortal` (mode publik) TETAP di-import biasa (bukan lazy) karena itu memang konten yang dibutuhkan pengunjung publik sejak awal.

**`public/robots.txt`**: tambah baris `Disallow: /staff` (kalau file belum ada, dibuat baru). Ini cuma etika crawler yang baik (Googlebot dkk akan mematuhi), bukan proteksi keamanan — ditulis di sini supaya konsisten dengan tujuan "kerapian", bukan diandalkan sebagai gerbang akses.

### Yang secara sadar TIDAK diubah (batas scope)

- Tetap satu deployment Vercel, satu domain, satu `package.json`/`vite.config.ts`.
- `loadData()` di `App.tsx` (fetch orders/transactions/dst.) tidak dipisah per entry-mode di iterasi ini — tetap jalan sama seperti sekarang untuk kedua mode. (Catatan: karena RLS `orders` sudah diperbaiki terpisah, fetch ini otomatis balik kosong untuk sesi anon di `entryMode="public"`, jadi tidak ada regresi keamanan dari keputusan ini — cuma belum dioptimalkan supaya publik nggak fetch tabel staf lain sama sekali. Bisa jadi proyek kecil terpisah kalau nanti mau dirapikan lebih jauh.)
- `monitor_service`/`monitor_tunggu` (papan kerja TV bengkel) tetap cuma bisa dibuka dari dalam nav dashboard staf (setelah login), persis seperti sekarang — bukan route publik.
- Konten `LandingPage.tsx`/`ProductMarketplace.tsx` lainnya (hero, portofolio, katalog, AI chat) **tidak disentuh** kecuali penghapusan tombol "Masuk Staff" — sejalan dengan batasan yang sudah berlaku di proyek ini soal marketplace/landing page.
- Tidak ada perubahan skema database — ini murni perubahan frontend routing & bundling.

## Risiko & dampak rollout

- **Staf kehilangan jalur lama**: setelah perubahan ini, tombol "Masuk Staff" di homepage hilang total. Semua staf perlu diberi tahu URL baru (`.../staff`) untuk login — sarankan di-bookmark di HP/laptop masing-masing. Ini satu-satunya dampak yang terlihat user-facing dari perubahan ini.
- **Sesi yang sedang aktif**: staf yang sedang login (tab masih terbuka) tidak terpengaruh sama sekali — perubahan ini cuma soal bagaimana sesi *baru* dimulai.
- **SEO/crawler**: `robots.txt` baru tidak mempengaruhi indexing halaman publik yang sudah ada.

## Rencana verifikasi

- `tsc --noEmit` bersih.
- Manual test (Playwright, seperti sesi-sesi sebelumnya): buka `/` → pastikan tombol "Masuk Staff" tidak ada di mana pun; buka `/staff` tanpa sesi → tampil halaman login penuh; login sukses → masuk dashboard, semua tab & fitur staf tetap berfungsi seperti sebelum perubahan; buka `/staff` lagi dalam kondisi sudah login → langsung ke dashboard tanpa form login; cek Network tab dari `/` (belum login) memastikan chunk JS panel-panel staf tidak ada di request awal; cek `/blog`, tracking, marketplace masih jalan seperti biasa (tidak ada regresi dari perubahan routing).
