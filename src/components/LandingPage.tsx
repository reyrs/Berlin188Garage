import React, { useState } from 'react';
import { ShieldCheck, Calendar, Car, ArrowRight, Clock, MapPin, Phone, Filter, Wrench } from 'lucide-react';
import { Order } from '../types';

interface LandingPageProps {
  onCheckOrder: () => void;
  onOpenLogin: () => void;
  onSelectSampleOrder: () => void;
  orders?: Order[];
}

const BRAND_IMAGES: Record<string, string> = {
  'Mercedes-Benz': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&auto=format&fit=crop&q=80',
  'BMW': 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&auto=format&fit=crop&q=80',
  'Audi': 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=600&auto=format&fit=crop&q=80',
  'VW': 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&auto=format&fit=crop&q=80',
  'MINI': 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=600&auto=format&fit=crop&q=80',
  'Land Rover': 'https://images.unsplash.com/photo-1508974239320-0a029497e820?w=600&auto=format&fit=crop&q=80',
  'Lainnya': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&auto=format&fit=crop&q=80'
};

const STATIC_PORTFOLIO = [
  {
    id: 'WO-101', carBrand: 'MINI' as const, carModel: 'Cooper S F56',
    serviceType: 'Kaki-Kaki' as const, complaint: 'Rem depan terasa getar saat pengereman kecepatan tinggi',
    createdAt: '2026-07-14T08:15:00-07:00', advisorName: 'Mekanik Joko',
    serviceItems: [
      { id: 'pi-101-1', name: 'Piringan Cakram Depan OEM Mini', type: 'part' as const, price: 650000, qty: 1 },
      { id: 'pi-101-2', name: 'Kampas Rem Depan Brembo', type: 'part' as const, price: 850000, qty: 1 }
    ],
    findings: [{ id: 'find-101', description: 'Piringan cakram depan bergelombang dan tipis', estimatedCost: 650000, status: 'approved' as const, timestamp: '2026-07-14T08:30:00-07:00' }]
  },
  {
    id: 'WO-102', carBrand: 'Mercedes-Benz' as const, carModel: 'C200 W205',
    serviceType: 'Servis Rutin' as const, complaint: 'Ganti oli rutin, servis berkala 10.000km',
    createdAt: '2026-07-14T09:00:00-07:00', advisorName: 'Mekanik Rudi',
    serviceItems: [
      { id: 'pi-102-1', name: 'Paket Oli Mesin Shell Helix Ultra 5W-40 (6L)', type: 'part' as const, price: 1200000, qty: 1 },
      { id: 'pi-102-2', name: 'Filter Oli Original Mercedes', type: 'part' as const, price: 250000, qty: 1 }
    ],
    findings: []
  },
  {
    id: 'WO-100', carBrand: 'Audi' as const, carModel: 'A4 B9 2.0 TFSI',
    serviceType: 'Perbaikan Mesin' as const, complaint: 'Indikator Check Engine menyala, idle kasar',
    createdAt: '2026-07-13T10:00:00-07:00', advisorName: 'Mekanik Joko',
    serviceItems: [
      { id: 'pi-100-1', name: 'Ignition Coil Pack Bosch (4 Pcs)', type: 'part' as const, price: 1800000, qty: 1 },
      { id: 'pi-100-2', name: 'Busi Iridium NGK Laser (4 Pcs)', type: 'part' as const, price: 800000, qty: 1 }
    ],
    findings: [{ id: 'find-100', description: 'Misfire silinder 2 akibat koil pengapian lemah', estimatedCost: 1800000, status: 'approved' as const, timestamp: '2026-07-13T10:15:00-07:00' }]
  },
  {
    id: 'WO-099', carBrand: 'Land Rover' as const, carModel: 'Range Rover Evoque',
    serviceType: 'Kelistrikan' as const, complaint: 'Pintu bagasi elektrik tidak mau menutup rapat',
    createdAt: '2026-07-12T14:30:00-07:00', advisorName: 'Mekanik Rudi',
    serviceItems: [
      { id: 'pi-099-1', name: 'Tailgate Actuator Motor Replacement', type: 'part' as const, price: 3500000, qty: 1 }
    ],
    findings: [{ id: 'find-099', description: 'Tailgate latch actuator motor internal gear retak', estimatedCost: 3500000, status: 'approved' as const, timestamp: '2026-07-12T14:45:00-07:00' }]
  }
];

