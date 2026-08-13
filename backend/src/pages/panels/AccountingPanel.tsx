import React, { useState } from 'react';
import {
  CurrencyDollar, TrendDown, TrendUp, PlusCircle, FileText, X,
  ShoppingCart, Lightning, Users, DotsThree, CheckCircle, WarningCircle
} from '@phosphor-icons/react';
import KpiTile from '@shared/components/KpiTile';
import RupiahInput from '@shared/components/RupiahInput';
import { CashTransaction, CashClosing, Order, Expense, User } from '@shared/types';
import { KpiTone } from '@shared/design';
import InvoicePrint from '../../components/InvoicePrint';

interface AccountingPanelProps {
  orders: Order[];
  transactions: CashTransaction[];
  closings: CashClosing[];
  expenses: Expense[];
  staffUser: User;
  onAddExpense: (exp: Omit<Expense, 'id'>) => void;
  onCashClosing: (closing: Omit<CashClosing, 'id'>) => void;
  onProcessPayment: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', dest: string) => void;
  onConfirmDPPayment?: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', dpAmount: number, dest: string) => void;
  onIssueInvoice: (orderId: string) => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'operasional', label: 'Operasional', icon: ShoppingCart, color: 'amber' },
  { value: 'pembelian_part', label: 'Pembelian Part', icon: Lightning, color: 'blue' },
  { value: 'gaji', label: 'Gaji / Honor', icon: Users, color: 'purple' },
  { value: 'utilitas', label: 'Utilitas (Listrik/Air)', icon: Lightning, color: 'green' },
  { value: 'lainnya', label: 'Lainnya', icon: DotsThree, color: 'gray' },
];

const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
const formatDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
const formatTime = (s: string) => new Date(s).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
const METHOD_LABEL: Record<string, string> = {
  tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', edc: 'EDC Debit/Kredit'
};

