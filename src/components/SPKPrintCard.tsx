import React from 'react';
import { Printer } from 'lucide-react';
import { Order } from '../types';
import { STATUS_CONFIG, BADGE_CLASS } from '../lib/design';

interface SPKPrintCardProps {
  order: Order;
}

// Order tanggal dibuat, dipakai buat kolom KET.TANGGAL — SPK nggak nyimpen
// tanggal per-item, jadi tiap baris pakai tanggal SPK ini (sama kayak
// contoh SPK asli: semua part di 1 SPK share 1 tanggal yang sama).
const formatTanggal = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
};

// ServiceItem nggak nyimpen satuan asli (liter/pcs/dst) — belum ada field
// buat itu di skema. PCS/KALI dipakai sebagai default yang paling umum
// sampai field satuan beneran ditambahkan.
const satuanFor = (type: 'part' | 'jasa') => (type === 'part' ? 'PCS' : 'KALI');

const CELL = 'border border-gray-400 px-2.5 py-1.5';
const LABEL_CELL = `${CELL} bg-blue-50 font-bold text-blue-700 text-xs sm:text-sm`;
const VALUE_CELL = `${CELL} text-xs sm:text-sm text-gray-900`;
const HEADER_CELL = `${CELL} bg-blue-50 font-bold text-blue-700 text-xs sm:text-sm uppercase tracking-wide`;

