import React, { useState } from 'react';
import { ClipboardList, FileText, Car, User, Printer, Wrench, Users, Info } from 'lucide-react';
import { Order, User as StaffUser } from '../types';
import { STATUS_CONFIG, BADGE_CLASS } from '../lib/design';

interface TechnicianPanelProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status'], timelineDescription: string) => void;
  onAddFinding: (orderId: string, finding: any) => void;
  onUpdateServiceItems: (orderId: string, items: any[]) => void;
  onUpdateOrder: (orderId: string, updatedFields: Partial<Order>) => void;
  activeUser: StaffUser;
}

export default function TechnicianPanel({ orders }: TechnicianPanelProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  const spkOrders = orders.filter(o => o.spkSent && o.status !== 'selesai');

  const badge = (status: Order['status']) => STATUS_CONFIG[status];

  return (
    <div className="grid md:grid-cols-12 gap-6 items-start">

      <div className="md:col-span-4 card-padded space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Users className="w-5 h-5 text-gray-700" />
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">SPK Aktif</h3>
            <span className="text-xs text-gray-400 mt-0.5">{spkOrders.length} dari SA</span>
          </div>
        </div>

        <div className="space-y-2">
          {spkOrders.map((o) => {
            const b = badge(o.status);
            return (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  selectedOrder?.id === o.id
                    ? 'bg-gray-50 border-gray-400'
                    : 'bg-white border-gray-150 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 truncate">
                    <div className="text-xs font-sans font-bold text-gray-700">{o.id} · {o.plateNumber}</div>
                    <div className="font-bold text-xs text-gray-800 truncate">{o.carBrand} {o.carModel}</div>
                    <div className="text-xs text-gray-500 font-medium bg-gray-50 border border-gray-150 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
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
              <ClipboardList className="w-8 h-8 text-gray-200 mx-auto" />
              <p className="text-xs text-gray-400">Belum ada SPK dikirim dari SA.</p>
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-8">
        {selectedOrder ? (
          <div className="space-y-4 print-area" id="spk-print-area">
            <div className="card shadow-sm overflow-hidden">
              <div className="bg-berlin-navy px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-white/70" />
                  <div>
                    <div className="text-xs font-bold text-white/50 tracking-wide">Berlin 188 Garage</div>
                    <div className="text-sm font-extrabold text-white tracking-wider uppercase">Surat Perintah Kerja</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-white/50 font-sans">No. SPK</div>
                    <div className="text-base font-black text-white font-sans">{selectedOrder.spkNumber || selectedOrder.id}</div>
                  </div>
                  <button onClick={() => window.print()}
                    className="print:hidden bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                    <Printer className="w-3.5 h-3.5" /> CETAK
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Ditugaskan Kepada</p>
                    <p className="font-bold text-blue-900 text-sm">{selectedOrder.assignedMechanicName || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">
                      <Car className="w-3 h-3" /> Data Kendaraan
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-xs text-gray-400 block font-medium">Merek / Model</span>
                        <span className="font-bold text-gray-900">{selectedOrder.carBrand} {selectedOrder.carModel}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block font-medium">Plat Nomor</span>
                        <span className="font-sans font-bold text-gray-900 text-sm">{selectedOrder.plateNumber}</span>
                      </div>
                      {selectedOrder.carYear && <div><span className="text-xs text-gray-400 block font-medium">Tahun</span><span className="font-semibold text-gray-700">{selectedOrder.carYear}</span></div>}
                      {selectedOrder.carEngineCode && <div><span className="text-xs text-gray-400 block font-medium">Kode Mesin</span><span className="font-sans font-semibold text-gray-700 uppercase">{selectedOrder.carEngineCode}</span></div>}
                      {selectedOrder.carVin && <div><span className="text-xs text-gray-400 block font-medium">VIN</span><span className="font-sans text-[10px] text-gray-700">{selectedOrder.carVin}</span></div>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">
                      <User className="w-3 h-3" /> Keluhan & Tipe Servis
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-xs text-gray-400 block font-medium">Tipe Servis</span>
                        <span className="font-semibold text-gray-700">{selectedOrder.serviceType}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block font-medium">Keluhan Awal</span>
                        <span className="font-semibold text-gray-700 italic">&ldquo;{selectedOrder.complaint}&rdquo;</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <div className="text-xs font-bold text-amber-700 mb-1 uppercase tracking-wide">Instruksi Service Advisor</div>
                    <p className="text-xs text-amber-900 leading-relaxed">{selectedOrder.notes}</p>
                  </div>
                )}

                {selectedOrder.serviceItems.filter(i => i.status === 'approved').length > 0 && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">
                      <Wrench className="w-3 h-3" /> Daftar Pekerjaan
                    </div>
                    <div className="space-y-2">
                      {selectedOrder.serviceItems.filter(i => i.status === 'approved').map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-150 rounded-xl text-xs">
                          <div className="w-5 h-5 rounded border-2 border-gray-300 shrink-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <span className="font-bold text-gray-800">{item.name}</span>
                            <span className="text-xs ml-2 text-gray-400">&times; {item.qty}</span>
                          </div>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                            item.type === 'part' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {item.type === 'part' ? 'Part' : 'Jasa'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOrder.findings.filter(f => f.status === 'approved').length > 0 && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Temuan Disetujui</div>
                    <div className="space-y-2">
                      {selectedOrder.findings.filter(f => f.status === 'approved').map((f) => (
                        <div key={f.id} className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs">
                          {f.imageUrl && <img src={f.imageUrl} alt="Temuan" className="w-10 h-10 rounded-lg object-cover border border-emerald-200 shrink-0" referrerPolicy="no-referrer" />}
                          <span className="font-semibold text-emerald-800">{f.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-sans">
                    Dibuat: {new Date(selectedOrder.createdAt).toLocaleString('id-ID')}
                  </span>
                  {(() => { const b = badge(selectedOrder.status); return (
                    <span className={`${BADGE_CLASS} ${b.bg} ${b.text} ${b.border}`}>{b.label}</span>
                  );})()}
                </div>
              </div>
            </div>

            <div className="print:hidden bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cetak SPK ini lalu kerjakan sesuai daftar di atas.</p>
                <p className="text-blue-600 mt-0.5">Laporkan ke SA jika ada temuan tambahan selama pengerjaan.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center space-y-4">
            <FileText className="w-10 h-10 text-gray-300 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-gray-800">Pilih SPK</h4>
              <p className="text-gray-400 text-xs mt-1">Pilih SPK di panel kiri untuk melihat detail dan mencetak.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
