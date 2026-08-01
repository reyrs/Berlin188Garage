# Blog — desain fitur

*(Item terakhir dari daftar marketing: banner promosi & portofolio manual sudah selesai. Ini rencana untuk fitur ketiga, Blog.)*

## Konteks

`LandingPage.tsx` dan seluruh `App.tsx` adalah single-page app murni — navigasi antar "halaman" (`landing`, `tracking`, `marketplace`, `staff_portal`, `monitor_service`, `monitor_tunggu`) dilakukan lewat `useState<...>('landing')` di `App.tsx:83`, tanpa sinkronisasi ke `window.location` sama sekali. Refresh selalu kembali ke landing page; tidak ada dua path URL yang berbeda hari ini. Ini bukan masalah untuk Banner Promosi maupun Portofolio Manual (keduanya cukup jadi bagian dari satu halaman yang sama), tapi jadi masalah nyata untuk Blog: tujuan utama fitur ini adalah SEO dan link yang bisa di-share (dikonfirmasi user), yang mensyaratkan setiap post punya URL sendiri yang bisa dibuka langsung dan diindex mesin pencari.

## Keputusan arsitektur

**Routing**: pasang `react-router-dom`, di-scope minimal — cuma dua route baru, `/blog` dan `/blog/:slug`. Semua path lain (termasuk `/`) tetap dilayani oleh komponen `App` yang sekarang, **tidak diubah sama sekali** — `currentView` state machine yang ada tetap jalan persis seperti sebelumnya. `main.tsx` dibungkus `<BrowserRouter>` di level paling atas dengan `<Routes>`: `path="/blog"` → `BlogListPage`, `path="/blog/:slug"` → `BlogPostPage`, `path="*"` → `App` (default export saat ini, tanpa modifikasi). Karena Router membungkus di root, komponen `<Link>` dari react-router tetap bisa dipakai di mana pun di dalam tree `App` (misal nav "Blog" di `LandingPage.tsx`) tanpa masalah context — dua sistem navigasi (state-driven lama, URL-driven baru) hidup berdampingan tanpa saling mengganggu.

Alternatif yang dipertimbangkan dan ditolak: migrasi semua `currentView` ke routing beneran sekaligus. Ditolak karena scope jauh lebih besar dari yang diminta, `App.tsx` bakal dirombak signifikan, dan menambah risiko regresi di fitur-fitur yang sudah stabil (tracking, marketplace, staff portal) padahal tidak ada yang minta itu — YAGNI.

**Deployment**: tambah `vercel.json` dengan SPA rewrite (`"/(.*)"` → `/index.html`). Wajib, bukan opsional — tanpa ini, membuka `/blog/nama-post` langsung dari link WhatsApp (bukan lewat klik dari dalam app) akan menghasilkan 404 dari Vercel karena file statisnya memang tidak ada. Ini justru inti dari fitur yang diminta (link yang bisa dibagikan), jadi bukan hal yang bisa dilewatkan.

**Keterbatasan yang diterima secara sadar**: app ini client-side rendered, tanpa SSR/prerendering. Google (Googlebot modern menjalankan JS) tetap bisa mengindeks tiap post dengan baik. Tapi preview link di WhatsApp/Facebook (gambar + judul saat link di-paste) butuh crawler yang membaca meta tag TANPA menjalankan JS — sesuatu yang tidak bisa dipenuhi tanpa infrastruktur prerendering tambahan (mis. Supabase Edge Function yang mendeteksi user-agent bot dan membalas HTML pre-rendered). User sudah memutuskan: terima keterbatasan ini untuk sekarang (link tetap terbuka & berfungsi normal, cuma preview gambar/judul di WhatsApp akan menampilkan default logo Berlin188, bukan gambar/judul spesifik per-post). Bisa di-upgrade nanti sebagai proyek terpisah kalau ternyata krusial.

## Skema data

```sql
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);
```

- `content`: HTML string hasil rich text editor. **Disanitasi dengan `dompurify`, baik sebelum disimpan maupun sebelum dirender publik** — meski cuma staff terpercaya (`marketing`/`owner`) yang bisa menulis, ini defense-in-depth murah untuk mencegah HTML/script mentah nyasar lewat paste dari clipboard.
- `published_at`: diisi pertama kali post di-publish (bukan pas dibuat) — dipakai untuk urutan tampil di `/blog` (`ORDER BY published_at DESC`), supaya urutan tidak berubah kalau draft lama baru di-publish belakangan.
- `slug`: auto-generate dari `title` (slugify + lowercase + dash) di sisi client saat submit; dicek keunikan dulu (query existing slugs dengan prefix sama), kalau bentrok ditambah `-2`, `-3`, dst. Tidak ada field slug manual yang diekspos ke UI — sesuai keputusan user.
- `category`: dari daftar tetap (bukan free text) — `export const BLOG_CATEGORIES = ['Tips Perawatan', 'Berita Bengkel', 'Promo']` di `BlogListPage.tsx`, dipakai ulang di form MarketingPanel. Pola sama seperti `BRANDS` yang sudah ada untuk Portofolio.

