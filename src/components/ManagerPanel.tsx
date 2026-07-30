import React, { useState, useMemo } from 'react';
import { TrendingUp, Car, Users, CheckCircle2, Clock, AlertTriangle, BarChart2, Calendar, Filter } from 'lucide-react';
import { Order, CashTransaction } from '../types';

interface ManagerPanelProps {
  orders: Order[];
  transactions: CashTransaction[];
}

type PeriodFilter = 'harian' | 'mingguan' | 'bulanan';

export default function ManagerPanel({ orders, transactions }: ManagerPanelProps) {
  const [period, setPeriod] = useState<PeriodFilter>('harian');

  const now = new Date();

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.createdAt);
      if (period === 'harian') {
        return d.toDateString() === now.toDateString();
      } else if (period === 'mingguan') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      } else {
        const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
        return d >= monthAgo;
      }
    });
  }, [orders, period]);

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.timestamp);
      if (period === 'harian') return d.toDateString() === now.toDateString();
      if (period === 'mingguan') { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
      const m = new Date(now); m.setMonth(now.getMonth() - 1); return d >= m;
    });
  }, [transactions, period]);

  const totalPemasukan = filteredTx.filter(t => t.type === 'masuk').reduce((s, t) => s + t.amount, 0);
  const totalPengeluaran = filteredTx.filter(t => t.type === 'keluar').reduce((s, t) => s + t.amount, 0);
  const selesai = filteredOrders.filter(o => o.status === 'selesai').length;
  const aktif = filteredOrders.filter(o => o.status !== 'selesai').length;

  const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const periodLabel = { harian: 'Hari Ini', mingguan: '7 Hari Terakhir', bulanan: '30 Hari Terakhir' };

  // Status breakdown
  const statusBreakdown = [
    { label: 'Antre', count: orders.filter(o => o.status === 'antre').length, color: 'bg-amber-500' },
    { label: 'Dikerjakan', count: orders.filter(o => o.status === 'dikerjakan').length, color: 'bg-sky-500' },
    { label: 'Temuan', count: orders.filter(o => o.status === 'temuan_dilaporkan').length, color: 'bg-purple-500' },
    { label: 'Billing', count: orders.filter(o => o.status === 'menunggu_pembayaran').length, color: 'bg-pink-500' },
    { label: 'Selesai', count: orders.filter(o => o.status === 'selesai').length, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] bg-berlin-navy/5 text-berlin-navy px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-berlin-navy/10">MANAGER PANEL</span>
            <h3 className="text-xl font-bold text-[#1A1A1A] mt-2">Dashboard Pantauan Keseluruhan</h3>
            <p className="text-gray-500 text-xs mt-0.5">Pantau performa bengkel, data order, dan laporan keuangan.</p>
          </div>
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
            {(['harian', 'mingguan', 'bulanan'] as PeriodFilter[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  period === p ? 'bg-white text-berlin-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {p === 'harian' ? 'Harian' : p === 'mingguan' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pemasukan', value: fmt(totalPemasukan), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Pengeluaran', value: fmt(totalPengeluaran), icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
          { label: 'WO Selesai', value: selesai.toString(), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'WO Aktif', value: aktif.toString(), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
        ].map(s => (
          <div key={s.label} className={`bg-white border ${s.bg} p-5 rounded-2xl shadow-sm space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-gray-400">{periodLabel[period]}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status bengkel saat ini */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Status Bengkel Saat Ini
          </h4>
          <div className="space-y-2.5">
            {statusBreakdown.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 w-16 font-semibold">{s.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className={`${s.color} h-2 rounded-full transition-all`}
                    style={{ width: orders.length ? `${(s.count / orders.length) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs font-black text-gray-700 w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">Total WO: {orders.length}</p>
        </div>

        {/* Order terbaru */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Car className="w-4 h-4" /> Order Terbaru ({periodLabel[period]})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredOrders.slice(0, 10).map(o => (
              <div key={o.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="font-mono font-bold text-gray-800">{o.id}</span>
                  <span className="text-gray-400 mx-1.5">·</span>
                  <span className="text-gray-600">{o.carBrand} {o.carModel}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                  o.status === 'selesai' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  o.status === 'dikerjakan' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                  'bg-amber-50 text-amber-800 border-amber-200'
                }`}>{o.status}</span>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <p className="text-center py-4 text-xs text-gray-400">Tidak ada order pada periode ini.</p>
            )}
          </div>
        </div>
      </div>

      {/* Semua order aktif */}
      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Seluruh Work Order Aktif di Bengkel</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {['WO', 'Plat', 'Kendaraan', 'Pemilik', 'SA', 'Status', 'Masuk'].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-[9px] uppercase tracking-widest text-gray-400 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.filter(o => o.status !== 'selesai').map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-2 font-mono font-bold text-gray-800">{o.id}</td>
                  <td className="py-2.5 px-2 font-mono text-gray-600">{o.plateNumber}</td>
                  <td className="py-2.5 px-2 text-gray-700">{o.carBrand} {o.carModel}</td>
                  <td className="py-2.5 px-2 text-gray-600">{o.customerName}</td>
                  <td className="py-2.5 px-2 text-gray-500">{o.advisorName || '—'}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                      o.status === 'dikerjakan' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                      o.status === 'temuan_dilaporkan' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                      o.status === 'menunggu_pembayaran' ? 'bg-pink-50 text-pink-800 border-pink-200' :
                      'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>{o.status}</span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-400 font-mono">{new Date(o.createdAt).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.filter(o => o.status !== 'selesai').length === 0 && (
            <p className="text-center py-6 text-xs text-gray-400">Tidak ada order aktif saat ini.</p>
          )}
        </div>
      </div>
    </div>
  );
}
