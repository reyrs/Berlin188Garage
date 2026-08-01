import React from 'react';
import { ShoppingCart, Eye, Heart } from 'lucide-react';
import { Product } from '../data/products';

const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

export default function ProductCard({ product, onAdd, onDetail, inCart, wishlisted, onToggleWishlist }: { product: Product; onAdd: (p: Product) => void; onDetail: (p: Product) => void; inCart: boolean; wishlisted: boolean; onToggleWishlist: (id: string) => void }) {
  return (
    <div className="group bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-[#2a2d35] rounded-xl overflow-hidden hover:border-gray-200 dark:hover:border-[#3a3d45] hover:shadow-sm transition-all">
      <div className="aspect-square bg-gray-50 dark:bg-[#22252c] overflow-hidden relative">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <button
          onClick={() => onToggleWishlist(product.id)}
          className={`absolute top-2 left-2 w-8 h-8 backdrop-blur rounded-lg flex items-center justify-center cursor-pointer transition-all ${wishlisted ? 'bg-white/90 opacity-100' : 'bg-white/90 opacity-0 group-hover:opacity-100 hover:bg-white'}`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'text-berlin-red fill-berlin-red' : 'text-gray-700'}`} />
        </button>
        <button
          onClick={() => onDetail(product)}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white"
        >
          <Eye className="w-4 h-4 text-gray-700" />
        </button>
      </div>
      <div className="p-3.5 space-y-2">
        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-sans">{product.code}</div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">{product.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{product.brand} &middot; {product.category}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-extrabold text-gray-900 dark:text-white">{fmt(product.price)}</span>
          <button
            onClick={() => onAdd(product)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              inCart
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-[#22252c] text-gray-700 dark:text-gray-300 hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {inCart ? 'Di keranjang' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
}
