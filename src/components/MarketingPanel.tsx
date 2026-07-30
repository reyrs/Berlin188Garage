import React, { useState } from 'react';
import { Camera, Download, Share2, Image, Star, Filter } from 'lucide-react';
import { Order } from '../types';

interface MarketingPanelProps {
  orders: Order[];
}

export default function MarketingPanel({ orders }: MarketingPanelProps) {
  const [selectedBrand, setSelectedBrand] = useState('Semua');

  // Orders yang sudah selesai dan punya foto (temuan/serviceItems dengan foto)
  const completedOrders = orders.filter(o => o.status === 'selesai' || o.paymentStatus === 'lunas');

  const brands = ['Semua', ...Array.from(new Set(completedOrders.map(o => o.carBrand)))];

  const filtered = selectedBrand === 'Semua'
    ? completedOrders
    : completedOrders.filter(o => o.carBrand === selectedBrand);

  // Kumpulkan semua foto dari findings dan service items
  const allPhotos = orders.flatMap(o => [
    ...o.findings.filter(f => f.imageUrl).map(f => ({
      url: f.imageUrl!,
      caption: f.description,
      order: o,
      type: 'Temuan Diagnosis' as const
    })),
    ...o.serviceItems.filter(i => i.photoUrl).map(i => ({
      url: i.photoUrl!,
      caption: i.name,
      order: o,
      type: 'Bukti Pengerjaan' as const
    }))
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] bg-berlin-red/10 text-berlin-red px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-berlin-red/20">MARKETING & KOMUNIKASI</span>
            <h3 className="text-xl font-bold text-[#1A1A1A] mt-2">Konten & Portofolio</h3>
            <p className="text-gray-500 text-xs mt-0.5">Data foto, temuan, dan pengerjaan untuk konten media sosial dan portofolio bengkel.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl">
            <Image className="w-4 h-4" />
            <span className="font-semibold">{allPhotos.length} foto tersedia</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'WO Selesai', value: completedOrders.length, color: 'text-emerald-600' },
          { label: 'Foto Pengerjaan', value: allPhotos.filter(p => p.type === 'Bukti Pengerjaan').length, color: 'text-blue-600' },
          { label: 'Foto Temuan', value: allPhotos.filter(p => p.type === 'Temuan Diagnosis').length, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Gallery foto */}
      {allPhotos.length > 0 && (
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Camera className="w-4 h-4" /> Galeri Foto Pengerjaan & Temuan
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allPhotos.map((photo, idx) => (
              <div key={idx} className="group relative rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-100">
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-[9px] font-bold leading-tight truncate">{photo.caption}</p>
                    <p className="text-white/70 text-[8px] mt-0.5">{photo.order.carBrand} {photo.order.carModel}</p>
                    <span className={`inline-block text-[7px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                      photo.type === 'Bukti Pengerjaan' ? 'bg-blue-500/80 text-white' : 'bg-purple-500/80 text-white'
                    }`}>{photo.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portofolio order selesai */}
      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Star className="w-4 h-4" /> Portofolio Kendaraan Selesai
          </h4>
          <div className="flex gap-1.5 flex-wrap">
            {brands.map(b => (
              <button key={b} onClick={() => setSelectedBrand(b)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedBrand === b ? 'bg-berlin-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{b}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(o => {
            const photos = [
              ...o.findings.filter(f => f.imageUrl).map(f => f.imageUrl!),
              ...o.serviceItems.filter(i => i.photoUrl).map(i => i.photoUrl!)
            ];
            return (
              <div key={o.id} className="border border-gray-150 rounded-xl p-4 space-y-3 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-gray-500">{o.id}</span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold uppercase">SELESAI</span>
                    </div>
                    <h5 className="font-bold text-gray-900 text-sm">{o.carBrand} {o.carModel}</h5>
                    <p className="text-[10px] text-gray-500">{o.serviceType} · {o.plateNumber}</p>
                    <p className="text-[11px] text-gray-600 italic">"{o.complaint}"</p>
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono shrink-0">{new Date(o.createdAt).toLocaleDateString('id-ID')}</span>
                </div>

                {/* Temuan */}
                {o.findings.filter(f => f.status === 'approved').length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-extrabold tracking-wider text-gray-400">Temuan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {o.findings.filter(f => f.status === 'approved').map(f => (
                        <span key={f.id} className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full font-semibold">{f.description.split(',')[0]}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Foto preview */}
                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {photos.slice(0, 5).map((url, idx) => (
                      <img key={idx} src={url} alt="Foto pengerjaan" className="w-14 h-14 rounded-lg object-cover border border-gray-200" referrerPolicy="no-referrer" />
                    ))}
                    {photos.length > 5 && (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">
                        +{photos.length - 5}
                      </div>
                    )}
                  </div>
                )}

                {photos.length === 0 && (
                  <p className="text-[10px] text-gray-400 italic">Belum ada foto pengerjaan untuk order ini.</p>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-xs text-gray-400">Belum ada order selesai untuk ditampilkan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
