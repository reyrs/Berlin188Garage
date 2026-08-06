import React from 'react';
import LegalPage from './LegalPage';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Kebijakan Privasi" updatedAt="6 Agustus 2026">
      <p>
        Berlin 188 Garage ("kami") menghargai privasi Anda. Halaman ini menjelaskan data apa saja yang
        kami kumpulkan lewat website ini (<strong>berlin188garage.com</strong>), untuk apa data itu
        dipakai, dan bagaimana Anda bisa menghubungi kami soal data Anda.
      </p>

      <h2>Data yang Kami Kumpulkan</h2>
      <p>Kami mengumpulkan data dalam dua konteks berbeda:</p>
      <ul>
        <li>
          <strong>Saat Anda servis kendaraan di bengkel kami</strong> (didaftarkan oleh staf advisor):
          nama, nomor WhatsApp, alamat, dan data kendaraan (merek, model, plat nomor, nomor rangka/VIN,
          tahun, kode mesin) — dipakai untuk membuat Work Order, komunikasi progres servis, dan
          administrasi internal bengkel.
        </li>
        <li>
          <strong>Saat Anda melihat/melacak status servis lewat link tracking</strong>: kami menampilkan
          data Work Order yang sudah ada terkait nomor HP/plat yang Anda masukkan — tidak ada data baru
          yang dikumpulkan di halaman ini selain yang Anda ketik untuk mencari.
        </li>
      </ul>
      <p>
        Untuk katalog sparepart (marketplace), kami <strong>tidak</strong> meminta Anda membuat akun atau
        memasukkan data pribadi apa pun di website. Keranjang belanja dan wishlist tersimpan lokal di
        perangkat Anda (browser), bukan di server kami. Saat Anda memutuskan membeli, transaksi
        dilanjutkan lewat WhatsApp secara manual — data yang Anda kirim lewat WhatsApp diproses sesuai
        kebijakan privasi WhatsApp/Meta, bukan oleh sistem kami.
      </p>

      <h2>Cookie dan Penyimpanan Lokal</h2>
      <p>Website ini menyimpan beberapa data teknis di browser Anda (localStorage), bukan cookie pelacak iklan:</p>
      <ul>
        <li>Preferensi mode terang/gelap</li>
        <li>Isi keranjang belanja dan wishlist di marketplace</li>
        <li>Status login staf (khusus dashboard internal)</li>
      </ul>
      <p>
        Saat ini kami belum mengaktifkan alat analitik pengunjung. Jika di kemudian hari kami mengaktifkan
        Google Analytics untuk memahami traffic website, kami akan memperbarui halaman ini.
      </p>

      <h2>Bagaimana Data Digunakan</h2>
      <p>Data yang Anda berikan saat servis kendaraan dipakai untuk:</p>
      <ul>
        <li>Membuat dan melacak Work Order servis kendaraan Anda</li>
        <li>Menghubungi Anda soal progres, temuan tambahan, atau estimasi biaya untuk disetujui</li>
        <li>Pencatatan transaksi dan laporan internal bengkel</li>
      </ul>
      <p>Kami tidak menjual atau menyewakan data pribadi Anda ke pihak ketiga untuk kepentingan pemasaran.</p>

      <h2>Penyimpanan dan Keamanan</h2>
      <p>
        Data disimpan di infrastruktur Supabase (penyedia database pihak ketiga) dengan kontrol akses
        berbasis peran (Row Level Security) — hanya staf dengan wewenang terkait yang bisa mengakses data
        tertentu. Akun staf dilindungi kata sandi lewat sistem autentikasi Supabase.
      </p>

      <h2>Hak Anda</h2>
      <p>
        Anda berhak meminta salinan, koreksi, atau penghapusan data pribadi Anda yang tersimpan di sistem
        kami. Hubungi kami lewat kontak di bawah untuk permintaan ini.
      </p>

      <h2>Perubahan Kebijakan</h2>
      <p>
        Kami dapat memperbarui halaman ini sewaktu-waktu, misalnya saat menambah fitur baru yang
        melibatkan data pengguna. Tanggal "Berlaku sejak" di atas menunjukkan pembaruan terakhir.
      </p>

      <h2>Kontak</h2>
      <p>
        Berlin 188 Garage<br />
        Jl. Rawa Kutuk No. 31, Pondok Jagung Timur, Tangerang Selatan 15324<br />
        Telepon/WhatsApp: 0818 188 188 01
      </p>

      <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-10">
        Catatan: halaman ini disusun untuk mencerminkan secara akurat data yang benar-benar dikumpulkan
        oleh sistem kami saat ini. Ini bukan pengganti nasihat hukum profesional — pemilik usaha
        disarankan meninjau ulang bersama konsultan hukum untuk kepatuhan penuh terhadap UU No. 27 Tahun
        2022 tentang Pelindungan Data Pribadi.
      </p>
    </LegalPage>
  );
}
