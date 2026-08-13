import React, { useState, useMemo } from 'react';
import { Search, Calendar, AlertTriangle, FileText, ChevronRight, User, ArrowLeft, Printer, Share2, DollarSign, Check, X, Camera, CreditCard, MessageCircle } from 'lucide-react';
import { Order, DiagnosticFinding } from '@shared/types';
import { CAR_BRAND_LOGOS } from '@/data/constants';
import CurveAccent from '@shared/components/CurveAccent';
import ImageLightbox from '@shared/components/ImageLightbox';
import RupiahInput from '@shared/components/RupiahInput';
import { trackOrdersByPhone, customerSetServiceItemStatus, uploadPaymentProof } from '@shared/db';
import { buildWhatsAppLink, buildTrackingLink } from '@shared/whatsapp';

interface TrackingPortalProps {
  orders: Order[];
  onBack: () => void;
  onApproveServiceItem: (orderId: string, itemId: string) => void;
  onRejectServiceItem: (orderId: string, itemId: string) => void;
  onConfirmPayment?: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', bankDest: string, proofUrl?: string) => void;
  onConfirmDPPayment?: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', dpAmount: number, dest: string, proofUrl?: string) => void;
  onUpdateFindingCost?: (orderId: string, findingId: string, cost: number) => void;
  onIssueInvoice?: (orderId: string) => void;
  onNotify?: (message: string) => void;
  initialSearchQuery?: string;
  isStaffView?: boolean;
  key?: string;
}

