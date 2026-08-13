import React from 'react';
import CurveAccent from './CurveAccent';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-berlin-navy flex flex-col items-center justify-center px-6 text-center">
      <img src="/logo-icon.png" alt="Berlin 188 Garage" className="h-14 object-contain mb-8" />
      <p className="spec-label text-white/50 mb-3">404</p>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
        Halaman ini gak ketemu.
      </h1>
      <p className="text-white/60 text-sm max-w-sm mb-8">
        Mungkin salah ketik alamat, atau halamannya sudah dipindah. Coba balik ke beranda.
      </p>
      <a href="/" className="relative spec-label text-white pb-2 cursor-pointer">
        Kembali ke Beranda
        <CurveAccent active className="text-berlin-red" />
      </a>
    </div>
  );
}
