import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

// Klik foto kecil di mana pun (temuan mekanik, resolusi gudang, resi
// customer) buat buka ini — overlay ukuran penuh, klik area gelap/X/Esc
// buat nutup.
export default function ImageLightbox({ src, alt = 'Foto', onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full cursor-pointer transition-colors"
        aria-label="Tutup"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        referrerPolicy="no-referrer"
        className="max-w-full max-h-full object-contain rounded-lg cursor-default"
      />
    </div>
  );
}
