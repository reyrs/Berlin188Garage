import React from 'react';
import { ShoppingCart, Eye, Heart } from '@phosphor-icons/react';
import { Product } from '../data/products';

const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

interface ProductCardProps {
  product: Product;
  onAdd: (p: Product) => void;
  onDetail: (p: Product) => void;
  inCart: boolean;
  wishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  liveStock?: number;
}

export default function ProductCard({ product, onAdd, onDetail, inCart, wishlisted, onToggleWishlist, liveStock }: ProductCardProps) {
  return (
    <div className="group card-product hover:shadow-lg transition-shadow">
      <div className="bg-gray-50 dark:bg-[#22252c] overflow-hidden relative aspect-square p-3">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <button
          onClick={() => onToggleWishlist(product.id)}
          className={`absolute top-2 left-2 w-8 h-8 backdrop-blur rounded-lg flex items-center justify-center cursor-pointer transition-all ${wishlisted ? 'bg-white/90 opacity-100' : 'bg-white/90 opacity-0 group-hover:opacity-100 hover:bg-white'}`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'text-berlin-red' : 'text-gray-700'}`} weight={wishlisted ? 'fill' : 'duotone'} />
        </button>
        <button
          onClick={() => onDetail(product)}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white"
        >
          <Eye className="w-4 h-4 text-gray-700" weight="duotone" />
        </button>
      </div>
      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="badge-brand">{product.category}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans shrink-0">{product.code}</span>
        </div>
        <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">{product.name}</h3>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{product.brand}</p>
        {liveStock !== undefined && (
          liveStock > 0 ? (
            <span className="inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full px-2 py-0.5">
              Stok Bengkel: {liveStock} — Siap Sekarang
            </span>
          ) : (
            <span className="inline-block text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-full px-2 py-0.5">
              Stok Bengkel: Habis
            </span>
          )
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-black text-berlin-navy dark:text-berlin-gold tabular-nums">{fmt(product.price)}</span>
          <button
            onClick={() => onAdd(product)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              inCart
                ? 'bg-berlin-navy text-white'
                : 'bg-berlin-navy/10 text-berlin-navy hover:bg-berlin-navy hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" weight="duotone" />
            {inCart ? 'Di keranjang' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
}