// Printable SPK — dibikin niru persis layout form asli bengkel (lihat
// "CATATAN ALUR SYSTEM BENGKEL BERLIN 188.pdf" halaman 3): tabel bergaris
// ala Excel, label biru, judul besar biru di sebelah logo, urutan section
// NAMA/PLAT -> NAMA BARANG(PART) -> NAMA JASA — sama pola desain yang
// dipakai SPPPrintCard.tsx. Shared by TechnicianPanel (mechanic's own
// dashboard) and SlotBoard's interactive detail view, so the two never
// drift out of sync.
export default function SPKPrintCard({ order }: SPKPrintCardProps) {
  const badge = STATUS_CONFIG[order.status];
  const approvedItems = order.serviceItems.filter(i => i.status === 'approved');
  const approvedParts = approvedItems.filter(i => i.type === 'part');
  const approvedJasa = approvedItems.filter(i => i.type === 'jasa');
  const tanggal = formatTanggal(order.createdAt);
  const approvedFindings = order.findings.filter(f => f.status === 'approved');

  return (
    <div className="space-y-3 print-area" id="spk-print-area">
      <div className="print:hidden flex items-center justify-end">
        <button onClick={() => window.print()}
          className="bg-berlin-navy hover:bg-berlin-navy-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
          <Printer className="w-3.5 h-3.5" /> CETAK
        </button>
      </div>

      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-gray-200">
        {/* Header — logo kiri, judul besar biru kanan, sama kayak form asli */}
        <div className="flex items-center gap-4 border-b-2 border-blue-600 pb-4 mb-4">
          <img src="/logo-on-white.png" alt="Berlin 188 Garage" className="h-14 sm:h-16 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-3xl font-black text-blue-700 leading-tight truncate">Berlin 188 Garage</h1>
            <p className="text-xs sm:text-sm font-bold text-blue-700 tracking-wide uppercase">Surat Perintah Kerja ( SPK )</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-gray-400 font-sans uppercase">No. SPK</div>
            <div className="text-sm font-black text-gray-800 font-sans">{order.spkNumber || order.id}</div>
          </div>
        </div>

        {/* Data pelanggan & kendaraan — 2 kolom label/value, sama kayak form asli */}
        <table className="w-full border-collapse mb-4">
          <tbody>
            <tr>
              <td className={LABEL_CELL} style={{ width: '14%' }}>NAMA</td>
              <td className={VALUE_CELL} style={{ width: '36%' }}>{order.customerName}</td>
              <td className={LABEL_CELL} style={{ width: '14%' }}>PLAT</td>
              <td className={`${VALUE_CELL} font-sans font-bold`}>{order.plateNumber}</td>
            </tr>
            <tr>
              <td className={LABEL_CELL}>TLP/HP</td>
              <td className={`${VALUE_CELL} font-sans`}>{order.customerPhone}</td>
              <td className={LABEL_CELL}>VIN</td>
              <td className={`${VALUE_CELL} font-sans`}>{order.carVin || '-'}</td>
            </tr>
            <tr>
              <td className={LABEL_CELL}>ALAMAT</td>
              <td className={VALUE_CELL}>{order.customerAddress || '-'}</td>
              <td className={LABEL_CELL}>TYPE</td>
              <td className={VALUE_CELL}>{order.carBrand} {order.carModel}</td>
            </tr>
            <tr>
              <td className={LABEL_CELL}>TEKNISI</td>
              <td className={VALUE_CELL}>{order.assignedMechanicName || '—'}</td>
              <td className={LABEL_CELL}>TAHUN</td>
              <td className={VALUE_CELL}>{order.carYear || '-'}</td>
            </tr>
          </tbody>
        </table>

        {/* Nama barang (part) */}
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr>
              <th className={`${HEADER_CELL} text-left`}>Nama Barang ( Part )</th>
              <th className={HEADER_CELL} style={{ width: '12%' }}>Qty</th>
              <th className={HEADER_CELL} style={{ width: '16%' }}>Satuan</th>
              <th className={HEADER_CELL} style={{ width: '18%' }}>Ket.Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {approvedParts.length > 0 ? approvedParts.map(item => (
              <tr key={item.id}>
                <td className={`${VALUE_CELL} font-semibold`}>{item.name}</td>
                <td className={`${VALUE_CELL} text-center font-sans`}>{item.qty}</td>
                <td className={`${VALUE_CELL} text-center`}>{satuanFor('part')}</td>
                <td className={`${VALUE_CELL} text-center font-sans`}>{tanggal}</td>
              </tr>
            )) : (
              <tr><td className={`${VALUE_CELL} text-gray-400 italic`} colSpan={4}>Belum ada sparepart disetujui.</td></tr>
            )}
          </tbody>
        </table>

        {/* Nama jasa */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${HEADER_CELL} text-left`}>Nama Jasa</th>
              <th className={HEADER_CELL} style={{ width: '12%' }}>Qty</th>
              <th className={HEADER_CELL} style={{ width: '16%' }}>Satuan</th>
              <th className={HEADER_CELL} style={{ width: '18%' }}>Ket.Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {approvedJasa.length > 0 ? approvedJasa.map(item => (
              <tr key={item.id}>
                <td className={`${VALUE_CELL} font-semibold`}>{item.name}</td>
                <td className={`${VALUE_CELL} text-center font-sans`}>{item.qty}</td>
                <td className={`${VALUE_CELL} text-center`}>{satuanFor('jasa')}</td>
                <td className={`${VALUE_CELL} text-center font-sans`}>PROGRES</td>
              </tr>
            )) : (
              <tr><td className={`${VALUE_CELL} text-gray-400 italic`} colSpan={4}>Belum ada jasa disetujui.</td></tr>
            )}
          </tbody>
        </table>

        {order.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
            <div className="text-xs font-bold text-amber-700 mb-1 uppercase tracking-wide">Instruksi Service Advisor</div>
            <p className="text-xs text-amber-900 leading-relaxed">{order.notes}</p>
          </div>
        )}

        {approvedFindings.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Temuan Disetujui</div>
            <div className="space-y-2">
              {approvedFindings.map((f) => (
                <div key={f.id} className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs">
                  {f.imageUrl && <img src={f.imageUrl} alt="Temuan" className="w-10 h-10 rounded-lg object-cover border border-emerald-200 shrink-0" referrerPolicy="no-referrer" />}
                  <span className="font-semibold text-emerald-800">{f.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 font-sans">
            Dibuat: {new Date(order.createdAt).toLocaleString('id-ID')}
          </span>
          <span className={`${BADGE_CLASS} ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
        </div>
      </div>
    </div>
  );
}
