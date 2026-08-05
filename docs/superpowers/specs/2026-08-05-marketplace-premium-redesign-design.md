# Redesign marketplace — gaya "e-commerce premium" sesuai karakter Berlin188

## Konteks

Lanjutan dari redesign dashboard staff (instrument-panel) sesi ini. User bertanya apakah landing page & marketplace desainnya masih kurang. Setelah dibaca ulang: **landing page sudah kuat**, tapi user secara spesifik ingin marketplace (`ProductMarketplace.tsx`, `ProductCard.tsx`, `CartDrawer.tsx`, `WishlistDrawer.tsx`) di-upgrade jadi "premium, sesuai karakter kita, gak boring".

Diagnosis setelah baca semua file terkait: **bukan semuanya generic**. Header, hero band (`bg-berlin-navy-light` dengan lingkaran dekoratif "never straight"), dan tab filter merek (sudah pakai `CurveAccent`) sudah brand-consistent. Yang generic justru **lapisan interaksi belanja**: state aktif/hover di sidebar kategori, sort dropdown, dan pagination semua pakai `bg-gray-900 dark:bg-white` polos (bukan warna brand), `ProductCard` pakai badge pill abu-abu standar dan tombol tambah-keranjang monokrom, serta grid produk 100% seragam (3 kolom rata — pola yang sama yang ditandai sebagai "ciri AI-generic" di audit desain staff dashboard sebelumnya).

User awalnya minta scope minimal (ganti warna + badge), lalu secara eksplisit minta dinaikkan ke rating 9/10 dengan menambahkan 3 elemen: grid tidak seragam, hierarki harga lebih dominan, dan micro-motion scroll — yang terakhir ini reuse pola `data-reveal`/`IntersectionObserver` yang sudah ada di `LandingPage.tsx` (lines 56-69) tapi belum pernah dipakai di marketplace.

**Constraint eksplisit dari user (di luar redesign ini)**: jangan sentuh `LandingPage.tsx` itu sendiri, `AiChat.tsx` (logic AI chat), atau apa pun di backend/`src/lib/db.ts`/`src/lib/supabase.ts`. Ini murni redesign visual pada 4 file: `ProductCard.tsx`, `ProductMarketplace.tsx`, `CartDrawer.tsx`, `WishlistDrawer.tsx`.

## Keputusan desain

### 1. Token warna & bentuk — brand, bukan monokrom

Ganti semua state aktif/CTA yang sekarang `bg-gray-900 dark:bg-white` / `text-gray-900 dark:text-white` menjadi bahasa brand:
- **Aktif (filter kategori sidebar, tab merek yang sudah benar, pagination halaman aktif)**: `bg-berlin-navy text-white` (bukan hitam/putih polos).
- **Sort dropdown & search input**: border default tetap netral (`border-gray-200`), tapi `focus:border-berlin-navy` menggantikan `focus:border-gray-500` generic.
- **`.badge-brand`** (utility baru di `index.css`): pengganti pill abu-abu generic untuk label kategori/brand di `ProductCard` — bentuk sedikit miring/terpotong di satu sudut (bukan pill simetris sempurna), konsisten dengan aturan brand guideline "aksen tidak pernah lurus sempurna" yang sudah diterapkan lewat `CurveAccent`.
- **`.card-product`** (utility baru): shadow tinted navy tipis untuk `ProductCard` (mirip semangat `card-instrument` dari redesign dashboard, tapi token terpisah — beda konteks, jangan pakai ulang token dashboard secara langsung supaya masing-masing bisa berubah independen nanti). Radius sedikit lebih besar dari kartu dashboard supaya foto produk terasa "dipajang".

### 2. Hierarki harga jadi dominan

Di `ProductCard`, urutan bobot visual saat ini: nama produk (`text-sm font-semibold`) ≈ harga (`font-extrabold`, ukuran sama). Dibalik: harga naik ke `text-lg font-black tabular-nums text-berlin-navy`, nama produk turun jadi elemen sekunder (`text-xs font-medium text-gray-600`). Prinsip sama seperti `KpiTile` di dashboard — angka yang paling penting dilihat customer (harga) harus paling dominan.

