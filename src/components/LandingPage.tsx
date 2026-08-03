import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, ArrowRight, X } from 'lucide-react';
import { Order, HeroContent, PortfolioItem } from '../types';
import ThemeToggle from './ThemeToggle';
import CurveAccent from './CurveAccent';

interface LandingPageProps {
  onCheckOrder: () => void;
  onSelectSampleOrder: () => void;
  onOpenMarketplace?: () => void;
  orders?: Order[];
  heroContent?: HeroContent | null;
  portfolioItems?: PortfolioItem[];
}

// Dipakai kalau heroContent belum kefetch dari server (atau gagal) — landing
// page nggak boleh pernah blank. Ini teks yang sama kayak yang di-seed ke
// hero_content pas migrasi, jadi nggak ada bedanya secara visual.
const DEFAULT_HERO: HeroContent = {
  headline: 'Mobil Eropa kamu, ditangani spesialis yang ngerti mesinnya.',
  subtitle: 'Kami foto setiap temuan. Kami jelasin setiap biaya. Kamu ACC dulu — baru kami kerjakan.',
  ctaText: 'Cek servis',
};

// Dipakai buat filter portofolio (dan dipakai ulang di form MarketingPanel
// biar merek yang bisa dipilih pas nambah item nyambung sama filter di sini
// — sebelumnya ada dua daftar beda yang nggak sinkron, "Volkswagen" di sini
// vs "VW" di form staf, jadi filternya nggak pernah nemu apa-apa. Sekarang
// disamain ke "VW" (sesuai penyebutan di seluruh app, mis. Order.carBrand).
export const BRANDS = ['Mercedes-Benz', 'BMW', 'Audi', 'VW', 'MINI', 'Land Rover'];

const STEPS = [
  { step: '01', t: 'Check-in', d: 'SA catat keluhan, data mobil, dan nomor HP kamu. 5 menit.' },
  { step: '02', t: 'Diagnosis', d: 'Mekanik periksa, foto kerusakan, upload ke sistem.' },
  { step: '03', t: 'Persetujuan', d: 'Kamu lihat foto + estimasi biaya di HP. ACC kalau setuju.' },
  { step: '04', t: 'Pengerjaan', d: 'Mekanik kerjakan. Status update real-time — kamu pantau dari rumah.' },
  { step: '05', t: 'Serah terima', d: 'Selesai, invoice otomatis. Bayar & bawa pulang mobil.' },
];

