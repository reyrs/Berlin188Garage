import React, { useState } from 'react';
import { ClipboardList, FileText, Car, User, Printer, Wrench, Users } from 'lucide-react';
import { Order, User as StaffUser } from '../types';

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

  // Semua WO yang SPK-nya sudah dikirim SA (spkSent = true), belum selesai
  const spkOrders = orders.filter(o => o.spkSent && o.status !== 'selesai');

  const handlePrintSPK = () => window.print();

  const statusLabel: Record<Order['status'], string> = {
    antre: 'ANTRE',
    dikerjakan: 'DIKERJAKAN',
    temuan_dilaporkan: 'ADA TEMUAN',
    menunggu_pembayaran: 'SELESAI SERVIS',
    selesai: 'SELESAI'
  };

  const statusColor: Record<Order['status'], string> = {
    antre: 'bg-amber-50 text-amber-800 border-amber-200',
    dikerjakan: 'bg-sky-50 text-sky-800 border-sky-200',
    temuan_dilaporkan: 'bg-purple-50 text-purple-800 border-purple-200',
    menunggu_pembayaran: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    selesai: 'bg-gray-100 text-gray-600 border-gray-200'
  };

  return (
    <div className="grid md:grid-cols-12 gap-6 items-start">

      {/* Left: shared SPK dashboard */}
      <div className="md:col-span-4 bg-white border border-gray-200 p-5 rounded-2xl space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Users className="w-5 h-5 text-black" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Dashboard SPK Bengkel</h3>
            <span className="text-[10px] text-gray-500 block mt-0.5">{spkOrders.length} SPK aktif dari SA</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {spkOrders.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedOrderId(o.id)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedOrder?.id === o.id
                  ? 'bg-gray-50 border-black'
                  : 'bg-white border-gray-150 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 truncate">
                  <div className="text-[10px] font-mono font-bold text-black">{o.id} · {o.plateNumber}</div>
                  <div className="font-bold text-xs text-gray-800 truncate">{o.carBrand} {o.carModel}</div>
                  <div className="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 inline-block">
                    🔧 {o.assignedMechanicName || 'Belum ditugaskan'}
                  </div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border ${statusColor[o.status]}`}>
                  {statusLabel[o.status]}
                </span>
              </div>
            </button>
          ))}

          {spkOrders.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <ClipboardList className="w-8 h-8 text-gray-200 mx-auto" />
              <p className="text-xs text-gray-400">Belum ada SPK dikirim dari SA.</p>
              <p className="text-[10px] text-gray-300">SPK muncul di sini setelah SA mengirimkannya.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: SPK Document */}
      <div className="md:col-span-8">
        {selectedOrder ? (
          <div className="space-y-4" id="spk-print-area">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-berlin-navy px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-white/70" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-white/50">Berlin 188 Garage</div>
                    <div className="text-sm font-extrabold text-white tracking-wider uppercase">Surat Perintah Kerja</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[9px] text-white/50 font-mono uppercase tracking-wider">No. SPK</div>
                    <div className="text-base font-black text-white font-mono">{selectedOrder.spkNumber || selectedOrder.id}</div>
                  </div>
                  <button
                    onClick={handlePrintSPK}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer no-print"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    CETAK SPK
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Assigned mechanic */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-blue-600">Ditugaskan Kepada</p>
                    <p className="font-bold text-blue-900 text-sm">{selectedOrder.assignedMechanicName || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-gray-400">
                      <Car className="w-3 h-3" /> Data Kendaraan
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Merek / Model</span>
                        <span className="font-bold text-gray-900">{selectedOrder.carBrand} {selectedOrder.carModel}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Plat Nomor</span>
                        <span className="font-mono font-black text-gray-900 text-sm tracking-wider">{selectedOrder.plateNumber}</span>
                      </div>
                      {selectedOrder.carYear && (
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-bold">Tahun</span>
                          <span className="font-semibold text-gray-700">{selectedOrder.carYear}</span>
                        </div>
                      )}
                      {selectedOrder.carEngineCode && (
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-bold">Kode Mesin</span>
                          <span className="font-mono font-semibold text-gray-700 uppercase">{selectedOrder.carEngineCode}</span>
                        </div>
                      )}
                      {selectedOrder.carVin && (
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase font-bold">VIN</span>
                          <span className="font-mono text-[10px] text-gray-700">{selectedOrder.carVin}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-gray-400">
                      <User className="w-3 h-3" /> Keluhan & Tipe Servis
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Tipe Servis</span>
                        <span className="font-semibold text-gray-700">{selectedOrder.serviceType}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Keluhan Awal</span>
                        <span className="font-semibold text-gray-700 italic leading-relaxed">"{selectedOrder.complaint}"</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-amber-700 mb-1">Instruksi Sales Advisor</div>
                    <p className="text-xs text-amber-900 leading-relaxed">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Approved work items — no prices */}
                {selectedOrder.serviceItems.filter(i => i.status === 'approved').length > 0 && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-gray-400">
                      <Wrench className="w-3 h-3" /> Daftar Pekerjaan yang Harus Diselesaikan
                    </div>
                    <div className="space-y-2">
                      {selectedOrder.serviceItems.filter(i => i.status === 'approved').map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-150 rounded-xl text-xs">
                          <div className="w-5 h-5 rounded border-2 border-gray-300 shrink-0 flex items-center justify-center">
                            <span className="text-[9px] font-black text-gray-400">{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <span className="font-bold text-gray-800">{item.name}</span>
                            <span className="text-[9px] ml-2 text-gray-400">× {item.qty}</span>
                          </div>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                            item.type === 'part'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {item.type === 'part' ? 'Sparepart' : 'Jasa'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOrder.findings.filter(f => f.status === 'approved').length > 0 && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400">Temuan yang Disetujui (ACC)</div>
                    <div className="space-y-2">
                      {selectedOrder.findings.filter(f => f.status === 'approved').map((f) => (
                        <div key={f.id} className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs">
                          {f.imageUrl && (
                            <img src={f.imageUrl} alt="Temuan" className="w-10 h-10 rounded-lg object-cover border border-emerald-200 shrink-0" referrerPolicy="no-referrer" />
                          )}
                          <span className="font-semibold text-emerald-800">{f.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                  <span className="text-[9px] text-gray-400 font-mono">
                    Dibuat: {new Date(selectedOrder.createdAt).toLocaleString('id-ID')}
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-wider uppercase border ${statusColor[selectedOrder.status]}`}>
                    {statusLabel[selectedOrder.status]}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800">
              <p className="font-semibold">ℹ️ Cetak SPK ini lalu kerjakan sesuai daftar di atas.</p>
              <p className="text-blue-600 mt-0.5">Laporkan ke SA jika ada temuan tambahan selama pengerjaan.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 p-12 rounded-2xl text-center space-y-4 shadow-sm">
            <FileText className="w-10 h-10 text-gray-300 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-[#1A1A1A]">Pilih SPK</h4>
              <p className="text-gray-400 text-xs mt-1">Pilih SPK di panel kiri untuk melihat detail dan mencetak.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
