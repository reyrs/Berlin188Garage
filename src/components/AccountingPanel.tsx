import React, { useState } from 'react';
import {
  DollarSign, TrendingDown, TrendingUp, PlusCircle, FileText, X,
  Calendar, Filter, ChevronDown, Printer, Banknote, CreditCard,
  ShoppingCart, Zap, Users, MoreHorizontal, CheckCircle2, AlertCircle
} from 'lucide-react';
import { CashTransaction, CashClosing, Order, Expense, User } from '../types';
import InvoicePrint from './InvoicePrint';

interface AccountingPanelProps {
  orders: Order[];
  transactions: CashTransaction[];
  closings: CashClosing[];
  expenses: Expense[];
  staffUser: User;
  onAddTransaction: (tx: Omit<CashTransaction, 'id' | 'timestamp'>) => void;
  onAddExpense: (exp: Omit<Expense, 'id'>) => void;
  onCashClosing: (closing: Omit<CashClosing, 'id'>) => void;
  onProcessPayment: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', dest: string) => void;
  onConfirmDPPayment?: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', dpAmount: number, dest: string) => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'operasional', label: 'Operasional', icon: ShoppingCart, color: 'amber' },
  { value: 'pembelian_part', label: 'Pembelian Part', icon: Zap, color: 'blue' },
  { value: 'gaji', label: 'Gaji / Honor', icon: Users, color: 'purple' },
  { value: 'utilitas', label: 'Utilitas (Listrik/Air)', icon: Zap, color: 'green' },
  { value: 'lainnya', label: 'Lainnya', icon: MoreHorizontal, color: 'gray' },
];

const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
const formatDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
const formatTime = (s: string) => new Date(s).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
const METHOD_LABEL: Record<string, string> = {
  tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', edc: 'EDC Debit/Kredit'
};