export default function LandingPage({ onCheckOrder, onOpenLogin, onSelectSampleOrder, orders = [] }: LandingPageProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('Semua');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const liveCompletedOrders = orders.filter(o => o.status === 'selesai');
  const combinedPortfolio = [
    ...liveCompletedOrders,
    ...STATIC_PORTFOLIO.filter(staticItem => !liveCompletedOrders.some(liveItem => liveItem.id === staticItem.id))
  ];
  const filteredPortfolio = selectedBrand === 'Semua'
    ? combinedPortfolio
    : combinedPortfolio.filter(item => item.carBrand === selectedBrand);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans overflow-x-hidden">

      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="#home" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Berlin 188 Garage" className="h-10 sm:h-12 object-contain" />
            <span className="font-extrabold tracking-tight text-lg text-berlin-navy">
              BERLIN <span className="text-berlin-red">188</span> <span className="text-gray-400 font-light">GARAGE</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#home" className="text-berlin-navy hover:text-berlin-red transition-colors">Beranda</a>
            <a href="#services" className="hover:text-berlin-navy transition-colors">Layanan</a>
            <a href="#portfolio" className="hover:text-berlin-navy transition-colors">Portofolio</a>
            <a href="#brands" className="hover:text-berlin-navy transition-colors">Spesialisasi</a>
            <a href="#contact" className="hover:text-berlin-navy transition-colors">Kontak</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={onCheckOrder}
              className="px-4 py-2 text-xs font-semibold text-berlin-navy hover:text-berlin-red transition-colors hidden sm:block">
              Cek Status Servis
            </button>
            <button onClick={onOpenLogin}
              className="bg-berlin-navy hover:bg-berlin-navy/90 text-white px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-colors cursor-pointer">
              MASUK STAFF
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="relative pt-16 pb-28 md:py-36 bg-berlin-navy text-white px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-12 items-center relative z-10">
          <div className="md:col-span-7 flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-berlin-red px-3.5 py-1.5 rounded-md text-xs font-bold text-white tracking-wide w-fit">
              SPESIALIS BENGKEL MOBIL EROPA — ALAM SUTERA
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Diagnosa Transparan,<br />
              <span className="text-berlin-gold">Tanpa Tebak-tebakan.</span>
            </h1>

            <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Mercedes-Benz, BMW, Audi, VW, MINI, hingga Land Rover, ditangani dengan standar pabrikan Eropa.
              Anda tahu detail diagnosis dan estimasi biaya sebelum pekerjaan dimulai.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button onClick={onCheckOrder}
                className="bg-berlin-red hover:bg-berlin-red/90 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
                Cek Pesanan Kamu
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={onSelectSampleOrder}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
                Demo Tracking (WO-103)
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold text-berlin-gold">12+</div>
                <div className="text-xs text-gray-400">Merek Eropa</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold text-berlin-gold">6 Hari</div>
                <div className="text-xs text-gray-400">Buka / Minggu</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold text-berlin-gold">100%</div>
                <div className="text-xs text-gray-400">Estimasi Transparan</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 relative flex justify-center z-10">
            <div className="relative w-full max-w-md h-[340px] sm:h-[420px] rounded-3xl overflow-hidden border border-white/10 bg-white/5 flex flex-col justify-between p-6">
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] bg-white/10 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  Live Workshop
                </span>
                <img src="/logo.jpg" alt="Berlin 188" className="w-8 h-8 object-contain rounded" />
              </div>

              <div className="my-auto relative flex justify-center items-center">
                <img
                  src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=500&auto=format&fit=crop&q=80"
                  alt="European car in workshop"
                  className="w-full h-44 object-cover rounded-xl border border-white/10"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-2 right-2 bg-berlin-navy/90 px-3 py-1 rounded-lg text-[10px] font-mono text-berlin-gold font-bold">
                  Alam Sutera, Tangerang
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-xl z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-berlin-red" />
                  <div>
                    <div className="text-[11px] font-bold text-white">WO-103: BMW C300</div>
                    <div className="text-[9px] text-gray-400">Progres: Dikerjakan</div>
                  </div>
                </div>
                <button onClick={onSelectSampleOrder}
                  className="text-[10px] text-berlin-gold hover:text-white font-bold flex items-center gap-0.5 cursor-pointer transition-colors">
                  Pantau <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section id="brands" className="py-16 bg-white border-y border-gray-100 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-xs uppercase tracking-widest text-gray-400 font-bold mb-10">
            Spesialisasi Perbaikan & Restorasi Mobil Eropa
          </p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 items-center justify-items-center">
            {[
              { name: 'Mercedes-Benz', logo: 'https://img.icons8.com/ios-filled/100/000000/mercedes.png' },
              { name: 'BMW', logo: 'https://img.icons8.com/ios-filled/100/000000/bmw.png' },
              { name: 'Audi', logo: 'https://img.icons8.com/ios-filled/100/000000/audi.png' },
              { name: 'Volkswagen', logo: 'https://img.icons8.com/ios-filled/100/000000/volkswagen.png' },
              { name: 'MINI Cooper', logo: 'https://img.icons8.com/ios-filled/100/000000/mini.png' },
              { name: 'Land Rover', logo: 'https://img.icons8.com/ios-filled/100/000000/land-rover.png' }
            ].map((brand, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 text-center grayscale hover:grayscale-0 transition-all duration-300 hover:scale-105">
                <img src={brand.logo} alt={brand.name} className="w-10 h-10 object-contain opacity-50 hover:opacity-100 transition-opacity" />
                <span className="text-xs font-medium text-gray-500">{brand.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section id="services" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase">Mengapa Berlin 188?</h2>
          <p className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">Transparansi & Presisi Tanpa Kompromi</p>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">Sistem digital terpadu menghubungkan semua divisi demi kenyamanan servis kendaraan Eropa Anda.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-100 p-8 rounded-2xl space-y-4 hover:border-gray-200 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-berlin-navy" />
            </div>
            <h3 className="text-lg font-bold">Transparansi Estimasi</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Mekanik melaporkan temuan lengkap dengan foto bukti kerusakan. Tidak ada penggantian komponen tanpa persetujuan Anda.
            </p>
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-2xl space-y-4 hover:border-gray-200 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-berlin-navy" />
            </div>
            <h3 className="text-lg font-bold">Pelacakan Real-Time</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Pantau status perbaikan mobil Anda dari mana saja — dari antrean, diagnosis, pengerjaan, hingga siap diambil.
            </p>
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-2xl space-y-4 hover:border-gray-200 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
              <Phone className="w-6 h-6 text-berlin-navy" />
            </div>
            <h3 className="text-lg font-bold">Komunikasi Mudah</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Terhubung langsung dengan Service Advisor. Notifikasi estimasi biaya & invoice dikirim via WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section id="portfolio" className="py-24 bg-white border-t border-gray-100 px-6">
        <div className="max-w-7xl mx-auto space-y-10">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-gray-100">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-berlin-navy tracking-tight">Portofolio Hasil Servis</h2>
              <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
                Koleksi pengerjaan kendaraan Eropa yang telah selesai. Data pribadi pelanggan disamarkan demi privasi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {['Semua', 'Mercedes-Benz', 'BMW', 'Audi', 'VW', 'MINI', 'Land Rover'].map((brand) => (
              <button key={brand} onClick={() => setSelectedBrand(brand)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  selectedBrand === brand
                    ? 'bg-berlin-navy text-white'
                    : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {brand}
              </button>
            ))}
          </div>

          {filteredPortfolio.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-500">Belum ada portofolio untuk {selectedBrand}</p>
              <p className="text-xs text-gray-400 mt-1">WO yang selesai akan muncul di sini secara otomatis.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPortfolio.map((item, idx) => {
                const isExpanded = expandedItemId === item.id;
                const carImage = BRAND_IMAGES[item.carBrand] || BRAND_IMAGES['Lainnya'];
                const formattedDate = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Baru Selesai';

                return (
                  <div key={item.id || idx}
                    className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-lg transition-all flex flex-col h-full">

                    <div className="relative h-48 overflow-hidden bg-gray-100 shrink-0">
                      <img src={carImage} alt={`${item.carBrand} ${item.carModel}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="bg-berlin-navy/90 text-white px-2.5 py-1 rounded-md text-xs font-bold tracking-wide">
                          {item.id}
                        </span>
                        <span className="bg-emerald-600/90 text-white px-2.5 py-1 rounded-md text-xs font-bold">
                          Selesai
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 text-white">
                        <span className="text-xs uppercase font-bold tracking-widest text-berlin-gold block">
                          {item.serviceType}
                        </span>
                        <h4 className="text-lg font-extrabold tracking-tight">
                          {item.carBrand} {item.carModel}
                        </h4>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">Keluhan</span>
                        <p className="text-gray-700 text-xs italic mt-1 leading-relaxed">
                          &ldquo;{item.complaint}&rdquo;
                        </p>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <button
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          className="w-full flex items-center justify-between text-xs font-bold text-berlin-navy hover:text-berlin-red transition-colors cursor-pointer">
                          <span className="flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5" />
                            {isExpanded ? 'Sembunyikan Rincian' : 'Lihat Rincian'}
                          </span>
                          <span className="text-lg leading-none">{isExpanded ? '-' : '+'}</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-3 bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs space-y-2.5">
                            <div>
                              <span className="text-gray-400 font-bold block">Mekanik</span>
                              <span className="text-gray-700 font-semibold">{item.advisorName || 'Service Advisor Berlin 188'}</span>
                            </div>

                            {item.findings && item.findings.length > 0 && (
                              <div>
                                <span className="text-gray-400 font-bold block mb-1">Temuan Diagnosis</span>
                                <ul className="list-disc list-inside space-y-1 text-gray-600 text-[11px]">
                                  {item.findings.map((f: any, fIdx: number) => (
                                    <li key={fIdx}>{f.description}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div>
                              <span className="text-gray-400 font-bold block mb-1">Suku Cadang Terpasang</span>
                              <div className="flex flex-wrap gap-1">
                                {item.serviceItems && item.serviceItems.length > 0 ? (
                                  item.serviceItems.map((sItem: any, sIdx: number) => (
                                    <span key={sIdx} className="bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] text-gray-700 font-medium">
                                      {sItem.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-400 italic text-[11px]">Servis standar selesai</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-gray-200 flex justify-between text-[10px]">
                              <span className="text-gray-400">Selesai</span>
                              <span className="font-bold text-gray-600">{formattedDate}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-berlin-navy text-white p-6 sm:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden">
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-extrabold">Kendaraan Eropa Anda butuh penanganan presisi?</h3>
              <p className="text-gray-300 text-sm max-w-xl">
                Dapatkan estimasi transparan dan pantau proses perbaikan real-time dari smartphone Anda.
              </p>
            </div>
            <button onClick={onCheckOrder}
              className="bg-berlin-red hover:bg-berlin-red/90 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shrink-0 cursor-pointer">
              Konsultasi Sekarang
            </button>
          </div>

        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 bg-gray-50 border-t border-gray-100 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase">Alur Kerja</h2>
            <p className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">Proses Digital Berlin 188</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Check-In & Registrasi', desc: 'Service Advisor mendata keluhan dan mendaftarkan order hanya dengan No. Handphone.' },
              { num: '02', title: 'Diagnosis Mekanik', desc: 'Mekanik memeriksa keluhan, mencatat temuan kerusakan dan mengunggah foto bukti.' },
              { num: '03', title: 'Persetujuan Pemilik', desc: 'Pemilik melihat detail temuan di HP dan menyetujui estimasi biaya secara transparan.' },
              { num: '04', title: 'Kasir & Serah Terima', desc: 'Invoice otomatis dibuat. Kasir memproses pembayaran dan serah terima kunci.' }
            ].map((step, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 space-y-3">
                <span className="text-5xl font-extrabold text-gray-100 font-mono">{step.num}</span>
                <h4 className="text-sm font-bold">{step.title}</h4>
                <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 border-t border-gray-100 bg-white px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Berlin 188 Garage" className="h-12 object-contain" />
              <div>
                <span className="font-extrabold tracking-tight text-lg block text-berlin-navy">
                  BERLIN <span className="text-berlin-red">188</span> <span className="text-gray-400 font-light">GARAGE</span>
                </span>
                <span className="text-xs uppercase tracking-widest text-berlin-gold font-bold">Premium Auto Specialist</span>
              </div>
            </div>

            <p className="text-gray-600 text-sm max-w-sm leading-relaxed">
              Perawatan dan perbaikan spesialis mobil Eropa modern dengan transparansi berbasis data digital.
            </p>

            <div className="space-y-4 text-xs text-gray-700">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-berlin-red shrink-0 mt-0.5" />
                <span>Jl. Alam Sutera Boulevard No. 188, Pakulonan, Serpong Utara, Tangerang Selatan, Banten 15325</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-berlin-navy shrink-0" />
                <span>+62 851-5601-0707</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-berlin-navy shrink-0" />
                <span>Senin - Sabtu (08.30 - 17.00 WIB)</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col justify-between space-y-6">
            <div>
              <h4 className="text-sm font-bold text-berlin-navy">Kunjungi Bengkel</h4>
              <p className="text-gray-500 text-xs mt-1">Lokasi utama kami di kawasan Alam Sutera, Tangerang.</p>
            </div>

            <div className="w-full h-44 rounded-xl overflow-hidden relative border border-gray-200">
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80"
                alt="Map"
                className="w-full h-full object-cover opacity-20 grayscale"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <MapPin className="w-8 h-8 text-berlin-red mb-2" />
                <span className="text-xs font-bold text-berlin-navy">Berlin 188 Garage Alam Sutera</span>
                <span className="text-[10px] text-gray-500 mt-0.5">Seberang Mall @ Alam Sutera</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-gray-200 pt-4">
              <span className="text-gray-500">Butuh derek darurat?</span>
              <a href="tel:085156010707" className="text-berlin-red font-bold hover:underline">Layanan Towing</a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-gray-100 mt-12 pt-8 text-center text-xs text-gray-400">
          <p>&copy; 2026 Berlin 188 Garage. Seluruh Hak Cipta Dilindungi.</p>
        </div>
      </section>
    </div>
  );
}
