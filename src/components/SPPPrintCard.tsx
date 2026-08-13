import React from 'react';
import { Printer, X } from 'lucide-react';
import { Order } from '../types';

interface SPPPrintCardProps {
  order: Order;
  onClose?: () => void;
}

const satuanFor = (type: 'part' | 'jasa') => (type === 'part' ? 'PCS' : 'KALI');

const CELL = 'border border-gray-400 px-2.5 py-1.5';
const LABEL_CELL = `${CELL} bg-blue-50 font-bold text-blue-700 text-xs sm:text-sm`;
const VALUE_CELL = `${CELL} text-xs sm:text-sm text-gray-900`;
const HEADER_CELL = `${CELL} bg-blue-50 font-bold text-blue-700 text-xs sm:text-sm uppercase tracking-wide`;

// Printable SPP (Surat Perintah Pengecekan) — dibikin niru persis layout form
// asli bengkel (lihat "CATATAN ALUR SYSTEM BENGKEL BERLIN 188.pdf" halaman 1):
// tabel bergaris ala Excel, label biru, judul besar biru di kanan logo, dan
// urutan section NAMA/NO.POL -> VONIS HASIL PENGECEKAN -> KEBUTUHAN SPAREPART
// -> JASA PENGERJAAN — bukan kartu modern kayak dokumen cetak lain di app ini,
// karena SPP ini yang dipegang & dibandingin langsung sama form kertas asli.
// Belum ada tabel/field khusus buat SPP di data model — `order.notes` dipakai
// sebagai "Vonis Hasil Pengecekan" (satu baris = satu temuan, dipisah newline)
// dan `order.serviceItems` (belum ditolak) sebagai kebutuhan sparepart/jasa,
// TANPA harga (beda dari Invoice) karena di tahap ini belum ada estimasi.
export default function SPPPrintCard({ order, onClose }: SPPPrintCardProps) {
  const items = order.serviceItems.filter(i => i.status !== 'rejected');
  const parts = items.filter(i => i.type === 'part');
  const jasa = items.filter(i => i.type === 'jasa');
  const teknisi = order.assignedMechanicName || order.advisorName || '—';
  const vonisLines = (order.notes?.trim() || order.complaint || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 print-area" id="spp-print-area">
      <div className="print:hidden flex items-center justify-end gap-2">
        <button onClick={() => window.print()}
          className="bg-berlin-navy hover:bg-berlin-navy-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
          <Printer className="w-3.5 h-3.5" /> CETAK
        </button>
        {onClose && (
          <button onClick={onClose}
            className="bg-white border border-gray-200 text-gray-500 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-gray-200">
        {/* Header — logo kiri, judul besar biru kanan, sama kayak form asli */}
        <div className="flex items-center gap-4 border-b-2 border-blue-600 pb-4 mb-4">
          <img src="/logo-on-white.png" alt="Berlin 188 Garage" className="h-14 sm:h-16 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-3xl font-black text-blue-700 leading-tight truncate">Berlin 188 Garage</h1>
            <p className="text-xs sm:text-sm font-bold text-blue-700 tracking-wide uppercase">Surat Perintah Pengecekan ( SPP )</p>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <div className="text-[10px] text-gray-400 font-sans uppercase">No. WO</div>
            <div className="text-sm font-black text-gray-800 font-sans">{order.id}</div>
          </div>
        </div>

        {/* Data pelanggan & kendaraan — 2 kolom label/value, sama kayak form asli */}
        <table className="w-full border-collapse mb-4">
          <tbody>
            <tr>
              <td className={LABEL_CELL} style={{ width: '14%' }}>NAMA</td>
              <td className={VALUE_CELL} style={{ width: '36%' }}>{order.customerName}</td>
              <td className={LABEL_CELL} style={{ width: '14%' }}>NO.POL</td>
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
              <td className={VALUE_CELL}>{teknisi}</td>
              <td className={LABEL_CELL}>TAHUN</td>
              <td className={VALUE_CELL}>{order.carYear || '-'}</td>
            </tr>
          </tbody>
        </table>

        {/* Vonis hasil pengecekan */}
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr><th className={`${HEADER_CELL} text-left`}>Vonis Hasil Pengecekan Kendaraan</th></tr>
          </thead>
          <tbody>
            {vonisLines.length > 0 ? vonisLines.map((line, i) => (
              <tr key={i}><td className={VALUE_CELL}>{line}</td></tr>
            )) : (
              <tr><td className={`${VALUE_CELL} text-gray-400 italic`}>Belum ada catatan.</td></tr>
            )}
          </tbody>
        </table>

        {/* Kebutuhan sparepart */}
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr>
              <th className={`${HEADER_CELL} text-left`}>Kebutuhan Sparepart</th>
              <th className={HEADER_CELL} style={{ width: '18%' }}>Qty</th>
              <th className={HEADER_CELL} style={{ width: '22%' }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {parts.length > 0 ? parts.map(item => (
              <tr key={item.id}>
                <td className={`${VALUE_CELL} font-semibold`}>{item.name}</td>
                <td className={`${VALUE_CELL} text-center font-sans`}>{item.qty} {satuanFor('part')}</td>
                <td className={VALUE_CELL}></td>
              </tr>
            )) : (
              <tr><td className={`${VALUE_CELL} text-gray-400 italic`} colSpan={3}>Belum ada kebutuhan sparepart.</td></tr>
            )}
          </tbody>
        </table>

        {/* Jasa pengerjaan */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${HEADER_CELL} text-left`}>Jasa Pengerjaan</th>
              <th className={HEADER_CELL} style={{ width: '18%' }}>Qty</th>
              <th className={HEADER_CELL} style={{ width: '22%' }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {jasa.length > 0 ? jasa.map(item => (
              <tr key={item.id}>
                <td className={`${VALUE_CELL} font-semibold`}>{item.name}</td>
                <td className={`${VALUE_CELL} text-center font-sans`}>{item.qty} {satuanFor('jasa')}</td>
                <td className={VALUE_CELL}></td>
              </tr>
            )) : (
              <tr><td className={`${VALUE_CELL} text-gray-400 italic`} colSpan={3}>Belum ada jasa pengerjaan.</td></tr>
            )}
          </tbody>
        </table>

        <div className="text-[10px] text-gray-400 font-sans text-right mt-3 sm:hidden">
          No. WO: {order.id}
        </div>
        <div className="text-[10px] text-gray-400 font-sans text-right mt-1">
          Dibuat: {new Date(order.createdAt).toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  );
}
