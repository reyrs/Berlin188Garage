import React, { useState } from 'react';
import { ClipboardText, FileText, Wrench, Users, Info } from '@phosphor-icons/react';
import { Order, User as StaffUser } from '../types';
import { STATUS_CONFIG, BADGE_CLASS } from '../lib/design';
import SPKPrintCard from './SPKPrintCard';

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
          <Users className="w-5 h-5 text-gray-700" weight="duotone" />
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
              <ClipboardText className="w-8 h-8 text-gray-200 mx-auto" weight="duotone" />
              <p className="text-xs text-gray-400">Belum ada SPK dikirim dari SA.</p>
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-8">
        {selectedOrder ? (
          <div className="space-y-4">
            <SPKPrintCard order={selectedOrder} />

            <div className="print:hidden bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" weight="duotone" />
              <div>
                <p className="font-semibold">Cetak SPK ini lalu kerjakan sesuai daftar di atas.</p>
                <p className="text-blue-600 mt-0.5">Laporkan ke SA jika ada temuan tambahan selama pengerjaan.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center space-y-4">
            <FileText className="w-10 h-10 text-gray-300 mx-auto" weight="duotone" />
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
