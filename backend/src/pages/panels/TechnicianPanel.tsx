import React, { useEffect, useRef, useState } from 'react';
import { ClipboardText, FileText, Wrench, Users, Info, Camera, UploadSimple, Warning, X, Check, Plus } from '@phosphor-icons/react';
import { Order, User as StaffUser, DiagnosticFinding } from '@shared/types';
import { STATUS_CONFIG, BADGE_CLASS } from '@shared/design';
import { genId } from '@shared/id';
import SPKPrintCard from '../../components/SPKPrintCard';

interface TechnicianPanelProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status'], timelineDescription: string) => void;
  onAddFinding: (orderId: string, finding: any) => void;
  onUpdateServiceItems: (orderId: string, items: any[]) => void;
  onUpdateOrder: (orderId: string, updatedFields: Partial<Order>) => void;
  activeUser: StaffUser;
  onNotify?: (message: string) => void;
}

const FINDING_STATUS_LABEL: Record<DiagnosticFinding['status'], { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'Menunggu ACC SA', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' },
  approved: { label: 'Disetujui', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20' },
  rejected: { label: 'Ditolak', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20' },
};

export default function TechnicianPanel({ orders, onAddFinding, onNotify }: TechnicianPanelProps) {
  const notify = onNotify || alert;
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  const spkOrders = orders.filter(o => o.spkSent && o.status !== 'selesai');

  const badge = (status: Order['status']) => STATUS_CONFIG[status];

  // Form lapor temuan sendiri — sama pola sama yang dipakai Advisor
  // (AdvisorDashboard.tsx), cuma tanpa field estimasi biaya (itu tetap
  // kerjaan SA pas ACC temuan).
  const [showTemuanForm, setShowTemuanForm] = useState(false);
  const [wsDesc, setWsDesc] = useState('');
  const [wsTemuanPhoto, setWsTemuanPhoto] = useState<string | null>(null);
  const [wsTemuanCamActive, setWsTemuanCamActive] = useState(false);
  const wsTemuanVideoRef = useRef<HTMLVideoElement>(null);
  const wsTemuanStreamRef = useRef<MediaStream | null>(null);

  const resetTemuanForm = () => {
    // Setiap jalan nutup form ini harus lewat sini biar kamera selalu ikut
    // kematiin — dulu cuma tombol "Batal" di dalam live-camera view sama
    // capture foto sukses yang beneran stop stream-nya, jalan tutup lain
    // (ganti order, tombol X, toggle ulang, submit teks doang) ninggalin
    // getUserMedia tetap nyala sampe komponen unmount.
    stopTemuanCamera();
    setShowTemuanForm(false);
    setWsDesc('');
    setWsTemuanPhoto(null);
  };

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

  // Navigasi keluar dari tab ini (unmount) juga harus matiin kamera — tanpa
  // ini, pindah tab pas kamera aktif ninggalin getUserMedia nyala tanpa ada
  // UI sama sekali buat matiinnya.
  useEffect(() => {
    return () => {
      wsTemuanStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

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
      id: genId('f'),
      description: wsDesc.trim(),
      estimatedCost: 0,
      status: 'pending',
      timestamp: new Date().toISOString(),
      ...(wsTemuanPhoto ? { imageUrl: wsTemuanPhoto } : {})
    };
    onAddFinding(orderId, finding);
    notify(`📋 Temuan dilaporkan ke SA — menunggu ACC.`);
    resetTemuanForm();
  };

  return (
    <div className="grid md:grid-cols-12 gap-6 items-start">

      <div className="md:col-span-4 card-padded space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-[#2a2d35]">
          <Users className="w-5 h-5 text-gray-700 dark:text-gray-300" weight="duotone" />
          <div>
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">SPK Aktif</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{spkOrders.length} dari SA</span>
          </div>
        </div>

        <div className="space-y-2">
          {spkOrders.map((o) => {
            const b = badge(o.status);
            return (
              <button
                key={o.id}
                onClick={() => { setSelectedOrderId(o.id); resetTemuanForm(); }}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  selectedOrder?.id === o.id
                    ? 'bg-gray-50 dark:bg-[#22252c] border-gray-400 dark:border-gray-500'
                    : 'bg-white dark:bg-[#1a1d23] border-gray-150 dark:border-[#2a2d35] hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 truncate">
                    <div className="text-xs font-sans font-bold text-gray-700 dark:text-gray-300">{o.id} · {o.plateNumber}</div>
                    <div className="font-bold text-xs text-gray-800 dark:text-gray-100 truncate">{o.carBrand} {o.carModel}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-50 dark:bg-[#22252c] border border-gray-150 dark:border-[#2a2d35] rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                      <Wrench className="w-3 h-3" weight="duotone" />
                      {o.assignedMechanicName || 'Belum ditugaskan'}
                    </div>
                  </div>
                  <span className={`shrink-0 ${BADGE_CLASS} ${b.bg} ${b.text} ${b.border}`}>
                    {b.label}
                  </span>
                </div>
              </button>
            );
          })}

          {spkOrders.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <ClipboardText className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto" weight="duotone" />
              <p className="text-xs text-gray-400 dark:text-gray-500">Belum ada SPK dikirim dari SA.</p>
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-8 space-y-4">
        {selectedOrder ? (
          <>
            <SPKPrintCard order={selectedOrder} />

            <div className="print:hidden bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-xs text-blue-800 dark:text-blue-400">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" weight="duotone" />
                <p>Cetak SPK ini lalu kerjakan sesuai daftar di atas. Ada temuan tambahan? Lapor langsung dari sini, lengkap dengan foto.</p>
              </div>
              <button
                onClick={() => {
                  if (showTemuanForm) {
                    resetTemuanForm();
                  } else {
                    setShowTemuanForm(true);
                    setWsTemuanPhoto(null);
                    setWsDesc('');
                  }
                }}
                className="print:hidden shrink-0 bg-berlin-navy text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-berlin-navy-dark transition-colors">
                <Camera className="w-3.5 h-3.5" weight="duotone" /> LAPOR TEMUAN
              </button>
            </div>

            {showTemuanForm && (
              <div className="print:hidden bg-white dark:bg-[#1a1d23] border border-berlin-navy/20 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-berlin-navy flex items-center gap-2">
                    <Warning className="w-4 h-4 text-amber-500" weight="duotone" /> Form Laporan Temuan
                  </h4>
                  <button onClick={resetTemuanForm}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer p-1">
                    <X className="w-4 h-4" weight="duotone" />
                  </button>
                </div>
                <input value={wsDesc} onChange={e => setWsDesc(e.target.value)}
                  placeholder="Deskripsi temuan (e.g. Knalpot bocor di header pipe)"
                  className="w-full bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy/40" />

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
                  disabled={!wsDesc.trim()}
                  className="w-full flex items-center justify-center gap-1.5 bg-berlin-navy text-white py-2.5 rounded-xl text-xs font-bold hover:bg-berlin-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                  <Plus className="w-3.5 h-3.5" weight="duotone" /> Kirim Temuan ke SA
                </button>
              </div>
            )}

            {selectedOrder.findings.length > 0 && (
              <div className="print:hidden card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a2d35]">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Temuan yang Sudah Dilaporkan</span>
                </div>
                <div className="p-5 space-y-3">
                  {selectedOrder.findings.map(finding => {
                    const st = FINDING_STATUS_LABEL[finding.status];
                    return (
                      <div key={finding.id} className="flex items-start justify-between gap-3 border border-gray-200 dark:border-[#2a2d35] rounded-xl p-3.5">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-800 dark:text-gray-100">{finding.description}</div>
                            <span className={`inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                              {st.label}
                            </span>
                          </div>
                        </div>
                        {finding.imageUrl && (
                          <img src={finding.imageUrl} alt="Bukti temuan" className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-[#2a2d35] shrink-0" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card p-12 text-center space-y-4">
            <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" weight="duotone" />
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Pilih SPK</h4>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Pilih SPK di panel kiri untuk melihat detail dan mencetak.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
