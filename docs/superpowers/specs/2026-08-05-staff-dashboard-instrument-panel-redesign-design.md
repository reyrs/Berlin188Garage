# Redesign visual dashboard staf — gaya "instrument panel"

## Konteks

Sesi ini diawali dari audit desain menyeluruh (pakai `taste-skill:redesign-skill`) yang menilai app 7.5/10: landing page publik (`LandingPage.tsx`) sudah kuat — warna brand custom, `CurveAccent` sesuai brand guideline ("never straight"), tidak ada pola generic AI. Tapi 10 panel staf (`OwnerPanel`, `AdvisorPanel`, `AdvisorDashboard`, `AccountingPanel`, `WarehousePanel`, `TechnicianPanel`, `ManagerPanel`, `FinanceReportPanel`, `MarketingPanel`, `SlotBoard`) kelihatan generic: pola kartu KPI diulang identik di semua tempat (`bg-white border border-gray-200 p-5 rounded-2xl shadow-sm`), dan 100% pakai `lucide-react` tanpa diferensiasi visual.

Ini diverifikasi langsung di browser sungguhan (skill `agent-browser`, baru dipasang sesi ini) — login sebagai `owner@berlin188.com`, buka tiap tab (Laporan/Kelola WO/dll), screenshot. Dashboard-nya **fungsional dan rapi**, bukan rusak — cuma tidak punya identitas visual yang beda dari admin-panel template pada umumnya. Ini dashboard internal staf (bukan customer-facing), jadi keputusan buat investasi desain di sini murni soal kenyamanan kerja tim & kesan buat owner, bukan konversi pelanggan.

User memilih arah **"instrument panel"** — terinspirasi dashboard mobil premium (angka besar & presisi, aksen warna dipakai hemat, garis tipis, shadow minimal) — karena brand-nya sendiri "spesialis mobil Eropa". User juga memilih: semua 10 panel dikerjakan sekaligus (bukan bertahap), dan icon set diganti dari `lucide-react` ke `@phosphor-icons/react` (varian duotone) karena Lucide disebut di audit sebagai "pilihan default AI" yang berkontribusi ke kesan generic.

## Keputusan desain

### Token — dua tingkat elevation, bukan satu rata

Semua kartu staf saat ini pakai treatment yang sama persis di mana pun posisinya (KPI utama vs list sekunder vs promo — semua `border+shadow-sm+rounded-2xl`). Diganti jadi dua tier eksplisit:

- **Tier 1 (KPI utama / angka yang paling penting dilihat)**: shadow lembut di-tint warna navy brand (bukan `rgb(0 0 0 / alpha)` generic) — token baru `--shadow-instrument: 0 4px 6px -1px rgb(0 101 192 / 0.06), 0 2px 4px -2px rgb(0 101 192 / 0.04)` di `index.css`. Tanpa border. Radius `--radius-lg`.
- **Tier 2 (list, tabel, kartu sekunder)**: flat — cuma `border-gray-150` (garis tipis, tanpa shadow sama sekali). Radius `--radius-md`. Ini yang "mundur ke belakang" secara visual, bukan bersaing dengan Tier 1.

Angka uang (`formatRupiah`) dan hitungan (jumlah WO, jumlah staf) dapat `tabular-nums` di class-nya — detail kecil yang bikin kolom angka sejajar rapi, kerasa presisi instrumen bukan teks biasa.

Warna brand (navy/red/gold) tetap dipakai hemat — cuma buat status/alert/aksi utama, persis disiplin yang sudah ada di `STATUS_CONFIG`/`KPI_TONE` (`src/lib/design.ts`). Redesign ini **memperluas** disiplin itu ke KPI tile, bukan menambah palet baru.

### Komponen baru — cuma yang jadi biang generic (Pendekatan C, hybrid)

`src/lib/design.ts` sudah punya token `KpiTone`/`KPI_TONE` (success/warning/danger/info/neutral) tapi belum pernah dipakai jadi komponen nyata — tiap panel masih hand-roll div KPI-nya sendiri berulang-ulang. Redesign ini menambah **dua komponen shared baru**, bukan merombak arsitektur panel:

- **`<KpiTile>`** (baru, `src/components/ui/KpiTile.tsx`): props `label, value, sublabel?, icon, tone: KpiTone`. Merender kartu Tier 1 lengkap (icon tile + label + value bertabular-nums + sublabel). Menggantikan blok KPI 4-kolom yang diulang manual di `OwnerPanel`, `ManagerPanel`, `AccountingPanel`, `FinanceReportPanel`, dll.
- **`<IconTile>`** (baru, `src/components/ui/IconTile.tsx`): props `icon, tone: KpiTone`. Merender kotak icon berwarna (pola `w-8 h-8 rounded-lg bg-{tone}-50 ...` yang berulang) — dipakai sendiri oleh `<KpiTile>` maupun di tempat lain yang butuh icon bertone tanpa full KPI card (mis. baris tabel, daftar staf aktif).