RLS (pola `current_staff_role()` yang sama dengan tabel-tabel lain):
```sql
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_select_published"
  ON blog_posts FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "blog_posts_select_staff_all"
  ON blog_posts FOR SELECT TO authenticated
  USING (current_staff_role() IN ('marketing','owner'));

CREATE POLICY "blog_posts_write_marketing"
  ON blog_posts FOR ALL TO authenticated
  USING (current_staff_role() IN ('marketing','owner'))
  WITH CHECK (current_staff_role() IN ('marketing','owner'));
```
Dua policy `SELECT` untuk `authenticated` digabung otomatis dengan `OR` oleh Postgres (multiple permissive policies) — staff marketing/owner yang login tetap bisa lihat draft, staff role lain yang login (mis. kasir) tetap hanya lihat yang published (sama seperti publik).

Post yang diminta lewat slug tapi berstatus `draft` atau tidak ditemukan: tampilkan pesan jujur "Artikel nggak ditemukan" di `BlogPostPage`, jangan bocorkan bahwa draft-nya ada.

## Editor & upload gambar

`@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-image`. Toolbar dasar: bold, italic, heading, list, link, gambar inline. Upload gambar inline pakai fungsi `uploadLandingAsset(file, 'blog')` yang sudah ada di `src/lib/db.ts` (dipakai ulang, sama seperti pola hero image dan portfolio image) — tidak perlu bucket storage baru, tetap `landing-assets`.

## Halaman publik

- **`/blog`** (`BlogListPage.tsx`, baru): grid card — cover image, judul, ringkasan (`excerpt`), badge kategori, tanggal `published_at` — dari post `status='published'`, urut terbaru dulu. Filter kategori (tombol, pola sama seperti filter merek di Portofolio). Empty state jujur kalau belum ada post sama sekali ("Artikel segera hadir").
- **`/blog/:slug`** (`BlogPostPage.tsx`, baru): fetch satu post by slug + `status='published'`. Set `document.title` dan `<meta name="description">` lewat `useEffect` (baik untuk Google, sesuai keputusan soal keterbatasan WhatsApp di atas). Render `content` (HTML tersanitasi) langsung. Tombol balik ke `/blog` dan ke beranda (`/`).
- Nav "Blog" ditambahkan ke `LandingPage.tsx` (link ke `/blog` via `<Link>` dari react-router).

## Tab "Blog" di MarketingPanel

Tab ke-4 (setelah Galeri, Banner Beranda, Portofolio Beranda). List semua post milik staff (termasuk draft — sesuai RLS `blog_posts_select_staff_all`), dengan status badge, tombol edit/hapus, toggle draft ⇄ publish. Form tambah/edit: judul, kategori (dropdown dari `BLOG_CATEGORIES`), ringkasan (textarea, field manual — bukan auto-generate dari isi, sesuai keputusan user supaya hasil share rapi), cover image (upload wajib, konsisten dengan pola Portofolio), editor Tiptap, tombol "Simpan Draft" / "Publish" (mengubah `status`, dan mengisi `published_at` kalau ini pertama kali dipublish).

## Dependency baru

Ini pertama kalinya sesi ini menambah dependency baru — Banner Promosi dan Portofolio Manual kemarin nol dependency tambahan:
- `react-router-dom` — routing.
- `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-image` — rich text editor.
- `dompurify` — sanitasi HTML sebelum simpan/render.

## Yang sengaja di luar scope

- Prerendering/deteksi-bot untuk preview WhatsApp yang akurat per-post (keputusan sudah diambil, lihat bagian "Keterbatasan yang diterima secara sadar" di atas).
- Komentar, related posts, search, pagination — bisa ditambah belakangan kalau jumlah post sudah banyak dan benar-benar dibutuhkan.
- Multi-author/editorial workflow di luar toggle draft/publish sederhana (mis. approval terpisah, revision history).

## Rencana verifikasi

1. `npm run lint` && `npm run build`.
2. Skrip Node: akun marketing sementara (pola sama seperti verifikasi Portofolio) — pastikan bisa INSERT/UPDATE/DELETE `blog_posts` termasuk toggle status; pastikan anon HANYA bisa SELECT post `status='published'` (tidak bisa lihat draft, tidak bisa tulis apa pun) — dikonfirmasi lewat row-count, bukan cuma cek ada-error. Akun sementara dihapus di akhir.
3. Playwright: buka `/blog` (harus 200, bukan 404 dari Vercel setelah rewrite dipasang — tapi untuk dev server lokal ini otomatis jalan; validasi `vercel.json` dicek terpisah lewat `vercel dev` atau review manual), screenshot sebelum/sesudah publish 1 post lewat service role, pastikan card muncul dengan gambar asli; buka `/blog/:slug` langsung (simulasi orang buka link share) dan pastikan konten tampil; coba akses slug yang masih `draft` dan pastikan pesan "tidak ditemukan" muncul (bukan bocorin konten draft).
4. `git status` — pastikan cuma file yang relevan yang berubah.
