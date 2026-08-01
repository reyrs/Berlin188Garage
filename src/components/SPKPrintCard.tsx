import React from 'react';
import { FileText, Car, User, Printer, Wrench } from 'lucide-react';
import { Order } from '../types';
import { STATUS_CONFIG, BADGE_CLASS } from '../lib/design';

interface SPKPrintCardProps {
  order: Order;
}

// Printable SPK — shared by TechnicianPanel (mechanic's own dashboard) and
// SlotBoard's interactive detail view, so the two never drift out of sync.
export default function SPKPrintCard({ order }: SPKPrintCardProps) {
  const badge = STATUS_CONFIG[order.status];

  return (
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
              <div className="text-base font-black text-white font-sans">{order.spkNumber || order.id}</div>
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
              <p className="font-bold text-blue-900 text-sm">{order.assignedMechanicName || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">
                <Car className="w-3 h-3" /> Data Kendaraan
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Merek / Model</span>
                  <span className="font-bold text-gray-900">{order.carBrand} {order.carModel}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Plat Nomor</span>
                  <span className="font-sans font-bold text-gray-900 text-sm">{order.plateNumber}</span>
                </div>
                {order.carYear && <div><span className="text-xs text-gray-400 block font-medium">Tahun</span><span className="font-semibold text-gray-700">{order.carYear}</span></div>}
                {order.carEngineCode && <div><span className="text-xs text-gray-400 block font-medium">Kode Mesin</span><span className="font-sans font-semibold text-gray-700 uppercase">{order.carEngineCode}</span></div>}
                {order.carVin && <div><span className="text-xs text-gray-400 block font-medium">VIN</span><span className="font-sans text-[10px] text-gray-700">{order.carVin}</span></div>}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">
                <User className="w-3 h-3" /> Keluhan & Tipe Servis
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Tipe Servis</span>
                  <span className="font-semibold text-gray-700">{order.serviceType}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Keluhan Awal</span>
                  <span className="font-semibold text-gray-700 italic">&ldquo;{order.complaint}&rdquo;</span>
                </div>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <div className="text-xs font-bold text-amber-700 mb-1 uppercase tracking-wide">Instruksi Service Advisor</div>
              <p className="text-xs text-amber-900 leading-relaxed">{order.notes}</p>
            </div>
          )}

          {order.serviceItems.filter(i => i.status === 'approved').length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">
                <Wrench className="w-3 h-3" /> Daftar Pekerjaan
              </div>
              <div className="space-y-2">
                {order.serviceItems.filter(i => i.status === 'approved').map((item, idx) => (
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

          {order.findings.filter(f => f.status === 'approved').length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Temuan Disetujui</div>
              <div className="space-y-2">
                {order.findings.filter(f => f.status === 'approved').map((f) => (
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
              Dibuat: {new Date(order.createdAt).toLocaleString('id-ID')}
            </span>
            <span className={`${BADGE_CLASS} ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
