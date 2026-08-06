import React from 'react';
import LegalPage from './LegalPage';

export default function TermsPage() {
  return (
    <LegalPage title="Syarat & Ketentuan" updatedAt="6 Agustus 2026">
      <p>
        Dengan menggunakan layanan Berlin 188 Garage — baik servis kendaraan di bengkel maupun katalog
        sparepart di website ini — Anda dianggap menyetujui syarat dan ketentuan berikut.
      </p>

      <h2>1. Layanan Servis Kendaraan</h2>
      <ul>
        <li>
          Setiap pengerjaan tambahan di luar keluhan awal (temuan diagnosis) akan diinformasikan ke Anda
          lengkap dengan estimasi biaya, dan baru dikerjakan setelah Anda menyetujuinya — bisa lewat
          advisor langsung atau lewat halaman lacak servis online.
        </li>
        <li>
          Estimasi biaya yang diberikan adalah estimasi berdasarkan diagnosis awal. Biaya final bisa
          berbeda jika ditemukan kondisi tambahan saat pengerjaan berlangsung, dan itu pun akan
          dikonfirmasi ulang ke Anda sebelum dikerjakan.
        </li>
        <li>
          Ketentuan garansi pekerjaan/sparepart mengikuti kebijakan yang berlaku untuk masing-masing jenis
          pekerjaan — silakan tanyakan detail garansi ke advisor kami saat servis, karena bisa berbeda
          tergantung jenis part dan jasa yang dikerjakan.
        </li>
        <li>
          Kendaraan yang sudah selesai dan tidak diambil dalam jangka waktu wajar setelah pemberitahuan
          selesai, dapat dikenakan biaya penitipan sesuai kebijakan bengkel — hubungi kami jika Anda butuh
          waktu tambahan.
        </li>
      </ul>

      <h2>2. Katalog Sparepart (Marketplace)</h2>
      <ul>
        <li>
          Harga dan stok yang ditampilkan di website ini mengikuti data listing kami dan dapat berubah
          sewaktu-waktu tanpa pemberitahuan sebelumnya di halaman ini.
        </li>
        <li>
          Website ini menampilkan katalog — <strong>bukan checkout otomatis</strong>. Transaksi pembelian
          sparepart difinalisasi secara manual lewat WhatsApp atau langsung ke toko Shopee kami; harga dan
          ketersediaan akhir dikonfirmasi saat itu, bukan otomatis mengikat saat Anda menekan tombol
          "Tambah" di website.
        </li>
        <li>
          Foto produk yang ditampilkan adalah foto asli barang dari listing kami, namun kondisi fisik unit
          tertentu (untuk part bekas/copotan) bisa bervariasi — mohon konfirmasi kondisi detail sebelum
          transaksi.
        </li>
      </ul>

      <h2>3. Akurasi Informasi</h2>
      <p>
        Kami berusaha menjaga informasi di website ini akurat dan terkini, tapi tidak menjamin bebas dari
        kesalahan penulisan harga, deskripsi, atau ketersediaan. Kami berhak mengoreksi kesalahan tersebut
        kapan saja.
      </p>

      <h2>4. Batasan Tanggung Jawab</h2>
      <p>
        Sepanjang diizinkan oleh hukum yang berlaku, Berlin 188 Garage tidak bertanggung jawab atas
        kerugian tidak langsung yang timbul dari penggunaan website ini, di luar tanggung jawab atas
        pekerjaan servis dan produk yang secara langsung kami jual/kerjakan.
      </p>

      <h2>5. Hukum yang Berlaku</h2>
      <p>
        Syarat dan ketentuan ini tunduk pada hukum Republik Indonesia. Perselisihan yang timbul akan
        diupayakan diselesaikan secara musyawarah terlebih dahulu.
      </p>

      <h2>Kontak</h2>
      <p>
        Berlin 188 Garage<br />
        Jl. Rawa Kutuk No. 31, Pondok Jagung Timur, Tangerang Selatan 15324<br />
        Telepon/WhatsApp: 0818 188 188 01
      </p>

      <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-10">
        Catatan: dokumen ini disusun berdasarkan cara kerja layanan yang sebenarnya (bukan template
        generik) dan bukan pengganti nasihat hukum profesional — disarankan ditinjau ulang bersama
        konsultan hukum sebelum dijadikan acuan formal, khususnya bagian garansi dan batasan tanggung
        jawab.
      </p>
    </LegalPage>
  );
}
