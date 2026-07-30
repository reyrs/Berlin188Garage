import React, { useEffect, useState } from 'react';
import { Order } from '../types';

interface MonitorDisplayProps {
  orders: Order[];
}

const STATUS_CONFIG = {
  antre: { label: 'Antrian', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  dikerjakan: { label: 'Dikerjakan', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  temuan_dilaporkan: { label: 'Menunggu Konfirmasi', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  menunggu_pembayaran: { label: 'Menunggu Pembayaran', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  selesai: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

const ALL_MECHANICS = [
  { id: 'mekanik-1', name: 'Mekanik Joko' },
  { id: 'mekanik-2', name: 'Mekanik Rudi' },
  { id: 'mekanik-3', name: 'Mekanik Budi' },
];

export default function MonitorDisplay({ orders }: MonitorDisplayProps) {
  const [time, setTime] = useState(new Date());
  const [mechanicFilter, setMechanicFilter] = useState<string>('all');
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeOrders = orders.filter(o => o.status !== 'selesai');
  const doneToday = orders.filter(o => o.status === 'selesai').length;

  const filteredOrders = mechanicFilter === 'all'
    ? activeOrders
    : activeOrders.filter(o => o.assignedMechanicId === mechanicFilter);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BERLIN188 GARAGE</h1>
          <p className="text-gray-400 text-sm mt-0.5">Monitor Pengerjaan — per Mekanik</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-bold text-white">
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-gray-400 text-sm">
            {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Antrian', value: activeOrders.length, color: 'text-white' },
          { label: 'Sedang Dikerjakan', value: orders.filter(o=>o.status==='dikerjakan').length, color: 'text-blue-400' },
          { label: 'Menunggu Konfirmasi', value: orders.filter(o=>o.status==='temuan_dilaporkan').length, color: 'text-amber-400' },
          { label: 'Selesai Hari Ini', value: doneToday, color: 'text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900 rounded-2xl p-4 text-center border border-gray-800">
            <div className={`text-4xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-gray-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mechanic filter */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setMechanicFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mechanicFilter === 'all' ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}>
          Semua Mekanik
        </button>
        {ALL_MECHANICS.map(m => {
          const count = activeOrders.filter(o => o.assignedMechanicId === m.id).length;
          return (
            <button key={m.id} onClick={() => setMechanicFilter(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mechanicFilter === m.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              🔧 {m.name.split(' ').slice(1).join(' ') || m.name}
              {count > 0 && <span className="bg-gray-700 text-white text-[9px] px-1.5 py-0.5 rounded-full">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Order grid */}
      {filteredOrders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <div className="text-6xl mb-4">✓</div>
            <p className="text-xl font-medium">
              {mechanicFilter === 'all' ? 'Tidak ada antrian aktif' : 'Tidak ada pekerjaan untuk mekanik ini'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
          {filteredOrders.map(order => {
            const cfg = STATUS_CONFIG[order.status];
            return (
              <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{order.id}</span>
                      {order.assignedMechanicName && (
                        <span className="text-[9px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                          🔧 {order.assignedMechanicName.split(' ').slice(1).join(' ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                  <span className="text-2xl">
                    {order.carBrand === 'Mercedes-Benz' ? '⭐' : order.carBrand === 'BMW' ? '🔵' : order.carBrand === 'Audi' ? '⚪' : order.carBrand === 'MINI' ? '🟢' : order.carBrand === 'Land Rover' ? '🟫' : '🔧'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-white font-semibold">{order.carBrand} {order.carModel}</p>
                  <p className="text-gray-400 text-sm font-mono">{order.plateNumber}</p>
                  <p className="text-gray-400 text-sm">{order.customerName}</p>
                  <div className="pt-2 mt-2 border-t border-gray-800">
                    <p className="text-gray-500 text-xs">{order.serviceType}</p>
                    <p className="text-gray-300 text-sm mt-0.5 line-clamp-2">{order.complaint}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-gray-600 text-xs">
        Berlin188 Garage · Spesialis European Car · Auto-refresh setiap 30 detik
      </div>
    </div>
  );
}
