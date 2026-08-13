import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PromoPopup } from '@shared/types';

const DISMISS_KEY = 'berlin188-promo-dismissed';

interface Props {
  promo: PromoPopup | null;
}

export default function PromoPopupModal({ promo }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!promo?.enabled) return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    const timer = setTimeout(() => setVisible(true), promo.delaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [promo]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  if (!visible || !promo) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative bg-white dark:bg-[#1a1d23] rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full animate-fade-up">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {promo.imageUrl && (
          <img src={promo.imageUrl} alt={promo.title} className="w-full aspect-[16/9] object-cover" referrerPolicy="no-referrer" />
        )}
        <div className="p-5 space-y-2">
          <p className="font-extrabold text-lg text-gray-900 dark:text-white leading-snug">{promo.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{promo.description}</p>
          {promo.ctaText && promo.ctaLink && (
            <a
              href={promo.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="block text-center bg-berlin-red hover:bg-berlin-red/90 text-white font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer mt-3"
            >
              {promo.ctaText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