export default function LandingPage({ onCheckOrder, onSelectSampleOrder, onOpenMarketplace, orders = [], heroContent, portfolioItems = [] }: LandingPageProps) {
  const hero = heroContent || DEFAULT_HERO;
  const [filter, setFilter] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = filter ? portfolioItems.filter(i => i.carBrand === filter) : portfolioItems;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>('[data-reveal]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [filtered.length]);

  return (
    <div ref={rootRef} className="min-h-screen bg-white text-berlin-navy font-sans">

      {/* NAV */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur border-b border-gray-100'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <a href="#home" className="flex items-center">
            <img
              src={scrolled ? '/logo-on-white.png' : '/logo-icon.png'}
              alt="Berlin 188 Garage"
              className={`object-contain transition-all duration-300 ${scrolled ? 'h-10' : 'h-9 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]'}`}
            />
          </a>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {onOpenMarketplace && (
              <button onClick={onOpenMarketplace}
                className={`spec-label transition-colors hidden sm:block cursor-pointer ${
                  scrolled ? 'text-gray-500 hover:text-berlin-navy' : 'text-white/70 hover:text-white'
                }`}>
                Marketplace
              </button>
            )}
            <Link to="/blog"
              className={`spec-label transition-colors hidden sm:block cursor-pointer ${
                scrolled ? 'text-gray-500 hover:text-berlin-navy' : 'text-white/70 hover:text-white'
              }`}>
              Blog
            </Link>
            <button onClick={onCheckOrder}
              className={`spec-label transition-colors hidden sm:block cursor-pointer ${
                scrolled ? 'text-gray-500 hover:text-berlin-navy' : 'text-white/70 hover:text-white'
              }`}>
              Cek Servis
            </button>
          </div>
        </div>
      </header>

      {/* HERO — video background, atau gambar kalau marketing upload banner */}
      <section className="relative min-h-[94vh] md:min-h-screen overflow-hidden bg-berlin-navy">
        <div className="absolute inset-0">
          {hero.backgroundImageUrl ? (
            <img
              src={hero.backgroundImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/car.mp4" type="video/mp4" />
            </video>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-berlin-navy via-berlin-navy/60 to-berlin-navy/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-berlin-navy-dark/95 via-berlin-navy/35 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-end min-h-[94vh] md:min-h-screen pt-24">
          <div className="max-w-6xl mx-auto w-full px-6 pb-12 md:pb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.05] tracking-tight text-white mb-6 max-w-3xl animate-fade-up">
              {hero.headline}
            </h1>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-9 max-w-md animate-fade-up [animation-delay:100ms]">
              {hero.subtitle}
            </p>
            <button onClick={onCheckOrder} className="bg-berlin-red hover:bg-berlin-red/90 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 animate-fade-up [animation-delay:200ms]">
              {hero.ctaText} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Brand strip — certification plate */}
      <div className="bg-berlin-navy-light border-t border-white/10 py-5">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-x-10 gap-y-2">
          {BRANDS.map((b) => (
            <span key={b} className="spec-label text-white/85">{b}</span>
          ))}
        </div>
      </div>

      {/* PORTFOLIO */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-10">
          <p className="spec-label text-gray-400 mb-2">Hasil Kerja</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-berlin-navy dark:text-white tracking-tight">Yang sudah kami tangani</h2>
        </div>

        {/* Filter — curved-accent tabs */}
        <div className="flex gap-6 mb-10 overflow-x-auto border-b border-gray-150">
          <button
            onClick={() => setFilter(null)}
            className={`relative spec-label pb-3 whitespace-nowrap transition-colors cursor-pointer ${!filter ? 'text-berlin-navy' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Semua
            <CurveAccent active={!filter} />
          </button>
          {BRANDS.map(b => (
            <button
              key={b}
              onClick={() => setFilter(b)}
              className={`relative spec-label pb-3 whitespace-nowrap transition-colors cursor-pointer ${filter === b ? 'text-berlin-navy' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {b}
              <CurveAccent active={filter === b} />
            </button>
          ))}
        </div>

        {/* Cards — hover reveal */}
        {portfolioItems.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-500">Portofolio segera hadir.</p>
            <p className="text-xs text-gray-400 mt-1">Tim kami lagi nyiapin dokumentasi hasil kerja terbaik.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-500">Belum ada portofolio untuk merek ini.</p>
          </div>
        ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item, i) => {
            const formattedDate = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              : '';
            return (
              <div
                key={item.id}
                data-reveal
                style={{ transitionDelay: `${(i % 3) * 80}ms` }}
                className="group relative cursor-pointer aspect-[4/3] rounded-xl overflow-hidden bg-gray-100"
                onClick={() => setLightbox(item.imageUrl)}
              >
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-bold text-sm text-white">{item.carBrand} {item.carModel}</p>
                  <p className="text-xs text-gray-300 mt-1 max-h-0 opacity-0 group-hover:max-h-10 group-hover:opacity-100 overflow-hidden transition-all duration-300">{item.workDescription}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-sans">{formattedDate}</p>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* HOW IT WORKS — dark instrument band */}
      <section className="bg-berlin-navy-light py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <p className="spec-label text-berlin-red text-center mb-3">Proses</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-14 tracking-tight">Dari datang sampai ambil mobil</h2>
          <div className="ml-14 sm:ml-16 space-y-10">
            {STEPS.map((s, i) => (
              <div key={i} data-reveal style={{ transitionDelay: `${i * 60}ms` }} className="relative">
                <span className="absolute -left-14 sm:-left-16 top-0 w-10 h-10 rounded-full bg-berlin-red flex items-center justify-center font-sans text-sm sm:text-base font-bold text-white">{s.step}</span>
                <p className="font-bold text-white text-base sm:text-lg">{s.t}</p>
                <p className="text-sm text-white/80 mt-1 leading-relaxed max-w-md">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="flex items-center mb-10">
          <img src="/logo-on-white.png" alt="Berlin 188 Garage" className="h-11 object-contain" />
        </div>

        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-150 dark:divide-[#2a2d35] border-t border-b border-gray-150 dark:border-[#2a2d35] mb-12">
          <div className="py-6 sm:pr-8">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-berlin-red" />
              <p className="spec-label text-gray-400">Alamat</p>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">Jl. Rawa Kutuk No. 31, Pondok Jagung Timur, Tangerang Selatan 15324</p>
          </div>
          <div className="py-6 sm:px-8">
            <div className="flex items-center gap-1.5 mb-2">
              <Phone className="w-3.5 h-3.5 text-berlin-navy" />
              <p className="spec-label text-gray-400">Telepon</p>
            </div>
            <a href="tel:081818818801" className="text-sm text-gray-700 dark:text-gray-300 font-sans hover:text-berlin-red transition-colors">0818 188 188 01</a>
          </div>
          <div className="py-6 sm:pl-8">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-berlin-navy" />
              <p className="spec-label text-gray-400">Jam Buka</p>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">Senin – Sabtu</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-sans">08.30 – 17.00 WIB</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-berlin-navy-light to-berlin-navy text-white rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-extrabold text-xl mb-1">Darurat? Butuh towing?</p>
            <p className="text-gray-400 text-sm">Telepon langsung — kami kirim mobil derek.</p>
          </div>
          <a href="tel:081818818801" className="bg-berlin-red hover:bg-berlin-red/90 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer inline-flex items-center gap-2 shrink-0">
            <Phone className="w-4 h-4" /> 0818 188 188 01
          </a>
        </div>

        <div className="text-center mt-16 space-y-2">
          <p className="spec-label text-gray-400">&copy; 2026 Berlin 188 Garage</p>
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer" onClick={() => setLightbox(null)}><X className="w-6 h-6" /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" referrerPolicy="no-referrer" />
        </div>
      )}
    </div>
  );
}
