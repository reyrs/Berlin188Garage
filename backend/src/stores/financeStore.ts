import { create } from 'zustand';
import type { CashTransaction, CashClosing, Expense } from '@shared/types';
import { genId } from '@shared/id';
import {
  fetchTransactions, createTransaction,
  fetchExpenses, createExpense,
  fetchClosings, createClosing,
} from '@shared/db';

interface FinanceState {
  transactions: CashTransaction[];
  expenses: Expense[];
  closings: CashClosing[];
  isLoading: boolean;
  error: string | null;

  setTransactions: (txns: CashTransaction[]) => void;
  setExpenses: (exp: Expense[]) => void;
  setClosings: (cls: CashClosing[]) => void;

  loadFinance: () => Promise<void>;
  addTransaction: (txn: CashTransaction) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addClosing: (closing: Omit<CashClosing, 'id'>) => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  expenses: [],
  closings: [],
  isLoading: false,
  error: null,

  setTransactions: (transactions) => set({ transactions }),
  setExpenses: (expenses) => set({ expenses }),
  setClosings: (closings) => set({ closings }),

  loadFinance: async () => {
    set({ isLoading: true, error: null });
    try {
      const [txnsResult, expResult, closingsResult] = await Promise.allSettled([
        fetchTransactions(), fetchExpenses(), fetchClosings(),
      ]);
      if (txnsResult.status === 'fulfilled') set({ transactions: txnsResult.value });
      if (expResult.status === 'fulfilled') set({ expenses: expResult.value });
      if (closingsResult.status === 'fulfilled') set({ closings: closingsResult.value });
      const failures = [
        txnsResult.status === 'rejected' ? 'transaksi' : null,
        expResult.status === 'rejected' ? 'pengeluaran' : null,
        closingsResult.status === 'rejected' ? 'closing' : null,
      ].filter(Boolean);
      if (failures.length > 0) {
        set({ error: `Gagal memuat data ${failures.join(', ')}.` });
      }
      set({ isLoading: false });
    } catch (err) {
      set({ error: 'Gagal memuat data keuangan.', isLoading: false });
    }
  },

  addTransaction: (txn) => {
    set((state) => ({ transactions: [txn, ...state.transactions] }));
    createTransaction(txn).catch((err) => {
      console.error('Failed to save transaction:', err);
      set((state) => ({ transactions: state.transactions.filter((t) => t.id !== txn.id) }));
    });
  },

  addExpense: async (expenseFields) => {
    const newExp: Expense = { ...expenseFields, id: genId('EXP') };
    set((state) => ({ expenses: [newExp, ...state.expenses] }));
    try {
      await createExpense(newExp);
      const outflowTxn: CashTransaction = {
        id: genId('tx'),
        amount: newExp.amount,
        type: 'keluar',
        method: newExp.method,
        category: newExp.category as CashTransaction['category'],
        description: newExp.description,
        timestamp: new Date().toISOString(),
        createdBy: newExp.createdBy,
      };
      set((state) => ({ transactions: [outflowTxn, ...state.transactions] }));
      createTransaction(outflowTxn).catch((err) => {
        console.error('Failed to save outflow transaction:', err);
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== outflowTxn.id) }));
      });
    } catch (err) {
      console.error('Failed to save expense:', err);
      set((state) => ({ expenses: state.expenses.filter((e) => e.id !== newExp.id) }));
      throw err;
    }
  },

  addClosing: (closingFields) => {
    const newClosing: CashClosing = { ...closingFields, id: genId('CLO') };
    set((state) => ({ closings: [newClosing, ...state.closings] }));
    createClosing(newClosing).catch((err) => {
      console.error('Failed to save closing:', err);
      set((state) => ({ closings: state.closings.filter((c) => c.id !== newClosing.id) }));
    });
  },
}));
