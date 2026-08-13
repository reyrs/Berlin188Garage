import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, ArrowRight, X, Wrench, Cog, Zap, CircleDot } from 'lucide-react';
import { HeroContent, PortfolioItem, BlogPost } from '@shared/types';
import ThemeToggle from '@shared/components/ThemeToggle';
import CurveAccent from '@shared/components/CurveAccent';
import { JASA_BY_CATEGORY } from '../data/jasaCatalog';

interface OtomotifNewsItem {
  title: string;
  link: string;
  pubDate: string;
  image: string | null;
}

const ADDRESS = 'Jl. Rawa Kutuk No. 31, Pondok Jagung Timur, Tangerang Selatan 15324';
const MAPS_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;
const MAPS_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`;

const JASA_CATEGORY_ICON: Record<string, typeof Wrench> = {
  'Servis Rutin': Wrench,
  'Perbaikan Mesin': Cog,
  'Kelistrikan': Zap,
  'Kaki-Kaki': CircleDot,
};

// Placeholder — foto Unsplash (lisensi gratis) sampai marketing kirim foto
// asli hasil kerja Berlin 188 buat gantiin ini per kategori.
const JASA_CATEGORY_IMAGE: Record<string, string> = {
  'Servis Rutin': 'https://images.unsplash.com/photo-1643700973089-baa86a1ab9ee?auto=format&fit=crop&q=80&w=800',
  'Perbaikan Mesin': 'https://images.unsplash.com/photo-1585225207578-919849288a18?auto=format&fit=crop&q=80&w=800',
  'Kelistrikan': 'https://images.unsplash.com/photo-1597766325363-f5576d851d6a?auto=format&fit=crop&q=80&w=800',
  'Kaki-Kaki': 'https://images.unsplash.com/photo-1645445522156-9ac06bc7a767?auto=format&fit=crop&q=80&w=800',
};

interface LandingPageProps {
  onCheckOrder: () => void;
  onOpenMarketplace?: () => void;
  heroContent?: HeroContent | null;
  portfolioItems?: PortfolioItem[];
  recentBlogPosts?: BlogPost[];
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

export default function LandingPage({ onCheckOrder, onOpenMarketplace, heroContent, portfolioItems = [], recentBlogPosts = [] }: LandingPageProps) {
  const hero = heroContent || DEFAULT_HERO;
  const [filter, setFilter] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [industryNews, setIndustryNews] = useState<OtomotifNewsItem[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = filter ? portfolioItems.filter(i => i.carBrand === filter) : portfolioItems;

  useEffect(() => {
    fetch('/api/otomotif-news')
      .then(r => r.json())
      .then(data => setIndustryNews(data.items || []))
      .catch(err => console.error('Failed to load industry news:', err));
  }, []);

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

      {/* LAYANAN */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-10">
          <p className="spec-label text-gray-400 mb-2">Layanan</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-berlin-navy dark:text-white tracking-tight">Yang bisa kami kerjakan</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xl">
            Biaya ditentukan dari diagnosis kondisi mobil Anda, bukan tarif tetap — konsultasi dulu, baru kami kasih estimasi sebelum mulai kerja.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Object.entries(JASA_BY_CATEGORY).map(([category, items]) => {
            const Icon = JASA_CATEGORY_ICON[category] || Wrench;
            return (
              <div key={category} className="rounded-xl border border-gray-150 dark:border-[#2a2d35] overflow-hidden bg-white dark:bg-[#1a1d23]">
                <div className="aspect-[4/3] bg-gray-100 dark:bg-[#22252c] relative">
                  <img src={JASA_CATEGORY_IMAGE[category]} alt={category} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute bottom-2 left-2 w-9 h-9 rounded-lg bg-white/90 dark:bg-[#1a1d23]/90 backdrop-blur flex items-center justify-center">
                    <Icon className="w-4 h-4 text-berlin-navy dark:text-berlin-gold" />
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">{category}</h3>
                  <ul className="space-y-1.5">
                    {items.map(name => (
                      <li key={name} className="text-xs text-gray-500 dark:text-gray-400">{name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        <a
          href={`https://wa.me/6281319438602?text=${encodeURIComponent('Halo Berlin 188, saya mau tanya soal layanan servis untuk mobil saya.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 bg-berlin-navy hover:bg-berlin-navy-dark text-white font-bold text-sm px-5 py-3 rounded-xl transition-colors cursor-pointer"
        >
          Konsultasi Servis via WhatsApp <ArrowRight className="w-4 h-4" />
        </a>
      </section>

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
                <img src={item.imageUrl} alt={`${item.carBrand} ${item.carModel} - ${item.workDescription}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" referrerPolicy="no-referrer" />
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

      {/* TREN INDUSTRI — headline eksternal, cuma judul+link keluar (bukan
          reproduksi artikel), sumber: feed publik detikOto difilter merek
          Eropa yang kami tangani */}
      {industryNews.length > 0 && (
        <section className="bg-gray-50 dark:bg-[#15171c] py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-10">
              <p className="spec-label text-gray-400 mb-2">Tren Industri</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-berlin-navy dark:text-white tracking-tight">Kabar mobil Eropa terbaru</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {industryNews.map(item => (
                <a key={item.link} href={item.link} target="_blank" rel="noopener noreferrer" className="group block">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 dark:bg-[#22252c] mb-3">
                    {item.image && (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" referrerPolicy="no-referrer" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white leading-snug group-hover:text-berlin-navy dark:group-hover:text-berlin-gold transition-colors line-clamp-3">{item.title}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">detikOto</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ARTIKEL TERBARU */}
      {recentBlogPosts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="spec-label text-gray-400 mb-2">Artikel</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-berlin-navy dark:text-white tracking-tight">Terbaru dari kami</h2>
            </div>
            <Link to="/blog" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-berlin-navy dark:text-berlin-gold hover:underline shrink-0">
              Lihat semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentBlogPosts.slice(0, 3).map(post => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-[#22252c] mb-3">
                  {post.coverImageUrl && (
                    <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" referrerPolicy="no-referrer" />
                  )}
                </div>
                <p className="spec-label text-berlin-red mb-1.5">{post.category}</p>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-snug group-hover:text-berlin-navy dark:group-hover:text-berlin-gold transition-colors">{post.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{post.excerpt}</p>
              </Link>
            ))}
          </div>
          <Link to="/blog" className="sm:hidden mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-berlin-navy dark:text-berlin-gold">
            Lihat semua artikel <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

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
            <a href={MAPS_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed hover:text-berlin-red transition-colors">{ADDRESS}</a>
          </div>
          <div className="py-6 sm:px-8">
            <div className="flex items-center gap-1.5 mb-2">
              <Phone className="w-3.5 h-3.5 text-berlin-navy" />
              <p className="spec-label text-gray-400">Telepon / WhatsApp</p>
            </div>
            <a
              href={`https://wa.me/6282112773501?text=${encodeURIComponent('Halo Berlin 188, saya mau tanya soal servis mobil saya.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-700 dark:text-gray-300 font-sans hover:text-berlin-red transition-colors"
            >
              0821 1277 3501
            </a>
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

        <div className="rounded-xl overflow-hidden border border-gray-150 dark:border-[#2a2d35] mb-6">
          <iframe
            src={MAPS_EMBED_SRC}
            title="Lokasi Berlin 188 Garage"
            className="w-full h-64 sm:h-80"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <a
          href={MAPS_DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-berlin-navy dark:text-berlin-gold hover:underline mb-12"
        >
          <MapPin className="w-3.5 h-3.5" /> Dapatkan Petunjuk Arah
        </a>

        <div className="bg-gradient-to-br from-berlin-navy-light to-berlin-navy text-white rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-extrabold text-xl mb-1">Darurat? Butuh towing?</p>
            <p className="text-gray-400 text-sm">Telepon langsung — kami kirim mobil derek.</p>
          </div>
          <a href="tel:082112773501" className="bg-berlin-red hover:bg-berlin-red/90 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer inline-flex items-center gap-2 shrink-0">
            <Phone className="w-4 h-4" /> 0821 1277 3501
          </a>
        </div>

        <div className="text-center mt-16 space-y-3">
          <div className="flex items-center justify-center gap-4">
            <a href="/privasi" className="spec-label text-gray-400 hover:text-berlin-navy dark:hover:text-white transition-colors">Kebijakan Privasi</a>
            <span className="text-gray-300 dark:text-gray-700">&middot;</span>
            <a href="/syarat" className="spec-label text-gray-400 hover:text-berlin-navy dark:hover:text-white transition-colors">Syarat & Ketentuan</a>
          </div>
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
