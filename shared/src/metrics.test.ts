import { describe, it, expect } from 'vitest';
import {
  periodStart, inPeriod, sumRevenue, sumOutflowTransactions, sumExpense, netProfit,
  revenueByCategory, expenseByCategory, pendingRevenue, orderStatusBreakdown,
  mechanicProductivity, bayUtilization, repeatCustomerRate, serviceDueList, revenueChartData,
} from './metrics';
import type { Order, CashTransaction, Expense, ServiceItem } from './types';

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'WO-1', customerName: 'Budi', customerPhone: '08111', carBrand: 'Mercedes-Benz',
    carModel: 'C200', plateNumber: 'B-1-XX', complaints: ['-'], serviceType: 'Servis Rutin',
    status: 'antre', createdAt: '2026-08-08T03:00:00.000Z', findings: [], serviceItems: [],
    timeline: [], paymentStatus: 'belum_dibayar', ...overrides,
  };
}
function svcItem(overrides: Partial<ServiceItem> = {}): ServiceItem {
  return { id: 's1', name: 'Ganti oli', type: 'jasa', price: 100000, qty: 1, ...overrides };
}
function tx(overrides: Partial<CashTransaction> = {}): CashTransaction {
  return {
    id: 't1', amount: 100000, type: 'masuk', method: 'tunai', category: 'pendapatan_jasa',
    description: '-', timestamp: '2026-08-08T03:00:00.000Z', ...overrides,
  };
}
function exp(overrides: Partial<Expense> = {}): Expense {
  return { id: 'e1', date: '2026-08-08', description: '-', amount: 50000, category: 'operasional', method: 'tunai', createdBy: 'x', ...overrides };
}

// Fixed "now" mid-week (Thursday 2026-08-06 WIB-ish) so week/month boundaries are deterministic.
const NOW = new Date(2026, 7, 6, 12, 0, 0); // 6 Aug 2026, local

describe('periodStart', () => {
  it('hari_ini starts at local midnight today', () => {
    expect(periodStart('hari_ini', NOW)).toEqual(new Date(2026, 7, 6));
  });

  it('minggu_ini starts on Monday of the current week', () => {
    // 6 Aug 2026 is a Thursday -> Monday is 3 Aug 2026.
    expect(periodStart('minggu_ini', NOW)).toEqual(new Date(2026, 7, 3));
  });

  it('minggu_ini handles Sunday correctly (rolls back to the Monday before, not forward)', () => {
    const sunday = new Date(2026, 7, 9, 12); // 9 Aug 2026 is a Sunday
    expect(periodStart('minggu_ini', sunday)).toEqual(new Date(2026, 7, 3));
  });

  it('bulan_ini starts on the 1st of the current month', () => {
    expect(periodStart('bulan_ini', NOW)).toEqual(new Date(2026, 7, 1));
  });

  it('tahun_ini starts on Jan 1', () => {
    expect(periodStart('tahun_ini', NOW)).toEqual(new Date(2026, 0, 1));
  });

  it('semua has no lower bound', () => {
    expect(periodStart('semua', NOW)).toBeNull();
  });
});

describe('inPeriod — timezone edge case for date-only strings', () => {
  it('treats a bare YYYY-MM-DD (Expense.date) as a LOCAL calendar date, not UTC midnight', () => {
    // If this were parsed as UTC ("new Date('2026-08-06')"), a WIB (UTC+7)
    // reader could see it fall on the previous day and drop out of
    // 'hari_ini'. Parsed as local, "today" always matches "today".
    expect(inPeriod('2026-08-06', 'hari_ini', NOW)).toBe(true);
  });

  it('full ISO timestamps compare normally', () => {
    expect(inPeriod('2026-08-06T23:59:59.000Z', 'hari_ini', NOW)).toBe(true);
    expect(inPeriod('2026-08-01T00:00:00.000Z', 'hari_ini', NOW)).toBe(false);
  });

  it('semua always returns true regardless of date', () => {
    expect(inPeriod('2000-01-01', 'semua', NOW)).toBe(true);
  });
});

describe('sumRevenue / sumOutflowTransactions / sumExpense / netProfit', () => {
  it('sums only masuk transactions in period, ignoring keluar', () => {
    const txs = [tx({ amount: 100000, type: 'masuk' }), tx({ amount: 30000, type: 'keluar' })];
    expect(sumRevenue(txs, 'semua', NOW)).toBe(100000);
  });

  it('sumOutflowTransactions reads keluar from transactions, not the expenses table', () => {
    const txs = [tx({ amount: 100000, type: 'masuk' }), tx({ amount: 30000, type: 'keluar' })];
    expect(sumOutflowTransactions(txs, 'semua', NOW)).toBe(30000);
  });

  it('empty arrays sum to 0, not NaN', () => {
    expect(sumRevenue([], 'semua', NOW)).toBe(0);
    expect(sumExpense([], 'semua', NOW)).toBe(0);
  });

  it('sumExpense reads the expenses table', () => {
    expect(sumExpense([exp({ amount: 50000 }), exp({ amount: 25000 })], 'semua', NOW)).toBe(75000);
  });

  it('netProfit is revenue minus expense, can go negative', () => {
    expect(netProfit(100000, 150000)).toBe(-50000);
  });
});

