# Pemisahan Pintu Masuk Staf (Opsi B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing page publik (`/`) tidak lagi punya tombol/jejak apa pun ke dashboard staf; login staf pindah ke route tersendiri (`/staff`) yang kodenya (9 panel + papan monitor + form login) di-lazy-load, jadi tidak ikut ke-download pengunjung publik.

**Architecture:** Satu route baru `/staff` (react-router, sudah dipakai untuk `/blog`) me-render komponen `App` yang sama persis dengan yang dipakai `/`, tapi lewat prop `entryMode="staff"` yang mengubah state awal `currentView` dari `'landing'` jadi `'staff_login'`. Sembilan panel staf + `SlotBoard` + `LoginModal` diubah dari static import jadi `React.lazy()`, dibungkus `<React.Suspense>` di titik render masing-masing — jadi chunk-nya cuma diminta browser kalau `currentView` benar-benar butuh salah satu dari itu. Tidak ada perubahan deployment/domain/database.

**Tech Stack:** React 19, react-router-dom (sudah jadi dependency), Vite (code-splitting otomatis dari `React.lazy()` + dynamic `import()`), TypeScript.

## Global Constraints

- Setiap task diakhiri `npm run lint` (alias `tsc --noEmit`) harus bersih sebelum lanjut ke task berikutnya.
- Tidak ada framework test otomatis di proyek ini (`package.json` dicek — tidak ada Jest/Vitest). Verifikasi dilakukan lewat `tsc --noEmit` + skrip Playwright manual (pola yang sama persis dipakai sepanjang sesi ini) — bukan unit test.
- Jalankan dev server dengan `npm run dev` (port 3000), matikan dengan `lsof -ti:3000 -sTCP:LISTEN | xargs -r kill` setelah selesai verifikasi tiap task — pola yang sudah dipakai berulang kali di sesi ini.
- Kredensial staf untuk verifikasi: `owner@berlin188.com` / `4c%PQQHe4MTMCyRy` (lihat `STAFF_CREDENTIALS.local.md`).
- Jangan sentuh `LandingPage.tsx`/`ProductMarketplace.tsx` selain yang eksplisit disebut di task (hapus tombol "Masuk Staff") — batasan proyek yang sudah berlaku.
- Commit di akhir tiap task (bukan ditumpuk di akhir plan) — pola "frequent commits".

---

## File Structure

- Modify: `src/main.tsx` — tambah satu `<Route path="/staff" .../>`.
- Create: `public/robots.txt` — baru, satu baris `Disallow`.
- Modify: `src/App.tsx` — prop `entryMode`, state `currentView` dapat member baru `'staff_login'`, kondisi restore-sesi, render branch baru, konversi 11 import jadi `React.lazy`, tambah `<React.Suspense>` di 3 titik render, hapus `isLoginModalOpen` + render `<LoginModal>` lama + prop `onOpenLogin` yang dioper ke `LandingPage`.
- Modify: `src/components/LoginModal.tsx` — tambah prop `variant?: 'modal' | 'page'`.
- Modify: `src/components/LandingPage.tsx` — hapus prop `onOpenLogin` dan tombol "Masuk Staff".

---

### Task 1: Route `/staff` + `robots.txt`

**Files:**
- Modify: `src/main.tsx`
- Create: `public/robots.txt`

**Interfaces:**
- Produces: route URL `/staff` yang me-render `<App entryMode="staff" />` — dipakai Task 2 dst.

- [ ] **Step 1: Tambah route `/staff` di `main.tsx`**

File `src/main.tsx` isinya sekarang:

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import App from './App.tsx';
import BlogListPage from './components/BlogListPage.tsx';
import BlogPostPage from './components/BlogPostPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
```

Ganti isinya jadi (satu baris `<Route>` baru sebelum catch-all, tidak ada lagi yang berubah):

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import App from './App.tsx';
import BlogListPage from './components/BlogListPage.tsx';
import BlogPostPage from './components/BlogPostPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/staff" element={<App entryMode="staff" />} />
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
```

