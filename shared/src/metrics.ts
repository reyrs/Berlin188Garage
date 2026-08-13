import {
  ShoppingCart, Lightning, Users, Handshake, Wallet, DotsThree,
  type Icon,
} from '@phosphor-icons/react';
import type { Order, CashTransaction, Expense } from './types';
import { STATUS_CONFIG, STATUS_SOLID } from './design';

// ---------------------------------------------------------------------------
// Period filter — single source of truth for every dashboard-ish panel.
// Replaces three previously-inconsistent local unions (Owner: none/all-time,
// Manager: harian|mingguan|bulanan, Finance: harian|mingguan|tahunan).
// ---------------------------------------------------------------------------

export type PeriodFilter = 'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'tahun_ini' | 'semua';

export const PERIOD_LABEL: Record<PeriodFilter, string> = {
  hari_ini: 'Hari Ini',
  minggu_ini: 'Minggu Ini',
  bulan_ini: 'Bulan Ini',
  tahun_ini: 'Tahun Ini',
  semua: 'Semua',
};

// Calendar-aligned (not rolling N-days). Returns null for 'semua' (no lower bound).
export function periodStart(period: PeriodFilter, now: Date = new Date()): Date | null {
  switch (period) {
    case 'hari_ini':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'minggu_ini': {
      const day = now.getDay(); // 0 = Sunday
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      return monday;
    }
    case 'bulan_ini':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'tahun_ini':
      return new Date(now.getFullYear(), 0, 1);
    case 'semua':
      return null;
  }
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Parses a stored date/timestamp string into a Date, treating bare
// "YYYY-MM-DD" values (e.g. Expense.date) as LOCAL calendar dates rather
// than UTC midnight — new Date("2026-08-08") is UTC and can land on the
// previous day for anyone in WIB (UTC+7), silently misfiling same-day
// expenses into "kemarin". Full ISO timestamps (CashTransaction.timestamp,
// Order.createdAt/paidAt) parse as-is.
function parseLocal(iso: string): Date {
  if (DATE_ONLY_RE.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function inPeriod(iso: string, period: PeriodFilter, now: Date = new Date()): boolean {
  const start = periodStart(period, now);
  if (!start) return true; // 'semua'
  return parseLocal(iso).getTime() >= start.getTime();
}

// ---------------------------------------------------------------------------
// Category label maps — single source of truth, replacing three separate
// representations (FinanceReportPanel's two Record<string,string> maps and
// AccountingPanel's array-of-objects EXPENSE_CATEGORIES).
//
// Kept loosely typed (Record<string,string>) rather than
// Record<Expense['category'],string> on purpose: FinanceReportPanel looks up
// EXPENSE_CATEGORY_LABEL[transactionCategory] as a defensive fallback for
// CashTransaction rows too (transactions and expenses share several category
// values but not all) — a strict Expense-only key type would reject that
// legitimate cross-lookup at compile time.
// ---------------------------------------------------------------------------

export const REVENUE_CATEGORY_LABEL: Record<string, string> = {
  pendapatan_jasa: 'Pendapatan Jasa',
  pendapatan_part: 'Pendapatan Part',
  operasional: 'Operasional',
  pembelian_part: 'Pembelian Part',
  gaji: 'Gaji',
  lainnya: 'Lainnya',
};

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  operasional: 'Operasional',
  pembelian_part: 'Pembelian Part',
  gaji: 'Gaji / Honor',
  utilitas: 'Utilitas (Listrik/Air)',
  bayar_supplier: 'Bayar Hutang Supplier',
  bayar_hutang_owner: 'Bayar Hutang Owner',
  lainnya: 'Lainnya',
};

export const EXPENSE_CATEGORIES: Array<{
  value: Expense['category'];
  label: string;
  icon: Icon;
  color: string;
}> = [
  { value: 'operasional', label: 'Operasional', icon: ShoppingCart, color: 'amber' },
  { value: 'pembelian_part', label: 'Pembelian Part', icon: Lightning, color: 'blue' },
  { value: 'gaji', label: 'Gaji / Honor', icon: Users, color: 'purple' },
  { value: 'utilitas', label: 'Utilitas (Listrik/Air)', icon: Lightning, color: 'green' },
  { value: 'bayar_supplier', label: 'Bayar Hutang Supplier', icon: Handshake, color: 'orange' },
  { value: 'bayar_hutang_owner', label: 'Bayar Hutang Owner', icon: Wallet, color: 'rose' },
  { value: 'lainnya', label: 'Lainnya', icon: DotsThree, color: 'gray' },
];

// ---------------------------------------------------------------------------
// Pure calculation functions — one per previously-duplicated block. Every
// function here takes plain data + a PeriodFilter and returns plain data;
// no React, no formatting. Panels call these instead of writing their own
// reduce/filter, so every dashboard-ish screen agrees on the same number
// for the same period.
// ---------------------------------------------------------------------------

export function sumRevenue(transactions: CashTransaction[], period: PeriodFilter, now: Date = new Date()): number {
  return transactions
    .filter(t => t.type === 'masuk' && inPeriod(t.timestamp, period, now))
    .reduce((s, t) => s + t.amount, 0);
}

// Cash-drawer outflow from the transactions ledger — distinct from
// sumExpense (which reads the separate `expenses` table). Kept as its own
// function rather than merged: they measure different things and panels
// that use this one should label it clearly (e.g. "Pengeluaran (Kas
// Keluar)") so it isn't mistaken for the expenses-table figure.
export function sumOutflowTransactions(transactions: CashTransaction[], period: PeriodFilter, now: Date = new Date()): number {
  return transactions
    .filter(t => t.type === 'keluar' && inPeriod(t.timestamp, period, now))
    .reduce((s, t) => s + t.amount, 0);
}

export function sumExpense(expenses: Expense[], period: PeriodFilter, now: Date = new Date()): number {
  return expenses
    .filter(e => inPeriod(e.date, period, now))
    .reduce((s, e) => s + e.amount, 0);
}

export function netProfit(revenue: number, expense: number): number {
  return revenue - expense;
}

export function revenueByCategory(transactions: CashTransaction[], period: PeriodFilter, now: Date = new Date()): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'masuk' || !inPeriod(t.timestamp, period, now)) continue;
    map.set(t.category, (map.get(t.category) || 0) + t.amount);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

export function expenseByCategory(expenses: Expense[], period: PeriodFilter, now: Date = new Date()): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const e of expenses) {
    if (!inPeriod(e.date, period, now)) continue;
    map.set(e.category, (map.get(e.category) || 0) + e.amount);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

// Outstanding (belum dibayar) revenue from approved service items, scoped
// by period on Order.createdAt. Preserves the original semantics exactly:
// a ServiceItem with no `status` set counts as included (implicit-approved)
// — do NOT tighten this to `status === 'approved'`, that would silently
// change the piutang total users already rely on.
//
// Also includes 'dp' orders (net of dpAmountPaid already received) — the
// original version only matched 'belum_dibayar', silently dropping every
// down-paid order's remaining balance from the outstanding total. Matches
// the definition AccountingPanel/TrackingPortal already use elsewhere
// (paymentStatus === 'belum_dibayar' || 'dp', remaining = total - dpAmountPaid).
export function pendingRevenue(orders: Order[], period: PeriodFilter, now: Date = new Date()): number {
  return orders
    .filter(o => (o.paymentStatus === 'belum_dibayar' || o.paymentStatus === 'dp') && inPeriod(o.createdAt, period, now))
    .reduce((acc, o) => {
      const approvedTotal = o.serviceItems
        .filter(item => item.status !== 'pending' && item.status !== 'rejected')
        .reduce((sum, item) => sum + item.price * item.qty, 0);
      const remaining = approvedTotal - (o.dpAmountPaid || 0);
      return acc + Math.max(0, remaining);
    }, 0);
}

// Always all-time — a live status board of the whole shop floor, not a
// period metric. Colors/labels reused from design.ts instead of
// hardcoding them a second time.
export function orderStatusBreakdown(orders: Order[]): Array<{ status: Order['status']; label: string; count: number; color: string }> {
  const statuses: Order['status'][] = ['antre', 'dikerjakan', 'temuan_dilaporkan', 'menunggu_pembayaran', 'selesai'];
  return statuses.map(status => ({
    status,
    label: STATUS_CONFIG[status].label,
    count: orders.filter(o => o.status === status).length,
    color: STATUS_SOLID[status],
  }));
}

export function mechanicProductivity(orders: Order[], period: PeriodFilter, now: Date = new Date()): Array<{ name: string; count: number; revenue: number }> {
  const map: Record<string, { count: number; revenue: number }> = {};
  orders
    .filter(o => o.status === 'selesai' && o.assignedMechanicName)
    .filter(o => inPeriod(o.paidAt || o.createdAt, period, now))
    .forEach(o => {
      const name = o.assignedMechanicName!;
      // Exclude 'pending' (not yet ACC'd) items too, not just 'rejected' —
      // an order can reach 'selesai' with a lingering unapproved item (see
      // the same gap fixed in AccountingPanel), which would otherwise
      // inflate a mechanic's displayed revenue with money never actually
      // billed. Matches pendingRevenue()'s convention above.
      const revenue = o.serviceItems.filter(i => i.status !== 'rejected' && i.status !== 'pending').reduce((s, i) => s + i.price * i.qty, 0);
      if (!map[name]) map[name] = { count: 0, revenue: 0 };
      map[name].count += 1;
      map[name].revenue += revenue;
    });
  return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);
}

