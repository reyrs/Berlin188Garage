import React, { useState, useMemo } from 'react';
import { TrendUp, Car, CheckCircle, Clock, ChartBar } from '@phosphor-icons/react';
import { Order, CashTransaction } from '../types';
import { STATUS_CONFIG, STATUS_SOLID, type KpiTone } from '../lib/design';
import KpiTile from './ui/KpiTile';

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
    { label: 'Antre', count: orders.filter(o => o.status === 'antre').length, color: STATUS_SOLID.antre },
    { label: 'Dikerjakan', count: orders.filter(o => o.status === 'dikerjakan').length, color: STATUS_SOLID.dikerjakan },
    { label: 'Temuan', count: orders.filter(o => o.status === 'temuan_dilaporkan').length, color: STATUS_SOLID.temuan_dilaporkan },
    { label: 'Menunggu Pembayaran', count: orders.filter(o => o.status === 'menunggu_pembayaran').length, color: STATUS_SOLID.menunggu_pembayaran },
    { label: 'Selesai', count: orders.filter(o => o.status === 'selesai').length, color: STATUS_SOLID.selesai },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
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
        {([
          { label: 'Pemasukan', value: fmt(totalPemasukan), icon: TrendUp, tone: 'success' as KpiTone },
          { label: 'Pengeluaran', value: fmt(totalPengeluaran), icon: TrendUp, tone: 'danger' as KpiTone },
          { label: 'WO Selesai', value: selesai.toString(), icon: CheckCircle, tone: 'success' as KpiTone },
          { label: 'WO Aktif', value: aktif.toString(), icon: Clock, tone: 'info' as KpiTone },
        ]).map(s => (
          <KpiTile key={s.label} label={s.label} value={s.value} sublabel={periodLabel[period]} icon={s.icon} tone={s.tone} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status bengkel saat ini */}
        <div className="card-padded space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <ChartBar className="w-4 h-4" weight="duotone" /> Status Bengkel Saat Ini
          </h4>
          <div className="space-y-2.5">
            {statusBreakdown.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 w-28 shrink-0 font-semibold">{s.label}</span>
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
        <div className="card-padded space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Car className="w-4 h-4" weight="duotone" /> Order Terbaru ({periodLabel[period]})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredOrders.slice(0, 10).map(o => (
              <div key={o.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="font-sans font-bold text-gray-800">{o.id}</span>
                  <span className="text-gray-400 mx-1.5">·</span>
                  <span className="text-gray-600">{o.carBrand} {o.carModel}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${STATUS_CONFIG[o.status].bg} ${STATUS_CONFIG[o.status].text} ${STATUS_CONFIG[o.status].border}`}>{STATUS_CONFIG[o.status].label}</span>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <p className="text-center py-4 text-xs text-gray-400">Tidak ada order pada periode ini.</p>
            )}
          </div>
        </div>
      </div>

      {/* Semua order aktif */}
      <div className="card-padded space-y-3">
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
                  <td className="py-2.5 px-2 font-sans font-bold text-gray-800">{o.id}</td>
                  <td className="py-2.5 px-2 font-sans text-gray-600">{o.plateNumber}</td>
                  <td className="py-2.5 px-2 text-gray-700">{o.carBrand} {o.carModel}</td>
                  <td className="py-2.5 px-2 text-gray-600">{o.customerName}</td>
                  <td className="py-2.5 px-2 text-gray-500">{o.advisorName || '—'}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${STATUS_CONFIG[o.status].bg} ${STATUS_CONFIG[o.status].text} ${STATUS_CONFIG[o.status].border}`}>{STATUS_CONFIG[o.status].label}</span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-400 font-sans">{new Date(o.createdAt).toLocaleDateString('id-ID')}</td>
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
