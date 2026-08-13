import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Order } from '@shared/types';

interface NavItem {
  id: string;
  label: string;
  icon: any;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  onNavigate: (id: string) => void;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

type ResultItem =
  | { kind: 'nav'; key: string; label: string; icon: any; navId: string }
  | { kind: 'order'; key: string; order: Order };

export default function CommandPalette({ open, onClose, navItems, onNavigate, orders, onSelectOrder }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase();

    const navResults: ResultItem[] = navItems
      .filter(n => !q || n.label.toLowerCase().includes(q))
      .map(n => ({ kind: 'nav', key: `nav-${n.id}`, label: n.label, icon: n.icon, navId: n.id }));

    if (!q) {
      return navResults;
    }

    const orderResults: ResultItem[] = orders
      .filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.plateNumber.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
      )
      .slice(0, 8)
      .map(o => ({ kind: 'order', key: `order-${o.id}`, order: o }));

    return [...navResults, ...orderResults];
  }, [query, navItems, orders]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = results[activeIndex];
        if (item) select(item);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, activeIndex]);

  const select = (item: ResultItem) => {
    if (item.kind === 'nav') onNavigate(item.navId);
    else onSelectOrder(item.order);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100 dark:border-[#2a2d35]">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari menu, No. WO, nama pelanggan, atau plat nomor..."
            className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
          />
          <kbd className="hidden sm:block text-[10px] font-semibold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[#2a2d35] rounded px-1.5 py-0.5 shrink-0">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {results.length === 0 && (
            <div className="text-center py-10 px-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Tidak ada hasil</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Coba kata kunci lain</p>
            </div>
          )}

          {results.map((item, idx) => {
            const active = idx === activeIndex;
            if (item.kind === 'nav') {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => select(item)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    active ? 'bg-berlin-navy text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${active ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>Menu</span>
                </button>
              );
            }
            const o = item.order;
            return (
              <button
                key={item.key}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => select(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-berlin-navy text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <ArrowRight className="w-4 h-4 shrink-0" />
                <span className="flex-1 min-w-0 truncate">
                  <span className="font-semibold">{o.id}</span> — {o.customerName} · {o.plateNumber}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider shrink-0 ${active ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>WO</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