export default function TrackingPortal({
  orders,
  onBack,
  onApproveServiceItem,
  onRejectServiceItem,
  onConfirmPayment,
  onConfirmDPPayment,
  onUpdateFindingCost,
  onIssueInvoice,
  onNotify,
  initialSearchQuery = '',
  isStaffView = false
}: TrackingPortalProps) {
  const notify = onNotify || alert;
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [searched, setSearched] = useState(initialSearchQuery !== '');
  const [activeOrder, setActiveOrder] = useState<Order | null>(() => {
    if (!initialSearchQuery || !isStaffView) return null; // customer lookup resolves async below
    return orders.find(o => o.id === initialSearchQuery || o.customerPhone === initialSearchQuery) || null;
  });
  const [tab, setTab] = useState<'status' | 'invoice'>('status');
  const [searchLoading, setSearchLoading] = useState(false);
  // Phone the customer actually searched with — kept separate from
  // searchQuery (which stays bound to the input) so later ACC actions still
  // use the phone that unlocked this order even if the input gets edited.
  const [customerPhone, setCustomerPhone] = useState(isStaffView ? '' : initialSearchQuery);
  const [showHistory, setShowHistory] = useState(false);

  // Payment form states
  const [payMethod, setPayMethod] = useState<'tunai' | 'transfer' | 'qris' | 'edc'>('transfer');
  const [bankDestination, setBankDestination] = useState('BCA');
  const [cashAmountInput, setCashAmountInput] = useState<number>(0);
  const [isDP, setIsDP] = useState(false);
  // Bukti pembayaran — wajib buat QRIS/transfer (revisi manager 2026-08-13).
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const requiresPaymentProof = payMethod === 'qris' || payMethod === 'transfer';
  const resetProof = () => {
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    setProofFile(null);
    setProofPreviewUrl(null);
  };
  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    setProofFile(file);
    setProofPreviewUrl(URL.createObjectURL(file));
  };
  const handleConfirmPaymentClick = async () => {
    let proofUrl: string | undefined;
    if (requiresPaymentProof && proofFile) {
      setUploadingProof(true);
      try {
        proofUrl = await uploadPaymentProof(proofFile);
      } catch (err) {
        console.error('Failed to upload payment proof:', err);
        setUploadingProof(false);
        notify('❌ Gagal upload bukti pembayaran. Coba lagi.');
        return;
      }
      setUploadingProof(false);
    }
    if (isDP && onConfirmDPPayment) {
      onConfirmDPPayment(currentOrder!.id, payMethod, cashAmountInput || 0, payMethod === 'tunai' ? 'Kas Laci' : bankDestination, proofUrl);
      resetProof();
    } else if (!isDP && onConfirmPayment) {
      onConfirmPayment(currentOrder!.id, payMethod, payMethod === 'tunai' ? 'Kas Laci' : bankDestination, proofUrl);
      resetProof();
    }
  };

  // Sync activeOrder with orders prop
  const currentOrder = activeOrder ? (orders.find(o => o.id === activeOrder.id) || activeOrder) : null;

  // Riwayat servis kendaraan ini (plat sama), dari order lain — staff-only.
  // Garansi dihitung dari kebijakan yang udah tertulis di invoice ("1 bulan
  // dari pembuatan invoice"): paidAt + 30 hari, bukan field tersendiri.
  const vehicleHistory = useMemo(() => {
    if (!currentOrder) return [];
    return orders
      .filter(o => o.id !== currentOrder.id && o.plateNumber === currentOrder.plateNumber)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(o => {
        const total = o.serviceItems.filter(i => i.status !== 'rejected').reduce((s, i) => s + i.price * i.qty, 0);
        const warrantyUntil = o.paidAt ? new Date(new Date(o.paidAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null;
        const underWarranty = !!warrantyUntil && warrantyUntil.getTime() > Date.now();
        return { order: o, total, warrantyUntil, underWarranty };
      });
  }, [orders, currentOrder]);

  // Customer deep-link (e.g. "lihat contoh pesanan" on the landing page)
  // resolves the initial phone-number lookup async, same RPC as a manual search.
  React.useEffect(() => {
    if (isStaffView || !initialSearchQuery) return;
    let cancelled = false;
    setSearchLoading(true);
    trackOrdersByPhone(initialSearchQuery)
      .then(matches => { if (!cancelled) setActiveOrder(matches[0] || null); })
      .catch(err => { console.error('Failed to track initial order by phone:', err); if (!cancelled) notify('❌ Gagal mencari pesanan.'); })
      .finally(() => { if (!cancelled) { setSearchLoading(false); setSearched(true); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Customer ACC on their own service items — goes through the phone-scoped
  // RPC (see lib/db.ts), not a staff onApprove*/onReject* prop, since anon
  // has no direct write access to `orders` anymore.
  const handleCustomerServiceItemDecision = async (itemId: string, status: 'approved' | 'rejected') => {
    if (!currentOrder) return;
    try {
      const updated = await customerSetServiceItemStatus(currentOrder.id, customerPhone, itemId, status);
      if (updated) setActiveOrder(updated);
      else notify('❌ Gagal menyimpan keputusan Anda. Coba cari ulang pesanan Anda.');
    } catch (err) {
      console.error('Failed to set service item status as customer:', err);
      notify('❌ Gagal menyimpan keputusan Anda. Coba lagi.');
    }
  };

  React.useEffect(() => {
    if (currentOrder) {
      setCashAmountInput(calculateTotal(currentOrder) - (currentOrder.dpAmountPaid || 0));
    }
  }, [currentOrder?.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (isStaffView) {
      const lower = query.toLowerCase();
      const matched = orders.find(
        (o) =>
          o.id.toLowerCase() === lower ||
          o.customerPhone === lower ||
          o.plateNumber.toLowerCase().replace(/\s+/g, '') === lower.replace(/\s+/g, '')
      );
      setActiveOrder(matched || null);
      setSearched(true);
      return;
    }

    // Customer can ONLY look up by their own phone number — resolved
    // server-side (see track_orders_by_phone), never from the full orders
    // table, which anon has no access to at all anymore.
    setSearchLoading(true);
    try {
      const matches = await trackOrdersByPhone(query);
      setActiveOrder(matches[0] || null);
      setCustomerPhone(query);
    } catch (err) {
      console.error('Failed to track order by phone:', err);
      notify('❌ Gagal mencari pesanan. Coba lagi.');
      setActiveOrder(null);
    } finally {
      setSearchLoading(false);
      setSearched(true);
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'antre': return 'ANTRE';
      case 'dikerjakan': return 'DIKERJAKAN';
      case 'temuan_dilaporkan': return 'TEMUAN DIAGNOSIS';
      case 'menunggu_pembayaran': return 'MENUNGGU PEMBAYARAN';
      case 'selesai': return 'SELESAI';
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'antre': return 'bg-amber-50 text-amber-800 border-amber-200/80';
      case 'dikerjakan': return 'bg-blue-50 text-blue-800 border-blue-200/80';
      case 'temuan_dilaporkan': return 'bg-purple-50 text-purple-800 border-purple-200/80';
      case 'menunggu_pembayaran': return 'bg-pink-50 text-pink-800 border-pink-200/80';
      case 'selesai': return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    }
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Staff-only (isStaffView) — klik-kirim WA, bukan integrasi API. Dipakai SA
  // buat notifikasi customer pas ada temuan baru, biar nggak nunggu customer
  // buka link tracking sendiri.
  const notifyFindingViaWhatsApp = (order: Order, finding: DiagnosticFinding) => {
    const costLine = (finding.estimatedCost || 0) > 0
      ? `\nEstimasi biaya: ${formatRupiah(finding.estimatedCost || 0)}`
      : '';
    const message = `Halo ${order.customerName}, ada temuan baru untuk ${order.carBrand} ${order.carModel} (${order.plateNumber}) di Berlin188 Garage:\n\n"${finding.description}"${costLine}\n\nCek detail & foto, lalu setujui/tolak temuan ini di:\n${buildTrackingLink(order.customerPhone)}\n\nTerima kasih.`;
    window.open(buildWhatsAppLink(order.customerPhone, message), '_blank', 'noopener,noreferrer');
  };

  const calculateTotal = (order: Order) => {
    // Only sum service items that are approved (status is not pending and not rejected)
    const standardTotal = order.serviceItems
      .filter(item => item.status !== 'pending' && item.status !== 'rejected')
      .reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

    const findingsTotal = order.findings
      .filter(f => f.status === 'approved')
      .reduce((acc, f) => {
        const srvSum = (f.services || []).reduce((sum, s) => sum + (s.price * s.qty), 0);
        const partSum = (f.resolvedParts || []).reduce((sum, p) => sum + (p.price * p.qty), 0);
        return acc + srvSum + partSum;
      }, 0);

    return standardTotal + findingsTotal;
  };

  const printInvoice = () => {
    window.print();
  };

  const handleShareWhatsApp = (order: Order) => {
    const total = calculateTotal(order);
    const approvableFindings = order.findings.filter(f => f.status !== 'pending');
    const approvedPct = approvableFindings.length > 0
      ? Math.round((order.findings.filter(f => f.status === 'approved').length / approvableFindings.length) * 100)
      : 100;
    const message = `Halo, saya memantau status servis Berlin 188 Garage untuk ${order.carBrand} ${order.carModel} [${order.plateNumber}]%0AStatus: ${getStatusLabel(order.status)}%0A%0AEstimasi Biaya: ${formatRupiah(total)}%0APersentase Persetujuan: ${approvedPct}%%0A%0APantau progres real-time Anda di: https://berlin188.com/track?wo=${order.id}`;
    window.open(`https://wa.me/${order.customerPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans p-4 sm:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Navigation with Brand Logo */}
        <div className="flex items-center justify-between bg-white border border-gray-150 p-4 rounded-2xl shadow-sm">
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-berlin-navy hover:text-berlin-red transition-all cursor-pointer bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          
          <div className="flex items-center">
            <img
              src="/logo-on-white.png"
              alt="Berlin 188 Garage"
              className="h-8 sm:h-10 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold leading-none">WhatsApp CS</span>
            <span className="text-xs font-bold text-berlin-navy font-sans">0818 188 188 01</span>
          </div>
        </div>

        {/* Title area */}
        <div className="text-center sm:text-left space-y-1.5 pt-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-berlin-navy">Portal Pelacakan Progres</h2>
          <p className="text-gray-500 text-xs sm:text-sm">Pantau diagnosis kerusakan, estimasi biaya, dan pengerjaan mekanik secara real-time.</p>
        </div>

        {/* Search Engine */}
        <div className="bg-white border border-gray-200/80 p-5 rounded-2xl shadow-xs">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
              {isStaffView ? "CARI PESANAN / WORK ORDER" : "MELALUI NOMOR TELEPON ANDA"}
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={isStaffView 
                    ? "Masukkan No. HP Pelanggan (misal: 085156010707) atau No. Polisi (misal: B 1234 AE) atau No. WO" 
                    : "Masukkan No. HP Anda untuk Melacak (misal: 085156010707)"
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-berlin-navy transition-colors"
                />
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                className="bg-berlin-navy hover:bg-berlin-navy/90 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all border border-berlin-gold/30 shrink-0 cursor-pointer shadow-md"
              >
                {searchLoading ? 'MENCARI...' : 'CARI PROGRES'}
              </button>
            </div>
          </form>
          
          {/* Quick links for testing */}
          {!searched && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2.5 text-xs">
              <span className="text-gray-400 font-medium">Contoh No. HP Aktif:</span>
              <button 
                onClick={() => { setSearchQuery('085156010707'); setSearched(true); setActiveOrder(orders.find(o => o.customerPhone === '085156010707') || null); }}
                className="bg-white border border-gray-200 hover:border-berlin-red text-gray-700 px-3 py-1.5 rounded-lg text-[11px] font-sans hover:text-berlin-navy transition-all cursor-pointer"
              >
                085156010707 (Arya Veda - BMW C300)
              </button>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searched && (
          currentOrder ? (
            <div className="space-y-6">
              {/* Quick status banner */}
              <div className="bg-white border border-gray-200/80 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-xl font-bold">
                    {CAR_BRAND_LOGOS[currentOrder.carBrand] && typeof CAR_BRAND_LOGOS[currentOrder.carBrand] === 'string' && CAR_BRAND_LOGOS[currentOrder.carBrand].startsWith('http') ? (
                      <img src={CAR_BRAND_LOGOS[currentOrder.carBrand]} alt={currentOrder.carBrand} className="w-6 h-6 opacity-70" />
                    ) : (
                      ''
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-sans text-gray-400 uppercase tracking-widest">{currentOrder.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider border ${getStatusColor(currentOrder.status)}`}>
                        {getStatusLabel(currentOrder.status)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-berlin-navy mt-0.5">{currentOrder.carBrand} {currentOrder.carModel}</h3>
                    <p className="text-xs text-gray-500 font-sans mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Plat: <strong className="text-gray-800 font-bold uppercase">{currentOrder.plateNumber}</strong></span>
                      {currentOrder.carType && <span>Tipe: <strong className="text-gray-800 font-semibold">{currentOrder.carType}</strong></span>}
                      {currentOrder.carYear && <span>Tahun: <strong className="text-gray-800 font-semibold font-sans">{currentOrder.carYear}</strong></span>}
                      {currentOrder.carEngineCode && <span>Engine: <strong className="text-gray-800 font-semibold font-sans uppercase">{currentOrder.carEngineCode}</strong></span>}
                      {currentOrder.carVin && <span>VIN: <strong className="text-gray-800 font-sans uppercase text-[11px]">{currentOrder.carVin}</strong></span>}
                    </p>
                    {currentOrder.customerAddress && (
                      <p className="text-[11px] text-gray-400 mt-1 italic">
                        Alamat: <span className="text-gray-600 font-medium">{currentOrder.customerAddress}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2.5 sm:gap-1 items-start sm:items-end w-full sm:w-auto border-t sm:border-0 border-gray-100 pt-3 sm:pt-0">
                  <div className="text-[10px] text-gray-400 uppercase font-bold leading-none">ESTIMASI TOTAL (ACC)</div>
                  <div className="text-xl font-black text-berlin-red">{formatRupiah(calculateTotal(currentOrder))}</div>
                </div>
              </div>

              {/* Riwayat servis kendaraan ini — staff-only */}
              {isStaffView && vehicleHistory.length > 0 && (
                <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-xs">
                  <button
                    onClick={() => setShowHistory(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">Riwayat Servis Kendaraan Ini</span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">{vehicleHistory.length}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                  </button>
                  {showHistory && (
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                      {vehicleHistory.map(({ order: h, total, warrantyUntil, underWarranty }) => (
                        <div key={h.id} className="px-5 py-3 flex items-start justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-sans text-gray-400">{new Date(h.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border ${getStatusColor(h.status)}`}>{getStatusLabel(h.status)}</span>
                              {underWarranty && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
                                  GARANSI S/D {warrantyUntil!.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 mt-1 italic">{h.complaints.map(c => `"${c}"`).join(', ')}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-gray-900 font-sans tabular-nums">{formatRupiah(total)}</div>
                            <div className="text-[10px] text-gray-400 font-sans">{h.id}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setTab('status')}
                  className={`relative flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer ${tab === 'status' ? 'text-berlin-navy' : 'text-gray-400 hover:text-berlin-navy'}`}
                >
                  REAL-TIME TIMELINE
                  <CurveAccent active={tab === 'status'} className="text-berlin-navy" />
                </button>
                <button
                  onClick={() => setTab('invoice')}
                  className={`relative flex-1 py-3 text-xs sm:text-sm font-bold tracking-wider transition-all cursor-pointer ${tab === 'invoice' ? 'text-berlin-navy' : 'text-gray-400 hover:text-berlin-navy'}`}
                >
                  INVOICE & ESTIMASI DETAIL
                  <CurveAccent active={tab === 'invoice'} className="text-berlin-navy" />
                </button>
              </div>

              {/* TAB 1: REAL-TIME TIMELINE */}
              {tab === 'status' && (
                <div className="grid md:grid-cols-12 gap-6 items-start">
                  
                  {/* Left: Interactive findings & approvals */}
                  <div className="md:col-span-7 space-y-6">

                    {/* NOTE: this used to have its own "Kirim Perintah Kerja ke
                        Mekanik" button that duplicated AdvisorDashboard's SA
                        workspace send-SPK flow, but incorrectly — it only
                        flipped status to 'dikerjakan' via onUpdateOrderStatus
                        without setting spkSent/assignedMechanicId/slot, while
                        still telling the advisor "SPK berhasil dikirim!". That
                        left orders stuck in 'dikerjakan' with no mechanic
                        ever assigned. Removed 2026-08-08 — sending SPK now
                        only happens through AdvisorDashboard's own panel
                        (which requires picking a mechanic and sets the real
                        fields), so this component no longer has an isStaffView
                        work-command control at all. */}

                    {/* Temuan (read-only) — persetujuan terjadi di level estimasi
                        jasa+sparepart di kartu "Persetujuan Jasa & Sparepart"
                        di bawah, bukan di sini. Dulu ada ACC/Tolak per-temuan
                        mentah + sistem finding.services[] legacy di kartu ini,
                        dihapus 2026-08-13 (nggak sinkron sama alur estimasi
                        gudang yang sekarang — temuan mentah belum punya harga,
                        jadi belum ada yang bisa di-ACC di level ini). */}
                    <div className="bg-white border border-gray-200/80 p-5 rounded-2xl space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Camera className="w-5 h-5 text-gray-700" />
                          <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">Diagnosis Temuan Kerusakan</h4>
                        </div>
                        <span className="text-[9px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full font-sans font-bold">
                          Foto Bukti Kamera
                        </span>
                      </div>

                      {currentOrder.findings.length === 0 ? (
                        <p className="text-gray-400 text-xs py-2 text-center">Belum ada temuan kerusakan tambahan yang dilaporkan.</p>
                      ) : (
                        <div className="space-y-4">
                          {currentOrder.findings.map((finding) => (
                            <div key={finding.id} className="bg-gray-50 border border-gray-150 p-4 rounded-xl space-y-3">
                              <div className="flex items-center justify-end text-[10px] text-gray-400 font-sans">
                                <span>{new Date(finding.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}, {new Date(finding.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>

                              <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">{finding.description}</p>

                              {finding.resolvedParts && finding.resolvedParts.length > 0 && (
                                <div className="bg-white/95 border border-gray-150 rounded-xl p-3.5 space-y-1.5">
                                  <span className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-800 block">Alokasi Sparepart Gudang:</span>
                                  {finding.resolvedParts.map((part) => (
                                    <div key={part.id} className="flex items-center justify-between text-xs">
                                      <div className="text-emerald-900 flex items-center gap-1.5 font-medium">
                                        <span className="w-1 h-1 rounded-full bg-emerald-600"></span>
                                        <span>{part.name}</span>
                                        <span className="text-[10px] font-sans text-emerald-700">x{part.qty}</span>
                                      </div>
                                      <span className="font-sans font-bold text-emerald-800 tabular-nums">{formatRupiah(part.price * part.qty)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {finding.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => setZoomedImage(finding.imageUrl!)}
                                  className="block w-full rounded-lg overflow-hidden border border-gray-200 max-h-52 bg-gray-100 relative group cursor-zoom-in"
                                >
                                  <img
                                    src={finding.imageUrl}
                                    alt="Bukti temuan"
                                    className="w-full h-full object-cover opacity-90 group-hover:scale-102 transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="print:hidden absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded flex items-center gap-1">
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Foto Bukti — Klik untuk perbesar</span>
                                  </div>
                                </button>
                              )}

                              {isStaffView && (
                                <button
                                  type="button"
                                  onClick={() => notifyFindingViaWhatsApp(currentOrder, finding)}
                                  className="print:hidden flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> Kirim ke WA Customer
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Persetujuan Jasa & Sparepart Tambahan (ACC) */}
                    <div className="bg-white border border-gray-200/80 p-5 rounded-2xl space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-gray-700" />
                          <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">Persetujuan Jasa & Sparepart (ACC)</h4>
                        </div>
                        <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-sans font-bold">
                          Butuh Respon Anda
                        </span>
                      </div>

                      {currentOrder.serviceItems.filter(item => item.status === 'pending').length === 0 ? (
                        <div className="text-center py-6 text-gray-400 space-y-1">
                          <p className="text-xs font-semibold text-gray-500">Semua pekerjaan utama telah disetujui!</p>
                          <p className="text-[10px]">Belum ada tambahan Jasa/Sparepart yang memerlukan persetujuan ACC Anda.</p>
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {currentOrder.serviceItems
                            .filter(item => item.status === 'pending')
                            .map((item) => (
                              <div key={item.id} className="bg-amber-50/20 border border-amber-200/60 p-4 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase border ${
                                    item.type === 'jasa' ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-purple-50 text-purple-800 border-purple-200'
                                  }`}>
                                    {item.type === 'jasa' ? 'Jasa Servis' : 'Sparepart'}
                                  </span>
                                  <span className="text-[10px] text-amber-800 font-bold">MENUNGGU ACC</span>
                                </div>

                                <div className="flex justify-between items-start gap-4">
                                  <div>
                                    <h5 className="text-xs sm:text-sm font-bold text-gray-800">{item.name}</h5>
                                    <p className="text-[10px] text-gray-400 mt-1 font-sans">
                                      Harga Satuan: {formatRupiah(item.price)} x {item.qty} Qty
                                    </p>
                                  </div>
                                  <div className="text-right font-sans font-bold text-sm text-gray-800">
                                    {formatRupiah(item.price * item.qty)}
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t border-amber-200/40 pt-2.5">
                                  <button
                                    onClick={() => isStaffView ? onRejectServiceItem(currentOrder.id, item.id) : handleCustomerServiceItemDecision(item.id, 'rejected')}
                                    className="bg-white hover:bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Tolak
                                  </button>
                                  <button
                                    onClick={() => isStaffView ? onApproveServiceItem(currentOrder.id, item.id) : handleCustomerServiceItemDecision(item.id, 'approved')}
                                    className="bg-berlin-navy hover:bg-berlin-navy/90 text-white border border-berlin-gold/30 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Berikan ACC
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* List of responded items for user record */}
                      {currentOrder.serviceItems.some(item => item.status === 'approved' || item.status === 'rejected') && (
                        <div className="pt-3 border-t border-gray-100 space-y-2">
                          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Riwayat Keputusan Anda:</span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {currentOrder.serviceItems
                              .filter(item => item.status === 'approved' || item.status === 'rejected')
                              .map((item) => (
                                <div key={item.id} className="flex justify-between items-center text-[11px] bg-gray-50 border border-gray-150 p-2 rounded-lg">
                                  <div className="truncate pr-2">
                                    <span className="font-medium text-gray-700">{item.name}</span>
                                    <span className="text-[9px] text-gray-400 ml-1.5 font-sans tabular-nums">({formatRupiah(item.price * item.qty)})</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                    item.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                                  }`}>
                                    {item.status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Information panel */}
                    <div className="bg-white border border-gray-200/80 p-5 rounded-2xl space-y-3.5 shadow-xs">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Informasi Servis Kendaraan</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400 block leading-tight">NAMA PELANGGAN</span>
                          <span className="font-semibold text-gray-800 mt-0.5 block">{currentOrder.customerName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block leading-tight">TELEPON (WA)</span>
                          <span className="font-semibold text-gray-800 mt-0.5 block">{currentOrder.customerPhone}</span>
                        </div>
                        {currentOrder.customerAddress && (
                          <div className="col-span-2">
                            <span className="text-gray-400 block leading-tight">ALAMAT</span>
                            <span className="font-semibold text-gray-800 mt-0.5 block">{currentOrder.customerAddress}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400 block leading-tight">MEKANIK BERTUGAS</span>
                          <span className="font-semibold text-gray-800 mt-0.5 block">{currentOrder.assignedMechanicName || 'Menunggu Penugasan'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block leading-tight">KELUHAN AWAL</span>
                          <div className="mt-0.5 space-y-0.5">
                            {currentOrder.complaints.map((c, i) => (
                              <span key={i} className="font-semibold text-gray-700 block italic">{i + 1}. "{c}"</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Dynamic Visual Timeline */}
                  <div className="md:col-span-5 bg-white border border-gray-200/80 p-5 rounded-2xl shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">RIWAYAT (TIMELINE)</h4>
                    
                    <div className="relative border-l border-gray-250 pl-5 ml-2.5 space-y-6">
                      {currentOrder.timeline.slice().reverse().map((evt, idx) => {
                        const isLatest = idx === 0;
                        return (
                          <div key={evt.id} className="relative">
                            {/* Bullet icon indicator */}
                            <span className={`absolute -left-[29px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                              isLatest ? 'border-black shadow-sm' : 'border-gray-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isLatest ? 'bg-black' : 'bg-gray-300'}`} />
                            </span>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`text-xs font-bold ${isLatest ? 'text-black' : 'text-gray-400'}`}>{evt.title}</span>
                                <span className="text-[10px] font-sans text-gray-400">
                                  {new Date(evt.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-gray-500 text-xs leading-relaxed">{evt.description}</p>
                              <div className="text-[9px] text-gray-400 flex items-center gap-1.5 pt-0.5">
                                <User className="w-3 h-3 text-gray-400" />
                                <span>Oleh: {evt.actor}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: INVOICE & ESTIMASI DETAIL */}
              {tab === 'invoice' && (
                <div className="print-area bg-white border border-gray-200 p-6 sm:p-8 rounded-2xl space-y-6 shadow-sm relative overflow-hidden print:bg-white print:text-neutral-900 print:p-0 print:border-0 print:shadow-none">
                  {/* Print design decorator */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-black print:hidden" />
                  
                  {/* Invoice Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-150 print:border-neutral-300">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg tracking-tight text-[#1A1A1A] print:text-neutral-900">
                          BERLIN <span className="text-gray-500">188</span>
                        </span>
                        <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase print:hidden">GARAGE</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-500 print:text-neutral-600 mt-1">Garage & Auto Clinic • Alam Sutera</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-800 print:text-neutral-800 uppercase tracking-wider">RESI INVOICE</h4>
                      <p className="text-xs font-sans text-gray-400 mt-0.5">{currentOrder.id} / {new Date(currentOrder.createdAt).toLocaleDateString('id-ID')}</p>
                      <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                        currentOrder.paymentStatus === 'lunas' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        currentOrder.paymentStatus === 'dp' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        {currentOrder.paymentStatus === 'lunas' ? 'LUNAS (PAID)' :
                         currentOrder.paymentStatus === 'dp' ? 'DP (DOWN PAYMENT)' :
                         'BELUM DIBAYAR (UNPAID)'}
                      </span>
                    </div>
                  </div>

                  {/* Customer and Car specs */}
                  <div className="grid grid-cols-2 gap-4 text-xs pb-6 border-b border-gray-150 print:border-neutral-300">
                    <div className="space-y-1">
                      <span className="text-gray-400 uppercase block font-bold text-[9px]">KEPADA (CUSTOMER):</span>
                      <p className="font-bold text-gray-800 print:text-neutral-900 text-sm">{currentOrder.customerName}</p>
                      <p className="text-gray-500 print:text-neutral-600">{currentOrder.customerPhone}</p>
                      {currentOrder.customerAddress && (
                        <p className="text-gray-500 print:text-neutral-600 italic text-[11px] mt-1 leading-normal">
                          Alamat: {currentOrder.customerAddress}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 uppercase block font-bold text-[9px]">KENDARAAN (VEHICLE):</span>
                      <p className="font-bold text-gray-800 print:text-neutral-900 text-sm">{currentOrder.carBrand} {currentOrder.carModel}</p>
                      <p className="text-gray-500 print:text-neutral-600 font-sans">{currentOrder.plateNumber} • {currentOrder.serviceType}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-gray-500 print:text-neutral-600 font-sans mt-1 pt-1 border-t border-dashed border-gray-100">
                        {currentOrder.carType && <span>Tipe: <strong>{currentOrder.carType}</strong></span>}
                        {currentOrder.carYear && <span>Tahun: <strong>{currentOrder.carYear}</strong></span>}
                        {currentOrder.carEngineCode && <span>Engine: <strong className="uppercase">{currentOrder.carEngineCode}</strong></span>}
                        {currentOrder.carVin && <span>VIN: <strong className="uppercase">{currentOrder.carVin}</strong></span>}
                      </div>
                    </div>
                  </div>

                  {/* Invoice Table Items */}
                  <div className="space-y-4">
                    <span className="text-gray-400 uppercase tracking-widest block font-bold text-[9px]">RINCIAN PERBAIKAN</span>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-gray-200 print:border-neutral-300 text-gray-400 uppercase tracking-wider text-[9px] font-extrabold">
                            <th className="py-2">Item Pekerjaan / Komponen</th>
                            <th className="py-2 text-center w-16">Qty</th>
                            <th className="py-2 text-right w-24">Harga Satuan</th>
                            <th className="py-2 text-right w-28">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Standard approved Items */}
                          {currentOrder.serviceItems
                            .filter(item => item.status !== 'pending' && item.status !== 'rejected')
                            .map((item) => (
                              <tr key={item.id} className="border-b border-gray-100 print:border-neutral-200 text-gray-800 print:text-neutral-800 font-medium">
                                <td className="py-3">
                                  <div>{item.name}</div>
                                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{item.type}</span>
                                </td>
                                <td className="py-3 text-center font-sans">{item.qty}</td>
                                <td className="py-3 text-right font-sans tabular-nums">{formatRupiah(item.price)}</td>
                                <td className="py-3 text-right font-sans font-bold tabular-nums">{formatRupiah(item.price * item.qty)}</td>
                              </tr>
                            ))}

                          {/* Approved Finding Services */}
                          {currentOrder.findings
                            .filter(f => f.status === 'approved')
                            .flatMap(f => (f.services || []).map(s => ({ ...s, findingDesc: f.description })))
                            .map((srv) => (
                              <tr key={`find-srv-${srv.id}`} className="border-b border-gray-100 print:border-neutral-200 text-gray-800 print:text-neutral-800 font-medium">
                                <td className="py-3">
                                  <div>{srv.name}</div>
                                  <span className="text-[9px] text-indigo-600 uppercase tracking-wider font-bold">Jasa Temuan: {srv.findingDesc}</span>
                                </td>
                                <td className="py-3 text-center font-sans">{srv.qty}</td>
                                <td className="py-3 text-right font-sans tabular-nums">{formatRupiah(srv.price)}</td>
                                <td className="py-3 text-right font-sans font-bold tabular-nums">{formatRupiah(srv.price * srv.qty)}</td>
                              </tr>
                            ))}

                          {/* Approved Finding Parts */}
                          {currentOrder.findings
                            .filter(f => f.status === 'approved')
                            .flatMap(f => (f.resolvedParts || []).map(p => ({ ...p, findingDesc: f.description })))
                            .map((part) => (
                              <tr key={`find-part-${part.id}`} className="border-b border-gray-100 print:border-neutral-200 text-gray-800 print:text-neutral-800 font-medium">
                                <td className="py-3">
                                  <div>{part.name}</div>
                                  <span className="text-[9px] text-emerald-600 uppercase tracking-wider font-bold">Part Temuan: {part.findingDesc}</span>
                                </td>
                                <td className="py-3 text-center font-sans">{part.qty}</td>
                                <td className="py-3 text-right font-sans tabular-nums">{formatRupiah(part.price)}</td>
                                <td className="py-3 text-right font-sans font-bold tabular-nums">{formatRupiah(part.price * part.qty)}</td>
                              </tr>
                            ))}

                          {currentOrder.serviceItems.filter(item => item.status !== 'pending' && item.status !== 'rejected').length === 0 &&
                           currentOrder.findings.filter(f => f.status === 'approved').flatMap(f => f.services || []).length === 0 &&
                           currentOrder.findings.filter(f => f.status === 'approved').flatMap(f => f.resolvedParts || []).length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-gray-400 italic">Belum ada item tindakan atau part yang disetujui.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end pt-4 border-t border-gray-100 print:border-neutral-300">
                    <div className="w-full sm:w-64 space-y-2 text-xs">
                      <div className="flex justify-between text-gray-400 print:text-neutral-600">
                        <span>Subtotal Item</span>
                        <span className="font-sans tabular-nums">{formatRupiah(calculateTotal(currentOrder))}</span>
                      </div>
                      <div className="flex justify-between text-gray-400 print:text-neutral-600">
                        <span>Diskon (-)</span>
                        <span className="font-sans">Rp 0</span>
                      </div>
                      <div className="flex justify-between text-gray-400 print:text-neutral-600">
                        <span>Pajak (0%)</span>
                        <span className="font-sans">Rp 0</span>
                      </div>
                      <div className="flex justify-between text-sm font-black border-t border-gray-200 print:border-neutral-300 pt-2 text-gray-800 print:text-neutral-900">
                        <span>TOTAL AKHIR</span>
                        <span className="text-black print:text-neutral-950 font-sans text-base tabular-nums">{formatRupiah(calculateTotal(currentOrder))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details if unpaid */}
                  {(currentOrder.paymentStatus === 'belum_dibayar' || currentOrder.paymentStatus === 'dp') && (
                    <div className="space-y-4 print:hidden">
                      {isStaffView && !currentOrder.invoicedAt ? (
                        <div className="bg-blue-50/40 border border-blue-200 p-5 rounded-2xl space-y-3 shadow-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-700" />
                            <h5 className="text-xs font-bold uppercase tracking-wider text-blue-900">Invoice Belum Diterbitkan</h5>
                          </div>
                          <p className="text-[11px] text-blue-700">Terbitkan invoice dulu sebelum pembayaran bisa diproses.</p>
                          {onIssueInvoice && (
                            <button
                              type="button"
                              onClick={() => onIssueInvoice(currentOrder.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                            >
                              Terbitkan Invoice
                            </button>
                          )}
                        </div>
                      ) : isStaffView ? (
                        <div className="bg-amber-50/30 border border-amber-200 p-5 rounded-2xl space-y-4 shadow-xs">
                          <div className="flex items-center gap-2 pb-2 border-b border-amber-100">
                            <DollarSign className="w-5 h-5 text-amber-700" />
                            <div>
                              <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                                {currentOrder.paymentStatus === 'dp' ? 'PROSES PELUNASAN (SISA BAYAR)' : 'PROSES & TERIMA PEMBAYARAN'}
                              </h5>
                              <p className="text-[10px] text-amber-700 font-medium">
                                {currentOrder.paymentStatus === 'dp'
                                  ? `Sisa Rp ${(calculateTotal(currentOrder) - (currentOrder.dpAmountPaid || 0)).toLocaleString('id-ID')} — Terima dana pelunasan dari customer.`
                                  : 'Terima dana langsung dari customer (Tunai / Transfer Bank / QRIS / EDC Debit/Kredit).'}
                              </p>
                            </div>
                          </div>

                          {/* DP toggle */}
                          {currentOrder.paymentStatus === 'belum_dibayar' && !isDP && (
                            <button
                              type="button"
                              onClick={() => setIsDP(true)}
                              className="w-full py-2 px-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-amber-400 hover:text-amber-600 text-xs font-bold transition-all cursor-pointer"
                            >
                              + Terima DP (Down Payment) Sebagian
                            </button>
                          )}

                          {/* Payment amount info */}
                          <div className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400">TOTAL TAGIHAN</span>
                            <span className="font-sans font-black text-base text-black tabular-nums">{formatRupiah(calculateTotal(currentOrder) - (currentOrder.dpAmountPaid || 0))}</span>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">METODE PEMBAYARAN</label>
                              <div className="grid grid-cols-2 gap-1.5">
                                {[
                                  { id: 'tunai' as const, label: 'Tunai', icon: DollarSign },
                                  { id: 'transfer' as const, label: 'Transfer', icon: FileText },
                                  { id: 'qris' as const, label: 'QRIS', icon: Share2 },
                                  { id: 'edc' as const, label: 'EDC Debit/Kredit', icon: CreditCard },
                                ].map(m => (
                                  <button key={m.id} type="button"
                                    onClick={() => setPayMethod(m.id)}
                                    className={`py-2 px-2.5 rounded-xl border text-center font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                      payMethod === m.id
                                        ? 'bg-black border-black text-white'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                  >
                                    <m.icon className="w-3.5 h-3.5 shrink-0" />
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {(payMethod === 'transfer' || payMethod === 'qris') ? (
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">REKENING / QRIS TUJUAN</label>
                                <select
                                  value={bankDestination}
                                  onChange={(e) => setBankDestination(e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs text-gray-800 focus:outline-none focus:border-black transition-colors"
                                >
                                  <option value="BCA">BCA (Berlin 188 Garage - 8831881888)</option>
                                  <option value="Mandiri">MANDIRI (Berlin 188 Garage - 1550018818818)</option>
                                  {payMethod === 'qris' && <option value="QRIS-GoPay">QRIS GoPay / OVO / ShopeePay</option>}
                                </select>
                              </div>
                            ) : payMethod === 'edc' ? (
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">JENIS KARTU</label>
                                <select
                                  value={bankDestination}
                                  onChange={(e) => setBankDestination(e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs text-gray-800 focus:outline-none focus:border-black transition-colors"
                                >
                                  <option value="EDC-BCA">EDC BCA — Debit/Kredit</option>
                                  <option value="EDC-Mandiri">EDC Mandiri — Debit/Kredit</option>
                                  <option value="EDC-BNI">EDC BNI — Debit/Kredit</option>
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">KAS DRAWERS</label>
                                <div className="bg-gray-100 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-500 font-medium">
                                  Disimpan ke Kas Kecil (Kasir Laci)
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">
                              {isDP ? 'JUMLAH DP (RP)' : 'JUMLAH DITERIMA (RP)'}
                            </label>
                            <div className="flex gap-2">
                              <RupiahInput
                                value={cashAmountInput ? String(cashAmountInput) : ''}
                                onChange={(digits) => setCashAmountInput(Number(digits))}
                                className="flex-1 bg-white border border-gray-200 rounded-lg py-2 pr-3 text-xs text-gray-800 focus:outline-none focus:border-black font-sans transition-colors"
                                placeholder={isDP ? "Nominal DP..." : "Nominal pembayaran..."}
                              />
                              {!isDP && (
                                <button
                                  type="button"
                                  onClick={() => setCashAmountInput(calculateTotal(currentOrder) - (currentOrder.dpAmountPaid || 0))}
                                  className="bg-white border border-gray-200 hover:border-gray-300 text-gray-800 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans shadow-xs"
                                >
                                  Uang Pas
                                </button>
                              )}
                            </div>
                          </div>

                          {!isDP && cashAmountInput > (calculateTotal(currentOrder) - (currentOrder.dpAmountPaid || 0)) && (
                            <div className="bg-white p-3 rounded-lg border border-gray-150 flex justify-between items-center text-xs">
                              <span className="text-gray-400 font-bold uppercase text-[9px]">UANG KEMBALIAN</span>
                              <span className="font-sans font-bold text-black tabular-nums">{formatRupiah(cashAmountInput - (calculateTotal(currentOrder) - (currentOrder.dpAmountPaid || 0)))}</span>
                            </div>
                          )}

                          {requiresPaymentProof && (
                            <div className="space-y-1.5">
                              <label className="text-[9px] uppercase font-bold tracking-widest text-gray-400">
                                BUKTI PEMBAYARAN (SCREENSHOT) <span className="text-red-500">*</span>
                              </label>
                              {proofPreviewUrl ? (
                                <div className="relative">
                                  <img src={proofPreviewUrl} alt="Bukti pembayaran" className="w-full max-h-40 object-cover rounded-xl border border-gray-200" />
                                  <button type="button" onClick={resetProof}
                                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 cursor-pointer">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-xl py-4 cursor-pointer hover:bg-gray-50 transition-colors text-xs text-gray-500 font-semibold">
                                  <Camera className="w-4 h-4" /> Upload screenshot dari customer
                                  <input type="file" accept="image/*" className="hidden" onChange={handleProofFileChange} />
                                </label>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={(requiresPaymentProof && !proofFile) || uploadingProof}
                            onClick={handleConfirmPaymentClick}
                            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs tracking-wider transition-colors cursor-pointer uppercase shadow-xs text-center flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            {uploadingProof ? 'MENGUPLOAD BUKTI...' : 'KONFIRMASI TERIMA PEMBAYARAN SELESAI'}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 p-5 rounded-2xl space-y-4 shadow-xs">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                            <DollarSign className="w-5 h-5 text-berlin-navy" />
                            <div>
                              <h5 className="text-xs font-bold uppercase tracking-wider text-berlin-navy">INFORMASI PEMBAYARAN</h5>
                              <p className="text-[10px] text-gray-400">Pembayaran aman dan langsung diproses oleh Service Advisor.</p>
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 leading-relaxed">
                            Mohon lakukan pembayaran secara langsung melalui <span className="font-bold text-black">Service Advisor Anda</span> di lokasi bengkel Berlin 188 Garage. Anda dapat membayar menggunakan Tunai, QRIS, atau melakukan transfer bank ke rekening resmi di bawah ini:
                          </p>

                          <div className="grid sm:grid-cols-3 gap-3 text-[11px] pt-1">
                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-150">
                              <span className="text-gray-400 font-bold block text-[9px]">BCA ALAM SUTERA</span>
                              <span className="text-gray-800 font-sans font-bold block mt-0.5">883-188-1888</span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">a.n Berlin 188 Garage</span>
                            </div>
                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-150">
                              <span className="text-gray-400 font-bold block text-[9px]">MANDIRI TANGERANG</span>
                              <span className="text-gray-800 font-sans font-bold block mt-0.5">155-00-18818818</span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">a.n Berlin 188 Garage</span>
                            </div>
                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-150">
                              <span className="text-gray-400 font-bold block text-[9px]">QRIS PEMBAYARAN</span>
                              <span className="text-gray-800 font-bold block mt-0.5">SCAN DI ADVISOR</span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">Tunjukkan bukti ke Advisor</span>
                            </div>
                          </div>

                          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200 text-[11px] font-semibold flex items-center gap-2">
                            <span>Silakan tunjukkan bukti transfer Anda kepada Service Advisor Anda untuk langsung mengonfirmasi pelunasan & serah-terima kunci kendaraan.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR / Signature for printing */}
                  <div className="hidden print:flex items-center justify-between pt-12 text-[11px]">
                    <div>
                      <p className="text-neutral-500 font-semibold uppercase">Mekanik Bertugas</p>
                      <div className="h-12" />
                      <p className="font-bold border-t border-neutral-300 pt-1 w-32">{currentOrder.assignedMechanicName || '-'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-neutral-500 font-semibold uppercase">Pelanggan</p>
                      <div className="h-12" />
                      <p className="font-bold border-t border-neutral-300 pt-1 w-32">{currentOrder.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-500 font-semibold uppercase">Kasir Pembayaran</p>
                      <div className="h-12" />
                      <p className="font-bold border-t border-neutral-300 pt-1 w-32">Berlin 188 Garage</p>
                    </div>
                  </div>

                  {/* PDF & WhatsApp Action Drawer at Bottom */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-gray-100 print:hidden">
                    <span className="text-xs text-gray-400">Butuh salinan berkas ini?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={printInvoice}
                        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Printer className="w-4 h-4 text-gray-500" />
                        Cetak PDF / Resi
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(currentOrder)}
                        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Share2 className="w-4 h-4 text-gray-500" />
                        WhatsApp Pemilik
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 p-8 rounded-2xl text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-md font-bold text-black">Orderan Tidak Ditemukan</h4>
                <p className="text-gray-500 text-xs leading-relaxed max-w-sm mx-auto">
                  Maaf, data pesanan dengan nomor pencarian tersebut tidak dapat ditemukan di server kami. Silakan periksa kembali input Anda atau hubungi service advisor.
                </p>
              </div>
              <button
                onClick={() => { setSearchQuery(''); setSearched(false); }}
                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:text-black transition-colors cursor-pointer shadow-sm"
              >
                Coba Cari Lagi
              </button>
            </div>
          )
        )}

      </div>
      {zoomedImage && <ImageLightbox src={zoomedImage} alt="Temuan Mekanik" onClose={() => setZoomedImage(null)} />}
    </div>
  );
}
