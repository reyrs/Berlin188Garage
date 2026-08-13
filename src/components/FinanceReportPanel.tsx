import React, { useMemo, useState } from 'react';
import { TrendUp, TrendDown, Wallet, ChartBarHorizontal } from '@phosphor-icons/react';
import { CashTransaction, Expense } from '../types';
import { KPI_TONE, PAYMENT_LABEL, formatRupiah } from '../lib/design';
import {
  PeriodFilter as PeriodFilterType, PERIOD_LABEL, inPeriod,
  sumRevenue, sumExpense, netProfit as calcNetProfit,
  revenueByCategory as calcRevenueByCategory, expenseByCategory as calcExpenseByCategory,
  REVENUE_CATEGORY_LABEL, EXPENSE_CATEGORY_LABEL,
} from '../lib/metrics';
import PeriodFilter from './ui/PeriodFilter';

interface FinanceReportPanelProps {
  transactions: CashTransaction[];
  expenses: Expense[];
}

const PERIOD_OPTIONS: PeriodFilterType[] = ['hari_ini', 'minggu_ini', 'tahun_ini'];

export default function FinanceReportPanel({ transactions, expenses }: FinanceReportPanelProps) {
  const [period, setPeriod] = useState<PeriodFilterType>('hari_ini');
  const now = new Date();

  const filteredTx = useMemo(
    () => transactions.filter(t => inPeriod(t.timestamp, period, now)),
    [transactions, period]
  );

  const totalRevenue = useMemo(() => sumRevenue(transactions, period, now), [transactions, period]);
  const totalExpense = useMemo(() => sumExpense(expenses, period, now), [expenses, period]);
  const revenueByCategory = useMemo(() => calcRevenueByCategory(transactions, period, now), [transactions, period]);
  const expenseByCategory = useMemo(() => calcExpenseByCategory(expenses, period, now), [expenses, period]);

  const netProfit = calcNetProfit(totalRevenue, totalExpense);
  const isProfit = netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] bg-berlin-navy/5 text-berlin-navy px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-berlin-navy/10">LAPORAN KEUANGAN</span>
            <h3 className="text-xl font-bold text-[#1A1A1A] dark:text-white mt-2">Laba Rugi &amp; Ringkasan Kas</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Data baca-saja — transaksi harian tetap dicatat lewat Akunting/Kasir.</p>
          </div>
          <PeriodFilter value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
        </div>
      </div>

      {/* Laba/Rugi Bersih — headline */}
      <div className="card-instrument p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">Laba / Rugi Bersih — {PERIOD_LABEL[period]}</span>
            <p className={`text-3xl font-black mt-1 ${isProfit ? KPI_TONE.success.text : KPI_TONE.danger.text}`}>
              {isProfit ? '' : '-'}{formatRupiah(Math.abs(netProfit))}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatRupiah(totalRevenue)} pendapatan − {formatRupiah(totalExpense)} pengeluaran</p>
          </div>
          {isProfit ? <TrendUp className={`w-10 h-10 ${KPI_TONE.success.text}`} weight="duotone" /> : <TrendDown className={`w-10 h-10 ${KPI_TONE.danger.text}`} weight="duotone" />}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Breakdown pendapatan */}
        <div className="card-padded space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
            <Wallet className="w-4 h-4" weight="duotone" /> Pendapatan per Kategori
          </h4>
          <div className="space-y-2.5">
            {revenueByCategory.map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 w-32 shrink-0 font-semibold">{REVENUE_CATEGORY_LABEL[cat] || cat}</span>
                <div className="flex-1 bg-gray-100 dark:bg-[#22252c] rounded-full h-2">
                  <div className="bg-success-500 h-2 rounded-full transition-all"
                    style={{ width: totalRevenue ? `${(amount / totalRevenue) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs font-black text-gray-700 dark:text-gray-300 w-24 text-right font-sans">{formatRupiah(amount)}</span>
              </div>
            ))}
            {revenueByCategory.length === 0 && (
              <p className="text-center py-4 text-xs text-gray-400 dark:text-gray-500">Belum ada pendapatan di periode ini.</p>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-[#2a2d35]">Total: {formatRupiah(totalRevenue)}</p>
        </div>

        {/* Breakdown pengeluaran */}
        <div className="card-padded space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
            <ChartBarHorizontal className="w-4 h-4" weight="duotone" /> Pengeluaran per Kategori
          </h4>
          <div className="space-y-2.5">
            {expenseByCategory.map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 w-32 shrink-0 font-semibold">{EXPENSE_CATEGORY_LABEL[cat] || cat}</span>
                <div className="flex-1 bg-gray-100 dark:bg-[#22252c] rounded-full h-2">
                  <div className="bg-danger-500 h-2 rounded-full transition-all"
                    style={{ width: totalExpense ? `${(amount / totalExpense) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs font-black text-gray-700 dark:text-gray-300 w-24 text-right font-sans">{formatRupiah(amount)}</span>
              </div>
            ))}
            {expenseByCategory.length === 0 && (
              <p className="text-center py-4 text-xs text-gray-400 dark:text-gray-500">Belum ada pengeluaran di periode ini.</p>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-[#2a2d35]">Total: {formatRupiah(totalExpense)}</p>
        </div>
      </div>

      {/* Drill-down transaksi */}
      <div className="card-padded space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Rincian Transaksi — {PERIOD_LABEL[period]}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#2a2d35]">
                {['Tanggal', 'Deskripsi', 'Kategori', 'Metode', 'Jenis', 'Jumlah'].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2a2d35]">
              {filteredTx.slice(0, 50).map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#22252c] transition-colors">
                  <td className="py-2.5 px-2 text-gray-400 dark:text-gray-500 font-sans">{new Date(t.timestamp).toLocaleDateString('id-ID')}</td>
                  <td className="py-2.5 px-2 text-gray-700 dark:text-gray-300">{t.description}</td>
                  <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400">{REVENUE_CATEGORY_LABEL[t.category] || EXPENSE_CATEGORY_LABEL[t.category] || t.category}</td>
                  <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400">{PAYMENT_LABEL[t.method] || t.method}</td>
                  <td className={`py-2.5 px-2 font-bold ${t.type === 'masuk' ? KPI_TONE.success.text : KPI_TONE.danger.text}`}>
                    {t.type === 'masuk' ? 'Masuk' : 'Keluar'}
                  </td>
                  <td className="py-2.5 px-2 font-sans font-bold text-gray-800 dark:text-gray-100">{formatRupiah(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTx.length === 0 && (
            <p className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">Tidak ada transaksi pada periode ini.</p>
          )}
        </div>
      </div>
    </div>
  );
}
