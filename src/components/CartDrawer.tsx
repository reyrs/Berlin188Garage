import React from 'react';
import { X, ShoppingCart, Trash, ChatCircle, ArrowSquareOut } from '@phosphor-icons/react';
import { Product } from '../data/products';

interface Props {
  cart: Product[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
const SHOPEE_SHOP_ID = '1396592299';
const shopeeUrl = (p: Product) => `https://shopee.co.id/product/${SHOPEE_SHOP_ID}/${p.code}`;
const shopeeShopUrl = `https://shopee.co.id/shop/${SHOPEE_SHOP_ID}`;

export default function CartDrawer({ cart, onRemove, onClose }: Props) {
  const total = cart.reduce((s, p) => s + p.price, 0);

  const waMessage = () => {
    const items = cart.map((p, i) => `${i + 1}. ${p.name} (${p.code}) — ${fmt(p.price)}`).join('\n');
    return `Halo Berlin 188,%0A%0ASaya mau pesan:%0A${items}%0A%0ATotal: ${fmt(total)}%0A%0ATolong dibantu ya. Terima kasih.`;
  };

  const shopeeCheckoutUrl = cart.length === 1 ? shopeeUrl(cart[0]) : shopeeShopUrl;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-[#1a1d23] h-full flex flex-col shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#2a2d35]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-berlin-navy dark:text-berlin-gold" weight="duotone" />
            <span className="font-extrabold text-gray-900 dark:text-white">Keranjang ({cart.length})</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#22252c] flex items-center justify-center cursor-pointer transition-colors">
            <X className="w-4 h-4 text-gray-400" weight="duotone" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-50" weight="duotone" />
            <p className="text-sm">Keranjang kosong</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {cart.map(p => (
                  <div key={p.id} className="flex gap-3 items-start py-3 border-b border-gray-50 dark:border-[#2a2d35]">
                  <img src={p.image} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-50 dark:bg-[#22252c] shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.code}</p>
                    <p className="text-sm font-black text-berlin-navy dark:text-berlin-gold tabular-nums mt-0.5">{fmt(p.price)}</p>
                  </div>
                  <button onClick={() => onRemove(p.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                    <Trash className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" weight="duotone" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 dark:border-[#2a2d35] px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-xl font-black text-berlin-navy dark:text-berlin-gold tabular-nums">{fmt(total)}</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/6281319438602?text=${waMessage()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ChatCircle className="w-4 h-4" weight="duotone" /> WhatsApp
                </a>
                <a
                  href={shopeeCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-berlin-red hover:bg-berlin-red/90 text-white font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowSquareOut className="w-4 h-4" weight="bold" /> Shopee
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
