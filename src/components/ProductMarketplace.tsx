import React, { useState, useMemo } from 'react';
import {
  MagnifyingGlass, ShoppingCart, CaretLeft, CaretRight, X, Package, SlidersHorizontal, Heart, ChatCircle, Sparkle,
} from '@phosphor-icons/react';
import { PRODUCTS, CATEGORIES, Product } from '../data/products';
import ProductCard from './ProductCard';
import CartDrawer from './CartDrawer';
import WishlistDrawer from './WishlistDrawer';
import AiChat from './AiChat';
import ThemeToggle from './ThemeToggle';
import CurveAccent from './CurveAccent';
import { useWishlist } from '../lib/wishlist';
import { useTheme } from '../lib/theme';
import { useCountUp } from '../lib/useCountUp';

const PAGE_SIZE = 12;
const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

export default function ProductMarketplace() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'default' | 'price_asc' | 'price_desc'>('default');
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<Product[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const { ids: wishlistIds, isWishlisted, toggle: toggleWishlist, remove: removeFromWishlist } = useWishlist();
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? '/logo.png' : '/logo-on-white.png';
  const wishlistItems = useMemo(() => PRODUCTS.filter(p => wishlistIds.includes(p.id)), [wishlistIds]);

  const brands = useMemo(() => Array.from(new Set(PRODUCTS.map(p => p.brand))).sort(), []);
  const productCount = useCountUp(PRODUCTS.length);
  const categoryCount = useCountUp(CATEGORIES.length);
  const brandCount = useCountUp(brands.length);

  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (category) list = list.filter(p => p.category === category);
    if (brand) list = list.filter(p => p.brand === brand);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    if (sortOrder === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sortOrder === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [search, category, brand, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addToCart = (p: Product) => {
    setCart(prev => prev.find(i => i.id === p.id) ? prev : [...prev, p]);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p.id !== id));
  };

  const inCart = (id: string) => cart.some(p => p.id === id);

  const moveToCart = (p: Product) => {
    addToCart(p);
    removeFromWishlist(p.id);
  };

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PRODUCTS.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, []);

  const FilterContent = () => (
    <div className="space-y-1">
      <button
        onClick={() => { setCategory(null); setPage(1); setShowMobileFilter(false); }}
        className={`w-full text-left px-3 py-2 rounded-lg spec-label transition-colors cursor-pointer flex items-center justify-between ${!category ? 'bg-berlin-navy text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]'}`}
      >
        <span>Semua Kategori</span>
        <span className={`text-[11px] font-sans font-semibold ${!category ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>{PRODUCTS.length}</span>
      </button>
      {CATEGORIES.map(cat => {
        const count = categoryCounts[cat] || 0;
        const active = category === cat;
        return (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1); setShowMobileFilter(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg spec-label normal-case tracking-normal font-semibold transition-colors cursor-pointer flex items-center justify-between ${active ? 'bg-berlin-navy text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]'}`}
          >
            <span>{cat}</span>
            <span className={`text-[11px] font-sans font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20 text-white/80' : 'bg-gray-100 dark:bg-[#22252c] text-gray-400 dark:text-gray-500'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* Header */}
      <div className="bg-white/95 dark:bg-[#1a1d23]/95 backdrop-blur border-b border-gray-100 dark:border-[#2a2d35] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center">
              <img src={logoSrc} alt="Berlin 188 Garage" className="h-9 object-contain" />
            </a>
            <span className="hidden sm:inline w-px h-5 bg-gray-200" />
            <span className="hidden sm:inline text-xs font-semibold text-gray-500 dark:text-gray-400">Toko Sparepart</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="relative hidden sm:block">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" weight="duotone" />
              <input
                type="text"
                placeholder="Cari part atau kode..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-56 pl-9 pr-3 py-2 bg-white dark:bg-[#22252c] border border-gray-300 dark:border-[#2a2d35] rounded-xl text-sm focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 dark:text-gray-100 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" weight="duotone" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowWishlist(true)}
              className="relative w-9 h-9 rounded-xl bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] hover:border-gray-300 dark:hover:border-[#3a3d45] hover:bg-gray-50 dark:hover:bg-[#2a2d35] flex items-center justify-center cursor-pointer transition-colors"
            >
              <Heart className="w-4 h-4 text-gray-600 dark:text-gray-400" weight="duotone" />
              {wishlistItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-berlin-red text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                  {wishlistItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCart(true)}
              className="relative w-9 h-9 rounded-xl bg-white dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] hover:border-gray-300 dark:hover:border-[#3a3d45] hover:bg-gray-50 dark:hover:bg-[#2a2d35] flex items-center justify-center cursor-pointer transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-400" weight="duotone" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-berlin-red text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowChat(true)}
              className="relative w-9 h-9 rounded-xl bg-berlin-navy dark:bg-berlin-gold hover:bg-berlin-navy-dark dark:hover:bg-berlin-gold-light text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <Sparkle className="w-4 h-4" weight="duotone" />
            </button>
            <button
              onClick={() => setShowMobileFilter(true)}
              className="sm:hidden w-9 h-9 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-600" weight="duotone" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden px-6 py-3 border-b border-gray-50 dark:border-[#2a2d35]">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" weight="duotone" />
          <input
            type="text"
            placeholder="Cari part atau kode..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-xl text-sm dark:text-gray-100 focus:outline-none focus:border-gray-400 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
              <X className="w-3.5 h-3.5 text-gray-400" weight="duotone" />
            </button>
          )}
        </div>
      </div>

      {/* Hero band — live spec-plate */}
      <div className="bg-berlin-navy-light relative overflow-hidden">
        <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full border-[3px] border-berlin-red/30 pointer-events-none" />
        <div className="absolute -right-4 top-8 w-40 h-40 rounded-full border-[3px] border-white/10 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 py-10 sm:py-12">
          <p className="spec-label text-white/60 mb-2">Sparepart &amp; Aksesoris</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight max-w-lg">
            Part asli mobil Eropa, harga bengkel &mdash; bisa nego langsung.
          </h1>
          <div className="flex gap-8 mt-7">
            <div>
              <p className="text-2xl font-sans font-bold text-white tabular-nums">{productCount}</p>
              <p className="spec-label text-white/50 mt-0.5">Part Siap Kirim</p>
            </div>
            <div>
              <p className="text-2xl font-sans font-bold text-white tabular-nums">{categoryCount}</p>
              <p className="spec-label text-white/50 mt-0.5">Kategori</p>
            </div>
            <div>
              <p className="text-2xl font-sans font-bold text-white tabular-nums">{brandCount}</p>
              <p className="spec-label text-white/50 mt-0.5">Merek</p>
            </div>
          </div>
        </div>
      </div>

      {/* Brand filter */}
      <div className="relative border-b border-gray-100 dark:border-[#2a2d35]">
        <div className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => { setBrand(null); setPage(1); }}
            className={`relative spec-label py-3 whitespace-nowrap transition-colors cursor-pointer ${!brand ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            Semua Merek
            <CurveAccent active={!brand} />
          </button>
          {brands.map(b => (
            <button
              key={b}
              onClick={() => { setBrand(b); setPage(1); }}
              className={`relative spec-label py-3 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${brand === b ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              {b}
              <CurveAccent active={brand === b} />
            </button>
          ))}
          <div className="shrink-0 w-2" aria-hidden="true" />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white dark:from-gray-950 to-transparent pointer-events-none" />
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">

          {/* Sidebar filter — desktop */}
          <div className="hidden sm:block">
            <div className="sticky top-20">
              <p className="spec-label text-gray-400 mb-3">Kategori</p>
              <FilterContent />
            </div>
          </div>

          {/* Product grid */}
          <div className="sm:col-span-3">
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" weight="duotone" />
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Produk tidak ditemukan</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Coba kata kunci atau kategori lain</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                      {[brand, category].filter(Boolean).join(' · ') || 'Semua Produk'}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">&middot; {filtered.length} produk</span>
                    {(category || brand) && (
                      <button onClick={() => { setCategory(null); setBrand(null); }} className="text-[10px] text-berlin-red hover:underline cursor-pointer ml-1">
                        hapus filter
                      </button>
                    )}
                  </div>
                  <select
                    value={sortOrder}
                    onChange={e => { setSortOrder(e.target.value as typeof sortOrder); setPage(1); }}
                    className="bg-white dark:bg-[#22252c] border border-gray-300 dark:border-[#2a2d35] rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:border-berlin-navy dark:text-gray-100 cursor-pointer transition-colors"
                  >
                    <option value="default">Urutan Default</option>
                    <option value="price_asc">Harga Terendah</option>
                    <option value="price_desc">Harga Tertinggi</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paged.map((p: Product) => (
                    <ProductCard key={p.id} product={p} onAdd={addToCart} onDetail={setDetail} inCart={inCart(p.id)} wishlisted={isWishlisted(p.id)} onToggleWishlist={toggleWishlist} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-10">
                    <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default">
                      <CaretLeft className="w-3.5 h-3.5" weight="duotone" />
                    </button>
                    {getPageNumbers().map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="w-7 h-8 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 select-none">&hellip;</span>
                      ) : (
                        <button key={p} onClick={() => handlePageChange(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums ${p === page ? 'bg-berlin-navy text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]'}`}>
                          {p}
                        </button>
                      )
                    )}
                    <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default">
                      <CaretRight className="w-3.5 h-3.5" weight="duotone" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter modal */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowMobileFilter(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1a1d23] rounded-t-2xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-extrabold text-gray-900 dark:text-white">Kategori</p>
              <button onClick={() => setShowMobileFilter(false)} className="cursor-pointer"><X className="w-5 h-5 text-gray-400" weight="duotone" /></button>
            </div>
            <FilterContent />
          </div>
        </div>
      )}

      {/* Product detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative bg-white dark:bg-[#1a1d23] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => toggleWishlist(detail.id)}
                className="w-8 h-8 rounded-lg bg-white/90 dark:bg-[#22252c]/90 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-[#22252c]"
              >
                <Heart className={`w-4 h-4 ${isWishlisted(detail.id) ? 'text-berlin-red fill-berlin-red' : 'text-gray-600 dark:text-gray-400'}`} weight="duotone" />
              </button>
              <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-lg bg-white/90 dark:bg-[#22252c]/90 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-[#22252c]">
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" weight="duotone" />
              </button>
            </div>
            <div className="aspect-[4/3] bg-gray-50 dark:bg-[#22252c] overflow-hidden">
              <img src={detail.fullImage || detail.image} alt={detail.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 font-sans mb-1">{detail.code}</p>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{detail.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{detail.brand}</p>
              </div>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-[#22252c] rounded-xl p-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Harga</span>
                <span className="text-2xl font-black text-berlin-navy dark:text-berlin-gold tabular-nums">{fmt(detail.price)}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-gray-500">Kompatibilitas</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium text-right max-w-[60%]">{detail.compatibility}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-gray-500">Kategori</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{detail.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-gray-500">Stok</span>
                  <span className={`font-medium ${detail.stock <= 3 ? 'text-berlin-red' : 'text-emerald-600'}`}>
                    {detail.stock <= 3 ? `Tersisa ${detail.stock}` : `Tersedia (${detail.stock})`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { addToCart(detail); setDetail(null); }}
                className={`w-full font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  inCart(detail.id)
                    ? 'bg-gray-100 dark:bg-[#22252c] text-gray-500 dark:text-gray-400'
                    : 'bg-berlin-navy hover:bg-berlin-navy-dark text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" weight="duotone" />
                {inCart(detail.id) ? 'Sudah di keranjang' : 'Tambah ke Keranjang'}
              </button>
              <a
                href={`https://wa.me/6285156010707?text=${encodeURIComponent(`Halo Berlin 188, saya mau tanya soal part ini:\n${detail.name} (${detail.code}) — ${fmt(detail.price)}\n\nMasih ada stok? Terima kasih.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <ChatCircle className="w-4 h-4" weight="duotone" /> Tanya via WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <CartDrawer cart={cart} onRemove={removeFromCart} onClose={() => setShowCart(false)} />
      )}

      {/* Wishlist drawer */}
      {showWishlist && (
        <WishlistDrawer items={wishlistItems} onRemove={removeFromWishlist} onMoveToCart={moveToCart} onClose={() => setShowWishlist(false)} />
      )}

      {/* AI Chat drawer */}
      {showChat && (
        <AiChat products={PRODUCTS} onClose={() => setShowChat(false)} onSelectProduct={setDetail} />
      )}

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-[#2a2d35] py-8 px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="" className="h-6 object-contain" />
            <span className="font-extrabold text-xs text-berlin-navy dark:text-white">BERLIN <span className="text-berlin-red">188</span> <span className="font-light text-gray-400 dark:text-gray-500">GARAGE</span></span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Sparepart asli & aftermarket berkualitas untuk mobil Eropa. Harga bengkel, bisa nego.</p>
        </div>
      </div>
    </div>
  );
}
