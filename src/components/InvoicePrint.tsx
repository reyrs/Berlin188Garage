import React from 'react';
import { Order } from '../types';

interface InvoiceProps {
  order: Order;
  invoiceNumber: string;
  kasirName?: string;
  onClose?: () => void;
}

const formatRp = (n: number) =>
  n.toLocaleString('id-ID');

const formatDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
    .replace(/ /g, '-');
};

export default function InvoicePrint({ order, invoiceNumber, kasirName = 'DHITA', onClose }: InvoiceProps) {
  const parts = order.serviceItems.filter(i => i.type === 'part' && i.status !== 'rejected');
  const jasa = order.serviceItems.filter(i => i.type === 'jasa' && i.status !== 'rejected');

  const totalPart = parts.reduce((s, i) => s + i.price * i.qty, 0);
  const totalJasa = jasa.reduce((s, i) => s + i.price * i.qty, 0);
  const grandTotal = totalPart + totalJasa;

  return (
    <div className="bg-white" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', minHeight: '100vh' }}>
      
      {/* Print / Close controls - hidden on print */}
      {onClose && (
        <div className="no-print flex gap-2 p-4 bg-gray-100 border-b">
          <button
            onClick={() => window.print()}
            className="bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800"
          >
            🖨️ Cetak Invoice
          </button>
          <button
            onClick={onClose}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            ✕ Tutup
          </button>
        </div>
      )}

      {/* ===== INVOICE BODY ===== */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 24px' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          {/* Left: Company info */}
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px', color: '#000' }}>
              FAKTUR PENJUALAN
            </div>
            <div style={{ marginTop: '6px', fontSize: '10px', lineHeight: '1.6' }}>
              ALAM SUTERA JL. RAWA KUTUK NO.31<br />
              PONDOK JAGUNG TIMUR,<br />
              TANGERANG SELATAN 15324<br />
              Telp : 0818 188 188 01
            </div>
          </div>

          {/* Right: Customer & vehicle data */}
          <div style={{ textAlign: 'right' }}>
            <table style={{ fontSize: '10px', borderCollapse: 'collapse', marginLeft: 'auto' }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: '8px', color: '#444' }}>Nama</td>
                  <td style={{ paddingRight: '4px' }}>:</td>
                  <td style={{ fontWeight: 'bold' }}>{order.customerName.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '8px', color: '#444' }}>Alamat</td>
                  <td style={{ paddingRight: '4px' }}>:</td>
                  <td>{order.customerAddress || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '8px', color: '#444' }}>HP</td>
                  <td style={{ paddingRight: '4px' }}>:</td>
                  <td>{order.customerPhone}</td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '8px', color: '#444' }}>No. Polisi</td>
                  <td style={{ paddingRight: '4px' }}>:</td>
                  <td style={{ fontWeight: 'bold', letterSpacing: '1px' }}>{order.plateNumber.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '8px', color: '#444' }}>Merek/Type</td>
                  <td style={{ paddingRight: '4px' }}>:</td>
                  <td>{order.carBrand} {order.carModel}</td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '8px', color: '#444' }}>Tahun</td>
                  <td style={{ paddingRight: '4px' }}>:</td>
                  <td>{order.carYear || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Divider + No & Tanggal + Vin + KM + Mekanik + Kasir */}
        <div style={{ borderTop: '2px solid #000', borderBottom: '1px solid #ccc', padding: '5px 0', margin: '8px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '24px', fontSize: '10px' }}>
            <div><span style={{ color: '#444' }}>No</span> : <strong>{invoiceNumber}</strong></div>
            <div><span style={{ color: '#444' }}>TGL</span> : <strong>{formatDate(order.paidAt || order.createdAt)}</strong></div>
            <div><span style={{ color: '#444' }}>No. Vin</span> : <strong style={{ letterSpacing: '0.5px' }}>{order.carVin || '-'}</strong></div>
            <div><span style={{ color: '#444' }}>KM</span> : <strong>-</strong></div>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '10px' }}>
            <div><span style={{ color: '#444' }}>Mekanik</span> : <strong>{order.advisorName || '-'}</strong></div>
            <div><span style={{ color: '#444' }}>Kasir</span> : <strong>{kasirName}</strong></div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #000', borderTop: '1.5px solid #000' }}>
              <th style={{ padding: '5px 4px', textAlign: 'center', width: '28px' }}>No</th>
              <th style={{ padding: '5px 4px', textAlign: 'left' }}>Deskripsi</th>
              <th style={{ padding: '5px 4px', textAlign: 'center', width: '36px' }}>Qty</th>
              <th style={{ padding: '5px 4px', textAlign: 'center', width: '44px' }}>Satuan</th>
              <th style={{ padding: '5px 4px', textAlign: 'right', width: '90px' }}>Harga</th>
              <th style={{ padding: '5px 4px', textAlign: 'right', width: '80px' }}>Disc</th>
              <th style={{ padding: '5px 4px', textAlign: 'right', width: '100px' }}>Jumlah ( Rp. )</th>
            </tr>
          </thead>
          <tbody>
            {/* PART section */}
            {parts.length > 0 && (
              <>
                <tr>
                  <td colSpan={7} style={{ padding: '6px 4px 2px', fontWeight: 'bold', fontSize: '10px', textDecoration: 'underline' }}>
                    PART
                  </td>
                </tr>
                {parts.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '3px 4px' }}>{item.name.toUpperCase()}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'center', fontSize: '9px' }}>
                      {item.qty === 1 ? 'SET' : 'PCS'}
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatRp(item.price)}
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', fontFamily: 'monospace' }}>0</td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {formatRp(item.price * item.qty)}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                  <td colSpan={6} style={{ padding: '4px 4px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px' }}>
                    Total Part
                  </td>
                  <td style={{ padding: '4px 4px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {formatRp(totalPart)}
                  </td>
                </tr>
              </>
            )}

            {/* JASA section */}
            {jasa.length > 0 && (
              <>
                <tr>
                  <td colSpan={7} style={{ padding: '8px 4px 2px', fontWeight: 'bold', fontSize: '10px', textDecoration: 'underline' }}>
                    Jasa
                  </td>
                </tr>
                {jasa.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '3px 4px' }}>{item.name.toUpperCase()}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'center', fontSize: '9px' }}>KLI</td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatRp(item.price)}
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', fontFamily: 'monospace' }}>0</td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {formatRp(item.price * item.qty)}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                  <td colSpan={6} style={{ padding: '4px 4px', textAlign: 'right', fontWeight: 'bold', fontSize: '10px' }}>
                    Total Jasa
                  </td>
                  <td style={{ padding: '4px 4px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {formatRp(totalJasa)}
                  </td>
                </tr>
              </>
            )}

            {/* Spacer rows untuk halaman penuh */}
            {Array.from({ length: Math.max(0, 6 - parts.length - jasa.length) }).map((_, i) => (
              <tr key={`spacer-${i}`}>
                <td colSpan={7} style={{ padding: '5px 4px', borderBottom: '1px solid #f5f5f5' }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUBTOTAL + GRAND TOTAL */}
        <div style={{ borderTop: '1.5px solid #000', display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <table style={{ fontSize: '11px', minWidth: '280px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>SUB TOTAL</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {formatRp(grandTotal)}
                </td>
              </tr>
              <tr style={{ borderTop: '2px solid #000', background: '#f8f8f8' }}>
                <td style={{ padding: '6px 8px', fontWeight: 'bold', fontSize: '13px' }}>GRAND TOTAL</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px' }}>
                  {formatRp(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PAYMENT INFO + NOTES */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '9.5px' }}>
          {/* Rekening */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold' }}>Pembayaran transfer ke rekening Bank BNI</div>
              <div>No. Rekening : <strong>555-1881-880</strong></div>
              <div>a/n PT. GRAHA OTOMOTIF ANDALAN</div>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold' }}>Pembayaran transfer ke rekening Bank BCA</div>
              <div>No. Rekening : <strong>604-465-6242</strong></div>
              <div>a/n PT. GRAHA OTOMOTIF ANDALAN</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>Pembayaran transfer ke rekening Bank BSI</div>
              <div>No. Rekening : <strong>768-188-1888</strong></div>
              <div>a/n PT. GRAHA OTOMOTIF ANDALAN</div>
            </div>
          </div>

          {/* Garansi note */}
          <div style={{ flex: 1, background: '#f9f9f9', border: '1px solid #ddd', padding: '8px 10px', fontSize: '9px', lineHeight: '1.6' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>NOTE :</div>
            <div>
              SETIAP PEMBELIAN DAN PERBAIKAN ELECTRICAL (KELISTRIKAN) BERGARANSI 1 BULAN
              TERHITUNG DARI PEMBUATAN INVOICE.
            </div>
            {order.notes && (
              <div style={{ marginTop: '6px', borderTop: '1px solid #ddd', paddingTop: '6px' }}>
                <strong>Catatan SA:</strong><br />{order.notes}
              </div>
            )}
          </div>
        </div>

        {/* TANDA TANGAN */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', fontSize: '10px' }}>
          <div style={{ textAlign: 'center', minWidth: '140px' }}>
            <div>Diterima Oleh ,</div>
            <div style={{ height: '52px', borderBottom: '1px solid #999', margin: '8px auto', width: '120px' }}></div>
            <div style={{ fontStyle: 'italic', color: '#555' }}>( {order.customerName} )</div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '140px' }}>
            <div>Hormat Kami ,</div>
            <div style={{ height: '52px', borderBottom: '1px solid #999', margin: '8px auto', width: '120px' }}></div>
            <div style={{ fontWeight: 'bold' }}>Berlin188 Garage</div>
          </div>
        </div>

        {/* Footer kecil */}
        <div style={{ borderTop: '1px solid #ddd', marginTop: '16px', paddingTop: '6px', fontSize: '9px', color: '#888', textAlign: 'center' }}>
          Berlin188 Garage · Alam Sutera Jl. Rawa Kutuk No.31, Pondok Jagung Timur, Tangerang Selatan · 0818 188 188 01
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
