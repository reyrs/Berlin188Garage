import React, { useEffect, useState } from 'react';
import { Wrench, X } from 'lucide-react';
import { Order } from '../types';
import { STATUS_CONFIG, BADGE_CLASS } from '../lib/design';
import SPKPrintCard from './SPKPrintCard';

interface SlotBoardProps {
  orders: Order[];
  // Ruang Service: klik slot buka detail lengkap + cetak SPK.
  // Ruang Tunggu: papan status doang, sengaja nggak bisa diklik — kalau
  // bisa, customer yang lagi nunggu bisa lihat nama/HP/alamat/VIN customer
  // lain yang mobilnya lagi dikerjakan di slot sebelah.
  interactive: boolean;
}

const TOTAL_SLOTS = 10;

export default function SlotBoard({ orders, interactive }: SlotBoardProps) {
  const [time, setTime] = useState(new Date());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const orderBySlot = new Map<number, Order>();
  orders.forEach(o => {
    if (o.slotNumber && o.status !== 'selesai') orderBySlot.set(o.slotNumber, o);
  });

  const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) || null : null;

  if (interactive && selectedOrder) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 pt-16">
        <button
          onClick={() => setSelectedOrderId(null)}
          className="print:hidden mb-5 flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Kembali ke Papan Slot
        </button>
        {selectedOrder.spkSent ? (
          <SPKPrintCard order={selectedOrder} />
        ) : (
          <div className="bg-gray-850 border border-gray-800 rounded-2xl p-10 text-center text-gray-400 text-sm">
            SPK belum dikirim untuk WO ini oleh Advisor.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-5 border-b-2 border-berlin-gold/30">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.png" alt="" className="h-10 sm:h-12 w-auto object-contain" />
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">BERLIN188 GARAGE</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              {interactive ? 'Papan Kerja — Ruang Service' : 'Papan Kerja — Ruang Tunggu'}
            </p>
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-2xl sm:text-4xl font-sans font-bold text-berlin-gold">
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-gray-400 text-xs sm:text-sm">
            {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 flex-1">
        {Array.from({ length: TOTAL_SLOTS }, (_, i) => i + 1).map(slotNum => {
          const order = orderBySlot.get(slotNum);
          const badge = order ? STATUS_CONFIG[order.status] : null;
          const clickable = interactive && !!order;
          return (
            <div
              key={slotNum}
              onClick={clickable ? () => setSelectedOrderId(order!.id) : undefined}
              className={`bg-gray-850 border rounded-2xl p-4 flex flex-col ${
                order ? 'border-gray-800' : 'border-gray-800/50 border-dashed'
              } ${clickable ? 'cursor-pointer hover:border-berlin-gold/50 transition-colors' : ''}`}
            >
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Slot {slotNum}</div>
              {order ? (
                <div className="space-y-1.5 flex-1">
                  <div className="text-sm font-bold text-white">{order.plateNumber}</div>
                  <div className="text-xs text-gray-400">{order.carBrand} {order.carType || order.carModel}</div>
                  <div className="text-xs text-gray-300 flex items-center gap-1">
                    <Wrench className="w-3 h-3 shrink-0" /> {order.assignedMechanicName || '—'}
                  </div>
                  {badge && (
                    <span className={`inline-block mt-1 ${BADGE_CLASS} ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-700 text-xs">Slot Kosong</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center text-gray-600 text-xs">
        Berlin188 Garage · Spesialis European Car
      </div>
    </div>
  );
}