export default function AccountingPanel({
  orders, transactions, closings, expenses, staffUser,
  onAddTransaction, onAddExpense, onCashClosing, onProcessPayment, onConfirmDPPayment
}: AccountingPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pembayaran' | 'pengeluaran' | 'closing'>('dashboard');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Order | null>(null);

  // Expense form state
  const [expForm, setExpForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'operasional' as Expense['category'],
    method: 'tunai' as 'tunai' | 'transfer' | 'qris' | 'edc',
  });

  // Payment form
  const [payMethod, setPayMethod] = useState<'tunai' | 'transfer' | 'qris' | 'edc'>('transfer');
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [payDest, setPayDest] = useState('BCA');
  const [isDP, setIsDP] = useState(false);
  const [dpAmount, setDpAmount] = useState('');

  // Closing form
  const [physicalCash, setPhysicalCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Calculations
  const today = new Date().toDateString();
  const todayTx = transactions.filter(t => new Date(t.timestamp).toDateString() === today);
  const todayIncome = todayTx.filter(t => t.type === 'masuk').reduce((s, t) => s + t.amount, 0);
  const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === today).reduce((s, e) => s + e.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'masuk').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const pendingOrders = orders.filter(o =>
    (o.status === 'menunggu_pembayaran' && o.paymentStatus === 'belum_dibayar') ||
    o.paymentStatus === 'dp'
  );

  const systemCash = todayTx
    .filter(t => t.method === 'tunai')
    .reduce((s, t) => s + (t.type === 'masuk' ? t.amount : -t.amount), 0);

  const handleAddExpense = () => {
    if (!expForm.description || !expForm.amount) return;
    onAddExpense({
      date: expForm.date,
      description: expForm.description,
      amount: parseInt(expForm.amount),
      category: expForm.category,
      method: expForm.method,
      createdBy: staffUser.name,
    });
    setExpForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: 'operasional', method: 'tunai' });
    setShowExpenseForm(false);
  };

  const handlePayment = () => {
    if (!showPaymentModal) return;
    onProcessPayment(showPaymentModal.id, payMethod, payDest);
    setShowPaymentModal(null);
  };

  const handleClosing = () => {
    const physical = parseInt(physicalCash) || 0;
    onCashClosing({
      timestamp: new Date().toISOString(),
      systemCash,
      physicalCash: physical,
      discrepancy: physical - systemCash,
      closedBy: staffUser.name,
      notes: closingNotes,
    });
    setPhysicalCash('');
    setClosingNotes('');
  };

  const tabs = [
    { id: 'dashboard', label: 'Ringkasan' },
    { id: 'pembayaran', label: `Tagihan${pendingOrders.length > 0 ? ` (${pendingOrders.length})` : ''}` },
    { id: 'pengeluaran', label: 'Pengeluaran' },
    { id: 'closing', label: 'Closing Kas' },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Pendapatan Hari Ini', value: formatRp(todayIncome), icon: TrendingUp, color: 'emerald', sub: `${todayTx.filter(t=>t.type==='masuk').length} transaksi` },
              { label: 'Pengeluaran Hari Ini', value: formatRp(todayExpenses), icon: TrendingDown, color: 'red', sub: 'Biaya operasional' },
              { label: 'Total Pendapatan', value: formatRp(totalIncome), icon: DollarSign, color: 'blue', sub: 'Sejak awal' },
              { label: 'Net Profit', value: formatRp(netProfit), icon: CheckCircle2, color: netProfit >= 0 ? 'emerald' : 'red', sub: 'Pendapatan - Pengeluaran' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{kpi.label}</span>
                  <div className={`w-8 h-8 rounded-lg bg-${kpi.color}-50 text-${kpi.color}-700 flex items-center justify-center`}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900 font-mono">{kpi.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Backup Data */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Backup & Export Data</h3>
              <p className="text-xs text-gray-400">Download semua data bengkel sebagai file JSON</p>
            </div>
            <button onClick={() => {
              const data = { orders, transactions, closings, expenses, exportedAt: new Date().toISOString() };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `berlin188-backup-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <FileText className="w-4 h-4" />
              Download Backup
            </button>
          </div>

          {/* Recent transactions */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Transaksi Terbaru</h3>
              <span className="text-xs text-gray-400">{transactions.length} total</span>
            </div>
            <div className="divide-y divide-gray-50">
              {[...transactions].reverse().slice(0, 8).map(tx => (
                <div key={tx.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'masuk' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {tx.type === 'masuk' ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{tx.description}</div>
                      <div className="text-xs text-gray-400">{formatDate(tx.timestamp)} · {METHOD_LABEL[tx.method] || tx.method}</div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold font-mono ${tx.type === 'masuk' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.type === 'masuk' ? '+' : '-'}{formatRp(tx.amount)}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">Belum ada transaksi</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PEMBAYARAN TAB */}
      {activeTab === 'pembayaran' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800">{pendingOrders.length} kendaraan menunggu pembayaran</span>
          </div>

          {pendingOrders.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Semua tagihan sudah lunas</p>
            </div>
          )}

          <div className="space-y-3">
            {pendingOrders.map(order => {
              const total = order.serviceItems
                .filter(i => i.status !== 'rejected')
                .reduce((s, i) => s + i.price * i.qty, 0);
              return (
                <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{order.id}</span>
                        {order.paymentStatus === 'dp' ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">DP (Sisa Bayar)</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Menunggu Bayar</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{order.customerName} · {order.carBrand} {order.carModel}</p>
                      <p className="text-sm text-gray-400">{order.plateNumber}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 font-mono">{formatRp(total)}</div>
                      <button onClick={() => setShowPaymentModal(order)}
                        className="mt-2 bg-black text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                        Proses Bayar
                      </button>
                    </div>
                  </div>
                  {/* Items breakdown */}
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                    {order.serviceItems.filter(i => i.status !== 'rejected').map(item => (
                      <div key={item.id} className="flex justify-between text-xs text-gray-500">
                        <span>{item.name} {item.qty > 1 ? `(×${item.qty})` : ''}</span>
                        <span className="font-mono">{formatRp(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paid history */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Riwayat Pembayaran</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {transactions.filter(t => t.type === 'masuk').reverse().map(tx => (
                <div key={tx.id} className="px-5 py-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{tx.description}</div>
                    <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatDate(tx.timestamp)} {formatTime(tx.timestamp)} · {METHOD_LABEL[tx.method] || tx.method}</span>
                    {tx.orderId && (
                      <button
                        onClick={() => setInvoiceOrder(orders.find(o => o.id === tx.orderId) || null)}
                        className="text-xs text-blue-500 hover:text-blue-700 underline"
                      >🖨️ Cetak Invoice</button>
                    )}
                  </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 font-mono">+{formatRp(tx.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PENGELUARAN TAB */}
      {activeTab === 'pengeluaran' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">Catat Pengeluaran</h3>
              <p className="text-sm text-gray-400">Total bulan ini: <span className="font-bold text-red-600">{formatRp(totalExpenses)}</span></p>
            </div>
            <button onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <PlusCircle className="w-4 h-4" />
              Tambah Pengeluaran
            </button>
          </div>

          {/* Expense form */}
          {showExpenseForm && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900">Pengeluaran Baru</h4>
                <button onClick={() => setShowExpenseForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Tanggal</label>
                  <input type="date" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Jumlah (Rp)</label>
                  <input type="number" placeholder="0" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Keterangan</label>
                  <input placeholder="Contoh: Beli brake cleaner 2 botol" value={expForm.description}
                    onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Kategori</label>
                  <select value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400">
                    {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Metode</label>
                  <select value={expForm.method} onChange={e => setExpForm(p => ({ ...p, method: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400">
                    <option value="tunai">Tunai</option>
                    <option value="transfer">Transfer</option>
                    <option value="qris">QRIS</option>
                    <option value="edc">EDC Debit/Kredit</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowExpenseForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">Batal</button>
                <button onClick={handleAddExpense}
                  className="flex-1 bg-black text-white py-2 rounded-xl text-sm font-medium hover:bg-gray-800">Simpan</button>
              </div>
            </div>
          )}

          {/* Expense list */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-50">
              {[...expenses].reverse().map(exp => {
                const cat = EXPENSE_CATEGORIES.find(c => c.value === exp.category);
                return (
                  <div key={exp.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{exp.description}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{formatDate(exp.date)}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{cat?.label || exp.category}</span>
                          <span className="text-xs text-gray-400">{METHOD_LABEL[exp.method] || exp.method}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-red-500 font-mono">-{formatRp(exp.amount)}</span>
                  </div>
                );
              })}
              {expenses.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">Belum ada pengeluaran tercatat</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CLOSING KAS TAB */}
      {activeTab === 'closing' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Closing Kas Harian</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Kas Tunai Sistem</p>
                <p className="text-xl font-bold text-gray-900 font-mono">{formatRp(systemCash)}</p>
                <p className="text-xs text-gray-400 mt-1">Berdasarkan transaksi hari ini</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Kas Fisik (hitung manual)</label>
                <input type="number" placeholder="0" value={physicalCash}
                  onChange={e => setPhysicalCash(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:border-gray-400" />
                {physicalCash && (
                  <p className={`text-sm font-medium mt-1 ${parseInt(physicalCash) - systemCash === 0 ? 'text-emerald-600' : parseInt(physicalCash) - systemCash > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    Selisih: {formatRp(Math.abs(parseInt(physicalCash) - systemCash))}
                    {parseInt(physicalCash) - systemCash > 0 ? ' (lebih)' : parseInt(physicalCash) - systemCash < 0 ? ' (kurang)' : ' ✓ Sesuai'}
                  </p>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1">Catatan (opsional)</label>
              <textarea placeholder="Keterangan selisih atau catatan lain..." value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none" />
            </div>
            <button onClick={handleClosing} disabled={!physicalCash}
              className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Tutup Kas Hari Ini
            </button>
          </div>

          {/* Closing history */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Riwayat Closing</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {[...closings].reverse().map(c => (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{formatDate(c.timestamp)} — oleh {c.closedBy}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-gray-400">Sistem: <span className="font-mono font-medium">{formatRp(c.systemCash)}</span></span>
                        <span className="text-xs text-gray-400">Fisik: <span className="font-mono font-medium">{formatRp(c.physicalCash)}</span></span>
                      </div>
                      {c.notes && <p className="text-xs text-gray-400 mt-1 italic">{c.notes}</p>}
                    </div>
                    <span className={`text-sm font-bold font-mono ${c.discrepancy === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {c.discrepancy === 0 ? '✓ Sesuai' : (c.discrepancy > 0 ? '+' : '') + formatRp(c.discrepancy)}
                    </span>
                  </div>
                </div>
              ))}
              {closings.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">Belum ada riwayat closing</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Print Modal */}
      {invoiceOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, overflow: 'auto' }}>
          <InvoicePrint
            order={invoiceOrder}
            invoiceNumber={`INV-${invoiceOrder.id}-${new Date().getFullYear()}`}
            kasirName={staffUser.name}
            onClose={() => setInvoiceOrder(null)}
          />
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Proses Pembayaran</h3>
              <button onClick={() => setShowPaymentModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-900">{showPaymentModal.id} — {showPaymentModal.customerName}</p>
              <p className="text-sm text-gray-500">{showPaymentModal.carBrand} {showPaymentModal.carModel} · {showPaymentModal.plateNumber}</p>
              <p className="text-xl font-bold text-gray-900 font-mono mt-2">
                {formatRp(showPaymentModal.serviceItems.filter(i=>i.status!=='rejected').reduce((s,i)=>s+i.price*i.qty,0))}
              </p>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'tunai' as const, label: '💵 Tunai' },
                    { id: 'transfer' as const, label: '🏦 Transfer' },
                    { id: 'qris' as const, label: '📱 QRIS' },
                    { id: 'edc' as const, label: '💳 EDC' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setPayMethod(m.id)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${payMethod === m.id ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {(payMethod === 'transfer' || payMethod === 'qris') && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">
                    {payMethod === 'qris' ? 'QRIS Tujuan' : 'Tujuan Transfer'}
                  </label>
                  <select value={payDest} onChange={e => setPayDest(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400">
                    <option>BCA - 8831881888</option>
                    <option>Mandiri - 1550018818818</option>
                    {payMethod === 'qris' && <option>QRIS GoPay/OVO/ShopeePay</option>}
                  </select>
                </div>
              )}
              {payMethod === 'edc' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Jenis Kartu</label>
                  <select value={payDest} onChange={e => setPayDest(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400">
                    <option>EDC BCA Debit/Kredit</option>
                    <option>EDC Mandiri Debit/Kredit</option>
                  </select>
                </div>
              )}
              {showPaymentModal.paymentStatus !== 'dp' && (
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={isDP} onChange={e => setIsDP(e.target.checked)} className="rounded" />
                  Terima DP (Down Payment) — belum lunas
                </label>
              )}
              {isDP && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Jumlah DP (Rp)</label>
                  <input type="number" value={dpAmount} onChange={e => setDpAmount(e.target.value)}
                    placeholder="Masukkan nominal DP..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-gray-400" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPaymentModal(null)}
                className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={() => {
                if (isDP && showPaymentModal && onConfirmDPPayment) {
                  onConfirmDPPayment(showPaymentModal.id, payMethod, parseInt(dpAmount) || 0, payDest);
                  setShowPaymentModal(null);
                  setIsDP(false);
                  setDpAmount('');
                } else {
                  handlePayment();
                }
              }}
                className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800">
                {isDP ? 'Konfirmasi DP' : 'Konfirmasi Lunas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
