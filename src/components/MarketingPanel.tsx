import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Image, Star, Layout, Upload, Save, Loader2, Trash2, Plus, FileText, Eye, EyeOff, Pencil } from 'lucide-react';
import { Order, HeroContent, PortfolioItem, User, BlogPost } from '../types';
import { BRANDS } from './LandingPage';
import { BLOG_CATEGORIES } from './BlogListPage';
import BlogEditor from './BlogEditor';
import {
  fetchAllBlogPosts, generateUniqueBlogSlug, createBlogPost, updateBlogPost,
  publishBlogPost, unpublishBlogPost, deleteBlogPost, uploadLandingAsset,
} from '../lib/db';

const SERVICE_TYPES: PortfolioItem['serviceType'][] = ['Servis Rutin', 'Perbaikan Mesin', 'Kelistrikan', 'Kaki-Kaki', 'Restorasi'];

interface MarketingPanelProps {
  orders: Order[];
  heroContent?: HeroContent | null;
  onUpdateHeroContent?: (fields: Partial<HeroContent>) => void;
  onUploadHeroImage?: (file: File) => Promise<string>;
  portfolioItems?: PortfolioItem[];
  onAddPortfolioItem?: (item: Omit<PortfolioItem, 'id' | 'createdAt'>) => void;
  onDeletePortfolioItem?: (id: string) => void;
  onUploadPortfolioImage?: (file: File) => Promise<string>;
  activeUser?: User | null;
}

type PanelTab = 'galeri' | 'banner' | 'portofolio' | 'blog';