Sisanya — layout spesifik tiap panel, form, tabel custom (mis. wizard 5-step di `AdvisorPanel`, papan slot di `SlotBoard`) — **direstyle langsung di tempat** mengikuti token Tier 1/Tier 2 di atas, tanpa dipaksa jadi komponen baru. Ini sesuai YAGNI: pola yang cuma dipakai di 1-2 tempat tidak diabstraksi.

### Migrasi icon — Lucide → Phosphor (duotone)

Tambah dependency `@phosphor-icons/react`. Ganti semua import `lucide-react` di 10 file panel staf ke padanan Phosphor, varian **duotone** (dua-nada, bisa di-tint sesuai `tone` KPI — beda dari Lucide yang cuma outline monoton abu-abu). `lucide-react` tetap dipakai di `LandingPage.tsx`/`ThemeToggle.tsx`/komponen publik lain — **tidak disentuh**, supaya bundle publik tidak kena migrasi yang tidak perlu dan risiko lebih kecil.

Inventaris icon per file (hasil grep sesi ini, jadi acuan mapping saat implementasi — bukan daftar final, beberapa nama Phosphor dikonfirmasi pas coding):

| File | Icon Lucide dipakai |
|---|---|
| `OwnerPanel` | DollarSign, Car, Users, TrendingUp, ShieldAlert, Clock, Calendar, CheckSquare, Sparkles, Award |
| `AdvisorPanel` | UserPlus, Car, Wrench, ChevronRight, Check, Sparkles, User, HelpCircle, FileText, ArrowRight, ShieldAlert, CheckCircle |
| `AdvisorDashboard` | Wrench, Users, CheckCircle2, ChevronRight, AlertTriangle, Search, Filter, Clock, Sparkles, User, FileText, ArrowLeft, Check, X, ShieldAlert, Car, RefreshCw, Smartphone, Camera, Upload, Trash2, AlertCircle, Plus, Send, Package, Settings |
| `AccountingPanel` | DollarSign, TrendingDown, TrendingUp, PlusCircle, FileText, X, Calendar, Filter, ChevronDown, Printer, Banknote, CreditCard, ShoppingCart, Zap, Users, MoreHorizontal, CheckCircle2, AlertCircle |
| `WarehousePanel` | Package, Search, Plus, MapPin, Trash2, ClipboardList, AlertCircle, CheckCircle2, ChevronRight, CornerDownRight, PackagePlus, Compass, Sliders, Hash, Check, X, RotateCcw |
| `TechnicianPanel` | ClipboardList, FileText, Wrench, Users, Info |
| `ManagerPanel` | TrendingUp, Car, Users, CheckCircle2, Clock, AlertTriangle, BarChart2, Calendar, Filter |
| `FinanceReportPanel` | TrendingUp, TrendingDown, Wallet, FileBarChart |
| `MarketingPanel` | Camera, Image, Star, Upload, Save, Loader2, Trash2, Plus, FileText, Eye, EyeOff, Pencil |
| `SlotBoard` | Wrench, X |

## Urutan implementasi

Semua 10 panel dikerjakan dalam satu putaran (pilihan user), tapi tetap perlu urutan internal supaya konsisten:

1. Token baru (`--shadow-instrument`, pemakaian `--radius-lg`/`--radius-md` yang disengaja) di `src/index.css`.
2. `<KpiTile>` + `<IconTile>` di `src/components/ui/` (folder baru), konsumsi `KPI_TONE` yang sudah ada di `design.ts` — tidak mengubah token itu sendiri.
3. Install `@phosphor-icons/react`.
4. Terapkan ke 10 panel: ganti KPI block manual → `<KpiTile>`, ganti card Tier 2 ke token flat, ganti import icon Lucide → Phosphor per file.
5. Verifikasi visual pakai skill `agent-browser`: login per role yang relevan (kredensial di `STAFF_CREDENTIALS.local.md`), screenshot tiap panel sebelum/sesudah, pastikan tidak ada regresi fungsional — ini murni restyle visual, nol perubahan logic/data/query.

## Batasan scope (sengaja tidak diubah)

- `LandingPage.tsx`, `ProductMarketplace.tsx`, `ProductCard.tsx`, `CartDrawer.tsx`, `WishlistDrawer.tsx`, `AiChat.tsx`, `TrackingPortal.tsx`, `BlogEditor.tsx`/`BlogListPage.tsx`/`BlogPostPage.tsx` — semua komponen publik/customer-facing tidak disentuh sama sekali.
- `src/lib/db.ts`, `src/lib/auth.ts`, skema Supabase — nol perubahan logic/backend. Redesign ini murni CSS/JSX/import icon.
- `STATUS_CONFIG`/`KPI_TONE`/`formatRupiah` di `design.ts` — dipakai, tidak diubah strukturnya.
- Data uji `WO-260805-G2LBP` ("TEST PERSISTENCE 2 - HAPUS") yang tersisa di database dari sesi verifikasi backend sebelumnya — di luar scope ini, ditahan sesuai instruksi user sebelumnya, tidak dihapus sebagai bagian pekerjaan ini.
