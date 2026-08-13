import React, { useState } from 'react';
import { ClipboardText, FileText, Wrench, Users, Info } from '@phosphor-icons/react';
import { Order, User as StaffUser, DiagnosticFinding } from '@shared/types';
import { STATUS_CONFIG, BADGE_CLASS } from '@shared/design';
import SPKPrintCard from '../../components/SPKPrintCard';

interface TechnicianPanelProps {
  orders: Order[];
  activeUser: StaffUser;
}

const FINDING_STATUS_LABEL: Record<DiagnosticFinding['status'], { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'Menunggu ACC SA', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' },
  approved: { label: 'Disetujui', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20' },
  rejected: { label: 'Ditolak', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20' },
};

// Revisi alur manager 2026-08-13: mekanik cuma nerima SPK dan lihat mobil
// yang perlu dikerjakan — nggak lapor temuan sendiri (itu jadi tanggung
// jawab SA, lihat AdvisorDashboard.tsx). Dulu ada form "LAPOR TEMUAN" di
// sini, sekarang dihapus; daftar temuan tetap ditampilin read-only biar
// mekanik ngerti konteks kerjaan tanpa bisa nambah/ubah apa pun.
export default function TechnicianPanel({ orders }: TechnicianPanelProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  const spkOrders = orders.filter(o => o.spkSent && o.status !== 'selesai');

  const badge = (status: Order['status']) => STATUS_CONFIG[status];

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
                onClick={() => setSelectedOrderId(o.id)}
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

            <div className="print:hidden bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-[#2a2d35] rounded-2xl p-4 flex items-start gap-2 text-xs text-blue-800 dark:text-blue-400">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" weight="duotone" />
              <p>Cetak SPK ini lalu kerjakan sesuai daftar di atas. Ada kerusakan tambahan yang ditemukan saat pengerjaan? Sampaikan langsung ke Service Advisor — bukan dilaporkan dari sini.</p>
            </div>

            {selectedOrder.findings.length > 0 && (
              <div className="print:hidden card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a2d35]">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Temuan Terkait WO Ini</span>
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