Catatan: `<App entryMode="staff" />` akan gagal type-check sampai Task 2 selesai (prop `entryMode` belum ada di `App`). Itu wajar — lanjut ke Step 2 dulu (file baru, tidak butuh type-check), baru Step 3 nanti akan tetap gagal sampai Task 2. Untuk task ini saja, cukup pastikan **tidak ada error BARU selain** `Property 'entryMode' does not exist` — itu yang akan ditutup Task 2.

- [ ] **Step 2: Buat `public/robots.txt`**

```
User-agent: *
Disallow: /staff
```

- [ ] **Step 3: Jalankan type-check, catat error yang diharapkan**

Run: `npm run lint`
Expected: satu error, persis `Property 'entryMode' does not exist on type 'IntrinsicAttributes'` (atau redaksi serupa) di `src/main.tsx` pada baris `<App entryMode="staff" />`. Kalau ada error LAIN selain ini, hentikan dan periksa ulang Step 1.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx public/robots.txt
git commit -m "feat: add /staff route and robots.txt disallow (staff entry point WIP)"
```

---

### Task 2: `entryMode` prop, state `staff_login`, render login di `/staff`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: route `/staff` dari Task 1.
- Produces: `App` menerima prop `entryMode?: 'public' | 'staff'`; state `currentView` sekarang bisa bernilai `'staff_login'`; membuka `/staff` (belum login) menampilkan `<LoginModal>` (masih gaya modal lama, akan diubah tampilannya di Task 3).

- [ ] **Step 1: Ubah signature fungsi `App` untuk menerima `entryMode`**

Di `src/App.tsx` baris 73, ganti:

```tsx
export default function App() {
```

jadi:

```tsx
export default function App({ entryMode = 'public' }: { entryMode?: 'public' | 'staff' }) {
```

- [ ] **Step 2: Tambah `'staff_login'` ke union type `currentView`, dan mulai dari sana kalau `entryMode === 'staff'`**

Baris 83, ganti:

```tsx
  const [currentView, setCurrentView] = useState<'landing' | 'tracking' | 'staff_portal' | 'monitor_service' | 'monitor_tunggu' | 'marketplace'>('landing');
```

jadi:

```tsx
  const [currentView, setCurrentView] = useState<'landing' | 'tracking' | 'staff_portal' | 'monitor_service' | 'monitor_tunggu' | 'marketplace' | 'staff_login'>(entryMode === 'staff' ? 'staff_login' : 'landing');
```

- [ ] **Step 3: Update kondisi restore-sesi supaya `staff_login` juga naik ke `staff_portal` kalau sesi valid**

Di efek "RESTORE STAFF SESSION" (sekitar baris 156), ganti:

```tsx
          setCurrentView((v) => (v === 'landing' ? 'staff_portal' : v));
```

jadi:

```tsx
          setCurrentView((v) => (v === 'landing' || v === 'staff_login' ? 'staff_portal' : v));
```

Ini memastikan: staf yang sudah login (sesi Supabase Auth masih valid di browser) yang buka `/staff` langsung masuk dashboard, tidak disuruh login ulang.

- [ ] **Step 4: Tambah render branch untuk `staff_login`**

Cari blok `{currentView === 'landing' && ( ... )}` (sekarang berakhir dengan `)}` diikuti baris kosong lalu `{currentView === 'marketplace' && (`). Sisipkan blok baru PERSIS di antara keduanya:

```tsx
        {currentView === 'staff_login' && (
          <LoginModal
            isOpen={true}
            onClose={() => {}}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

```

(Blok `LandingPage`/`marketplace`/`tracking`/`staff_portal` yang sudah ada di sekitarnya TIDAK diubah sama sekali — cuma menyisipkan blok baru ini di antaranya.)

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: bersih, tidak ada error sama sekali (error dari Task 1 soal `entryMode` sekarang sudah tertutup).

- [ ] **Step 6: Verifikasi manual di browser**

```bash
cd /Users/reyhanresha/Documents/project/berlin188-garage-final
(npm run dev > /tmp/berlin188-dev.log 2>&1 &) ; for i in $(seq 1 30); do curl -sf http://localhost:3000 >/dev/null && echo READY && break; sleep 1; done
```

Buka `http://localhost:3000/staff` di browser (atau lewat Playwright): harus tampil form login (dengan backdrop gelap ngambang di atas layar polos gelap — masih "kurang rapi" secara visual, itu wajar, akan dirapikan Task 3). Login pakai `owner@berlin188.com` / `4c%PQQHe4MTMCyRy` → harus berhasil masuk ke dashboard (tampilan sama seperti sebelum ada perubahan ini).

Buka `http://localhost:3000/` (tanpa apa-apa) — harus tetap tampil landing page seperti biasa, tombol "Masuk Staff" masih ada (belum dihapus, itu Task 4) dan masih berfungsi seperti sebelumnya (dua jalur login hidup berdampingan sementara).

Matikan dev server:
```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: /staff route shows a real login screen, gated by entryMode prop"
```

---

### Task 3: `LoginModal` varian halaman-penuh

**Files:**
- Modify: `src/components/LoginModal.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `LoginModal` dari Task 2 (dipakai di render branch `staff_login`).
- Produces: `LoginModal` menerima prop baru `variant?: 'modal' | 'page'` (default `'modal'`, supaya konsumen manapun yang tidak eksplisit set prop ini tetap dapat perilaku identik dengan sebelumnya).

- [ ] **Step 1: Tambah prop `variant` ke `LoginModal`**

Di `src/components/LoginModal.tsx`, ganti interface & signature (baris 7-19):

```tsx
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email atau password salah.';
  if (message.includes('Email not confirmed')) return 'Akun belum dikonfirmasi. Hubungi admin.';
  return 'Gagal masuk. Coba lagi beberapa saat.';
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
```

jadi:

```tsx
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  variant?: 'modal' | 'page';
}

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email atau password salah.';
  if (message.includes('Email not confirmed')) return 'Akun belum dikonfirmasi. Hubungi admin.';
  return 'Gagal masuk. Coba lagi beberapa saat.';
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess, variant = 'modal' }: LoginModalProps) {
```

- [ ] **Step 2: Ganti wrapper terluar & tombol tutup supaya bercabang sesuai `variant`**

Cari baris (di dalam `return (...)`, sebelum komentar `{/* Banner decorator */}`):

```tsx
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        {/* Banner decorator */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-berlin-navy" />

        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between mt-1">
          <div className="flex items-center">
              <img
                src="/logo-on-white.png"
                alt="Berlin 188 Garage"
                className="h-10 object-contain"
              />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-black border border-gray-150 hover:border-gray-250 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
```

Ganti jadi:

```tsx
  return (
    <div className={variant === 'page'
      ? 'min-h-screen flex items-center justify-center p-4 bg-gray-50'
      : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'
    }>
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        {/* Banner decorator */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-berlin-navy" />

        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between mt-1">
          <div className="flex items-center">
              <img
                src="/logo-on-white.png"
                alt="Berlin 188 Garage"
                className="h-10 object-contain"
              />
          </div>
          {variant === 'modal' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-black border border-gray-150 hover:border-gray-250 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
```

(Tidak ada bagian lain dari file ini yang berubah — form, validasi, `handleLogin`, `handleForgotPassword` semua tetap persis sama.)

- [ ] **Step 3: Pakai `variant="page"` di render branch `staff_login`**

Di `src/App.tsx`, blok yang ditambahkan Task 2:

```tsx
        {currentView === 'staff_login' && (
          <LoginModal
            isOpen={true}
            onClose={() => {}}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
```

Ganti jadi:

```tsx
        {currentView === 'staff_login' && (
          <LoginModal
            isOpen={true}
            variant="page"
            onClose={() => {}}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
```

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: bersih.

- [ ] **Step 5: Verifikasi manual**

Ulangi langkah start dev server dari Task 2 Step 6. Buka `/staff` — sekarang harus tampil form login memenuhi layar penuh, background abu-abu terang (`bg-gray-50`), **tanpa** backdrop gelap dan **tanpa** tombol X di pojok kanan atas card. Login tetap berhasil seperti sebelumnya. Matikan dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/LoginModal.tsx src/App.tsx
git commit -m "feat: full-page LoginModal variant for the /staff entry point"
```

---

### Task 4: Hapus tombol "Masuk Staff" dari landing page

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: tidak ada lagi cara masuk dashboard dari `LandingPage` — `/staff` (Task 2+3) jadi satu-satunya jalur.

- [ ] **Step 1: Hapus prop `onOpenLogin` dari interface & destructuring `LandingPage`**

Di `src/components/LandingPage.tsx`, ganti:

```tsx
interface LandingPageProps {
  onCheckOrder: () => void;
  onOpenLogin: () => void;
  onSelectSampleOrder: () => void;
  onOpenMarketplace?: () => void;
  orders?: Order[];
  heroContent?: HeroContent | null;
  portfolioItems?: PortfolioItem[];
}
```

jadi:

```tsx
interface LandingPageProps {
  onCheckOrder: () => void;
  onSelectSampleOrder: () => void;
  onOpenMarketplace?: () => void;
  orders?: Order[];
  heroContent?: HeroContent | null;
  portfolioItems?: PortfolioItem[];
}
```

Dan ganti:

```tsx
export default function LandingPage({ onCheckOrder, onOpenLogin, onSelectSampleOrder, onOpenMarketplace, orders = [], heroContent, portfolioItems = [] }: LandingPageProps) {
```

jadi:

```tsx
export default function LandingPage({ onCheckOrder, onSelectSampleOrder, onOpenMarketplace, orders = [], heroContent, portfolioItems = [] }: LandingPageProps) {
```

- [ ] **Step 2: Hapus tombol "Masuk Staff"**

Cari (persis setelah tombol "Cek Servis"):

```tsx
            <button onClick={onOpenLogin}
              className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                scrolled
                  ? 'border border-berlin-navy text-berlin-navy hover:bg-berlin-navy hover:text-white'
                  : 'border border-white/30 text-white hover:bg-white/10'
              }`}>
              Masuk Staff
            </button>
```

Hapus blok itu seluruhnya (tidak diganti apa pun).

- [ ] **Step 3: Hapus `isLoginModalOpen`, `onOpenLogin` prop, dan render `<LoginModal>` lama dari `App.tsx`**

Hapus baris deklarasi state (sekitar baris 85):

```tsx
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
```

Di render `<LandingPage>`, hapus baris:

```tsx
            onOpenLogin={() => setIsLoginModalOpen(true)}
```

dari daftar prop-nya (baris-baris prop lain di sekitarnya — `onCheckOrder`, `onSelectSampleOrder`, `onOpenMarketplace`, `orders`, `heroContent`, `portfolioItems` — tidak berubah).

Di paling bawah komponen (sebelum `</div>` penutup & `);` penutup fungsi), hapus render `<LoginModal>` yang lama:

```tsx
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
```

(Render `<LoginModal>` yang BARU, di dalam blok `{currentView === 'staff_login' && (...)}` dari Task 2/3, **tetap ada** — yang dihapus cuma render lama yang tadinya ada di paling bawah, di luar `<main>`.)

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: bersih. Kalau ada error "unused variable" untuk sesuatu selain yang disebut di atas, periksa ulang — kemungkinan ada sisa referensi yang terlewat.

- [ ] **Step 5: Verifikasi manual**

Start dev server (pola sama seperti sebelumnya). Buka `/` — pastikan tombol "Masuk Staff" **tidak ada** di mana pun (cek visual + `grep`-style check: teks "Masuk Staff" tidak muncul di DOM). Buka `/staff` — form login penuh masih tampil & berfungsi seperti Task 3. Matikan dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/LandingPage.tsx src/App.tsx
git commit -m "feat: remove Masuk Staff button — /staff is now the only entry point"
```

---

### Task 5: Lazy-load kode dashboard staf

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: 11 komponen (`LoginModal`, `AdvisorPanel`, `AdvisorDashboard`, `AccountingPanel`, `OwnerPanel`, `WarehousePanel`, `SlotBoard`, `TechnicianPanel`, `ManagerPanel`, `FinanceReportPanel`, `MarketingPanel`) jadi chunk terpisah, cuma ke-download kalau `currentView` benar-benar butuh salah satunya.

- [ ] **Step 1: Ganti static import jadi `React.lazy()` untuk 11 komponen staf**

Cari blok import (baris 8-22):

```tsx
// Components
import LandingPage from './components/LandingPage';
import TrackingPortal from './components/TrackingPortal';
import LoginModal from './components/LoginModal';
import AdvisorPanel from './components/AdvisorPanel';
import AdvisorDashboard from './components/AdvisorDashboard';
import AccountingPanel from './components/AccountingPanel';
import OwnerPanel from './components/OwnerPanel';
import WarehousePanel from './components/WarehousePanel';
import SlotBoard from './components/SlotBoard';
import TechnicianPanel from './components/TechnicianPanel';
import ManagerPanel from './components/ManagerPanel';
import FinanceReportPanel from './components/FinanceReportPanel';
import MarketingPanel from './components/MarketingPanel';
import ProductMarketplace from './components/ProductMarketplace';
```

Ganti jadi:

```tsx
// Components — dipakai pengunjung publik (`/`), tetap static import
import LandingPage from './components/LandingPage';
import TrackingPortal from './components/TrackingPortal';
import ProductMarketplace from './components/ProductMarketplace';

// Components — cuma dipakai lewat /staff. Lazy-load supaya kode ini tidak
// pernah ikut ke-download pengunjung publik (lihat docs/superpowers/specs/
// 2026-08-03-staff-entry-separation-design.md).
const LoginModal = React.lazy(() => import('./components/LoginModal'));
const AdvisorPanel = React.lazy(() => import('./components/AdvisorPanel'));
const AdvisorDashboard = React.lazy(() => import('./components/AdvisorDashboard'));
const AccountingPanel = React.lazy(() => import('./components/AccountingPanel'));
const OwnerPanel = React.lazy(() => import('./components/OwnerPanel'));
const WarehousePanel = React.lazy(() => import('./components/WarehousePanel'));
const SlotBoard = React.lazy(() => import('./components/SlotBoard'));
const TechnicianPanel = React.lazy(() => import('./components/TechnicianPanel'));
const ManagerPanel = React.lazy(() => import('./components/ManagerPanel'));
const FinanceReportPanel = React.lazy(() => import('./components/FinanceReportPanel'));
const MarketingPanel = React.lazy(() => import('./components/MarketingPanel'));
```

- [ ] **Step 2: Tambah komponen fallback loading**

Sisipkan fungsi baru persis sebelum `export default function App(...)`:

```tsx
function StaffLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
      Memuat...
    </div>
  );
}

```

- [ ] **Step 3: Bungkus `<SlotBoard>` (papan monitor) dengan `<React.Suspense>`**

Cari (early return sebelum `<main>`, sekitar baris 773-785):

```tsx
  if (currentView === 'monitor_service' || currentView === 'monitor_tunggu') {
    return (
      <div>
        <button
          onClick={() => setCurrentView('staff_portal')}
          className="print:hidden fixed top-4 left-4 z-50 bg-gray-800 text-gray-200 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700"
        >
          ← Kembali
        </button>
        <SlotBoard orders={orders} interactive={currentView === 'monitor_service'} />
      </div>
    );
  }
```

Ganti jadi:

```tsx
  if (currentView === 'monitor_service' || currentView === 'monitor_tunggu') {
    return (
      <div>
        <button
          onClick={() => setCurrentView('staff_portal')}
          className="print:hidden fixed top-4 left-4 z-50 bg-gray-800 text-gray-200 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700"
        >
          ← Kembali
        </button>
        <React.Suspense fallback={<StaffLoadingFallback />}>
          <SlotBoard orders={orders} interactive={currentView === 'monitor_service'} />
        </React.Suspense>
      </div>
    );
  }
```

- [ ] **Step 4: Bungkus `<LoginModal>` (render branch `staff_login`) dengan `<React.Suspense>`**

Ganti:

```tsx
        {currentView === 'staff_login' && (
          <LoginModal
            isOpen={true}
            variant="page"
            onClose={() => {}}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
```

jadi:

```tsx
        {currentView === 'staff_login' && (
          <React.Suspense fallback={<StaffLoadingFallback />}>
            <LoginModal
              isOpen={true}
              variant="page"
              onClose={() => {}}
              onLoginSuccess={handleLoginSuccess}
            />
          </React.Suspense>
        )}
```

- [ ] **Step 5: Bungkus seluruh isi `staff_portal` (9 panel) dengan satu `<React.Suspense>`**

Cari (sekitar baris 884, awal area konten dashboard):

```tsx
            <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">

              {activeTab === 'dashboard' && (
```

Ganti baris pembuka itu jadi:

```tsx
            <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">
              <React.Suspense fallback={<StaffLoadingFallback />}>

              {activeTab === 'dashboard' && (
```

Lalu cari penutup blok ini (sekitar baris 991-994):

```tsx
              {!getTabsForRole(activeStaffUser.role).find(t => t.id === activeTab) && (
                <div className="bg-white border border-gray-200 p-10 rounded-2xl text-center">
                  <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Pilih menu di atas untuk memulai.</p>
                </div>
              )}
            </div>
          </div>
        )}
```

Ganti jadi (tambah satu baris penutup `</React.Suspense>` sebelum `</div>` yang menutup `max-w-7xl`):

```tsx
              {!getTabsForRole(activeStaffUser.role).find(t => t.id === activeTab) && (
                <div className="bg-white border border-gray-200 p-10 rounded-2xl text-center">
                  <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Pilih menu di atas untuk memulai.</p>
                </div>
              )}
              </React.Suspense>
            </div>
          </div>
        )}
```

(Semua 9 blok `{activeTab === '...' && (<XxxPanel .../>)}` di antara dua titik ini TIDAK diubah isinya sama sekali — cuma sekarang berada di dalam `<React.Suspense>`.)

- [ ] **Step 6: Type-check**

Run: `npm run lint`
Expected: bersih.

- [ ] **Step 7: Verifikasi manual — dashboard tetap berfungsi**

Start dev server. Login di `/staff` (`owner@berlin188.com` / `4c%PQQHe4MTMCyRy`). Klik minimal 3 tab berbeda (misal "Buat WO", "Kelola WO", "Gudang") — pastikan semua render normal seperti sebelum Task 5 (sempat kelihatan sekilas teks "Memuat..." pas pertama kali pindah tab, itu normal/diharapkan — tanda lazy-load jalan). Matikan dev server.

- [ ] **Step 8: Verifikasi build produksi — konfirmasi chunk splitting sungguhan**

```bash
cd /Users/reyhanresha/Documents/project/berlin188-garage-final
npm run build 2>&1 | tail -40
ls -la dist/assets/ | grep -iE "ownerpanel|advisorpanel|warehousepanel|loginmodal"
```

Expected: `npm run build` sukses tanpa error, dan `ls` menunjukkan file JS terpisah untuk masing-masing (misal `OwnerPanel-a1b2c3.js`, `LoginModal-d4e5f6.js`, dst.) — ini bukti Vite benar-benar memecah komponen-komponen itu jadi chunk sendiri, bukan ikut nempel di bundle utama.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "perf: lazy-load all staff-only panels so public bundle excludes them"
```

---

### Task 6: Verifikasi end-to-end & tutup plan

**Files:** tidak ada perubahan kode — task ini murni verifikasi gabungan dari Task 1-5, plus cek regresi ke fitur yang tidak disentuh (blog, tracking, marketplace).

- [ ] **Step 1: Jalankan dev server**

```bash
cd /Users/reyhanresha/Documents/project/berlin188-garage-final
(npm run dev > /tmp/berlin188-dev.log 2>&1 &) ; for i in $(seq 1 30); do curl -sf http://localhost:3000 >/dev/null && echo READY && break; sleep 1; done
```

- [ ] **Step 2: Skrip Playwright verifikasi menyeluruh**

Buat file `/tmp/verify-staff-split.mjs` (pakai `playwright` yang sudah ter-install di sesi-sesi sebelumnya — kalau belum ada di environment baru, `npm install playwright@1.62.1` dulu di direktori manapun yang boleh nulis):

```js
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

// 1. Landing page publik: tidak ada jejak "Masuk Staff"
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
const hasStaffButton = await page.getByText('Masuk Staff').count();
console.log('1. Tombol "Masuk Staff" di landing page (harus 0):', hasStaffButton);

// 2. Cek tidak ada chunk staff yang ke-download di landing page
const requestedUrls = [];
page.on('request', req => requestedUrls.push(req.url()));
await page.reload({ waitUntil: 'networkidle' });
const staffChunkLoaded = requestedUrls.some(u => /ownerpanel|advisorpanel|warehousepanel|loginmodal/i.test(u));
console.log('2. Chunk staff ikut ke-download di "/" (harus false):', staffChunkLoaded);

// 3. /staff tanpa sesi -> halaman login penuh, bukan landing page
await page.goto('http://localhost:3000/staff', { waitUntil: 'networkidle' });
const hasLoginForm = await page.locator('input[type=email]').count();
const hasLandingHero = await page.getByText('Masuk Staff').count(); // harus 0 (tombol dihapus) DAN bukan berarti ini landing page
console.log('3. Form login tampil di /staff (harus >=1):', hasLoginForm);

// 4. Login dan cek dashboard jalan
await page.locator('input[type=email]').fill('owner@berlin188.com');
await page.locator('input[type=password]').fill('4c%PQQHe4MTMCyRy');
await page.getByRole('button', { name: /MASUK/ }).click();
await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'Kelola WO', exact: true }).click();
await page.waitForTimeout(1200);
const kelolaWoWorks = await page.getByText('Dashboard Progres & Persetujuan').count();
console.log('4. Kelola WO jalan setelah login (harus >=1):', kelolaWoWorks);

// 5. Reload /staff sambil sudah login -> harus langsung ke dashboard, skip form login
await page.goto('http://localhost:3000/staff', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const stillLoggedIn = await page.getByText('Owner Berlin 188').count();
console.log('5. Sesi persist, /staff langsung ke dashboard (harus >=1):', stillLoggedIn);

// 6. Fitur publik lain tidak regresi
await page.goto('http://localhost:3000/blog', { waitUntil: 'networkidle' });
console.log('6a. /blog masih jalan, status ok:', page.url().includes('/blog'));

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.getByText('Cek Servis', { exact: true }).click();
await page.waitForTimeout(800);
const trackingPageWorks = await page.getByText('Portal Pelacakan Progres').count();
console.log('6b. Cek Servis (tracking) masih jalan (harus >=1):', trackingPageWorks);

// 7. robots.txt ke-serve
const robotsRes = await page.goto('http://localhost:3000/robots.txt');
const robotsBody = await robotsRes.text();
console.log('7. robots.txt berisi "Disallow: /staff":', robotsBody.includes('Disallow: /staff'));

console.log('\nConsole/page errors selama semua langkah di atas:', JSON.stringify(consoleErrors, null, 2));

await browser.close();
```

Jalankan: `node /tmp/verify-staff-split.mjs`

Expected: semua baris `console.log` bernomor 1-7 sesuai keterangan "(harus ...)" di sampingnya, dan `consoleErrors` di akhir tidak berisi error baru yang berhubungan dengan routing/lazy-loading (boleh ada noise lama yang sudah dikenal seperti `42501 row-level security... warehouse_stock` — itu isu lama yang tidak berhubungan, sudah didokumentasikan di memory proyek, bukan regresi dari perubahan ini).

- [ ] **Step 3: Matikan dev server**

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

- [ ] **Step 4: Commit penutup (kalau ada file skrip verifikasi yang sengaja disimpan) atau langsung lanjut kalau tidak ada perubahan kode**

Task ini murni verifikasi — kalau semua Step 2 lolos tanpa perlu perubahan kode tambahan, tidak ada commit baru di sini (commit terakhir tetap yang dari Task 5). Kalau Step 2 menemukan regresi, perbaiki dulu di file terkait, ulangi Step 2, baru commit perbaikannya dengan pesan yang menjelaskan apa yang diperbaiki.