// Snapshot, not period-aware — there's no bay-entry/exit timestamp recorded
// anywhere to average over, so pretending to compute a historical rate
// would just be making a number up.
export function bayUtilization(orders: Order[], totalBays: number = 10): { occupied: number; pct: number } {
  const occupied = new Set(orders.filter(o => o.status !== 'selesai' && o.slotNumber).map(o => o.slotNumber)).size;
  return { occupied, pct: totalBays > 0 ? Math.round((occupied / totalBays) * 100) : 0 };
}

// All-time by design — a repeat-customer rate needs full history to mean
// anything; a period-scoped version would mostly measure "how long is this
// window", not loyalty.
export function repeatCustomerRate(orders: Order[]): number {
  const phoneCounts: Record<string, number> = {};
  orders.forEach(o => { phoneCounts[o.customerPhone] = (phoneCounts[o.customerPhone] || 0) + 1; });
  const uniquePhones = Object.keys(phoneCounts).length;
  if (uniquePhones === 0) return 0;
  const repeaters = Object.values(phoneCounts).filter(c => c > 1).length;
  return Math.round((repeaters / uniquePhones) * 100);
}

// Not a reminder cron (none exists in this app) — SA sends the WhatsApp
// nudge manually per vehicle from the list this returns.
export function serviceDueList(orders: Order[], months: number = 6, now: Date = new Date()): Order[] {
  const latestByPlate = new Map<string, Order>();
  orders.filter(o => o.status === 'selesai' && o.paidAt).forEach(o => {
    const existing = latestByPlate.get(o.plateNumber);
    if (!existing || new Date(o.paidAt!).getTime() > new Date(existing.paidAt!).getTime()) {
      latestByPlate.set(o.plateNumber, o);
    }
  });
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return Array.from(latestByPlate.values())
    .filter(o => new Date(o.paidAt!).getTime() < cutoff.getTime())
    .sort((a, b) => new Date(a.paidAt!).getTime() - new Date(b.paidAt!).getTime());
}

// Groups 'masuk' transactions by day for the revenue chart, bounded by
// `period` (fixes an unbounded-history bug: the chart used to render every
// day of data that ever existed). The label always includes the year —
// grouping by "1 Jan" alone collides Jan 2025 with Jan 2026 the moment a
// period can span more than one calendar year ('tahun_ini', 'semua').
export function revenueChartData(transactions: CashTransaction[], period: PeriodFilter, now: Date = new Date()): Array<{ name: string; revenue: number }> {
  const grouped = new Map<string, { label: string; revenue: number; sortKey: number }>();
  transactions
    .filter(t => t.type === 'masuk' && inPeriod(t.timestamp, period, now))
    .forEach(tx => {
      const d = new Date(tx.timestamp);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD, stable sort + group key
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const existing = grouped.get(key);
      if (existing) existing.revenue += tx.amount;
      else grouped.set(key, { label, revenue: tx.amount, sortKey: d.getTime() });
    });
  return Array.from(grouped.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ label, revenue }) => ({ name: label, revenue }));
}
