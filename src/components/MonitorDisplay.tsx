import React, { useEffect, useState } from 'react';
import { CheckCircle, Wrench } from 'lucide-react';
import { Order } from '../types';
import { STATUS_CONFIG, STATUS_BORDER, BADGE_CLASS } from '../lib/design';

interface MonitorDisplayProps {
  orders: Order[];
}

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
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col">
      <div className="flex items-center justify-between mb-5 pb-5 border-b-2 border-berlin-gold/30">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.png" alt="" className="h-12 w-auto object-contain" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">BERLIN188 GARAGE</h1>
            <p className="text-gray-400 text-sm mt-0.5">Monitor Pengerjaan</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-sans font-bold text-berlin-gold">
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-gray-400 text-sm">
            {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Antrian', value: activeOrders.length, color: 'text-white', border: 'border-t-gray-500', tint: 'bg-white/5' },
          { label: 'Dikerjakan', value: orders.filter(o=>o.status==='dikerjakan').length, color: 'text-info-500', border: 'border-t-info-500', tint: 'bg-info-500/10' },
          { label: 'Menunggu Konfirmasi', value: orders.filter(o=>o.status==='temuan_dilaporkan').length, color: 'text-warning-500', border: 'border-t-warning-500', tint: 'bg-warning-500/10' },
          { label: 'Selesai Hari Ini', value: doneToday, color: 'text-success-500', border: 'border-t-success-500', tint: 'bg-success-500/10' },
        ].map((s, i) => (
          <div key={i} className={`${s.tint} rounded-2xl p-4 text-center border border-gray-800 border-t-2 ${s.border}`}>
            <div className={`text-4xl font-bold font-sans ${s.color}`}>{s.value}</div>
            <div className="text-gray-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setMechanicFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            mechanicFilter === 'all' ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}>
          Semua Mekanik
        </button>
        {ALL_MECHANICS.map(m => {
          const count = activeOrders.filter(o => o.assignedMechanicId === m.id).length;
          return (
            <button key={m.id} onClick={() => setMechanicFilter(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                mechanicFilter === m.id ? 'bg-berlin-navy text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              <Wrench className="w-3 h-3" />
              {m.name.split(' ').slice(1).join(' ') || m.name}
              {count > 0 && <span className="bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded-full">{count}</span>}
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p className="text-xl font-medium">
              {mechanicFilter === 'all' ? 'Tidak ada antrian aktif' : 'Tidak ada pekerjaan untuk mekanik ini'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
          {filteredOrders.map(order => {
            const badge = STATUS_CONFIG[order.status];
            return (
              <div key={order.id} className={`bg-gray-850 border border-gray-800 border-l-4 ${STATUS_BORDER[order.status]} rounded-2xl p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{order.id}</span>
                      {order.assignedMechanicName && (
                        <span className="text-xs bg-berlin-navy-light/30 text-info-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          {order.assignedMechanicName.split(' ').slice(1).join(' ')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <span className={`${BADGE_CLASS} ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 font-semibold">
                    {order.carBrand}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-white font-semibold">{order.carBrand} {order.carModel}</p>
                  <p className="text-gray-400 text-sm font-sans">{order.plateNumber}</p>
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

      <div className="mt-6 text-center text-gray-600 text-xs">
        Berlin188 Garage · Spesialis European Car
      </div>
    </div>
  );
}
