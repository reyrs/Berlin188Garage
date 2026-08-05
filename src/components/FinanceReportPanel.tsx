import React, { useMemo, useState } from 'react';
import { TrendUp, TrendDown, Wallet, ChartBarHorizontal } from '@phosphor-icons/react';
import { CashTransaction, Expense } from '../types';
import { KPI_TONE, PAYMENT_LABEL, formatRupiah } from '../lib/design';

interface FinanceReportPanelProps {
  transactions: CashTransaction[];
  expenses: Expense[];
}

type PeriodFilter = 'harian' | 'mingguan' | 'tahunan';

const PERIOD_LABEL: Record<PeriodFilter, string> = {
  harian: 'Hari Ini',
  mingguan: '7 Hari Terakhir',
  tahunan: '1 Tahun Terakhir',
};

const REVENUE_CATEGORY_LABEL: Record<string, string> = {
  pendapatan_jasa: 'Pendapatan Jasa',
  pendapatan_part: 'Pendapatan Part',
};

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  operasional: 'Operasional',
  pembelian_part: 'Pembelian Part',
  gaji: 'Gaji',
  utilitas: 'Utilitas',
  lainnya: 'Lainnya',
};

function periodStart(period: PeriodFilter, now: Date): Date {
  const start = new Date(now);
  if (period === 'harian') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'mingguan') {
    start.setDate(now.getDate() - 7);
  } else {
    start.setFullYear(now.getFullYear() - 1);
  }
  return start;
}

export default function FinanceReportPanel({ transactions, expenses }: FinanceReportPanelProps) {
  const [period, setPeriod] = useState<PeriodFilter>('harian');
  const now = new Date();
  const start = periodStart(period, now);

  const filteredTx = useMemo(
    () => transactions.filter(t => new Date(t.timestamp) >= start),
    [transactions, period]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter(e => new Date(e.date) >= start),
    [expenses, period]
  );

  const revenueTx = filteredTx.filter(t => t.type === 'masuk');
  const totalRevenue = revenueTx.reduce((s, t) => s + t.amount, 0);
  const revenueByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of revenueTx) map.set(t.category, (map.get(t.category) || 0) + t.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [revenueTx]);

  const totalExpense = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) map.set(e.category, (map.get(e.category) || 0) + e.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const netProfit = totalRevenue - totalExpense;
  const isProfit = netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] bg-berlin-navy/5 text-berlin-navy px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-berlin-navy/10">LAPORAN KEUANGAN</span>
            <h3 className="text-xl font-bold text-[#1A1A1A] mt-2">Laba Rugi &amp; Ringkasan Kas</h3>
            <p className="text-gray-500 text-xs mt-0.5">Data baca-saja — transaksi harian tetap dicatat lewat Akunting/Kasir.</p>
          </div>
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
            {(['harian', 'mingguan', 'tahunan'] as PeriodFilter[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  period === p ? 'bg-white text-berlin-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {p === 'harian' ? 'Harian' : p === 'mingguan' ? 'Mingguan' : 'Tahunan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Laba/Rugi Bersih — headline */}
      <div className="card-instrument p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Laba / Rugi Bersih — {PERIOD_LABEL[period]}</span>
            <p className={`text-3xl font-black mt-1 ${isProfit ? KPI_TONE.success.text : KPI_TONE.danger.text}`}>
              {isProfit ? '' : '-'}{formatRupiah(Math.abs(netProfit))}
            </p>
            <p className="text-xs text-gray-500 mt-1">{formatRupiah(totalRevenue)} pendapatan − {formatRupiah(totalExpense)} pengeluaran</p>
          </div>
          {isProfit ? <TrendUp className={`w-10 h-10 ${KPI_TONE.success.text}`} weight="duotone" /> : <TrendDown className={`w-10 h-10 ${KPI_TONE.danger.text}`} weight="duotone" />}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Breakdown pendapatan */}
        <div className="card-padded space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Wallet className="w-4 h-4" weight="duotone" /> Pendapatan per Kategori
          </h4>
          <div className="space-y-2.5">
            {revenueByCategory.map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 w-32 shrink-0 font-semibold">{REVENUE_CATEGORY_LABEL[cat] || cat}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-success-500 h-2 rounded-full transition-all"
                    style={{ width: totalRevenue ? `${(amount / totalRevenue) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs font-black text-gray-700 w-24 text-right font-sans">{formatRupiah(amount)}</span>
              </div>
            ))}
            {revenueByCategory.length === 0 && (
              <p className="text-center py-4 text-xs text-gray-400">Belum ada pendapatan di periode ini.</p>
            )}
          </div>
          <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">Total: {formatRupiah(totalRevenue)}</p>
        </div>

        {/* Breakdown pengeluaran */}
        <div className="card-padded space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <ChartBarHorizontal className="w-4 h-4" weight="duotone" /> Pengeluaran per Kategori
          </h4>
          <div className="space-y-2.5">
            {expenseByCategory.map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 w-32 shrink-0 font-semibold">{EXPENSE_CATEGORY_LABEL[cat] || cat}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-danger-500 h-2 rounded-full transition-all"
                    style={{ width: totalExpense ? `${(amount / totalExpense) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs font-black text-gray-700 w-24 text-right font-sans">{formatRupiah(amount)}</span>
              </div>
            ))}
            {expenseByCategory.length === 0 && (
              <p className="text-center py-4 text-xs text-gray-400">Belum ada pengeluaran di periode ini.</p>
            )}
          </div>
          <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">Total: {formatRupiah(totalExpense)}</p>
        </div>
      </div>

      {/* Drill-down transaksi */}
      <div className="card-padded space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Rincian Transaksi — {PERIOD_LABEL[period]}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {['Tanggal', 'Deskripsi', 'Kategori', 'Metode', 'Jenis', 'Jumlah'].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-[9px] uppercase tracking-widest text-gray-400 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTx.slice(0, 50).map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-2 text-gray-400 font-sans">{new Date(t.timestamp).toLocaleDateString('id-ID')}</td>
                  <td className="py-2.5 px-2 text-gray-700">{t.description}</td>
                  <td className="py-2.5 px-2 text-gray-500">{REVENUE_CATEGORY_LABEL[t.category] || EXPENSE_CATEGORY_LABEL[t.category] || t.category}</td>
                  <td className="py-2.5 px-2 text-gray-500">{PAYMENT_LABEL[t.method] || t.method}</td>
                  <td className={`py-2.5 px-2 font-bold ${t.type === 'masuk' ? KPI_TONE.success.text : KPI_TONE.danger.text}`}>
                    {t.type === 'masuk' ? 'Masuk' : 'Keluar'}
                  </td>
                  <td className="py-2.5 px-2 font-sans font-bold text-gray-800">{formatRupiah(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTx.length === 0 && (
            <p className="text-center py-6 text-xs text-gray-400">Tidak ada transaksi pada periode ini.</p>
          )}
        </div>
      </div>
    </div>
  );
}
