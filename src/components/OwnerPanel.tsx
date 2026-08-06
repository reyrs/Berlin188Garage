import React from 'react';
import {
  CurrencyDollar, Car, Users, ShieldWarning
} from '@phosphor-icons/react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { Order, CashTransaction, CashClosing, User as StaffUser } from '../types';
import KpiTile from './ui/KpiTile';
import { useTheme } from '../lib/theme';

interface OwnerPanelProps {
  orders: Order[];
  transactions: CashTransaction[];
  closings: CashClosing[];
  staffUsers: StaffUser[];
  onlineStaffIds: Set<string>;
}

export default function OwnerPanel({ orders, transactions, closings, staffUsers, onlineStaffIds }: OwnerPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Rincian Keuangan (Slide 8 Metrics)
  const totalRevenue = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingRevenue = orders
    .filter(o => o.paymentStatus === 'belum_dibayar')
    .reduce((acc, curr) => {
      const orderApprovedTotal = curr.serviceItems
        .filter(item => item.status !== 'pending' && item.status !== 'rejected')
        .reduce((sum, item) => sum + (item.price * item.qty), 0);
      return acc + orderApprovedTotal;
    }, 0);

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const chartData = (() => {
    const grouped: Record<string, number> = {};
    transactions.filter(t => t.type === 'masuk').forEach(tx => {
      const day = new Date(tx.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      grouped[day] = (grouped[day] || 0) + tx.amount;
    });
    return Object.entries(grouped).map(([name, revenue]) => ({ name, revenue }));
  })();

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          label="TOTAL PENDAPATAN"
          value={formatRupiah(totalRevenue)}
          sublabel="Lunas Diterima"
          icon={CurrencyDollar}
          tone="success"
        />
        <KpiTile
          label="BELUM DIBAYAR"
          value={formatRupiah(pendingRevenue)}
          sublabel="Tagihan Tertunda (Outstanding)"
          icon={ShieldWarning}
          tone="danger"
        />
        <KpiTile
          label="ORDERAN AKTIF"
          value={`${orders.filter(o => o.status !== 'selesai').length} WO`}
          sublabel="Sedang Dikerjakan"
          icon={Car}
          tone="info"
        />
        <KpiTile
          label="TIM STAF AKTIF"
          value={`${staffUsers.length} Orang`}
          sublabel="Teknisi & Administrasi"
          icon={Users}
          tone="neutral"
        />
      </div>

      {/* Main Charts & History rows */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        
        {/* Revenue chart */}
        <div className="lg:col-span-8 card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d35] pb-3">
            <div>
              <span className="text-[10px] bg-gray-100 dark:bg-[#22252c] text-black dark:text-white px-2 py-0.5 rounded font-bold">Grafik Omset</span>
              <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-white mt-1.5">Laporan Kas & Pendapatan Bulanan</h3>
            </div>

            <div className="text-right text-xs">
              <span className="text-gray-400 dark:text-gray-500 font-bold block">PENDAPATAN</span>
              <span className="font-bold text-gray-800 dark:text-gray-100">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? '#ffffff' : '#000000'} stopOpacity={isDark ? 0.12 : 0.06}/>
                    <stop offset="95%" stopColor={isDark ? '#ffffff' : '#000000'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2a2d35' : '#F3F4F6'} />
                <XAxis dataKey="name" stroke={isDark ? '#6B7280' : '#9CA3AF'} fontSize={10} tickLine={false} />
                <YAxis stroke={isDark ? '#6B7280' : '#9CA3AF'} fontSize={10} tickLine={false} tickFormatter={(v) => `Rp ${v/1000000}M`} />
                <Tooltip
                  contentStyle={isDark
                    ? { backgroundColor: '#1a1d23', borderColor: '#2a2d35', borderRadius: '12px', fontSize: '11px', color: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }
                    : { backgroundColor: '#ffffff', borderColor: '#E5E7EB', borderRadius: '12px', fontSize: '11px', color: '#1A1A1A', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  formatter={(val: number) => [formatRupiah(val), 'Pendapatan']}
                />
                <Area type="monotone" dataKey="revenue" stroke={isDark ? '#ffffff' : '#000000'} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column: Audit logs / Closings logs */}
        <div className="lg:col-span-4 card p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 pb-3 border-b border-gray-100 dark:border-[#2a2d35]">
            Riwayat Penutupan Kas
          </h3>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {closings.map((cls) => (
              <div key={cls.id} className="bg-gray-50 dark:bg-[#22252c] border border-gray-150 dark:border-[#2a2d35] p-3.5 rounded-xl space-y-2.5 hover:border-gray-250 dark:hover:border-gray-600 transition-colors">
                <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 font-sans">
                  <span>{new Date(cls.timestamp).toLocaleDateString()} {new Date(cls.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-bold text-black dark:text-white">{cls.id}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-400 dark:text-gray-500 block">Sistem</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100 block">{formatRupiah(cls.systemCash)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-gray-500 block">Uang Fisik</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100 block">{formatRupiah(cls.physicalCash)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-gray-200 dark:border-[#2a2d35] pt-2.5">
                  <span className="text-gray-400 dark:text-gray-500">Selisih:</span>
                  <span className={`font-bold font-sans ${cls.discrepancy === 0 ? 'text-emerald-700 dark:text-emerald-400' : cls.discrepancy > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                    {cls.discrepancy === 0 ? 'Cocok (Rp 0)' : formatRupiah(cls.discrepancy)}
                  </span>
                </div>

                <div className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                  Tutup oleh: <span className="font-bold text-gray-600 dark:text-gray-400">{cls.closedBy}</span>
                  {cls.notes && <span className="block mt-0.5">"{cls.notes}"</span>}
                </div>
              </div>
            ))}

            {closings.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500 italic space-y-1">
                <span>Belum ada riwayat penutupan kas masuk laci kasir hari ini.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Staff directory */}
      <div className="card p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 pb-3 border-b border-gray-100 dark:border-[#2a2d35]">
          Daftar Kehadiran & Aktivitas Staff Bengkel
        </h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {staffUsers.map((u) => (
            <div key={u.id} className="bg-gray-50 dark:bg-[#22252c] border border-gray-150 dark:border-[#2a2d35] p-4 rounded-xl flex items-center gap-3.5 hover:border-gray-250 dark:hover:border-gray-600 transition-colors">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] flex items-center justify-center font-bold text-black dark:text-white text-sm shrink-0">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  u.name.charAt(0)
                )}
              </div>

              <div className="truncate">
                <div className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{u.name}</div>
                <div className="text-[9px] uppercase tracking-wider text-black dark:text-white font-bold mt-0.5">{u.role}</div>
                {onlineStaffIds.has(u.id) ? (
                  <span className="inline-flex items-center gap-1.5 text-[9px] text-emerald-700 dark:text-emerald-400 mt-1 font-bold">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    AKTIF ONLINE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[9px] text-gray-400 dark:text-gray-500 mt-1 font-bold">
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    OFFLINE
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