export default function AccountingPanel({
  orders, transactions, closings, expenses, staffUser,
  onAddExpense, onCashClosing, onProcessPayment, onConfirmDPPayment, onIssueInvoice
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
  const [cashReceived, setCashReceived] = useState('');

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
    setCashReceived('');
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
      <div className="flex gap-1 bg-gray-100 dark:bg-[#22252c] p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-white dark:bg-[#1a1d23] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
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
              { label: 'Pendapatan Hari Ini', value: formatRp(todayIncome), icon: TrendUp, tone: 'success' as KpiTone, sub: `${todayTx.filter(t=>t.type==='masuk').length} transaksi` },
              { label: 'Pengeluaran Hari Ini', value: formatRp(todayExpenses), icon: TrendDown, tone: 'danger' as KpiTone, sub: 'Biaya operasional' },
              { label: 'Total Pendapatan', value: formatRp(totalIncome), icon: CurrencyDollar, tone: 'info' as KpiTone, sub: 'Sejak awal' },
              { label: 'Net Profit', value: formatRp(netProfit), icon: CheckCircle, tone: (netProfit >= 0 ? 'success' : 'danger') as KpiTone, sub: 'Pendapatan - Pengeluaran' },
            ].map((kpi, i) => (
              <KpiTile key={i} label={kpi.label} value={kpi.value} sublabel={kpi.sub} icon={kpi.icon} tone={kpi.tone} />
            ))}
          </div>

          {/* Backup Data */}
          <div className="card p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Backup & Export Data</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Download semua data bengkel sebagai file JSON</p>
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
              className="flex items-center gap-2 bg-berlin-navy text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-berlin-navy-dark transition-colors">
              <FileText className="w-4 h-4" weight="duotone" />
              Download Backup
            </button>
          </div>

          {/* Recent transactions */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a2d35] flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Transaksi Terbaru</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">{transactions.length} total</span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-[#2a2d35]">
              {[...transactions].reverse().slice(0, 8).map(tx => (
                <div key={tx.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#22252c]">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'masuk' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
                      {tx.type === 'masuk' ? <TrendUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" weight="duotone" /> : <TrendDown className="w-4 h-4 text-red-500" weight="duotone" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{tx.description}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{formatDate(tx.timestamp)} · {METHOD_LABEL[tx.method] || tx.method}</div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold font-sans ${tx.type === 'masuk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {tx.type === 'masuk' ? '+' : '-'}{formatRp(tx.amount)}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">Belum ada transaksi</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PEMBAYARAN TAB */}
      {activeTab === 'pembayaran' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <WarningCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" weight="duotone" />
            <span className="text-sm text-amber-800 dark:text-amber-400">{pendingOrders.length} kendaraan menunggu pembayaran</span>
          </div>

          {pendingOrders.length === 0 && (
            <div className="card py-16 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" weight="duotone" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Semua tagihan sudah lunas</p>
            </div>
          )}

          <div className="space-y-3">
            {pendingOrders.map(order => {
              const total = order.serviceItems
                .filter(i => i.status !== 'rejected' && i.status !== 'pending')
                .reduce((s, i) => s + i.price * i.qty, 0);
              return (
                <div key={order.id} className="card-padded">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 dark:text-white">{order.id}</span>
                        {order.paymentStatus === 'dp' ? (
                          <span className="text-xs bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">DP (Sisa Bayar)</span>
                        ) : (
                          <span className="text-xs bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">Menunggu Bayar</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.customerName} · {order.carBrand} {order.carModel}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">{order.plateNumber}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 dark:text-white font-sans tabular-nums">{formatRp(total)}</div>
                      {!order.invoicedAt ? (
                        <button onClick={() => onIssueInvoice(order.id)}
                          className="mt-2 bg-amber-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5 ml-auto">
                          <FileText className="w-3.5 h-3.5" weight="duotone" /> Terbitkan Invoice
                        </button>
                      ) : (
                        <button onClick={() => { setShowPaymentModal(order); setCashReceived(''); }}
                          className="mt-2 bg-berlin-navy text-white text-sm px-4 py-1.5 rounded-lg hover:bg-berlin-navy-dark transition-colors">
                          Proses Bayar
                        </button>
                      )}
                    </div>
                  </div>
                  {order.invoicedAt && (
                    <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Invoice diterbitkan {formatDate(order.invoicedAt)} {formatTime(order.invoicedAt)}
                    </p>
                  )}
                  {/* Items breakdown */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2d35] space-y-1">
                    {order.serviceItems.filter(i => i.status !== 'rejected' && i.status !== 'pending').map(item => (
                      <div key={item.id} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{item.name} {item.qty > 1 ? `(×${item.qty})` : ''}</span>
                        <span className="font-sans tabular-nums">{formatRp(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paid history */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a2d35]">
              <h3 className="font-semibold text-gray-900 dark:text-white">Riwayat Pembayaran</h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-[#2a2d35]">
              {transactions.filter(t => t.type === 'masuk').reverse().map(tx => (
                <div key={tx.id} className="px-5 py-3 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{tx.description}</div>
                    <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(tx.timestamp)} {formatTime(tx.timestamp)} · {METHOD_LABEL[tx.method] || tx.method}</span>
                    {tx.orderId && (
                      <button
                        onClick={() => setInvoiceOrder(orders.find(o => o.id === tx.orderId) || null)}
                        className="text-xs text-blue-500 hover:text-blue-700 underline"
                       >Cetak Invoice</button>
                    )}
                  </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-sans tabular-nums">+{formatRp(tx.amount)}</span>
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
              <h3 className="font-semibold text-gray-900 dark:text-white">Catat Pengeluaran</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">Total bulan ini: <span className="font-bold text-red-600 dark:text-red-400">{formatRp(totalExpenses)}</span></p>
            </div>
            <button onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2 bg-berlin-navy text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-berlin-navy-dark transition-colors">
              <PlusCircle className="w-4 h-4" weight="duotone" />
              Tambah Pengeluaran
            </button>
          </div>

          {/* Expense form */}
          {showExpenseForm && (
            <div className="card-padded">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Pengeluaran Baru</h4>
                <button onClick={() => setShowExpenseForm(false)}><X className="w-5 h-5 text-gray-400 dark:text-gray-500" weight="duotone" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Tanggal</label>
                  <input type="date" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Jumlah (Rp)</label>
                  <RupiahInput placeholder="0" value={expForm.amount} onChange={digits => setExpForm(p => ({ ...p, amount: digits }))}
                    className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg pr-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Keterangan</label>
                  <input placeholder="Contoh: Beli brake cleaner 2 botol" value={expForm.description}
                    onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Kategori</label>
                  <select value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value as any }))}
                    className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500">
                    {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Metode</label>
                  <select value={expForm.method} onChange={e => setExpForm(p => ({ ...p, method: e.target.value as any }))}
                    className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500">
                    <option value="tunai">Tunai</option>
                    <option value="transfer">Transfer</option>
                    <option value="qris">QRIS</option>
                    <option value="edc">EDC Debit/Kredit</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowExpenseForm(false)}
                  className="flex-1 border border-gray-200 dark:border-[#2a2d35] text-gray-600 dark:text-gray-400 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#22252c]">Batal</button>
                <button onClick={handleAddExpense}
                  className="flex-1 bg-berlin-navy text-white py-2 rounded-xl text-sm font-medium hover:bg-berlin-navy-dark">Simpan</button>
              </div>
            </div>
          )}

          {/* Expense list */}
          <div className="card overflow-hidden">
            <div className="divide-y divide-gray-50 dark:divide-[#2a2d35]">
              {[...expenses].reverse().map(exp => {
                const cat = EXPENSE_CATEGORIES.find(c => c.value === exp.category);
                return (
                  <div key={exp.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#22252c]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                        <TrendDown className="w-4 h-4 text-red-500" weight="duotone" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{exp.description}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(exp.date)}</span>
                          <span className="text-xs bg-gray-100 dark:bg-[#22252c] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{cat?.label || exp.category}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{METHOD_LABEL[exp.method] || exp.method}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-red-500 font-sans tabular-nums">-{formatRp(exp.amount)}</span>
                  </div>
                );
              })}
              {expenses.length === 0 && (
                <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">Belum ada pengeluaran tercatat</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CLOSING KAS TAB */}
      {activeTab === 'closing' && (
        <div className="space-y-4">
          <div className="card-padded">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Closing Kas Harian</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-[#22252c] rounded-xl p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider mb-1">Kas Tunai Sistem</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white font-sans tabular-nums">{formatRp(systemCash)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Berdasarkan transaksi hari ini</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Kas Fisik (hitung manual)</label>
                <RupiahInput placeholder="0" value={physicalCash}
                  onChange={digits => setPhysicalCash(digits)}
                  className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-xl pr-4 py-3 text-lg font-sans text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500" />
                {physicalCash && (
                  <p className={`text-sm font-medium mt-1 ${parseInt(physicalCash) - systemCash === 0 ? 'text-emerald-600 dark:text-emerald-400' : parseInt(physicalCash) - systemCash > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                    Selisih: {formatRp(Math.abs(parseInt(physicalCash) - systemCash))}
                    {parseInt(physicalCash) - systemCash > 0 ? ' (lebih)' : parseInt(physicalCash) - systemCash < 0 ? ' (kurang)' : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Catatan (opsional)</label>
              <textarea placeholder="Keterangan selisih atau catatan lain..." value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)} rows={2}
                className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 resize-none" />
            </div>
            <button onClick={handleClosing} disabled={!physicalCash}
              className="w-full bg-berlin-navy text-white py-3 rounded-xl font-medium hover:bg-berlin-navy-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Tutup Kas Hari Ini
            </button>
          </div>

          {/* Closing history */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a2d35]">
              <h3 className="font-semibold text-gray-900 dark:text-white">Riwayat Closing</h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-[#2a2d35]">
              {[...closings].reverse().map(c => (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{formatDate(c.timestamp)} — oleh {c.closedBy}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">Sistem: <span className="font-sans font-medium tabular-nums">{formatRp(c.systemCash)}</span></span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">Fisik: <span className="font-sans font-medium tabular-nums">{formatRp(c.physicalCash)}</span></span>
                      </div>
                      {c.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">{c.notes}</p>}
                    </div>
                    <span className={`text-sm font-bold font-sans ${c.discrepancy === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {c.discrepancy === 0 ? '✓ Sesuai' : (c.discrepancy > 0 ? '+' : '') + formatRp(c.discrepancy)}
                    </span>
                  </div>
                </div>
              ))}
              {closings.length === 0 && (
                <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">Belum ada riwayat closing</div>
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
      {showPaymentModal && (() => {
        const totalTagihan = showPaymentModal.serviceItems.filter(i => i.status !== 'rejected' && i.status !== 'pending').reduce((s, i) => s + i.price * i.qty, 0);
        const sudahDibayar = showPaymentModal.dpAmountPaid || 0;
        const sisaTagihan = totalTagihan - sudahDibayar;
        const cashReceivedNum = parseInt(cashReceived) || 0;
        const kembalian = Math.max(0, cashReceivedNum - sisaTagihan);
        const dpAmountNum = parseInt(dpAmount) || 0;
        const isDpAmountValid = dpAmountNum > 0 && dpAmountNum <= sisaTagihan;
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="bg-white dark:bg-[#1a1d23] rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Proses Pembayaran</h3>
              <button onClick={() => { setShowPaymentModal(null); setCashReceived(''); }}><X className="w-5 h-5 text-gray-400 dark:text-gray-500" weight="duotone" /></button>
            </div>
            <div className="bg-gray-50 dark:bg-[#22252c] rounded-xl p-4 mb-4 space-y-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{showPaymentModal.id} — {showPaymentModal.customerName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{showPaymentModal.carBrand} {showPaymentModal.carModel} · {showPaymentModal.plateNumber}</p>
              <div className="border-t border-gray-200 dark:border-[#2a2d35] pt-2 mt-1 space-y-1 text-xs">
                <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Total Tagihan</span><span className="font-sans tabular-nums">{formatRp(totalTagihan)}</span></div>
                {sudahDibayar > 0 && (
                  <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Sudah Dibayar (DP)</span><span className="font-sans tabular-nums">{formatRp(sudahDibayar)}</span></div>
                )}
                <div className="flex justify-between text-gray-900 dark:text-white font-bold text-sm"><span>Sisa Tagihan</span><span className="font-sans tabular-nums">{formatRp(sisaTagihan)}</span></div>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                     { id: 'tunai' as const, label: 'Tunai' },
                     { id: 'qris' as const, label: 'QRIS' },
                     { id: 'transfer' as const, label: 'Transfer' },
                     { id: 'edc' as const, label: 'EDC' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setPayMethod(m.id)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${payMethod === m.id ? 'bg-berlin-navy text-white border-berlin-navy' : 'border-gray-200 dark:border-[#2a2d35] text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {payMethod === 'tunai' && !isDP && (
                <div className="border border-gray-200 dark:border-[#2a2d35] rounded-xl p-3 space-y-2.5 bg-gray-50/60 dark:bg-[#22252c]/60">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block">Nominal Cepat</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[50000, 100000, 200000, 500000, 1000000].map(n => (
                      <button key={n} type="button" onClick={() => setCashReceived(String(n))}
                        className="py-2 rounded-lg text-xs font-semibold border border-gray-200 dark:border-[#2a2d35] text-gray-600 dark:text-gray-400 hover:border-berlin-navy hover:text-berlin-navy dark:hover:text-white transition-all">
                        {n >= 1000000 ? `${n / 1000000}jt` : `${n / 1000}rb`}
                      </button>
                    ))}
                    <button type="button" onClick={() => setCashReceived(String(sisaTagihan))}
                      className="py-2 rounded-lg text-xs font-bold bg-berlin-navy text-white hover:bg-berlin-navy-dark transition-all">
                      LUNAS
                    </button>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Jumlah Dibayar</label>
                    <RupiahInput value={cashReceived} onChange={digits => setCashReceived(digits)}
                      placeholder="0"
                      className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-xl pr-3 py-2.5 text-sm font-sans text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500" />
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-gray-200 dark:border-[#2a2d35]">
                    <span className="text-gray-500 dark:text-gray-400">Uang Diterima</span>
                    <span className="font-sans tabular-nums text-gray-700 dark:text-gray-300">{formatRp(cashReceivedNum)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-900 dark:text-white">Kembalian</span>
                    <span className="font-sans tabular-nums text-emerald-600 dark:text-emerald-400">{formatRp(kembalian)}</span>
                  </div>
                </div>
              )}
              {(payMethod === 'transfer' || payMethod === 'qris') && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                    {payMethod === 'qris' ? 'QRIS Tujuan' : 'Tujuan Transfer'}
                  </label>
                  <select value={payDest} onChange={e => setPayDest(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500">
                    <option>BCA - 8831881888</option>
                    <option>Mandiri - 1550018818818</option>
                    {payMethod === 'qris' && <option>QRIS GoPay/OVO/ShopeePay</option>}
                  </select>
                </div>
              )}
              {payMethod === 'edc' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Jenis Kartu</label>
                  <select value={payDest} onChange={e => setPayDest(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500">
                    <option>EDC BCA Debit/Kredit</option>
                    <option>EDC Mandiri Debit/Kredit</option>
                  </select>
                </div>
              )}
              {showPaymentModal.paymentStatus !== 'dp' && (
                <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={isDP} onChange={e => setIsDP(e.target.checked)} className="rounded" />
                  Terima DP (Down Payment) — belum lunas
                </label>
              )}
              {isDP && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Jumlah DP (Rp)</label>
                  <RupiahInput value={dpAmount} onChange={digits => setDpAmount(digits)}
                    placeholder="0"
                    className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-xl pr-3 py-2.5 text-sm font-sans text-gray-800 dark:text-gray-100 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500" />
                  {dpAmount.trim() !== '' && !isDpAmountValid && (
                    <p className="text-xs text-red-500 mt-1.5">
                      {dpAmountNum <= 0
                        ? 'Nominal DP harus lebih dari Rp 0.'
                        : `Nominal DP tidak boleh melebihi sisa tagihan (${formatRp(sisaTagihan)}).`}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowPaymentModal(null); setCashReceived(''); }}
                className="flex-1 border border-gray-200 dark:border-[#2a2d35] py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]">Batal</button>
              <button
                disabled={(payMethod === 'tunai' && !isDP && cashReceivedNum < sisaTagihan) || (isDP && !isDpAmountValid)}
                onClick={() => {
                  if (isDP && showPaymentModal && onConfirmDPPayment) {
                    onConfirmDPPayment(showPaymentModal.id, payMethod, dpAmountNum, payDest);
                    setShowPaymentModal(null);
                    setIsDP(false);
                    setDpAmount('');
                    setCashReceived('');
                  } else {
                    handlePayment();
                  }
                }}
                className="flex-1 bg-berlin-navy text-white py-2.5 rounded-xl text-sm font-medium hover:bg-berlin-navy-dark disabled:opacity-40 disabled:cursor-not-allowed">
                {isDP ? 'Konfirmasi DP' : 'Konfirmasi Lunas'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