describe('revenueByCategory / expenseByCategory', () => {
  it('groups and sorts descending by amount', () => {
    const txs = [
      tx({ category: 'pendapatan_part', amount: 50000 }),
      tx({ category: 'pendapatan_jasa', amount: 200000 }),
      tx({ category: 'pendapatan_jasa', amount: 100000 }),
    ];
    expect(revenueByCategory(txs, 'semua', NOW)).toEqual([['pendapatan_jasa', 300000], ['pendapatan_part', 50000]]);
  });

  it('expenseByCategory includes the two new debt categories', () => {
    const exps = [exp({ category: 'bayar_supplier', amount: 40000 }), exp({ category: 'bayar_hutang_owner', amount: 10000 })];
    expect(expenseByCategory(exps, 'semua', NOW)).toEqual([['bayar_supplier', 40000], ['bayar_hutang_owner', 10000]]);
  });
});

describe('pendingRevenue — preserves implicit-approved semantics', () => {
  it('counts a service item with NO status set (undefined) as approved', () => {
    const o = order({ paymentStatus: 'belum_dibayar', serviceItems: [svcItem({ price: 100000, qty: 1, status: undefined })] });
    expect(pendingRevenue([o], 'semua', NOW)).toBe(100000);
  });

  it('excludes pending and rejected items', () => {
    const o = order({
      paymentStatus: 'belum_dibayar',
      serviceItems: [
        svcItem({ price: 100000, qty: 1, status: 'approved' }),
        svcItem({ price: 999999, qty: 1, status: 'pending' }),
        svcItem({ price: 999999, qty: 1, status: 'rejected' }),
      ],
    });
    expect(pendingRevenue([o], 'semua', NOW)).toBe(100000);
  });

  it('ignores orders that are already lunas', () => {
    const o = order({ paymentStatus: 'lunas', serviceItems: [svcItem({ price: 100000, qty: 1 })] });
    expect(pendingRevenue([o], 'semua', NOW)).toBe(0);
  });

  it('is period-aware via createdAt', () => {
    const oldOrder = order({ paymentStatus: 'belum_dibayar', createdAt: '2020-01-01T00:00:00.000Z', serviceItems: [svcItem({ price: 100000, qty: 1 })] });
    expect(pendingRevenue([oldOrder], 'bulan_ini', NOW)).toBe(0);
    expect(pendingRevenue([oldOrder], 'semua', NOW)).toBe(100000);
  });

  it('includes dp orders, net of dpAmountPaid already received', () => {
    const o = order({
      paymentStatus: 'dp',
      dpAmountPaid: 40000,
      serviceItems: [svcItem({ price: 100000, qty: 1, status: 'approved' })],
    });
    expect(pendingRevenue([o], 'semua', NOW)).toBe(60000);
  });

  it('clamps a dp order at 0 if dpAmountPaid somehow exceeds the approved total', () => {
    const o = order({
      paymentStatus: 'dp',
      dpAmountPaid: 999999,
      serviceItems: [svcItem({ price: 100000, qty: 1, status: 'approved' })],
    });
    expect(pendingRevenue([o], 'semua', NOW)).toBe(0);
  });
});

describe('orderStatusBreakdown', () => {
  it('always covers all five statuses, all-time, regardless of period', () => {
    const orders = [order({ status: 'antre' }), order({ status: 'selesai' }), order({ status: 'selesai' })];
    const result = orderStatusBreakdown(orders);
    expect(result).toHaveLength(5);
    expect(result.find(r => r.status === 'selesai')?.count).toBe(2);
    expect(result.find(r => r.status === 'dikerjakan')?.count).toBe(0);
  });
});