Terapkan juga di modal detail produk (`ProductMarketplace.tsx` baris ±375-378, blok harga di dalam modal) dan di `CartDrawer`/`WishlistDrawer` (baris harga per item) — supaya konsisten di semua tempat harga muncul, bukan cuma di grid card.

### 3. Grid tidak seragam — pecah pola "3 kolom rata"

Murni CSS, tanpa mengubah `Product`/data produk (`data/products.ts` tidak disentuh, tidak ada field baru seperti `featured`). Pakai CSS `nth-child` di grid produk: kartu pertama dari setiap kelompok 5 kartu (`nth-child(5n+1)`) mendapat `sm:col-span-2` dan rasio gambar lebih lebar (`aspect-[16/9]` alih-alih `aspect-square`). Berulang konsisten di setiap scroll/halaman — bukan cuma trik di atas grid, jadi ritme visualnya konsisten di seluruh daftar produk, termasuk saat difilter/dicari (tidak bergantung pada produk mana yang tampil).

`ProductCard` menerima satu prop opsional baru, `featured?: boolean`, dan merender ukuran/rasio gambar berbeda saat `true`. `ProductMarketplace.tsx` yang menentukan kartu mana `featured` lewat index posisi di grid (`i % 5 === 0`), bukan `ProductCard` yang menebak sendiri — menjaga `ProductCard` tetap komponen "dumb" yang cuma render sesuai props.

### 4. Micro-motion — reuse pola reveal dari landing page

`LandingPage.tsx` sudah punya pola `data-reveal` + `IntersectionObserver` (attribute CSS `[data-reveal]`/`.is-visible` sudah ada di `index.css`, tidak perlu token CSS baru) yang dipakai untuk portofolio & proses. Marketplace sekarang dipakai di tempat kedua — ekstrak logic observer-nya jadi satu hook kecil `useScrollReveal` (baru, `src/lib/useScrollReveal.ts`) yang menerima sebuah `ref` dan attach observer yang sama persis (threshold 0.15, unobserve setelah muncul, cleanup on unmount). `LandingPage.tsx` **tidak diubah** untuk memakai hook baru ini (di luar scope, sesuai constraint "jangan sentuh LandingPage.tsx") — hook ini murni dipakai oleh `ProductMarketplace.tsx` untuk grid produknya, dengan stagger delay per kartu (`transitionDelay: ${(i % 12) * 60}ms`, di-modulo 12 supaya delay tidak menumpuk lama di halaman dengan banyak produk).

## Berkas yang berubah

- `src/index.css`: tambah `.badge-brand`, `.card-product` (token baru, bukan reuse token dashboard).
- `src/lib/useScrollReveal.ts` (baru): hook reveal-on-scroll, diekstrak dari pola `LandingPage.tsx` supaya tidak duplikat.
- `src/components/ProductCard.tsx`: warna/badge/shadow brand, hierarki harga, prop `featured`.
- `src/components/ProductMarketplace.tsx`: state aktif filter/sort/pagination jadi brand navy, grid `nth-child` non-seragam, pakai `useScrollReveal`, hierarki harga di modal detail.
- `src/components/CartDrawer.tsx`, `src/components/WishlistDrawer.tsx`: hierarki harga konsisten, ikon Lucide → Phosphor duotone (mengikuti migrasi yang sudah dilakukan di dashboard staff, supaya satu bahasa ikon di seluruh app — publik maupun staf).

## Batasan scope (sengaja tidak diubah)

- `LandingPage.tsx`, `AiChat.tsx`, `TrackingPortal.tsx`, blog components — tidak disentuh.
- `src/lib/db.ts`, `src/lib/supabase.ts`, `data/products.ts` — nol perubahan logic/data.
- Checkout tetap via WhatsApp (link `wa.me`) — tidak ada perubahan alur transaksi, murni visual.