export default function MarketingPanel({ orders, heroContent, onUpdateHeroContent, onUploadHeroImage, portfolioItems = [], onAddPortfolioItem, onDeletePortfolioItem, onUploadPortfolioImage, activeUser }: MarketingPanelProps) {
  const [panelTab, setPanelTab] = useState<PanelTab>('galeri');
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

  // --- Banner Beranda (hero landing page) ---
  const [heroHeadline, setHeroHeadline] = useState(heroContent?.headline || '');
  const [heroSubtitle, setHeroSubtitle] = useState(heroContent?.subtitle || '');
  const [heroCta, setHeroCta] = useState(heroContent?.ctaText || '');
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [heroInitialized, setHeroInitialized] = useState(false);

  // Sinkron form sekali begitu heroContent asli kefetch dari server (nggak
  // nimpa terus tiap render biar nggak ilangin ketikan yang lagi diedit).
  useEffect(() => {
    if (!heroInitialized && heroContent) {
      setHeroInitialized(true);
      setHeroHeadline(heroContent.headline);
      setHeroSubtitle(heroContent.subtitle);
      setHeroCta(heroContent.ctaText);
    }
  }, [heroContent, heroInitialized]);

  const handleHeroImagePick = (file: File) => {
    setHeroImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setHeroImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveHero = async () => {
    if (!onUpdateHeroContent) return;
    setIsSavingHero(true);
    try {
      let backgroundImageUrl = heroContent?.backgroundImageUrl;
      if (heroImageFile && onUploadHeroImage) {
        backgroundImageUrl = await onUploadHeroImage(heroImageFile);
      }
      onUpdateHeroContent({ headline: heroHeadline, subtitle: heroSubtitle, ctaText: heroCta, backgroundImageUrl });
      setHeroImageFile(null);
    } catch (err) {
      console.error('Gagal upload gambar banner:', err);
      alert('Gagal upload gambar banner. Coba lagi.');
    } finally {
      setIsSavingHero(false);
    }
  };

  // --- Portofolio Beranda (galeri publik manual) ---
  const [pfBrand, setPfBrand] = useState(BRANDS[0]);
  const [pfModel, setPfModel] = useState('');
  const [pfServiceType, setPfServiceType] = useState<PortfolioItem['serviceType']>(SERVICE_TYPES[0]);
  const [pfDescription, setPfDescription] = useState('');
  const [pfImageFile, setPfImageFile] = useState<File | null>(null);
  const [pfImagePreview, setPfImagePreview] = useState<string | null>(null);
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false);

  const handlePortfolioImagePick = (file: File) => {
    setPfImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPfImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetPortfolioForm = () => {
    setPfBrand(BRANDS[0]);
    setPfModel('');
    setPfServiceType(SERVICE_TYPES[0]);
    setPfDescription('');
    setPfImageFile(null);
    setPfImagePreview(null);
  };

  const handleAddPortfolio = async () => {
    if (!onAddPortfolioItem || !onUploadPortfolioImage) return;
    if (!pfModel.trim() || !pfDescription.trim() || !pfImageFile) {
      alert('Model mobil, deskripsi kerjaan, dan foto wajib diisi.');
      return;
    }
    setIsSavingPortfolio(true);
    try {
      const imageUrl = await onUploadPortfolioImage(pfImageFile);
      onAddPortfolioItem({
        carBrand: pfBrand,
        carModel: pfModel.trim(),
        serviceType: pfServiceType,
        workDescription: pfDescription.trim(),
        imageUrl,
        createdBy: activeUser?.name,
      });
      resetPortfolioForm();
    } catch (err) {
      console.error('Gagal upload gambar portofolio:', err);
      alert('Gagal upload gambar portofolio. Coba lagi.');
    } finally {
      setIsSavingPortfolio(false);
    }
  };

  const handleDeletePortfolio = (id: string) => {
    if (!onDeletePortfolioItem) return;
    if (!confirm('Hapus item portofolio ini dari beranda?')) return;
    onDeletePortfolioItem(id);
  };

  // --- Blog ---
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoadingBlog, setIsLoadingBlog] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogCategory, setBlogCategory] = useState<BlogPost['category']>(BLOG_CATEGORIES[0]);
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogCoverFile, setBlogCoverFile] = useState<File | null>(null);
  const [blogCoverPreview, setBlogCoverPreview] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [isSavingBlog, setIsSavingBlog] = useState(false);
  const [blogEditorKey, setBlogEditorKey] = useState(0);

  const loadBlogPosts = useCallback(() => {
    setIsLoadingBlog(true);
    fetchAllBlogPosts()
      .then(setBlogPosts)
      .catch(err => console.error('Failed to load blog posts:', err))
      .finally(() => setIsLoadingBlog(false));
  }, []);

  const hasLoadedBlog = useRef(false);
  useEffect(() => {
    if (panelTab === 'blog' && !hasLoadedBlog.current) {
      hasLoadedBlog.current = true;
      loadBlogPosts();
    }
  }, [panelTab, loadBlogPosts]);

  const resetBlogForm = () => {
    setEditingBlogId(null);
    setBlogTitle('');
    setBlogCategory(BLOG_CATEGORIES[0]);
    setBlogExcerpt('');
    setBlogContent('');
    setBlogCoverFile(null);
    setBlogCoverPreview(null);
    setExistingCoverUrl(null);
    setBlogEditorKey(k => k + 1); // force BlogEditor to remount with fresh content
  };

  const startEditBlog = (post: BlogPost) => {
    setEditingBlogId(post.id);
    setBlogTitle(post.title);
    setBlogCategory(post.category);
    setBlogExcerpt(post.excerpt);
    setBlogContent(post.content);
    setBlogCoverFile(null);
    setBlogCoverPreview(null);
    setExistingCoverUrl(post.coverImageUrl);
    setBlogEditorKey(k => k + 1);
  };

  const handleBlogCoverPick = (file: File) => {
    setBlogCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setBlogCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadBlogInlineImage = async (file: File): Promise<string> => {
    return uploadLandingAsset(file, 'blog');
  };

  const showNotificationLocal = (msg: string) => alert(msg);

  const handleSaveBlog = async (publish: boolean) => {
    if (!blogTitle.trim() || !blogExcerpt.trim() || !blogContent.trim()) {
      alert('Judul, ringkasan, dan isi artikel wajib diisi.');
      return;
    }
    if (!blogCoverFile && !existingCoverUrl) {
      alert('Cover image wajib diupload.');
      return;
    }

    const existingPost = editingBlogId ? blogPosts.find(p => p.id === editingBlogId) : undefined;
    const wasPublished = existingPost?.status === 'published';
    if (editingBlogId && !publish && wasPublished) {
      // Confirm BEFORE any write happens — declining here must cancel the
      // entire save (content edits included), not just the unpublish step.
      if (!confirm('Artikel ini sedang tayang. Simpan sebagai draft akan menurunkannya dari halaman publik. Lanjutkan?')) {
        return;
      }
    }

    setIsSavingBlog(true);
    try {
      const coverImageUrl = blogCoverFile ? await uploadLandingAsset(blogCoverFile, 'blog-cover') : existingCoverUrl!;

      if (editingBlogId) {
        await updateBlogPost(editingBlogId, {
          title: blogTitle.trim(),
          excerpt: blogExcerpt.trim(),
          content: blogContent,
          coverImageUrl,
          category: blogCategory,
        });
        if (publish && !wasPublished) {
          await publishBlogPost(editingBlogId, !!existingPost?.publishedAt);
        } else if (!publish && wasPublished) {
          await unpublishBlogPost(editingBlogId);
        }
      } else {
        const slug = await generateUniqueBlogSlug(blogTitle.trim());
        await createBlogPost({
          title: blogTitle.trim(),
          slug,
          excerpt: blogExcerpt.trim(),
          content: blogContent,
          coverImageUrl,
          category: blogCategory,
          status: publish ? 'published' : 'draft',
          createdBy: activeUser?.name,
        });
      }

      showNotificationLocal(publish ? '✅ Artikel dipublish.' : '✅ Draft disimpan.');
      resetBlogForm();
      loadBlogPosts();
    } catch (err) {
      console.error('Gagal menyimpan artikel:', err);
      alert('Gagal menyimpan artikel. Coba lagi.');
    } finally {
      setIsSavingBlog(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      if (post.status === 'published') await unpublishBlogPost(post.id);
      else await publishBlogPost(post.id, !!post.publishedAt);
      loadBlogPosts();
    } catch (err) {
      console.error('Gagal mengubah status artikel:', err);
      alert('Gagal mengubah status artikel. Coba lagi.');
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm('Hapus artikel ini? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      await deleteBlogPost(id);
      if (editingBlogId === id) resetBlogForm();
      loadBlogPosts();
    } catch (err) {
      console.error('Gagal menghapus artikel:', err);
      alert('Gagal menghapus artikel. Coba lagi.');
    }
  };

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

      {/* Tab switcher */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { id: 'galeri' as const, label: 'Galeri & Portofolio', icon: Image },
          { id: 'banner' as const, label: 'Banner Beranda', icon: Layout },
          { id: 'portofolio' as const, label: 'Portofolio Beranda', icon: Star },
          { id: 'blog' as const, label: 'Blog', icon: FileText },
        ]).map(t => (
          <button key={t.id} onClick={() => setPanelTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              panelTab === t.id ? 'bg-white text-berlin-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {panelTab === 'banner' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Edit Banner Beranda</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Judul (Headline)</label>
                <textarea
                  value={heroHeadline}
                  onChange={e => setHeroHeadline(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Subjudul</label>
                <textarea
                  value={heroSubtitle}
                  onChange={e => setHeroSubtitle(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Teks Tombol</label>
                <input
                  type="text"
                  value={heroCta}
                  onChange={e => setHeroCta(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Gambar Latar (opsional)</label>
                <p className="text-[10px] text-gray-400">Kalau diisi, gantiin video mobil di beranda jadi gambar ini. Kosongkan buat pakai video default.</p>
                <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-lg py-4 cursor-pointer hover:bg-gray-50 transition-colors text-xs text-gray-500 font-semibold">
                  <Upload className="w-4 h-4" /> Pilih Gambar
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroImagePick(f); }} />
                </label>
              </div>
              <button
                onClick={handleSaveHero}
                disabled={isSavingHero}
                className="w-full flex items-center justify-center gap-1.5 bg-berlin-navy hover:bg-berlin-navy/90 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {isSavingHero ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSavingHero ? 'Menyimpan...' : 'Simpan Banner'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-sm relative min-h-[360px] flex flex-col justify-end p-6">
            {(heroImagePreview || heroContent?.backgroundImageUrl) && (
              <img
                src={heroImagePreview || heroContent?.backgroundImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-berlin-navy via-berlin-navy/40 to-transparent" />
            <div className="relative z-10 space-y-3">
              <span className="text-[9px] uppercase tracking-widest text-white/50 font-bold">Preview Beranda</span>
              <h2 className="text-2xl font-extrabold text-white leading-tight">{heroHeadline || 'Judul banner...'}</h2>
              <p className="text-gray-300 text-xs">{heroSubtitle || 'Subjudul banner...'}</p>
              <span className="inline-block bg-berlin-red text-white font-semibold px-3 py-1.5 rounded-lg text-[10px]">
                {heroCta || 'Tombol'}
              </span>
            </div>
          </div>
        </div>
      )}

      {panelTab === 'portofolio' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Tambah Portofolio</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Merek</label>
                <select
                  value={pfBrand}
                  onChange={e => setPfBrand(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors"
                >
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Model</label>
                <input
                  type="text"
                  value={pfModel}
                  onChange={e => setPfModel(e.target.value)}
                  placeholder="Cth: C-Class W205"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Tipe Servis</label>
                <select
                  value={pfServiceType}
                  onChange={e => setPfServiceType(e.target.value as PortfolioItem['serviceType'])}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors"
                >
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Deskripsi Kerjaan</label>
                <textarea
                  value={pfDescription}
                  onChange={e => setPfDescription(e.target.value)}
                  rows={2}
                  placeholder="Cth: Overhaul mesin + ganti timing chain"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Foto Hasil Kerja</label>
                <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-lg py-4 cursor-pointer hover:bg-gray-50 transition-colors text-xs text-gray-500 font-semibold">
                  <Upload className="w-4 h-4" /> {pfImageFile ? pfImageFile.name : 'Pilih Foto (wajib)'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePortfolioImagePick(f); }} />
                </label>
              </div>
              <button
                onClick={handleAddPortfolio}
                disabled={isSavingPortfolio}
                className="w-full flex items-center justify-center gap-1.5 bg-berlin-navy hover:bg-berlin-navy/90 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {isSavingPortfolio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {isSavingPortfolio ? 'Menyimpan...' : 'Tambah ke Beranda'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Portofolio Aktif ({portfolioItems.length})</h4>
            {portfolioItems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada portofolio yang ditambahkan.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {portfolioItems.map(item => (
                  <div key={item.id} className="group relative rounded-xl overflow-hidden border border-gray-200 aspect-[4/3] bg-gray-100">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <p className="text-white text-[10px] font-bold leading-tight">{item.carBrand} {item.carModel}</p>
                      <p className="text-white/70 text-[9px] mt-0.5 truncate">{item.workDescription}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePortfolio(item.id)}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white text-berlin-red p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {panelTab === 'blog' && (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              {editingBlogId ? 'Edit Artikel' : 'Tulis Artikel Baru'}
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Judul</label>
                <input type="text" value={blogTitle} onChange={e => setBlogTitle(e.target.value)}
                  placeholder="Cth: 5 Tanda Timing Belt Perlu Diganti"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Kategori</label>
                <select value={blogCategory} onChange={e => setBlogCategory(e.target.value as BlogPost['category'])}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors">
                  {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Ringkasan</label>
                <textarea value={blogExcerpt} onChange={e => setBlogExcerpt(e.target.value)} rows={2}
                  placeholder="1-2 kalimat buat card & preview link"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3.5 text-xs text-gray-800 focus:outline-none focus:border-berlin-navy transition-colors resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Cover Image</label>
                <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-lg py-4 cursor-pointer hover:bg-gray-50 transition-colors text-xs text-gray-500 font-semibold">
                  <Upload className="w-4 h-4" /> {blogCoverFile ? blogCoverFile.name : existingCoverUrl ? 'Ganti cover (opsional)' : 'Pilih Cover (wajib)'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleBlogCoverPick(f); }} />
                </label>
                {(blogCoverPreview || existingCoverUrl) && (
                  <img src={blogCoverPreview || existingCoverUrl!} alt="" className="mt-2 w-full aspect-[16/9] object-cover rounded-lg border border-gray-200" />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Isi Artikel</label>
                <BlogEditor key={blogEditorKey} content={blogContent} onChange={setBlogContent} onUploadImage={handleUploadBlogInlineImage} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSaveBlog(false)} disabled={isSavingBlog}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  {isSavingBlog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan Draft
                </button>
                <button onClick={() => handleSaveBlog(true)} disabled={isSavingBlog}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-berlin-navy hover:bg-berlin-navy/90 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  {isSavingBlog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  Publish
                </button>
              </div>
              {editingBlogId && (
                <button onClick={resetBlogForm} className="w-full text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer">
                  Batal edit, tulis artikel baru
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Semua Artikel ({blogPosts.length})</h4>
            {isLoadingBlog ? (
              <p className="text-xs text-gray-400 text-center py-8">Memuat...</p>
            ) : blogPosts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada artikel.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {blogPosts.map(post => (
                  <div key={post.id} className="flex items-center gap-3 border border-gray-150 rounded-xl p-3 hover:border-gray-300 transition-colors">
                    <img src={post.coverImageUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          post.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>{post.status === 'published' ? 'Published' : 'Draft'}</span>
                        <span className="text-[9px] text-gray-400">{post.category}</span>
                      </div>
                      <p className="font-bold text-xs text-gray-900 truncate mt-0.5">{post.title}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleTogglePublish(post)} title={post.status === 'published' ? 'Jadikan draft' : 'Publish'}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors">
                        {post.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => startEditBlog(post)} title="Edit"
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteBlog(post.id)} title="Hapus"
                        className="p-1.5 rounded-lg text-berlin-red hover:bg-red-50 cursor-pointer transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {panelTab === 'galeri' && (
      <>
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
                      <span className="font-sans text-[10px] font-bold text-gray-500">{o.id}</span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold uppercase">SELESAI</span>
                    </div>
                    <h5 className="font-bold text-gray-900 text-sm">{o.carBrand} {o.carModel}</h5>
                    <p className="text-[10px] text-gray-500">{o.serviceType} · {o.plateNumber}</p>
                    <p className="text-[11px] text-gray-600 italic">"{o.complaint}"</p>
                  </div>
                  <span className="text-[9px] text-gray-400 font-sans shrink-0">{new Date(o.createdAt).toLocaleDateString('id-ID')}</span>
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
      </>
      )}
    </div>
  );
}
