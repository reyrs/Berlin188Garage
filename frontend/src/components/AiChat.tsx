import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, MessageCircle } from 'lucide-react';
import { Product } from '../data/products';
import { askAi } from '../lib/ai';

interface Props {
  products: Product[];
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
  productIds?: string[];
  needsInspection?: boolean;
}

const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

export default function AiChat({ products, onClose, onSelectProduct }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Halo! 🏎️ Saya asisten AI Berlin 188 Garage. Ceritain aja masalah atau part yang kamu cari, nanti saya bantu rekomendasiin sparepart yang cocok.\n\nContoh: _"Saya butuh shockbreaker depan buat Audi A6"_ atau _"Ada kampas rem Mercedes W221?"_',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    const result = await askAi(q, products);

    setMessages(prev => [...prev, { role: 'ai', text: result.text, productIds: result.productIds, needsInspection: result.needsInspection }]);
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-[#1a1d23] h-full flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#2a2d35] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-berlin-navy dark:bg-berlin-navy-light flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-gray-900 dark:text-white text-sm">AI Assistant</span>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">Rekomendasi part otomatis</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#22252c] flex items-center justify-center cursor-pointer transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-berlin-navy text-white rounded-2xl rounded-br-md' : 'bg-gray-100 dark:bg-[#22252c] text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md'} px-4 py-2.5`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {msg.role === 'ai' && msg.needsInspection && (
                  <a
                    href={`https://wa.me/6281319438602?text=${encodeURIComponent('Halo Berlin 188, saya mau tanya soal keluhan mobil saya, bisa dibantu cek jadwal periksanya?')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Atur Jadwal Periksa via WhatsApp
                  </a>
                )}

                {msg.role === 'ai' && msg.productIds && msg.productIds.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.productIds.map(pid => {
                      const p = products.find(pp => pp.id === pid);
                      if (!p) return null;
                      return (
                        <button
                          key={pid}
                          onClick={() => onSelectProduct(p)}
                          className="w-full flex items-center gap-3 bg-white dark:bg-[#1a1d23] rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-[#2a2d35] transition-colors cursor-pointer border border-gray-200 dark:border-[#2a2d35] text-left"
                        >
                          <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-gray-50 dark:bg-[#22252c] shrink-0" referrerPolicy="no-referrer" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{p.brand} &middot; {p.category}</p>
                            <p className="text-xs font-extrabold text-berlin-navy dark:text-berlin-gold mt-0.5">{fmt(p.price)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-[#22252c] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                <span className="text-xs text-gray-400">Mencari part yang cocok...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 dark:border-[#2a2d35] px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Cari sparepart apa hari ini?"
              disabled={loading}
              className="flex-1 bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-berlin-navy dark:focus:border-berlin-gold transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-berlin-navy hover:bg-berlin-navy-dark dark:bg-berlin-gold dark:hover:bg-berlin-gold-light text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-40 disabled:cursor-default"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
