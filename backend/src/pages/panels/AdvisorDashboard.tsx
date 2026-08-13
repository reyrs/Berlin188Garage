import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wrench, CheckCircle, CaretRight, Warning, MagnifyingGlass,
  ArrowLeft, Check, X, Car, DeviceMobile,
  Camera, UploadSimple, Trash, WarningCircle, Plus, PaperPlaneTilt, WhatsappLogo, Printer, ArrowCounterClockwise
} from '@phosphor-icons/react';
import { Order, User as StaffUser, DiagnosticFinding } from '@shared/types';
import { STATUS_CONFIG } from '@shared/design';
import { genId } from '@shared/id';
import { buildWhatsAppLink, buildTrackingLink } from '@shared/whatsapp';
import TrackingPortal from '../../components/TrackingPortal';
import InvoicePrint from '../../components/InvoicePrint';
import SPPPrintCard from '../../components/SPPPrintCard';
import SPKPrintCard from '../../components/SPKPrintCard';
import ImageLightbox from '@shared/components/ImageLightbox';

const MOCK_PROOFS = [
  { name: 'Sparepart Terpasang', url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400' },
  { name: 'Oli Baru Diisi', url: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&q=80&w=400' },
  { name: 'Tune Up Selesai', url: 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&q=80&w=400' },
  { name: 'Kelistrikan Selesai', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=400' }
];

interface AdvisorDashboardProps {
  orders: Order[];
  users?: StaffUser[];
  onApproveServiceItem: (orderId: string, itemId: string) => void;
  onRejectServiceItem: (orderId: string, itemId: string) => void;
  onConfirmPayment: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', bankDest: string) => void;
  onConfirmDPPayment?: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', dpAmount: number, dest: string) => void;
  onUpdateOrderStatus?: (orderId: string, status: Order['status'], timelineDescription: string) => void;
  onUpdateFindingCost?: (orderId: string, findingId: string, cost: number) => void;
  onUpdateOrder?: (orderId: string, fields: Partial<Order>) => void;
  onAddFinding?: (orderId: string, finding: DiagnosticFinding) => void;
  onSendSPK?: (orderId: string, mechanicId: string | undefined, mechanicName: string) => void;
  onIssueInvoice?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  onReturnFindingToGudang?: (orderId: string, findingId: string) => void;
  onNotify?: (message: string) => void;
  activeUser?: StaffUser;
}

type FilterType = 'all' | 'pending_acc' | 'antre' | 'dikerjakan' | 'temuan_dilaporkan' | 'menunggu_pembayaran' | 'selesai';

export default function AdvisorDashboard({
  orders,
  users = [],
  onApproveServiceItem,
  onRejectServiceItem,
  onConfirmPayment,
  onConfirmDPPayment,
  onUpdateOrderStatus,
  onUpdateFindingCost,
  onUpdateOrder,
  onAddFinding,
  onSendSPK,
  onIssueInvoice,
  onDeleteOrder,
  onReturnFindingToGudang,
  onNotify,
  activeUser
}: AdvisorDashboardProps) {
  const notify = onNotify || alert;
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [sppOrder, setSppOrder] = useState<Order | null>(null);
  const [spkOrder, setSpkOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<Order['status']>('dikerjakan');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // 'selesai' deliberately excluded — that transition goes through the
  // payment-confirmation flow (records a transaction, backfills the freed
  // slot), so bulk-setting it here would silently skip those side effects.
  const BULK_STATUS_OPTIONS: { value: Order['status']; label: string }[] = [
    { value: 'antre', label: STATUS_CONFIG.antre.label },
    { value: 'dikerjakan', label: STATUS_CONFIG.dikerjakan.label },
    { value: 'temuan_dilaporkan', label: STATUS_CONFIG.temuan_dilaporkan.label },
    { value: 'menunggu_pembayaran', label: STATUS_CONFIG.menunggu_pembayaran.label },
  ];

  const applyBulkStatus = () => {
    if (!onUpdateOrderStatus) return;
    const label = STATUS_CONFIG[bulkStatus].label;
    selectedIds.forEach(id => {
      onUpdateOrderStatus(id, bulkStatus, `Diubah massal ke "${label}" oleh ${activeUser?.name || 'Advisor'}.`);
    });
    notify(`✅ ${selectedIds.size} WO diubah ke status "${label}".`);
    clearSelection();
  };

  // SA Workspace — add jasa/temuan, approve parts from gudang, send SPK
  // Temuan form state
  const [showTemuanForm, setShowTemuanForm] = useState(false);
  const [wsDesc, setWsDesc] = useState('');
  const [wsTemuanPhoto, setWsTemuanPhoto] = useState<string | null>(null);
  const [wsTemuanCamActive, setWsTemuanCamActive] = useState(false);
  const wsTemuanVideoRef = useRef<HTMLVideoElement>(null);
  const wsTemuanStreamRef = useRef<MediaStream | null>(null);

  const [selectedMechanicName, setSelectedMechanicName] = useState('');
  const mechanics = users.filter(u => u.role === 'mekanik');

  const startTemuanCamera = async () => {
    try {
      wsTemuanStreamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      wsTemuanStreamRef.current = stream;
      setWsTemuanCamActive(true);
      setTimeout(() => {
        if (wsTemuanVideoRef.current) { wsTemuanVideoRef.current.srcObject = stream; wsTemuanVideoRef.current.play(); }
      }, 150);
    } catch { notify('❌ Tidak dapat membuka kamera.'); }
  };

  const stopTemuanCamera = () => {
    wsTemuanStreamRef.current?.getTracks().forEach(t => t.stop());
    wsTemuanStreamRef.current = null;
    setWsTemuanCamActive(false);
  };

  const captureTemuanPhoto = () => {
    if (!wsTemuanVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = wsTemuanVideoRef.current.videoWidth || 640;
    canvas.height = wsTemuanVideoRef.current.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(wsTemuanVideoRef.current, 0, 0);
    setWsTemuanPhoto(canvas.toDataURL('image/jpeg'));
    stopTemuanCamera();
  };

  const handleAddTemuan = (orderId: string) => {
    if (!wsDesc.trim()) return;
    // estimatedCost sengaja nggak diisi SA — biaya (sparepart + jasa pasang)
    // sekarang jatah gudang, diisi lewat estimasi resmi di WarehousePanel.
    const finding: DiagnosticFinding = {
      id: genId('f'),
      description: wsDesc.trim(),
      estimatedCost: 0,
      status: 'pending',
      timestamp: new Date().toISOString(),
      ...(wsTemuanPhoto ? { imageUrl: wsTemuanPhoto } : {})
    };
    onAddFinding?.(orderId, finding);
    setWsDesc(''); setWsTemuanPhoto(null);
    setShowTemuanForm(false);
  };

  // Klik-kirim WA — bukan integrasi API (nggak ada biaya/backend), cuma
  // buka wa.me dengan pesan siap kirim ke no HP customer. Link tracking-nya
  // deep-link langsung ke portal (lihat App.tsx `?track=` handling), jadi
  // customer nggak perlu ngetik ulang no HP-nya buat lihat detail/foto temuan.
  // Ini juga titik resmi "PENAWARAN" di alur baru — nyetel finding.offeredAt
  // + nulis timeline, jadi ada jejak kapan estimasi beneran ditawarkan ke
  // customer (sebelumnya cuma buka wa.me tanpa nyimpen apa pun).
  const findingItemsTotal = (order: Order, findingId: string) =>
    order.serviceItems.filter(i => i.findingId === findingId).reduce((sum, i) => sum + i.price * i.qty, 0);

  const notifyFindingViaWhatsApp = (order: Order, finding: DiagnosticFinding) => {
    const total = findingItemsTotal(order, finding.id);
    const costLine = total > 0 ? `\nEstimasi biaya (sparepart + jasa pasang): ${formatRupiah(total)}` : '';
    const message = `Halo ${order.customerName}, ada temuan baru untuk ${order.carBrand} ${order.carModel} (${order.plateNumber}) di Berlin188 Garage:\n\n"${finding.description}"${costLine}\n\nCek detail & foto, lalu setujui/tolak temuan ini di:\n${buildTrackingLink(order.customerPhone)}\n\nTerima kasih.`;
    window.open(buildWhatsAppLink(order.customerPhone, message), '_blank', 'noopener,noreferrer');

    if (!finding.offeredAt) {
      const now = new Date().toISOString();
      const updatedFindings = order.findings.map(f => f.id === finding.id ? { ...f, offeredAt: now } : f);
      onUpdateOrder?.(order.id, {
        findings: updatedFindings,
        timeline: [...order.timeline, {
          id: genId('t-offer'), status: order.status, timestamp: now,
          title: 'Penawaran Dikirim ke Pelanggan',
          description: `SA mengirim penawaran estimasi untuk temuan: "${finding.description}"${total > 0 ? ` (Rp ${total.toLocaleString('id-ID')})` : ''} via WhatsApp.`,
          actor: activeUser?.name || 'Service Advisor',
        }],
      });
    }
  };

  const handleDeleteOrder = (order: Order) => {
    if (!confirm(`Hapus WO ${order.id} (${order.customerName} — ${order.carBrand} ${order.carModel})? Data ini hilang permanen dan tidak bisa dikembalikan.`)) return;
    onDeleteOrder?.(order.id);
    if (selectedOrderId === order.id) setSelectedOrderId(null);
    notify(`🗑️ WO ${order.id} dihapus.`);
  };

  const handleSendSPKClick = (orderId: string) => {
    const trimmedName = selectedMechanicName.trim();
    if (!trimmedName) { notify('❌ Tulis nama mekanik terlebih dahulu.'); return; }
    // Kalau nama yang ditulis cocok sama mekanik yang punya akun staf asli,
    // tetap link ke id-nya (biar dia bisa lihat WO ini di "Kerja Saya").
    const mec = mechanics.find(m => m.name.trim().toLowerCase() === trimmedName.toLowerCase());
    onSendSPK?.(orderId, mec?.id, trimmedName);
    setSelectedMechanicName('');
  };

  // Checklist state for SA
  const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(null);
  const [checklistCamActive, setChecklistCamActive] = useState(false);
  const [saReport, setSaReport] = useState('');
  const checklistVideoRef = useRef<HTMLVideoElement>(null);
  const checklistStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      checklistStreamRef.current?.getTracks().forEach(t => t.stop());
      wsTemuanStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startChecklistCamera = async (itemId: string) => {
    setActivePhotoItemId(itemId);
    try {
      checklistStreamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      checklistStreamRef.current = stream;
      setChecklistCamActive(true);
      setTimeout(() => {
        if (checklistVideoRef.current) { checklistVideoRef.current.srcObject = stream; checklistVideoRef.current.play(); }
      }, 150);
    } catch { notify('❌ Tidak dapat membuka kamera.'); }
  };

  const stopChecklistCamera = () => {
    checklistStreamRef.current?.getTracks().forEach(t => t.stop());
    checklistStreamRef.current = null;
    setChecklistCamActive(false);
  };

  const captureChecklistPhoto = (orderId: string, itemId: string) => {
    if (!checklistVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = checklistVideoRef.current.videoWidth || 640;
    canvas.height = checklistVideoRef.current.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(checklistVideoRef.current, 0, 0);
    attachPhotoToItem(orderId, itemId, canvas.toDataURL('image/jpeg'));
    stopChecklistCamera();
  };

  const attachPhotoToItem = (orderId: string, itemId: string, photoUrl: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !onUpdateOrder) return;
    onUpdateOrder(orderId, {
      serviceItems: order.serviceItems.map(i => i.id === itemId ? { ...i, photoUrl } : i)
    });
  };

  const removePhotoFromItem = (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !onUpdateOrder) return;
    onUpdateOrder(orderId, {
      serviceItems: order.serviceItems.map(i => i.id === itemId ? { ...i, photoUrl: undefined, completed: false } : i)
    });
  };

  const toggleItemCompletion = (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !onUpdateOrder) return;
    const item = order.serviceItems.find(i => i.id === itemId);
    if (!item) return;
    if (!item.completed && !item.photoUrl) {
      notify('❌ Wajib lampirkan foto bukti sebelum menandai item selesai!');
      return;
    }
    onUpdateOrder(orderId, {
      serviceItems: order.serviceItems.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i)
    });
  };

  const handleSubmitChecklist = (order: Order) => {
    const approved = order.serviceItems.filter(i => i.status === 'approved');
    const undone = approved.filter(i => !i.completed);
    if (undone.length > 0) {
      notify(`❌ Masih ada ${undone.length} item yang belum selesai/berfoto.`);
      return;
    }
    const report = saReport.trim() || "Seluruh pekerjaan selesai dikerjakan dan didokumentasikan.";
    onUpdateOrder?.(order.id, {
      status: 'menunggu_pembayaran',
      timeline: [...order.timeline, {
        id: genId('t-sa-done'),
        status: 'menunggu_pembayaran' as const,
        timestamp: new Date().toISOString(),
        title: 'Servis Selesai — Konfirmasi SA',
        description: `SA ${activeUser?.name || ''} mengkonfirmasi seluruh pekerjaan selesai. Catatan: "${report}"`,
        actor: `SA (${activeUser?.name || 'Advisor'})`
      }]
    });
    setSaReport('');
    notify('✅ Konfirmasi selesai! Kendaraan siap ke billing.');
  };

  // Find if selected order still exists
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Helper to check if an order has pending items needing ACC
  const hasPendingAcc = (order: Order) => {
    return order.serviceItems.some(item => item.status === 'pending');
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Status Filter
      if (statusFilter === 'pending_acc') {
        if (!hasPendingAcc(order)) return false;
      } else if (statusFilter !== 'all') {
        if (order.status !== statusFilter) return false;
      }

      // 2. Search Term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchId = order.id.toLowerCase().includes(term);
        const matchName = order.customerName.toLowerCase().includes(term);
        const matchPhone = order.customerPhone.includes(term);
        const matchPlate = order.plateNumber.toLowerCase().includes(term);
        const matchCar = `${order.carBrand} ${order.carModel}`.toLowerCase().includes(term);
        
        return matchId || matchName || matchPhone || matchPlate || matchCar;
      }

      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  // Quick Counter Statistics
  const stats = useMemo(() => {
    const totalActive = orders.filter(o => o.status !== 'selesai').length;
    const pendingAccCount = orders.filter(hasPendingAcc).length;
    const inProgress = orders.filter(o => o.status === 'dikerjakan' || o.status === 'temuan_dilaporkan').length;
    const completed = orders.filter(o => o.status === 'selesai').length;

    return { totalActive, pendingAccCount, inProgress, completed };
  }, [orders]);

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
    const c = STATUS_CONFIG[status];
    return `${c.bg} ${c.text} ${c.border}`;
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // If an order is selected, render its dedicated tracking and approval workspace
  if (selectedOrder) {
    return (
      <div className="space-y-4">
        {/* Print modals — sppOrder/invoiceOrder/spkOrder get set from buttons
            inside THIS branch, so the popups have to render here too. They
            used to only be rendered in the list-view return below, which
            meant clicking "CETAK SPP" from inside an order's detail page set
            state that nothing ever read — the button silently did nothing. */}
        {invoiceOrder && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, overflow: 'auto' }}>
            <InvoicePrint
              order={invoiceOrder}
              invoiceNumber={`INV-${invoiceOrder.id}-${new Date().getFullYear()}`}
              kasirName={activeUser?.name}
              onClose={() => setInvoiceOrder(null)}
            />
          </div>
        )}
        {sppOrder && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, overflow: 'auto', padding: '24px' }}>
            <SPPPrintCard order={sppOrder} onClose={() => setSppOrder(null)} />
          </div>
        )}
        {spkOrder && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, overflow: 'auto', padding: '24px' }}>
            <div className="max-w-3xl mx-auto space-y-3">
              <button
                onClick={() => setSpkOrder(null)}
                className="print:hidden bg-white/10 hover:bg-white/20 border border-white/30 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
              <SPKPrintCard order={spkOrder} />
            </div>
          </div>
        )}

        {/* Back navigation header */}
        <div className="card p-4 flex items-center justify-between">
          <button
            onClick={() => setSelectedOrderId(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-berlin-navy hover:text-berlin-red transition-all cursor-pointer bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] px-3.5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" weight="duotone" />
            Kembali ke Daftar Progres Mobil
          </button>
          
          <div className="text-right text-xs">
            <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase block">KENDARAAN AKTIF</span>
            <span className="font-bold text-berlin-navy">{selectedOrder.carBrand} {selectedOrder.carModel} • {selectedOrder.plateNumber}</span>
          </div>
        </div>

        {/* SA WORKSPACE — dulu cuma nongol pas status === 'antre', padahal
            lapor temuan/cetak SPP paling sering dibutuhkan justru pas mobil
            LAGI dikerjakan (temuan baru muncul waktu mekanik bongkar). Batas
            'selesai'/'menunggu_pembayaran' disamain sama TrackingPortal's
            sendiri punya kondisi buat "order udah closed" (lihat
            TrackingPortal.tsx baris ~541), biar konsisten. */}
        {selectedOrder.status !== 'selesai' && selectedOrder.status !== 'menunggu_pembayaran' && (
          <div className="space-y-4">

            {/* 1. Vehicle header card */}
            <div className="card-padded">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-sans font-bold tracking-wider">
                    {selectedOrder.id} / PLAT: {selectedOrder.plateNumber}
                  </div>
                  <h3 className="text-xl font-black text-berlin-navy mt-0.5">
                    {selectedOrder.carBrand} {selectedOrder.carModel}
                  </h3>
                  <div className="grid grid-cols-2 gap-6 mt-3">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">PEMILIK</div>
                      <div className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                        {selectedOrder.customerName} ({selectedOrder.customerPhone})
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">KELUHAN AWAL ({selectedOrder.complaints.length})</div>
                      <div className="space-y-0.5 mt-0.5">
                        {selectedOrder.complaints.map((c, i) => (
                          <div key={i} className="text-xs text-gray-600 dark:text-gray-400 italic">{i + 1}. "{c}"</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => { setShowTemuanForm(v => !v); setWsTemuanPhoto(null); setWsDesc(''); }}
                    className="bg-berlin-navy text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-berlin-navy-dark transition-colors">
                    <Camera className="w-3.5 h-3.5" weight="duotone" /> MELAPORKAN TEMUAN
                  </button>
                  <button
                    onClick={() => setSppOrder(selectedOrder)}
                    className="bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] text-gray-600 dark:text-gray-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <Printer className="w-3.5 h-3.5" weight="duotone" /> CETAK SPP
                  </button>
                  {selectedOrder.spkSent && (
                    <button
                      onClick={() => setSpkOrder(selectedOrder)}
                      className="bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] text-gray-600 dark:text-gray-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <Printer className="w-3.5 h-3.5" weight="duotone" /> CETAK SPK
                    </button>
                  )}
                  {onDeleteOrder && (
                    <button
                      onClick={() => handleDeleteOrder(selectedOrder)}
                      className="bg-white dark:bg-[#1a1d23] border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash className="w-3.5 h-3.5" weight="duotone" /> HAPUS WO
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Inline temuan form */}
            {showTemuanForm && (
              <div className="bg-white dark:bg-[#1a1d23] border border-berlin-navy/20 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-berlin-navy flex items-center gap-2">
                    <Warning className="w-4 h-4 text-amber-500" weight="duotone" /> Form Laporan Temuan
                  </h4>
                  <button onClick={() => { setShowTemuanForm(false); setWsTemuanPhoto(null); setWsDesc(''); }}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer p-1">
                    <X className="w-4 h-4" weight="duotone" />
                  </button>
                </div>
                <input value={wsDesc} onChange={e => setWsDesc(e.target.value)}
                  placeholder="Deskripsi temuan (e.g. Knalpot bocor di header pipe)"
                  className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy/40" />
                {/* Photo */}
                <div className="border border-gray-200 dark:border-[#2a2d35] rounded-xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-[#22252c] px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-[#2a2d35]">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Camera className="w-3 h-3" weight="duotone" /> Foto Bukti Temuan
                    </span>
                    {wsTemuanPhoto && (
                      <button type="button" onClick={() => setWsTemuanPhoto(null)}
                        className="text-[9px] text-red-500 font-bold cursor-pointer hover:underline">Hapus Foto</button>
                    )}
                  </div>
                  {wsTemuanPhoto ? (
                    <div className="p-2.5">
                      <img src={wsTemuanPhoto} alt="Bukti temuan" className="w-full max-h-40 object-cover rounded-lg border border-gray-200 dark:border-[#2a2d35]" referrerPolicy="no-referrer" />
                      <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-1"><Check className="w-3 h-3" weight="duotone" /> Foto terlampir</p>
                    </div>
                  ) : wsTemuanCamActive ? (
                    <div className="p-2.5 space-y-2">
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-[#2a2d35] aspect-video bg-black">
                        <video ref={wsTemuanVideoRef} className="w-full h-full object-cover" playsInline muted />
                        <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded">REC</span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={captureTemuanPhoto}
                          className="flex-1 bg-emerald-600 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                          <Camera className="w-3.5 h-3.5" weight="duotone" /> Ambil Foto
                        </button>
                        <button type="button" onClick={stopTemuanCamera}
                          className="px-4 bg-gray-100 dark:bg-[#22252c] text-gray-600 dark:text-gray-400 text-[10px] font-bold py-2 rounded-lg cursor-pointer">Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#22252c] transition-colors text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                        <UploadSimple className="w-3.5 h-3.5" weight="duotone" /> Upload Foto
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setWsTemuanPhoto(r.result as string); r.readAsDataURL(f); } }} />
                      </label>
                      <button type="button" onClick={startTemuanCamera}
                        className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#22252c] transition-colors">
                        <Camera className="w-3.5 h-3.5" weight="duotone" /> Aktifkan Kamera
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={() => handleAddTemuan(selectedOrder.id)}
                  className="w-full flex items-center justify-center gap-1.5 bg-berlin-navy text-white py-2.5 rounded-xl text-xs font-bold hover:bg-berlin-navy/90 transition-all cursor-pointer">
                  <Plus className="w-3.5 h-3.5" weight="duotone" /> Simpan Temuan
                </button>
              </div>
            )}

            {/* 3. PENAWARAN & PERSETUJUAN — estimasi (sparepart + jasa pasang)
                disusun GUDANG (lihat WarehousePanel), SA cuma menawarkan ke
                customer & mencatat keputusannya di sini / lewat portal
                tracking di bawah. SA sudah nggak bisa nambah jasa sendiri —
                itu bagian estimasi resmi gudang. */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a2d35] flex items-center gap-3">
                <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold px-2.5 py-1 rounded-lg">PENAWARAN</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Estimasi Gudang & Persetujuan Pelanggan</span>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Estimasi (sparepart + jasa pasang) di bawah disusun oleh Gudang. Tawarkan ke pelanggan lewat WA, lalu catat ACC/Tolak-nya di panel Portal Tracking (Kelola) di bawah — SPK baru bisa dikirim setelah semua item di-ACC/ditolak, tidak ada lagi yang menggantung "pending".
                </p>

                {selectedOrder.findings.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-gray-200 dark:border-[#2a2d35] rounded-xl">
                    <Warning className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" weight="duotone" />
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold">Belum ada temuan.</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">Klik "MELAPORKAN TEMUAN" di atas untuk menambahkan.</p>
                  </div>
                ) : selectedOrder.findings.map(finding => {
                  const findingItems = selectedOrder.serviceItems.filter(i => i.findingId === finding.id);
                  const hasPendingEstimate = findingItems.some(i => i.status === 'pending');
                  const hasRejectedEstimate = findingItems.some(i => i.status === 'rejected');
                  // Dot: hijau kalau estimasi ada & semuanya udah di-ACC, merah
                  // kalau ada yang ditolak (nunggu dibalikin ke gudang), kuning
                  // buat sisanya (belum ada estimasi / masih ada yang pending).
                  const isFullyApproved = findingItems.length > 0 && findingItems.every(i => i.status === 'approved');
                  return (
                    <div key={finding.id} className="border border-gray-200 dark:border-[#2a2d35] rounded-2xl p-5 space-y-4">
                      {/* Finding header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${isFullyApproved ? 'bg-emerald-500' : hasRejectedEstimate ? 'bg-red-400' : 'bg-amber-400'}`} />
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 dark:text-white leading-snug">{finding.description}</div>
                            {finding.offeredAt && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Ditawarkan ke pelanggan {new Date(finding.offeredAt).toLocaleString('id-ID')}</div>
                            )}
                          </div>
                        </div>
                        {finding.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setZoomedImage(finding.imageUrl!)}
                            className="shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
                          >
                            <img src={finding.imageUrl} alt="Bukti temuan" className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-[#2a2d35]" referrerPolicy="no-referrer" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => notifyFindingViaWhatsApp(selectedOrder, finding)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        <WhatsappLogo className="w-3.5 h-3.5" weight="duotone" /> Kirim Penawaran ke WA Customer
                      </button>

                      {/* Estimate list for this finding — sparepart + jasa pasang, read-only (ACC/Tolak dilakukan di Portal Tracking di bawah) */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">ESTIMASI GUDANG (SPAREPART + JASA PASANG):</div>
                        {findingItems.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic">Belum ada estimasi dari gudang.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {findingItems.map(item => (
                              <div key={item.id} className={`flex items-center justify-between py-2 px-3 rounded-xl text-xs border ${
                                item.type === 'jasa'
                                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20'
                                  : 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20'
                              }`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 ${item.type === 'jasa' ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                    {item.type === 'jasa' ? 'Jasa' : 'Part'}
                                  </span>
                                  <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-gray-600 dark:text-gray-300 font-sans tabular-nums">{formatRupiah(item.price)} × {item.qty}</span>
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                    item.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
                                    : item.status === 'rejected' ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                                    : 'bg-gray-150 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                  }`}>{item.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {hasPendingEstimate && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-semibold">⚠ Masih ada item pending — ACC/Tolak dulu di Portal Tracking di bawah sebelum SPK bisa dikirim.</p>
                        )}
                        {hasRejectedEstimate && onReturnFindingToGudang && (
                          <button
                            type="button"
                            onClick={() => onReturnFindingToGudang(selectedOrder.id, finding.id)}
                            className="w-full mt-2 border border-dashed border-amber-300 dark:border-amber-500/30 rounded-xl py-2.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <ArrowCounterClockwise className="w-3.5 h-3.5" weight="duotone" /> Kembalikan ke Gudang untuk Direvisi
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Send SPK — hanya nyala kalau SEMUA temuan & item estimasi
                    (part + jasa) sudah diputuskan (approved/rejected), bukan
                    lagi 'pending'. Ini gerbang persetujuan pelanggan yang
                    sesungguhnya: sebelum ini, SPK belum boleh terbit. */}
                {(() => {
                  // Sumber kebenaran "temuan siap" sekarang serviceItems, BUKAN
                  // finding.status — sejak kartu approve/reject per-temuan mentah
                  // dihapus (revisi 2026-08-13), gak ada lagi apa pun yang
                  // mengubah finding.status dari 'pending', jadi gerbang ini WAJIB
                  // derive dari estimasi (serviceItems) biar SPK gak kekunci permanen.
                  const findingsWithoutEstimate = selectedOrder.findings.filter(
                    f => !selectedOrder.serviceItems.some(i => i.findingId === f.id)
                  );
                  const hasUnestimatedFindings = findingsWithoutEstimate.length > 0;
                  const hasPendingItems = selectedOrder.serviceItems.some(i => i.status === 'pending');
                  // Sudah kekirim — jangan tampilin lagi dropdown+tombol kirim,
                  // banner "SPK sudah dikirim" di bawah sudah cukup. Tanpa ini,
                  // klik ulang bisa nge-assign order ke slot baru padahal
                  // mobilnya masih di bay yang sama (lihat handleSendSPK).
                  if (selectedOrder.spkSent) return null;
                  const readyToSend = selectedOrder.findings.length > 0 && !hasUnestimatedFindings && !hasPendingItems;
                  return (
                    <div className={`border rounded-2xl p-4 space-y-3 ${readyToSend ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-[#2a2d35] bg-gray-50 dark:bg-[#22252c]'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${readyToSend ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {selectedOrder.findings.length === 0 || hasUnestimatedFindings ? '⚠ Menunggu estimasi gudang (sparepart + jasa pasang)'
                          : hasPendingItems ? '⚠ Menunggu ACC/Tolak pelanggan atas semua estimasi'
                          : 'Semua sudah di-ACC pelanggan — kirim SPK ke mekanik'}
                      </p>
                      {readyToSend && (
                        <>
                          <input type="text" list="spk-mechanic-suggestions"
                            value={selectedMechanicName} onChange={e => setSelectedMechanicName(e.target.value)}
                            placeholder="Ketik nama mekanik..."
                            className="w-full border border-gray-200 dark:border-[#2a2d35] rounded-xl px-3 py-2.5 text-xs focus:outline-none bg-white dark:bg-[#1a1d23] text-gray-800 dark:text-gray-100" />
                          <datalist id="spk-mechanic-suggestions">
                            {mechanics.map(m => <option key={m.id} value={m.name} />)}
                          </datalist>
                          <button onClick={() => handleSendSPKClick(selectedOrder.id)}
                            disabled={!selectedMechanicName.trim()}
                            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer disabled:cursor-not-allowed">
                            <PaperPlaneTilt className="w-3.5 h-3.5" weight="duotone" /> Kirim SPK ke Mekanik
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>
        )}

        {/* SPK sudah dikirim — info banner */}
        {selectedOrder.spkSent && (
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
            <PaperPlaneTilt className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" weight="duotone" />
            <div>
              <p className="text-xs font-bold text-blue-800 dark:text-blue-400">SPK sudah dikirim ke {selectedOrder.assignedMechanicName}</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">Kendaraan sedang dikerjakan. Pantau progres di timeline bawah.</p>
            </div>
          </div>
        )}

        {/* Re-use TrackingPortal in staff approval mode */}
        <div className="card overflow-hidden">
          <TrackingPortal
            key={selectedOrder.id}
            orders={orders}
            onBack={() => setSelectedOrderId(null)}
            onApproveServiceItem={onApproveServiceItem}
            onRejectServiceItem={onRejectServiceItem}
            onConfirmPayment={onConfirmPayment}
            onConfirmDPPayment={onConfirmDPPayment}
            onUpdateFindingCost={onUpdateFindingCost}
            onIssueInvoice={onIssueInvoice}
            onNotify={onNotify}
            initialSearchQuery={selectedOrder.id}
            isStaffView={true}
          />
        </div>

        {/* SA Checklist & Foto Pengerjaan */}
        {(selectedOrder.status === 'dikerjakan' || selectedOrder.status === 'temuan_dilaporkan') &&
          selectedOrder.serviceItems.filter(i => i.status === 'approved').length > 0 && (
          <div className="card-padded space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-[#2a2d35] pb-3">
              <Wrench className="w-4 h-4 text-berlin-navy" weight="duotone" />
              <div>
                <h4 className="text-xs font-bold text-berlin-navy uppercase tracking-wider">Checklist & Foto Bukti Pengerjaan</h4>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">SA memantau dan mendokumentasikan setiap item pekerjaan yang diselesaikan mekanik.</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {selectedOrder.serviceItems.filter(i => i.status === 'approved').map((item) => {
                const isUploadingThis = activePhotoItemId === item.id;
                return (
                  <div key={item.id} className={`p-4 rounded-xl border space-y-3 transition-all ${
                    item.completed ? 'bg-emerald-50/40 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20' : 'bg-gray-50 dark:bg-[#22252c] border-gray-150 dark:border-[#2a2d35]'
                  }`}>
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5 flex-wrap">
                          <span>{item.name}</span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                            item.type === 'part' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                          }`}>{item.type === 'part' ? 'Sparepart' : 'Jasa'}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-sans">Jumlah: {item.qty} unit</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleItemCompletion(selectedOrder.id, item.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase flex items-center gap-1 transition-all cursor-pointer border ${
                          item.completed
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                            : item.photoUrl
                              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                              : 'bg-white dark:bg-[#1a1d23] text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {item.completed ? <><CheckCircle className="w-3.5 h-3.5" weight="duotone" /> Selesai</> : item.type === 'part' ? 'Pasang' : 'Kerjakan'}
                      </button>
                    </div>

                    <div className="border-t border-gray-200/60 dark:border-[#2a2d35] pt-2.5">
                      {item.photoUrl ? (
                        <div className="flex items-center justify-between card p-2.5">
                          <div className="flex items-center gap-3">
                            <img src={item.photoUrl} alt="Bukti" className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-[#2a2d35]" referrerPolicy="no-referrer" />
                            <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 uppercase">
                              <Check className="w-3 h-3" weight="duotone" /> Foto Terlampir
                            </span>
                          </div>
                          {!item.completed && (
                            <button type="button" onClick={() => removePhotoFromItem(selectedOrder.id, item.id)}
                              className="p-1.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-500/20 cursor-pointer">
                              <Trash className="w-4 h-4" weight="duotone" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <WarningCircle className="w-3.5 h-3.5 text-amber-500" weight="duotone" /> Wajib Foto Bukti
                            </span>
                            <button type="button" onClick={() => setActivePhotoItemId(isUploadingThis ? null : item.id)}
                              className="text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-500/20">
                              {isUploadingThis ? 'Tutup' : 'Pilih/Ambil Foto'}
                            </button>
                          </div>

                          {isUploadingThis && (
                            <div className="card p-3 space-y-3">
                              {checklistCamActive ? (
                                <div className="space-y-2">
                                  <div className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 aspect-video bg-black max-w-xs mx-auto">
                                    <video ref={checklistVideoRef} className="w-full h-full object-cover" playsInline muted />
                                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded">REC</span>
                                  </div>
                                  <div className="flex justify-center gap-2">
                                    <button type="button" onClick={() => captureChecklistPhoto(selectedOrder.id, item.id)}
                                      className="bg-emerald-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer">
                                      <Camera className="w-3.5 h-3.5" weight="duotone" /> Ambil Foto
                                    </button>
                                    <button type="button" onClick={stopChecklistCamera}
                                      className="bg-gray-100 dark:bg-[#22252c] text-gray-700 dark:text-gray-300 font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer">Batal</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => attachPhotoToItem(selectedOrder.id, item.id, r.result as string); r.readAsDataURL(f); } }}
                                    onClick={() => document.getElementById(`sa-file-${item.id}`)?.click()}
                                    className="border-2 border-dashed border-gray-200 dark:border-[#2a2d35] hover:border-gray-300 dark:hover:border-gray-600 rounded-lg p-4 text-center cursor-pointer bg-gray-50/50 dark:bg-[#22252c]"
                                  >
                                    <input id={`sa-file-${item.id}`} type="file" accept="image/*" className="hidden"
                                      onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => attachPhotoToItem(selectedOrder.id, item.id, r.result as string); r.readAsDataURL(f); } }} />
                                    <UploadSimple className="w-5 h-5 text-gray-400 dark:text-gray-500 mx-auto mb-1" weight="duotone" />
                                    <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">Seret foto atau <span className="text-blue-600 dark:text-blue-400 underline">klik untuk pilih</span></p>
                                  </div>
                                  <button type="button" onClick={() => startChecklistCamera(item.id)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                                    <Camera className="w-3.5 h-3.5" weight="duotone" /> AKTIFKAN KAMERA
                                  </button>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {MOCK_PROOFS.map((p, idx) => (
                                      <button key={idx} type="button" onClick={() => attachPhotoToItem(selectedOrder.id, item.id, p.url)}
                                        className="border border-gray-200 dark:border-[#2a2d35] rounded-lg p-1.5 flex items-center gap-1.5 bg-gray-50 dark:bg-[#22252c] hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                                        <img src={p.url} alt={p.name} className="w-6 h-6 rounded object-cover" referrerPolicy="no-referrer" />
                                        <span className="text-[8px] font-bold text-gray-600 dark:text-gray-400 truncate">{p.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit checklist */}
            {(() => {
              const approved = selectedOrder.serviceItems.filter(i => i.status === 'approved');
              const done = approved.filter(i => i.completed).length;
              const allDone = done === approved.length && approved.length > 0;
              return (
                <div className="pt-3 space-y-3 border-t border-gray-100 dark:border-[#2a2d35]">
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${allDone ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400'}`}>
                    <WarningCircle className="w-4 h-4 shrink-0" weight="duotone" />
                    <p className="font-medium">{allDone ? `Semua ${approved.length} item selesai & terfoto. Siap konfirmasi.` : `${done} dari ${approved.length} item selesai. Selesaikan semua sebelum konfirmasi.`}</p>
                  </div>
                  <textarea rows={2} placeholder="Catatan SA (opsional): kondisi kendaraan, hasil test drive, dll."
                    value={saReport} onChange={e => setSaReport(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-black dark:focus:border-gray-500 text-gray-800 dark:text-gray-100" />
                  <button type="button" onClick={() => handleSubmitChecklist(selectedOrder)} disabled={!allDone}
                    className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      allDone ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}>
                    <CheckCircle className="w-4 h-4" weight="duotone" /> KONFIRMASI SERVIS SELESAI
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {invoiceOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, overflow: 'auto' }}>
          <InvoicePrint
            order={invoiceOrder}
            invoiceNumber={`INV-${invoiceOrder.id}-${new Date().getFullYear()}`}
            kasirName={activeUser?.name}
            onClose={() => setInvoiceOrder(null)}
          />
        </div>
      )}
      {sppOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, overflow: 'auto', padding: '24px' }}>
          <SPPPrintCard order={sppOrder} onClose={() => setSppOrder(null)} />
        </div>
      )}
    <div className="space-y-6">
      
      {/* Dashboard Header */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] bg-berlin-navy/5 text-berlin-navy px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-berlin-navy/10">
              SERVICE ADVISOR PANEL
            </span>
            <h3 className="text-xl font-bold text-[#1A1A1A] dark:text-white mt-2">Dashboard Progres & Persetujuan (ACC)</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Pantau real-time seluruh progres kendaraan di bengkel dan kelola persetujuan estimasi pengerjaan tambahan.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold block">TOTAL AKTIF</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-berlin-navy">{stats.totalActive}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">Unit Mobil</span>
            </div>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 p-4 rounded-xl space-y-1 relative overflow-hidden">
            <span className="text-[10px] uppercase tracking-widest text-amber-800 dark:text-amber-400 font-bold block flex items-center gap-1">
              <Warning className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" weight="duotone" />
              BUTUH ACC SA
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pendingAccCount}</span>
              {stats.pendingAccCount > 0 && (
                <span className="absolute -right-2 -bottom-2 w-12 h-12 bg-amber-500/5 rounded-full" />
              )}
              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold">Butuh Respon</span>
            </div>
          </div>

          <div className="bg-blue-50/40 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-blue-800 dark:text-blue-400 font-bold block">SEDANG DIKERJAKAN</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-blue-700 dark:text-blue-400">{stats.inProgress}</span>
              <span className="text-[10px] text-blue-800 dark:text-blue-400 font-semibold">Unit Stall</span>
            </div>
          </div>

          <div className="bg-emerald-50/40 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-emerald-800 dark:text-emerald-400 font-bold block">SELESAI (HARI INI)</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.completed}</span>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold">Unit Keluar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Filters and Search */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-berlin-navy text-white' : 'bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              Semua Progres
            </button>
            <button
              onClick={() => setStatusFilter('pending_acc')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                statusFilter === 'pending_acc' 
                  ? 'bg-amber-600 border-amber-600 text-white shadow-xs' 
                  : 'bg-amber-50/50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 hover:bg-amber-100/50'
              }`}
            >
              <Warning className="w-3.5 h-3.5" weight="duotone" />
              Butuh ACC ({stats.pendingAccCount})
            </button>
            <button
              onClick={() => setStatusFilter('antre')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'antre' ? 'bg-berlin-navy text-white' : 'bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              Antre
            </button>
            <button
              onClick={() => setStatusFilter('dikerjakan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'dikerjakan' ? 'bg-berlin-navy text-white' : 'bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              Dikerjakan
            </button>
            <button
              onClick={() => setStatusFilter('menunggu_pembayaran')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'menunggu_pembayaran' ? 'bg-berlin-navy text-white' : 'bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              Menunggu Pembayaran
            </button>
            <button
              onClick={() => setStatusFilter('selesai')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'selesai' ? 'bg-berlin-navy text-white' : 'bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              Selesai
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <input
              type="text"
              placeholder="Cari No. HP, Plat, Model, Nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-xl py-2 pl-9 pr-4 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-black dark:focus:border-gray-500 transition-colors"
            />
            <MagnifyingGlass className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" weight="duotone" />
          </div>
        </div>
      </div>

      {/* Bulk action bar — shown only once orders are selected */}
      {selectedIds.size > 0 && (
        <div className="card p-3.5 flex flex-wrap items-center gap-3 border-berlin-navy/30 dark:border-berlin-gold/30">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            {selectedIds.size} WO dipilih
          </span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value as Order['status'])}
            className="bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg text-xs font-semibold px-2.5 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-berlin-navy dark:focus:border-berlin-gold cursor-pointer"
          >
            {BULK_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>Ubah ke: {opt.label}</option>
            ))}
          </select>
          <button
            onClick={applyBulkStatus}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-berlin-navy hover:bg-berlin-navy-dark text-white transition-colors cursor-pointer"
          >
            Terapkan
          </button>
          <button
            onClick={clearSelection}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#22252c] transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      )}

      {/* Grid List of Car Progresses */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-[#2a2d35] flex items-center justify-between bg-gray-50/50 dark:bg-[#22252c]">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
              onChange={e => setSelectedIds(e.target.checked ? new Set(filteredOrders.map(o => o.id)) : new Set())}
              className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 cursor-pointer accent-berlin-navy"
            />
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">
              MENAMPILKAN {filteredOrders.length} MOBIL AKTIF
            </span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans">Real-time Sync</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500 space-y-2">
            <Car className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" weight="duotone" />
            <p className="text-xs font-semibold">Tidak ada kendaraan yang sesuai filter.</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-normal max-w-xs mx-auto">Coba ganti filter status atau periksa kembali kata kunci pencarian Anda.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-150 dark:divide-[#2a2d35]">
            {filteredOrders.map((order) => {
              const pendingItemsCount = order.serviceItems.filter(item => item.status === 'pending').length;
              const hasAccRequest = pendingItemsCount > 0;
              
              return (
                <div
                  key={order.id}
                  className="p-5 hover:bg-gray-50/60 dark:hover:bg-[#22252c] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    {/* Top line metadata */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 cursor-pointer accent-berlin-navy shrink-0"
                      />
                      <span className="font-sans font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#22252c] border border-gray-200/80 dark:border-[#2a2d35] px-2 py-0.5 rounded">
                        {order.id}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">•</span>
                      <span className="text-gray-500 dark:text-gray-400 font-sans">{order.plateNumber}</span>
                      <span className="text-gray-400 dark:text-gray-500">•</span>
                      <span className="text-gray-400 dark:text-gray-500 font-semibold">{new Date(order.createdAt).toLocaleDateString('id-ID')}</span>
                      
                      {hasAccRequest && (
                        <span className="bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-amber-500/30 px-2 py-0.5 rounded font-bold text-[9px] tracking-wider uppercase flex items-center gap-1">
                          <Warning className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" weight="duotone" />
                          BUTUH ACC ({pendingItemsCount} ITEM)
                        </span>
                      )}
                    </div>

                    {/* Middle details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold block leading-none">MEREK & MODEL</span>
                        <span className="text-sm font-bold text-berlin-navy mt-1 block">{order.carBrand} {order.carModel}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold block leading-none">CUSTOMER</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-1 block">{order.customerName}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-sans mt-0.5 block flex items-center gap-1">
                          <DeviceMobile className="w-3 h-3 text-gray-400 dark:text-gray-500" weight="duotone" />
                          {order.customerPhone}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold block leading-none">MEKANIK</span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-1 block">{order.assignedMechanicName || 'Belum Ditugaskan'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action & Status block */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 border-gray-100 dark:border-[#2a2d35] pt-3 md:pt-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.paymentStatus === 'lunas' && (
                        <button
                          onClick={() => setInvoiceOrder(order)}
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-[#2a2d35] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c] transition-all flex items-center gap-1"
                        >
                          Invoice
                        </button>
                      )}
                      {onDeleteOrder && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order); }}
                          title="Hapus WO ini"
                          className="p-2 rounded-xl border border-gray-200 dark:border-[#2a2d35] text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 hover:border-red-200 dark:hover:border-red-500/30 transition-all cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" weight="duotone" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-1 shadow-xs cursor-pointer ${
                          hasAccRequest 
                            ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-500/40 font-bold' 
                            : 'bg-berlin-navy hover:bg-berlin-navy/90 text-white border border-berlin-gold/30'
                        }`}
                      >
                        Buka Lacak & ACC
                        <CaretRight className="w-3.5 h-3.5" weight="duotone" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {zoomedImage && <ImageLightbox src={zoomedImage} alt="Bukti temuan" onClose={() => setZoomedImage(null)} />}
    </div>
    </div>
  );
}