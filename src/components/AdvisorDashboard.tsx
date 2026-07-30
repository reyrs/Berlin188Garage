import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wrench, Users, CheckCircle2, ChevronRight, AlertTriangle, Search, Filter,
  Clock, Sparkles, User, FileText, ArrowLeft, Check, X, ShieldAlert, Car, RefreshCw, Smartphone,
  Camera, Upload, Trash2, AlertCircle, Plus, Send, Package, Settings
} from 'lucide-react';
import { Order, User as StaffUser, ServiceItem, DiagnosticFinding } from '../types';
import TrackingPortal from './TrackingPortal';
import InvoicePrint from './InvoicePrint';

const MOCK_PROOFS = [
  { name: 'Sparepart Terpasang', url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400' },
  { name: 'Oli Baru Diisi', url: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&q=80&w=400' },
  { name: 'Tune Up Selesai', url: 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&q=80&w=400' },
  { name: 'Kelistrikan Selesai', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=400' }
];

interface AdvisorDashboardProps {
  orders: Order[];
  users?: StaffUser[];
  onApproveFinding: (orderId: string, findingId: string) => void;
  onRejectFinding: (orderId: string, findingId: string) => void;
  onApproveServiceItem: (orderId: string, itemId: string) => void;
  onRejectServiceItem: (orderId: string, itemId: string) => void;
  onConfirmPayment: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', bankDest: string) => void;
  onConfirmDPPayment?: (orderId: string, method: 'tunai' | 'transfer' | 'qris' | 'edc', dpAmount: number, dest: string) => void;
  onUpdateOrderStatus?: (orderId: string, status: Order['status'], timelineDescription: string) => void;
  onUpdateFindingCost?: (orderId: string, findingId: string, cost: number) => void;
  onUpdateOrder?: (orderId: string, fields: Partial<Order>) => void;
  onAddFinding?: (orderId: string, finding: DiagnosticFinding) => void;
  onUpdateServiceItems?: (orderId: string, items: ServiceItem[]) => void;
  onSendSPK?: (orderId: string, mechanicId: string, mechanicName: string) => void;
  activeUser?: StaffUser;
}

type FilterType = 'all' | 'pending_acc' | 'antre' | 'dikerjakan' | 'temuan_dilaporkan' | 'menunggu_pembayaran' | 'selesai';

export default function AdvisorDashboard({
  orders,
  users = [],
  onApproveFinding,
  onRejectFinding,
  onApproveServiceItem,
  onRejectServiceItem,
  onConfirmPayment,
  onConfirmDPPayment,
  onUpdateOrderStatus,
  onUpdateFindingCost,
  onUpdateOrder,
  onAddFinding,
  onUpdateServiceItems,
  onSendSPK,
  activeUser
}: AdvisorDashboardProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // SA Workspace — add jasa/temuan, approve parts from gudang, send SPK
  // Temuan form state
  const [showTemuanForm, setShowTemuanForm] = useState(false);
  const [wsDesc, setWsDesc] = useState('');
  const [wsCost, setWsCost] = useState('');
  const [wsTemuanPhoto, setWsTemuanPhoto] = useState<string | null>(null);
  const [wsTemuanCamActive, setWsTemuanCamActive] = useState(false);
  const wsTemuanVideoRef = useRef<HTMLVideoElement>(null);
  const wsTemuanStreamRef = useRef<MediaStream | null>(null);

  // Per-finding jasa form state
  const [activeFindingJasaId, setActiveFindingJasaId] = useState<string | null>(null);
  const [jasaName, setJasaName] = useState('');
  const [jasaPrice, setJasaPrice] = useState('');
  const [jasaQty, setJasaQty] = useState('1');

  const [selectedMechanicId, setSelectedMechanicId] = useState('');
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
    } catch { alert('Tidak dapat membuka kamera.'); }
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
    const finding: DiagnosticFinding = {
      id: `f-${Date.now()}`,
      description: wsDesc.trim(),
      estimatedCost: Number(wsCost) || 0,
      status: 'pending',
      timestamp: new Date().toISOString(),
      ...(wsTemuanPhoto ? { imageUrl: wsTemuanPhoto } : {})
    };
    onAddFinding?.(orderId, finding);
    setWsDesc(''); setWsCost(''); setWsTemuanPhoto(null);
    setShowTemuanForm(false);
  };

  const handleAddJasaToFinding = (orderId: string, findingId: string) => {
    if (!jasaName.trim() || !jasaPrice) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newItem: ServiceItem = {
      id: `item-${Date.now()}`,
      name: jasaName.trim(),
      type: 'jasa',
      price: Number(jasaPrice) || 0,
      qty: Number(jasaQty) || 1,
      status: 'approved',
      findingId
    };
    onUpdateServiceItems?.(orderId, [...order.serviceItems, newItem]);
    setJasaName(''); setJasaPrice(''); setJasaQty('1');
    setActiveFindingJasaId(null);
  };

  const handleRemoveItem = (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    onUpdateServiceItems?.(orderId, order.serviceItems.filter(i => i.id !== itemId));
  };

  const handleSAApprovePartItem = (orderId: string, itemId: string) => {
    onApproveServiceItem(orderId, itemId);
  };

  const handleSARejectPartItem = (orderId: string, itemId: string) => {
    onRejectServiceItem(orderId, itemId);
  };

  const handleSendSPKClick = (orderId: string) => {
    if (!selectedMechanicId) { alert('Pilih mekanik terlebih dahulu.'); return; }
    const mec = mechanics.find(m => m.id === selectedMechanicId);
    if (!mec) return;
    onSendSPK?.(orderId, mec.id, mec.name);
    setSelectedMechanicId('');

    // Send invoice to customer
    const order = orders.find(o => o.id === orderId);
    if (order) {
      showToast(`📄 Invoice untuk ${order.customerName} telah dikirim ke WhatsApp. Silakan cek Tracking Portal.`);
      setInvoiceOrder(order);
    }
  };

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
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
    } catch { alert("Tidak dapat membuka kamera."); }
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
      alert("⚠️ Wajib lampirkan foto bukti sebelum menandai item selesai!");
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
      alert(`⚠️ Masih ada ${undone.length} item yang belum selesai/berfoto.`);
      return;
    }
    const report = saReport.trim() || "Seluruh pekerjaan selesai dikerjakan dan didokumentasikan.";
    onUpdateOrder?.(order.id, {
      status: 'menunggu_pembayaran',
      timeline: [...order.timeline, {
        id: `t-sa-done-${Date.now()}`,
        status: 'menunggu_pembayaran' as const,
        timestamp: new Date().toISOString(),
        title: 'Servis Selesai — Konfirmasi SA',
        description: `SA ${activeUser?.name || ''} mengkonfirmasi seluruh pekerjaan selesai. Catatan: "${report}"`,
        actor: `SA (${activeUser?.name || 'Advisor'})`
      }]
    });
    setSaReport('');
    alert("🎉 Konfirmasi selesai! Kendaraan siap ke billing.");
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
      case 'menunggu_pembayaran': return 'MENUNGGU BILLING';
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

  // If an order is selected, render its dedicated tracking and approval workspace
  if (selectedOrder) {
    return (
      <div className="space-y-4">
        {/* Back navigation header */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <button
            onClick={() => setSelectedOrderId(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-berlin-navy hover:text-berlin-red transition-all cursor-pointer bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Progres Mobil
          </button>
          
          <div className="text-right text-xs">
            <span className="text-gray-400 font-semibold uppercase block">KENDARAAN AKTIF</span>
            <span className="font-bold text-berlin-navy">{selectedOrder.carBrand} {selectedOrder.carModel} • {selectedOrder.plateNumber}</span>
          </div>
        </div>

        {/* SA WORKSPACE */}
        {selectedOrder.status === 'antre' && (
          <div className="space-y-4">

            {/* 1. Vehicle header card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 font-mono font-bold tracking-wider">
                    {selectedOrder.id} / PLAT: {selectedOrder.plateNumber}
                  </div>
                  <h3 className="text-xl font-black text-berlin-navy mt-0.5">
                    {selectedOrder.carBrand} {selectedOrder.carModel}
                  </h3>
                  <div className="grid grid-cols-2 gap-6 mt-3">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">PEMILIK</div>
                      <div className="text-sm font-bold text-gray-800 mt-0.5">
                        {selectedOrder.customerName} ({selectedOrder.customerPhone})
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">KELUHAN AWAL</div>
                      <div className="text-xs text-gray-600 italic mt-0.5">"{selectedOrder.complaint}"</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => { setShowTemuanForm(v => !v); setWsTemuanPhoto(null); setWsDesc(''); setWsCost(''); }}
                    className="bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-neutral-800 transition-colors">
                    <Camera className="w-3.5 h-3.5" /> MELAPORKAN TEMUAN
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Inline temuan form */}
            {showTemuanForm && (
              <div className="bg-white border border-berlin-navy/20 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-berlin-navy flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Form Laporan Temuan
                  </h4>
                  <button onClick={() => { setShowTemuanForm(false); setWsTemuanPhoto(null); setWsDesc(''); setWsCost(''); }}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input value={wsDesc} onChange={e => setWsDesc(e.target.value)}
                  placeholder="Deskripsi temuan (e.g. Knalpot bocor di header pipe)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-berlin-navy/40" />
                <input value={wsCost} onChange={e => setWsCost(e.target.value)} type="number"
                  placeholder="Estimasi biaya (Rp, opsional)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-berlin-navy/40" />

                {/* Photo */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b border-gray-100">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Foto Bukti Temuan
                    </span>
                    {wsTemuanPhoto && (
                      <button type="button" onClick={() => setWsTemuanPhoto(null)}
                        className="text-[9px] text-red-500 font-bold cursor-pointer hover:underline">Hapus Foto</button>
                    )}
                  </div>
                  {wsTemuanPhoto ? (
                    <div className="p-2.5">
                      <img src={wsTemuanPhoto} alt="Bukti temuan" className="w-full max-h-40 object-cover rounded-lg border border-gray-200" referrerPolicy="no-referrer" />
                      <p className="text-[9px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1"><Check className="w-3 h-3" /> Foto terlampir</p>
                    </div>
                  ) : wsTemuanCamActive ? (
                    <div className="p-2.5 space-y-2">
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 aspect-video bg-black">
                        <video ref={wsTemuanVideoRef} className="w-full h-full object-cover" playsInline muted />
                        <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded">REC</span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={captureTemuanPhoto}
                          className="flex-1 bg-emerald-600 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                          <Camera className="w-3.5 h-3.5" /> Ambil Foto
                        </button>
                        <button type="button" onClick={stopTemuanCamera}
                          className="px-4 bg-gray-100 text-gray-600 text-[10px] font-bold py-2 rounded-lg cursor-pointer">Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-lg py-3 cursor-pointer hover:bg-gray-50 transition-colors text-[10px] text-gray-500 font-semibold">
                        <Upload className="w-3.5 h-3.5" /> Upload Foto
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setWsTemuanPhoto(r.result as string); r.readAsDataURL(f); } }} />
                      </label>
                      <button type="button" onClick={startTemuanCamera}
                        className="border border-dashed border-gray-300 rounded-lg py-3 text-[10px] font-semibold text-gray-500 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-50 transition-colors">
                        <Camera className="w-3.5 h-3.5" /> Aktifkan Kamera
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={() => handleAddTemuan(selectedOrder.id)}
                  className="w-full flex items-center justify-center gap-1.5 bg-berlin-navy text-white py-2.5 rounded-xl text-xs font-bold hover:bg-berlin-navy/90 transition-all cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Simpan Temuan
                </button>
              </div>
            )}

            {/* 3. ACC TEMUAN section — per-finding jasa input */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-lg">ACC TEMUAN</span>
                <span className="text-sm font-bold text-gray-900">Temuan yang Disetujui & Jasa Pengerjaan</span>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Berikut adalah daftar temuan tambahan yang telah disetujui (ACC) oleh Sales Advisor / Pelanggan. Masukkan rincian{' '}
                  <strong className="text-gray-800">Jasa Pengerjaan beserta Biayanya</strong> (bisa lebih dari satu) untuk setiap temuan di bawah ini.
                </p>

                {selectedOrder.findings.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
                    <AlertTriangle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 font-semibold">Belum ada temuan.</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">Klik "MELAPORKAN TEMUAN" di atas untuk menambahkan.</p>
                  </div>
                ) : selectedOrder.findings.map(finding => {
                  const findingJasa = selectedOrder.serviceItems.filter(i => i.type === 'jasa' && i.findingId === finding.id);
                  const isAddingJasa = activeFindingJasaId === finding.id;
                  return (
                    <div key={finding.id} className="border border-gray-200 rounded-2xl p-5 space-y-4">
                      {/* Finding header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 leading-snug">{finding.description}</div>
                            {(finding.estimatedCost || 0) > 0 && (
                              <div className="text-xs text-gray-400 mt-0.5">Estimasi awal: {formatRupiah(finding.estimatedCost || 0)}</div>
                            )}
                          </div>
                        </div>
                        {finding.imageUrl && (
                          <img src={finding.imageUrl} alt="Bukti temuan" className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                        )}
                      </div>

                      {/* Jasa list for this finding */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">DAFTAR JASA PENGERJAAN:</div>
                        {findingJasa.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Belum ada jasa pengerjaan yang dimasukkan.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {findingJasa.map(item => (
                              <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-blue-50 border border-blue-100 rounded-xl text-xs">
                                <span className="font-semibold text-blue-900">{item.name}</span>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-blue-600 font-mono">{formatRupiah(item.price)} × {item.qty}</span>
                                  <button onClick={() => handleRemoveItem(selectedOrder.id, item.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add jasa form per finding */}
                      {isAddingJasa ? (
                        <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600">+ TAMBAH JASA SERVICE & BIAYA</div>
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="col-span-1 space-y-1">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">NAMA JASA SERVICE</label>
                              <input value={jasaName} onChange={e => setJasaName(e.target.value)}
                                placeholder="Contoh: Bongkar Pasang & Kali..."
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-black bg-white" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">BIAYA JASA (RP)</label>
                              <input value={jasaPrice} onChange={e => setJasaPrice(e.target.value)} type="number"
                                placeholder="Contoh: 150000"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-black bg-white" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">QTY</label>
                              <input value={jasaQty} onChange={e => setJasaQty(e.target.value)} type="number" min="1"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-black bg-white" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleAddJasaToFinding(selectedOrder.id, finding.id)}
                              className="bg-black text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-neutral-800 transition-colors">
                              Tambah
                            </button>
                            <button onClick={() => setActiveFindingJasaId(null)}
                              className="text-gray-500 text-xs px-3 py-2 cursor-pointer hover:text-gray-700">Batal</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setActiveFindingJasaId(finding.id); setJasaName(''); setJasaPrice(''); setJasaQty('1'); }}
                          className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-[10px] font-bold text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer">
                          + TAMBAH JASA SERVICE & BIAYA
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Pending spareparts from gudang */}
                {selectedOrder.serviceItems.filter(i => i.type === 'part' && i.status === 'pending').length > 0 && (
                  <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Sparepart dari Gudang — perlu ACC Anda
                    </p>
                    {selectedOrder.serviceItems.filter(i => i.type === 'part' && i.status === 'pending').map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2.5 bg-white border border-amber-100 rounded-xl text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-gray-800 truncate block">{item.name}</span>
                          <span className="text-gray-400">{formatRupiah(item.price)} × {item.qty}</span>
                        </div>
                        <button onClick={() => handleSAApprovePartItem(selectedOrder.id, item.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all cursor-pointer flex items-center gap-1">
                          <Check className="w-3 h-3" /> ACC
                        </button>
                        <button onClick={() => handleSARejectPartItem(selectedOrder.id, item.id)}
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all cursor-pointer flex items-center gap-1">
                          <X className="w-3 h-3" /> Tolak
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Send SPK */}
                {(() => {
                  const hasJasa = selectedOrder.serviceItems.some(i => i.type === 'jasa' && i.status === 'approved');
                  const hasPendingParts = selectedOrder.serviceItems.some(i => i.type === 'part' && i.status === 'pending');
                  const allPartsResolved = selectedOrder.serviceItems.filter(i => i.type === 'part').every(i => i.status === 'approved' || i.status === 'rejected');
                  const readyToSend = hasJasa && allPartsResolved && !hasPendingParts;
                  return (
                    <div className={`border rounded-2xl p-4 space-y-3 ${readyToSend ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${readyToSend ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {!hasJasa ? '⚠ Tambah minimal 1 jasa pengerjaan dari temuan di atas'
                          : hasPendingParts ? '⏳ ACC dulu sparepart dari gudang di atas...'
                          : '✅ Semua siap — kirim SPK ke mekanik'}
                      </p>
                      {readyToSend && (
                        <>
                          <select value={selectedMechanicId} onChange={e => setSelectedMechanicId(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none bg-white cursor-pointer">
                            <option value="">— Pilih Mekanik —</option>
                            {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                          <button onClick={() => handleSendSPKClick(selectedOrder.id)}
                            disabled={!selectedMechanicId}
                            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer disabled:cursor-not-allowed">
                            <Send className="w-3.5 h-3.5" /> Kirim SPK ke Mekanik
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
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
            <Send className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-800">SPK sudah dikirim ke {selectedOrder.assignedMechanicName}</p>
              <p className="text-[10px] text-blue-600 mt-0.5">Kendaraan sedang dikerjakan. Pantau progres di timeline bawah.</p>
            </div>
          </div>
        )}

        {/* Re-use TrackingPortal in staff approval mode */}
        <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
          <TrackingPortal
            key={selectedOrder.id}
            orders={orders}
            onBack={() => setSelectedOrderId(null)}
            onApproveFinding={onApproveFinding}
            onRejectFinding={onRejectFinding}
            onApproveServiceItem={onApproveServiceItem}
            onRejectServiceItem={onRejectServiceItem}
            onConfirmPayment={onConfirmPayment}
            onUpdateOrderStatus={onUpdateOrderStatus}
            onUpdateFindingCost={onUpdateFindingCost}
            onUpdateOrder={onUpdateOrder}
            initialSearchQuery={selectedOrder.id}
            isStaffView={true}
          />
        </div>

        {/* SA Checklist & Foto Pengerjaan */}
        {(selectedOrder.status === 'dikerjakan' || selectedOrder.status === 'temuan_dilaporkan') &&
          selectedOrder.serviceItems.filter(i => i.status === 'approved').length > 0 && (
          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Wrench className="w-4 h-4 text-berlin-navy" />
              <div>
                <h4 className="text-xs font-bold text-berlin-navy uppercase tracking-wider">Checklist & Foto Bukti Pengerjaan</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">SA memantau dan mendokumentasikan setiap item pekerjaan yang diselesaikan mekanik.</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {selectedOrder.serviceItems.filter(i => i.status === 'approved').map((item) => {
                const isUploadingThis = activePhotoItemId === item.id;
                return (
                  <div key={item.id} className={`p-4 rounded-xl border space-y-3 transition-all ${
                    item.completed ? 'bg-emerald-50/40 border-emerald-200/60' : 'bg-gray-50 border-gray-150'
                  }`}>
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-gray-800 flex items-center gap-1.5 flex-wrap">
                          <span>{item.name}</span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                            item.type === 'part' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>{item.type === 'part' ? 'Sparepart' : 'Jasa'}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono">Jumlah: {item.qty} unit</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleItemCompletion(selectedOrder.id, item.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase flex items-center gap-1 transition-all cursor-pointer border ${
                          item.completed
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300'
                            : item.photoUrl
                              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-gray-400 border-gray-300'
                        }`}
                      >
                        {item.completed ? <><CheckCircle2 className="w-3.5 h-3.5" /> Selesai</> : item.type === 'part' ? 'Pasang' : 'Kerjakan'}
                      </button>
                    </div>

                    <div className="border-t border-gray-200/60 pt-2.5">
                      {item.photoUrl ? (
                        <div className="flex items-center justify-between bg-white border border-gray-150 rounded-xl p-2.5">
                          <div className="flex items-center gap-3">
                            <img src={item.photoUrl} alt="Bukti" className="w-12 h-12 rounded-lg object-cover border border-gray-200" referrerPolicy="no-referrer" />
                            <span className="text-[9px] font-extrabold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                              <Check className="w-3 h-3" /> Foto Terlampir
                            </span>
                          </div>
                          {!item.completed && (
                            <button type="button" onClick={() => removePhotoFromItem(selectedOrder.id, item.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 cursor-pointer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-amber-600 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Wajib Foto Bukti
                            </span>
                            <button type="button" onClick={() => setActivePhotoItemId(isUploadingThis ? null : item.id)}
                              className="text-blue-600 font-bold text-[10px] uppercase bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                              {isUploadingThis ? 'Tutup' : 'Pilih/Ambil Foto'}
                            </button>
                          </div>

                          {isUploadingThis && (
                            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                              {checklistCamActive ? (
                                <div className="space-y-2">
                                  <div className="relative rounded-lg overflow-hidden border border-gray-300 aspect-video bg-black max-w-xs mx-auto">
                                    <video ref={checklistVideoRef} className="w-full h-full object-cover" playsInline muted />
                                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded">REC</span>
                                  </div>
                                  <div className="flex justify-center gap-2">
                                    <button type="button" onClick={() => captureChecklistPhoto(selectedOrder.id, item.id)}
                                      className="bg-emerald-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer">
                                      <Camera className="w-3.5 h-3.5" /> Ambil Foto
                                    </button>
                                    <button type="button" onClick={stopChecklistCamera}
                                      className="bg-gray-100 text-gray-700 font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer">Batal</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => attachPhotoToItem(selectedOrder.id, item.id, r.result as string); r.readAsDataURL(f); } }}
                                    onClick={() => document.getElementById(`sa-file-${item.id}`)?.click()}
                                    className="border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-lg p-4 text-center cursor-pointer bg-gray-50/50"
                                  >
                                    <input id={`sa-file-${item.id}`} type="file" accept="image/*" className="hidden"
                                      onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => attachPhotoToItem(selectedOrder.id, item.id, r.result as string); r.readAsDataURL(f); } }} />
                                    <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                                    <p className="text-[10px] text-gray-600 font-bold">Seret foto atau <span className="text-blue-600 underline">klik untuk pilih</span></p>
                                  </div>
                                  <button type="button" onClick={() => startChecklistCamera(item.id)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                                    <Camera className="w-3.5 h-3.5" /> AKTIFKAN KAMERA
                                  </button>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {MOCK_PROOFS.map((p, idx) => (
                                      <button key={idx} type="button" onClick={() => attachPhotoToItem(selectedOrder.id, item.id, p.url)}
                                        className="border border-gray-200 rounded-lg p-1.5 flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                                        <img src={p.url} alt={p.name} className="w-6 h-6 rounded object-cover" referrerPolicy="no-referrer" />
                                        <span className="text-[8px] font-bold text-gray-600 truncate">{p.name}</span>
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
                <div className="pt-3 space-y-3 border-t border-gray-100">
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${allDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="font-medium">{allDone ? `Semua ${approved.length} item selesai & terfoto. Siap konfirmasi.` : `${done} dari ${approved.length} item selesai. Selesaikan semua sebelum konfirmasi.`}</p>
                  </div>
                  <textarea rows={2} placeholder="Catatan SA (opsional): kondisi kendaraan, hasil test drive, dll."
                    value={saReport} onChange={e => setSaReport(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-black" />
                  <button type="button" onClick={() => handleSubmitChecklist(selectedOrder)} disabled={!allDone}
                    className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      allDone ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}>
                    <CheckCircle2 className="w-4 h-4" /> KONFIRMASI SERVIS SELESAI
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
            onClose={() => setInvoiceOrder(null)}
          />
        </div>
      )}
    <div className="space-y-6">
      
      {/* Dashboard Header */}
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] bg-berlin-navy/5 text-berlin-navy px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-berlin-navy/10">
              SERVICE ADVISOR PANEL
            </span>
            <h3 className="text-xl font-bold text-[#1A1A1A] mt-2">Dashboard Progres & Persetujuan (ACC)</h3>
            <p className="text-gray-500 text-xs mt-0.5">Pantau real-time seluruh progres kendaraan di bengkel dan kelola persetujuan estimasi pengerjaan tambahan.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">TOTAL AKTIF</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-berlin-navy">{stats.totalActive}</span>
              <span className="text-[10px] text-gray-500 font-semibold">Unit Mobil</span>
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-xl space-y-1 relative overflow-hidden">
            <span className="text-[10px] uppercase tracking-widest text-amber-800 font-bold block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              BUTUH ACC SA
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-600">{stats.pendingAccCount}</span>
              {stats.pendingAccCount > 0 && (
                <span className="absolute -right-2 -bottom-2 w-12 h-12 bg-amber-500/5 rounded-full" />
              )}
              <span className="text-[10px] text-amber-800 font-bold">Butuh Respon</span>
            </div>
          </div>

          <div className="bg-blue-50/40 border border-blue-200/50 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-blue-800 font-bold block">SEDANG DIKERJAKAN</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-blue-700">{stats.inProgress}</span>
              <span className="text-[10px] text-blue-800 font-semibold">Unit Stall</span>
            </div>
          </div>

          <div className="bg-emerald-50/40 border border-emerald-200/50 p-4 rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-emerald-800 font-bold block">SELESAI (HARI INI)</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-700">{stats.completed}</span>
              <span className="text-[10px] text-emerald-800 font-semibold">Unit Keluar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Filters and Search */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-black text-white' : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-100'}`}
            >
              Semua Progres
            </button>
            <button
              onClick={() => setStatusFilter('pending_acc')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                statusFilter === 'pending_acc' 
                  ? 'bg-amber-600 border-amber-600 text-white shadow-xs' 
                  : 'bg-amber-50/50 border-amber-200 text-amber-800 hover:bg-amber-100/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Butuh ACC ({stats.pendingAccCount})
            </button>
            <button
              onClick={() => setStatusFilter('antre')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'antre' ? 'bg-black text-white' : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-100'}`}
            >
              Antre
            </button>
            <button
              onClick={() => setStatusFilter('dikerjakan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'dikerjakan' ? 'bg-black text-white' : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-100'}`}
            >
              Dikerjakan
            </button>
            <button
              onClick={() => setStatusFilter('menunggu_pembayaran')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'menunggu_pembayaran' ? 'bg-black text-white' : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-100'}`}
            >
              Menunggu Billing
            </button>
            <button
              onClick={() => setStatusFilter('selesai')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'selesai' ? 'bg-black text-white' : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-100'}`}
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Grid List of Car Progresses */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
            MENAMPILKAN {filteredOrders.length} MOBIL AKTIF
          </span>
          <span className="text-[10px] text-gray-400 font-mono">Real-time Sync</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Car className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-xs font-semibold">Tidak ada kendaraan yang sesuai filter.</p>
            <p className="text-[11px] text-gray-400 leading-normal max-w-xs mx-auto">Coba ganti filter status atau periksa kembali kata kunci pencarian Anda.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-150">
            {filteredOrders.map((order) => {
              const pendingItemsCount = order.serviceItems.filter(item => item.status === 'pending').length;
              const hasAccRequest = pendingItemsCount > 0;
              
              return (
                <div 
                  key={order.id}
                  className="p-5 hover:bg-gray-50/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    {/* Top line metadata */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono font-bold text-gray-700 bg-gray-100 border border-gray-200/80 px-2 py-0.5 rounded">
                        {order.id}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 font-mono">{order.plateNumber}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-400 font-semibold">{new Date(order.createdAt).toLocaleDateString('id-ID')}</span>
                      
                      {hasAccRequest && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300/60 px-2 py-0.5 rounded font-bold text-[9px] tracking-wider uppercase flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                          BUTUH ACC ({pendingItemsCount} ITEM)
                        </span>
                      )}
                    </div>

                    {/* Middle details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block leading-none">MEREK & MODEL</span>
                        <span className="text-sm font-bold text-berlin-navy mt-1 block">{order.carBrand} {order.carModel}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block leading-none">CUSTOMER</span>
                        <span className="text-sm font-bold text-gray-800 mt-1 block">{order.customerName}</span>
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5 block flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-gray-400" />
                          {order.customerPhone}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block leading-none">MEKANIK</span>
                        <span className="text-xs font-semibold text-gray-600 mt-1 block">{order.advisorName || 'Belum Ditugaskan'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action & Status block */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.paymentStatus === 'lunas' && (
                        <button
                          onClick={() => setInvoiceOrder(order)}
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1"
                        >
                          🖨️ Invoice
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
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 p-4 rounded-xl shadow-lg max-w-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
          <span className="text-sm text-gray-800">{toastMsg}</span>
        </div>
      )}
    </div>
    </div>
  );
}