describe('mechanicProductivity', () => {
  it('only counts selesai orders with an assigned mechanic, in period by paidAt', () => {
    const orders = [
      order({ status: 'selesai', assignedMechanicName: 'Bagas', paidAt: '2026-08-06T01:00:00.000Z', serviceItems: [svcItem({ price: 200000, qty: 1 })] }),
      order({ status: 'selesai', assignedMechanicName: undefined, paidAt: '2026-08-06T01:00:00.000Z', serviceItems: [svcItem({ price: 999999, qty: 1 })] }),
      order({ status: 'dikerjakan', assignedMechanicName: 'Bagas', serviceItems: [svcItem({ price: 999999, qty: 1 })] }),
    ];
    const result = mechanicProductivity(orders, 'semua', NOW);
    expect(result).toEqual([{ name: 'Bagas', count: 1, revenue: 200000 }]);
  });

  it('falls back to createdAt when paidAt is missing', () => {
    const o = order({ status: 'selesai', assignedMechanicName: 'Ridho', createdAt: '2026-08-06T01:00:00.000Z', paidAt: undefined, serviceItems: [svcItem({ price: 50000, qty: 1 })] });
    expect(mechanicProductivity([o], 'hari_ini', NOW)).toEqual([{ name: 'Ridho', count: 1, revenue: 50000 }]);
  });

  it('excludes pending (not-yet-ACC) items from revenue, not just rejected', () => {
    const o = order({
      status: 'selesai', assignedMechanicName: 'Bagas', paidAt: '2026-08-06T01:00:00.000Z',
      serviceItems: [
        svcItem({ price: 200000, qty: 1, status: 'approved' }),
        svcItem({ price: 999999, qty: 1, status: 'pending' }),
      ],
    });
    expect(mechanicProductivity([o], 'semua', NOW)).toEqual([{ name: 'Bagas', count: 1, revenue: 200000 }]);
  });
});

describe('bayUtilization', () => {
  it('counts distinct occupied slots among non-selesai orders', () => {
    const orders = [
      order({ status: 'dikerjakan', slotNumber: 1 }),
      order({ status: 'dikerjakan', slotNumber: 2 }),
      order({ status: 'selesai', slotNumber: 3 }), // excluded, done
      order({ status: 'antre' }), // excluded, no slot
    ];
    expect(bayUtilization(orders, 10)).toEqual({ occupied: 2, pct: 20 });
  });

  it('guards against division by zero if totalBays is 0', () => {
    expect(bayUtilization([], 0)).toEqual({ occupied: 0, pct: 0 });
  });
});

describe('repeatCustomerRate', () => {
  it('computes % of unique phones with more than one order', () => {
    const orders = [
      order({ customerPhone: 'A' }), order({ customerPhone: 'A' }),
      order({ customerPhone: 'B' }),
    ];
    expect(repeatCustomerRate(orders)).toBe(50); // 1 of 2 unique phones repeats
  });

  it('returns 0 for no orders', () => {
    expect(repeatCustomerRate([])).toBe(0);
  });
});

describe('serviceDueList', () => {
  it('lists vehicles whose latest paid service is older than the cutoff, oldest first', () => {
    const orders = [
      order({ plateNumber: 'B-1', status: 'selesai', paidAt: '2026-01-01T00:00:00.000Z' }),
      order({ plateNumber: 'B-2', status: 'selesai', paidAt: '2026-07-01T00:00:00.000Z' }), // recent, excluded
    ];
    const due = serviceDueList(orders, 6, NOW);
    expect(due.map(o => o.plateNumber)).toEqual(['B-1']);
  });

  it('keeps only the latest order per plate before checking the cutoff', () => {
    const orders = [
      order({ plateNumber: 'B-1', status: 'selesai', paidAt: '2020-01-01T00:00:00.000Z' }),
      order({ plateNumber: 'B-1', status: 'selesai', paidAt: '2026-07-01T00:00:00.000Z' }), // newer visit, not due
    ];
    expect(serviceDueList(orders, 6, NOW)).toHaveLength(0);
  });
});

describe('revenueChartData — year-collision fix', () => {
  it('does not merge the same calendar day from two different years', () => {
    const txs = [
      tx({ amount: 100000, timestamp: '2025-01-01T03:00:00.000Z' }),
      tx({ amount: 200000, timestamp: '2026-01-01T03:00:00.000Z' }),
    ];
    const result = revenueChartData(txs, 'semua', NOW);
    expect(result).toHaveLength(2);
    expect(result[0].revenue).toBe(100000);
    expect(result[1].revenue).toBe(200000);
  });

  it('merges same-day transactions into one point', () => {
    const txs = [
      tx({ amount: 100000, timestamp: '2026-08-06T02:00:00.000Z' }),
      tx({ amount: 50000, timestamp: '2026-08-06T10:00:00.000Z' }),
    ];
    expect(revenueChartData(txs, 'semua', NOW)).toEqual([{ name: expect.any(String), revenue: 150000 }]);
  });

  it('is bounded by period — does not render unbounded history', () => {
    const txs = [
      tx({ amount: 999999, timestamp: '2020-01-01T00:00:00.000Z' }),
      tx({ amount: 100000, timestamp: '2026-08-06T02:00:00.000Z' }),
    ];
    const result = revenueChartData(txs, 'bulan_ini', NOW);
    expect(result).toHaveLength(1);
    expect(result[0].revenue).toBe(100000);
  });
});
