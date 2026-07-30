import React, { useState } from 'react';
import { DollarSign, CreditCard, CheckSquare, ListTodo, Landmark, AlertCircle, History, ShieldAlert } from 'lucide-react';
import { Order, CashTransaction, CashClosing, User as StaffUser } from '../types';

interface CashierPanelProps {
  orders: Order[];
  transactions: CashTransaction[];
  closings: CashClosing[];
  onConfirmPayment: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', bankDest: string) => void;
  onAddClosing: (closing: CashClosing) => void;
  activeUser: StaffUser;
}

export default function CashierPanel({ orders, transactions, closings, onConfirmPayment, onAddClosing, activeUser }: CashierPanelProps) {
  // Outstanding payments filter
  const pendingPayments = orders.filter(
    (o) => o.status === 'menunggu_pembayaran' || (o.status === 'selesai' && o.paymentStatus === 'belum_dibayar')
  );

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<'tunai' | 'transfer' | 'qris' | 'edc'>('transfer');
  const [bankDestination, setBankDestination] = useState('BCA');
  const [cashAmountInput, setCashAmountInput] = useState<number>(0);
  
  // Close Cash register state
  const [physicalCash, setPhysicalCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [closeSuccess, setCloseSuccess] = useState(false);

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const calculateTotal = (order: Order) => {
    // Only sum service items that are approved (status is not pending and not rejected)
    return order.serviceItems
      .filter(item => item.status !== 'pending' && item.status !== 'rejected')
      .reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
  };

  // Cash Drawer calculation for closing
  const cashTransactions = transactions.filter(t => t.method === 'tunai');
  const calculatedSystemCashInDrawer = cashTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    const total = calculateTotal(order);
    setCashAmountInput(total);
  };

  const handleProcessPayment = () => {
    if (!selectedOrder) return;
    onConfirmPayment(selectedOrder.id, payMethod, payMethod === 'tunai' ? 'Kas Laci' : bankDestination);
    setSelectedOrder(null);
  };

  const handleCloseCash = (e: React.FormEvent) => {
    e.preventDefault();
    const discrepancy = physicalCash - calculatedSystemCashInDrawer;

    const newClosing: CashClosing = {
      id: `CLS-${Date.now()}`,
      timestamp: new Date().toISOString(),
      systemCash: calculatedSystemCashInDrawer,
      physicalCash: physicalCash,
      discrepancy: discrepancy,
      closedBy: activeUser.name,
      notes: closingNotes
    };

    onAddClosing(newClosing);
    setCloseSuccess(true);
    setClosingNotes('');
    setPhysicalCash(0);

    setTimeout(() => {
      setCloseSuccess(false);
    }, 4000);
  };

  return (
    <div className="grid md:grid-cols-12 gap-6 items-start">
      
      {/* Left Column: Tutup Kas Harian Form */}
      <div className="md:col-span-5 space-y-6">
        
        {/* Info Banner */}
        <div className="bg-sky-50 border border-sky-150 p-5 rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-sky-900 font-bold text-xs sm:text-sm uppercase tracking-wide">
            <Landmark className="w-5 h-5 text-sky-700" />
            <span>SISTEM PEMBAYARAN TERPUSAT</span>
          </div>
          <p className="text-[11px] text-sky-700 leading-relaxed font-medium">
            Proses transaksi & penerimaan pembayaran pelanggan kini sepenuhnya dialihkan ke <span className="font-bold text-sky-900">Sales Advisor</span> di lapangan. Kasir bertanggung jawab penuh terhadap pencocokan uang fisik, rekonsiliasi kas harian, dan penerbitan laporan penutupan kas (Closing).
          </p>
        </div>

        {/* Tutup Kas Harian */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <DollarSign className="w-5 h-5 text-black" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Tutup Kas Harian</h3>
              <p className="text-[10px] text-gray-500 font-medium">Cocokkan uang fisik di laci mesin kasir dengan catatan transaksi sistem.</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 font-bold uppercase">TUNAI DI LACI (SISTEM)</span>
              <span className="font-mono font-bold text-black">{formatRupiah(calculatedSystemCashInDrawer)}</span>
            </div>
            <div className="text-[9px] text-gray-400 font-mono">
              Total {cashTransactions.length} transaksi tunai masuk hari ini.
            </div>
          </div>

          {closeSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <span>✓ Berhasil menyimpan laporan penutupan kas laci.</span>
            </div>
          )}

          <form onSubmit={handleCloseCash} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">UANG FISIK DI LACI SEKARANG</label>
              <input
                type="number"
                placeholder="Contoh: 2200000"
                value={physicalCash === 0 ? '' : physicalCash}
                onChange={(e) => setPhysicalCash(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-850 focus:outline-none focus:border-black font-mono transition-colors"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">CATATAN DAN REKONSILIASI</label>
              <textarea
                placeholder="Tulis selisih atau catatan penutupan kas..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-850 focus:outline-none focus:border-black resize-none text-[11px] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black hover:bg-neutral-800 text-white py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all cursor-pointer shadow-xs"
            >
              SIMPAN LAPORAN CLOSING
            </button>
          </form>
        </div>

      </div>

      {/* Right Column: Transactions log & Closings history */}
      <div className="md:col-span-7 space-y-6">
        
        {/* Catatan Transaksi */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <History className="w-5 h-5 text-gray-700" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Transaksi Penerimaan Hari Ini</h3>
              <p className="text-[10px] text-gray-500 font-medium">Daftar transaksi pembayaran masuk yang divalidasi oleh Sales Advisor.</p>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-150 bg-gray-50/50">
                <div className="space-y-0.5 truncate pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-mono">
                    <span className="text-black font-bold">{tx.id}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-400 font-bold uppercase">{tx.orderId}</span>
                  </div>
                  <div className="font-bold text-xs text-gray-800 truncate">{tx.customerName}</div>
                  <div className="text-[9px] text-gray-400">{new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-black font-mono">{formatRupiah(tx.amount)}</div>
                  <span className={`inline-block text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border mt-0.5 ${
                    tx.method === 'tunai'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-850'
                      : 'bg-blue-50 border-blue-200 text-blue-850'
                  }`}>
                    {tx.method.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}

            {transactions.length === 0 && (
              <p className="text-center py-8 text-xs text-gray-400 italic">Belum ada transaksi pembayaran masuk hari ini.</p>
            )}
          </div>
        </div>

        {/* Laporan Closing */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <CheckSquare className="w-5 h-5 text-gray-700" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Riwayat Laporan Closing</h3>
              <p className="text-[10px] text-gray-500 font-medium">Buku laporan penutupan kas laci mesin kasir harian.</p>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {closings.map((closing) => (
              <div key={closing.id} className="p-4 rounded-xl border border-gray-150 bg-white space-y-3 text-xs">
                <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div>
                    <span className="font-mono text-[9px] text-gray-400 block font-bold">{closing.id}</span>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {new Date(closing.timestamp).toLocaleDateString('id-ID')} - {new Date(closing.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">PIC: {closing.closedBy}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-[8px] text-gray-400 block font-extrabold uppercase">Kas Sistem</span>
                    <span className="font-mono font-bold text-black text-[10px]">{formatRupiah(closing.systemCash)}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-[8px] text-gray-400 block font-extrabold uppercase">Uang Fisik</span>
                    <span className="font-mono font-bold text-black text-[10px]">{formatRupiah(closing.physicalCash)}</span>
                  </div>
                  <div className={`p-2 rounded-lg border ${
                    closing.discrepancy === 0
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                      : 'bg-red-50 border-red-100 text-red-800'
                  }`}>
                    <span className="text-[8px] block font-extrabold uppercase">Selisih</span>
                    <span className="font-mono font-bold text-[10px]">{formatRupiah(closing.discrepancy)}</span>
                  </div>
                </div>

                {closing.notes && (
                  <div className="bg-gray-50/50 p-2 rounded border border-gray-100 text-[10px] leading-relaxed text-gray-650">
                    <span className="font-bold text-gray-400">Notes:</span> "{closing.notes}"
                  </div>
                )}
              </div>
            ))}

            {closings.length === 0 && (
              <p className="text-center py-8 text-xs text-gray-400 italic">Belum ada laporan closing kas yang disimpan.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
