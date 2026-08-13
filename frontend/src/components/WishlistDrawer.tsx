import React from 'react';
import { X, Heart, Trash, ShoppingCart } from '@phosphor-icons/react';
import { Product } from '../data/products';

interface Props {
  items: Product[];
  onRemove: (id: string) => void;
  onMoveToCart: (p: Product) => void;
  onClose: () => void;
}

const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

export default function WishlistDrawer({ items, onRemove, onMoveToCart, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-[#1a1d23] h-full flex flex-col shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#2a2d35]">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-berlin-red" weight="duotone" />
            <span className="font-extrabold text-gray-900 dark:text-white">Wishlist ({items.length})</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#22252c] flex items-center justify-center cursor-pointer transition-colors">
            <X className="w-4 h-4 text-gray-400" weight="duotone" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Heart className="w-12 h-12 mb-3 opacity-50" weight="duotone" />
            <p className="text-sm">Belum ada part yang disimpan</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
            {items.map(p => (
              <div key={p.id} className="flex gap-3 items-start py-3 border-b border-gray-50 dark:border-[#2a2d35]">
                <img src={p.image} alt={p.name} className="w-14 h-14 rounded-lg object-cover bg-gray-50 dark:bg-[#22252c] shrink-0" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.code}</p>
                  <p className="text-sm font-black text-berlin-navy dark:text-berlin-gold tabular-nums mt-0.5">{fmt(p.price)}</p>
                  <button
                    onClick={() => onMoveToCart(p)}
                    className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-berlin-navy dark:text-berlin-gold hover:underline cursor-pointer"
                  >
                    <ShoppingCart className="w-3 h-3" weight="duotone" /> Pindah ke Keranjang
                  </button>
                </div>
                <button onClick={() => onRemove(p.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                  <Trash className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" weight="duotone" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
