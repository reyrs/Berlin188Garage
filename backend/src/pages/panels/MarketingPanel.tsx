import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Image, Star, UploadSimple, FloppyDisk, CircleNotch, Trash, Plus, FileText, Eye, EyeSlash, PencilSimple, Megaphone } from '@phosphor-icons/react';
import { Order, PortfolioItem, User, BlogPost, PromoPopup } from '@shared/types';
import { BRANDS } from '../../components/LandingPage';
import { BLOG_CATEGORIES } from '../../components/BlogListPage';
import BlogEditor from '../../components/BlogEditor';
import {
  fetchAllBlogPosts, generateUniqueBlogSlug, createBlogPost, updateBlogPost,
  publishBlogPost, unpublishBlogPost, deleteBlogPost, uploadLandingAsset,
  fetchPromoPopup, updatePromoPopup,
} from '@shared/db';

const SERVICE_TYPES: PortfolioItem['serviceType'][] = ['Servis Rutin', 'Perbaikan Mesin', 'Kelistrikan', 'Kaki-Kaki', 'Restorasi'];

interface MarketingPanelProps {
  orders: Order[];
  portfolioItems?: PortfolioItem[];
  onAddPortfolioItem?: (item: Omit<PortfolioItem, 'id' | 'createdAt'>) => void;
  onDeletePortfolioItem?: (id: string) => void;
  onUploadPortfolioImage?: (file: File) => Promise<string>;
  onNotify?: (message: string) => void;
  activeUser?: User | null;
}

type PanelTab = 'galeri' | 'portofolio' | 'blog' | 'promo';

export default function MarketingPanel({ orders, portfolioItems = [], onAddPortfolioItem, onDeletePortfolioItem, onUploadPortfolioImage, onNotify, activeUser }: MarketingPanelProps) {
  const notify = onNotify || alert;
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

  // --- Portofolio Beranda (galeri publik manual) ---
  const [pfBrand, setPfBrand] = useState(BRANDS[0]);
  const [pfModel, setPfModel] = useState('');
  const [pfServiceType, setPfServiceType] = useState<PortfolioItem['serviceType']>(SERVICE_TYPES[0]);
  const [pfDescription, setPfDescription] = useState('');
  const [pfImageFile, setPfImageFile] = useState<File | null>(null);
  const [pfExistingImageUrl, setPfExistingImageUrl] = useState<string | null>(null);
  const [pfSourceOrderId, setPfSourceOrderId] = useState<string | null>(null);
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false);

  const handlePortfolioImagePick = (file: File) => {
    setPfImageFile(file);
    setPfExistingImageUrl(null);
    setPfSourceOrderId(null);
  };

  const resetPortfolioForm = () => {
    setPfBrand(BRANDS[0]);
    setPfModel('');
    setPfServiceType(SERVICE_TYPES[0]);
    setPfDescription('');
    setPfImageFile(null);
    setPfExistingImageUrl(null);
    setPfSourceOrderId(null);
  };

  // Draft portofolio dari WO yang udah selesai — marketing masih review/edit
  // teks & foto di form sebelum "Tambah ke Beranda", jadi gak ada yang
  // otomatis publish. Foto WO dipakai apa adanya (URL yang udah ke-upload
  // mekanik), gak perlu upload ulang.
  const useOrderAsPortfolioSeed = (order: Order, photoUrl: string) => {
    const completedWork = order.serviceItems.filter(i => i.completed).map(i => i.name).join(', ');
    setPfBrand(BRANDS.includes(order.carBrand) ? order.carBrand : BRANDS[0]);
    setPfModel(order.carModel);
    setPfServiceType(order.serviceType);
    setPfDescription(completedWork || order.complaints.join(', '));
    setPfImageFile(null);
    setPfExistingImageUrl(photoUrl);
    setPfSourceOrderId(order.id);
    setPanelTab('portofolio');
  };

  const handleAddPortfolio = async () => {
    if (!onAddPortfolioItem) return;
    if (!pfModel.trim() || !pfDescription.trim() || (!pfImageFile && !pfExistingImageUrl)) {
      notify('❌ Model mobil, deskripsi kerjaan, dan foto wajib diisi.');
      return;
    }
    setIsSavingPortfolio(true);
    try {
      const imageUrl = pfExistingImageUrl || (pfImageFile && onUploadPortfolioImage ? await onUploadPortfolioImage(pfImageFile) : null);
      if (!imageUrl) throw new Error('imageUrl missing');
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
      notify('❌ Gagal upload gambar portofolio. Coba lagi.');
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

  const handleSaveBlog = async (publish: boolean) => {
    if (!blogTitle.trim() || !blogExcerpt.trim() || !blogContent.trim()) {
      notify('❌ Judul, ringkasan, dan isi artikel wajib diisi.');
      return;
    }
    if (!blogCoverFile && !existingCoverUrl) {
      notify('❌ Cover image wajib diupload.');
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

      notify(publish ? '✅ Artikel dipublish.' : '✅ Draft disimpan.');
      resetBlogForm();
      loadBlogPosts();
    } catch (err) {
      console.error('Gagal menyimpan artikel:', err);
      notify('❌ Gagal menyimpan artikel. Coba lagi.');
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
      notify('❌ Gagal mengubah status artikel. Coba lagi.');
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
      notify('❌ Gagal menghapus artikel. Coba lagi.');
    }
  };

  // --- Promo Popup (landing page — muncul otomatis) ---
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoCtaText, setPromoCtaText] = useState('');
  const [promoCtaLink, setPromoCtaLink] = useState('');
  const [promoDelaySeconds, setPromoDelaySeconds] = useState(5);
  const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
  const [promoImagePreview, setPromoImagePreview] = useState<string | null>(null);
  const [existingPromoImageUrl, setExistingPromoImageUrl] = useState<string | null>(null);
  const [isLoadingPromo, setIsLoadingPromo] = useState(false);
  const [isSavingPromo, setIsSavingPromo] = useState(false);

  const hasLoadedPromo = useRef(false);
  useEffect(() => {
    if (panelTab !== 'promo' || hasLoadedPromo.current) return;
    hasLoadedPromo.current = true;
    setIsLoadingPromo(true);
    fetchPromoPopup()
      .then((promo: PromoPopup | null) => {
        if (!promo) return;
        setPromoEnabled(promo.enabled);
        setPromoTitle(promo.title);
        setPromoDescription(promo.description);
        setPromoCtaText(promo.ctaText);
        setPromoCtaLink(promo.ctaLink);
        setPromoDelaySeconds(promo.delaySeconds);
        setExistingPromoImageUrl(promo.imageUrl || null);
      })
      .catch(err => console.error('Gagal memuat promo popup:', err))
      .finally(() => setIsLoadingPromo(false));
  }, [panelTab]);

  const handlePromoImagePick = (file: File) => {
    setPromoImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPromoImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSavePromo = async () => {
    if (promoEnabled && (!promoTitle.trim() || !promoDescription.trim())) {
      notify('❌ Judul dan deskripsi wajib diisi kalau popup mau diaktifkan.');
      return;
    }
    setIsSavingPromo(true);
    try {
      const imageUrl = promoImageFile ? await uploadLandingAsset(promoImageFile, 'promo') : (existingPromoImageUrl || undefined);
      await updatePromoPopup({
        enabled: promoEnabled,
        imageUrl,
        title: promoTitle.trim(),
        description: promoDescription.trim(),
        ctaText: promoCtaText.trim(),
        ctaLink: promoCtaLink.trim(),
        delaySeconds: promoDelaySeconds,
      }, activeUser?.name || 'Marketing');
      if (imageUrl) setExistingPromoImageUrl(imageUrl);
      setPromoImageFile(null);
      setPromoImagePreview(null);
      notify(promoEnabled ? '✅ Popup promosi disimpan & aktif di landing page.' : '✅ Popup promosi disimpan (nonaktif).');
    } catch (err) {
      console.error('Gagal menyimpan promo popup:', err);
      notify('❌ Gagal menyimpan popup promosi. Coba lagi.');
    } finally {
      setIsSavingPromo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] bg-berlin-red/10 text-berlin-red px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-berlin-red/20">MARKETING & KOMUNIKASI</span>
            <h3 className="text-xl font-bold text-[#1A1A1A] dark:text-white mt-2">Konten & Portofolio</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Data foto, temuan, dan pengerjaan untuk konten media sosial dan portofolio bengkel.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] px-4 py-2.5 rounded-xl">
            <Image className="w-4 h-4" weight="duotone" />
            <span className="font-semibold">{allPhotos.length} foto tersedia</span>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 bg-gray-100 dark:bg-[#22252c] p-1 rounded-xl w-fit">
        {([
          { id: 'galeri' as const, label: 'Galeri & Portofolio', icon: Image },
          { id: 'portofolio' as const, label: 'Portofolio Beranda', icon: Star },
          { id: 'blog' as const, label: 'Blog', icon: FileText },
          { id: 'promo' as const, label: 'Promo Popup', icon: Megaphone },
        ]).map(t => (
          <button key={t.id} onClick={() => setPanelTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              panelTab === t.id ? 'bg-white dark:bg-[#1a1d23] text-berlin-navy shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {panelTab === 'portofolio' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card-padded space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Tambah Portofolio</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Merek</label>
                <select
                  value={pfBrand}
                  onChange={e => setPfBrand(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors"
                >
                  {BRANDS.map((b: string) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Model</label>
                <input
                  type="text"
                  value={pfModel}
                  onChange={e => setPfModel(e.target.value)}
                  placeholder="Cth: C-Class W205"
                  className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Tipe Servis</label>
                <select
                  value={pfServiceType}
                  onChange={e => setPfServiceType(e.target.value as PortfolioItem['serviceType'])}
                  className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors"
                >
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Deskripsi Kerjaan</label>
                <textarea
                  value={pfDescription}
                  onChange={e => setPfDescription(e.target.value)}
                  rows={2}
                  placeholder="Cth: Overhaul mesin + ganti timing chain"
                  className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Foto Hasil Kerja</label>
                {pfExistingImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-[#2a2d35]">
                    <img src={pfExistingImageUrl} alt="" className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-white text-[9px] font-bold">{pfSourceOrderId ? `Dari ${pfSourceOrderId}` : 'Foto dipilih'}</span>
                      <button type="button" onClick={() => { setPfExistingImageUrl(null); setPfSourceOrderId(null); }}
                        className="text-white/80 hover:text-white text-[9px] font-bold underline cursor-pointer">Ganti foto</button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#22252c] transition-colors text-xs text-gray-500 dark:text-gray-400 font-semibold">
                    <UploadSimple className="w-4 h-4" weight="duotone" /> {pfImageFile ? pfImageFile.name : 'Pilih Foto (wajib)'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePortfolioImagePick(f); }} />
                  </label>
                )}
              </div>
              <button
                onClick={handleAddPortfolio}
                disabled={isSavingPortfolio}
                className="w-full flex items-center justify-center gap-1.5 bg-berlin-navy hover:bg-berlin-navy/90 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {isSavingPortfolio ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" weight="duotone" />}
                {isSavingPortfolio ? 'Menyimpan...' : 'Tambah ke Beranda'}
              </button>
            </div>
          </div>

          <div className="card-padded space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Portofolio Aktif ({portfolioItems.length})</h4>
            {portfolioItems.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Belum ada portofolio yang ditambahkan.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {portfolioItems.map(item => (
                  <div key={item.id} className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-[#2a2d35] aspect-[4/3] bg-gray-100 dark:bg-[#22252c]">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <p className="text-white text-[10px] font-bold leading-tight">{item.carBrand} {item.carModel}</p>
                      <p className="text-white/70 text-[9px] mt-0.5 truncate">{item.workDescription}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePortfolio(item.id)}
                      className="absolute top-2 right-2 bg-white/90 dark:bg-[#1a1d23] hover:bg-white text-berlin-red p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Hapus"
                    >
                      <Trash className="w-3.5 h-3.5" weight="duotone" />
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
          <div className="card-padded space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {editingBlogId ? 'Edit Artikel' : 'Tulis Artikel Baru'}
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Judul</label>
                <input type="text" value={blogTitle} onChange={e => setBlogTitle(e.target.value)}
                  placeholder="Cth: 5 Tanda Timing Belt Perlu Diganti"
                  className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Kategori</label>
                <select value={blogCategory} onChange={e => setBlogCategory(e.target.value as BlogPost['category'])}
                  className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors">
                  {BLOG_CATEGORIES.map((c: any) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Ringkasan</label>
                <textarea value={blogExcerpt} onChange={e => setBlogExcerpt(e.target.value)} rows={2}
                  placeholder="1-2 kalimat buat card & preview link"
                  className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Cover Image</label>
                <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#22252c] transition-colors text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  <UploadSimple className="w-4 h-4" weight="duotone" /> {blogCoverFile ? blogCoverFile.name : existingCoverUrl ? 'Ganti cover (opsional)' : 'Pilih Cover (wajib)'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleBlogCoverPick(f); }} />
                </label>
                {(blogCoverPreview || existingCoverUrl) && (
                  <img src={blogCoverPreview || existingCoverUrl!} alt="" className="mt-2 w-full aspect-[16/9] object-cover rounded-lg border border-gray-200 dark:border-[#2a2d35]" />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Isi Artikel</label>
                <BlogEditor key={blogEditorKey} content={blogContent} onChange={setBlogContent} onUploadImage={handleUploadBlogInlineImage} onNotify={onNotify} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSaveBlog(false)} disabled={isSavingBlog}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-[#22252c] hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-60 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  {isSavingBlog ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <FloppyDisk className="w-3.5 h-3.5" weight="duotone" />}
                  Simpan Draft
                </button>
                <button onClick={() => handleSaveBlog(true)} disabled={isSavingBlog}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-berlin-navy hover:bg-berlin-navy/90 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  {isSavingBlog ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" weight="duotone" />}
                  Publish
                </button>
              </div>
              {editingBlogId && (
                <button onClick={resetBlogForm} className="w-full text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
                  Batal edit, tulis artikel baru
                </button>
              )}
            </div>
          </div>

          <div className="card-padded space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Semua Artikel ({blogPosts.length})</h4>
            {isLoadingBlog ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Memuat...</p>
            ) : blogPosts.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Belum ada artikel.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {blogPosts.map(post => (
                  <div key={post.id} className="flex items-center gap-3 border border-gray-150 dark:border-[#2a2d35] rounded-xl p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <img src={post.coverImageUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-[#2a2d35] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          post.status === 'published' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-gray-100 dark:bg-[#22252c] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#2a2d35]'
                        }`}>{post.status === 'published' ? 'Published' : 'Draft'}</span>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500">{post.category}</span>
                      </div>
                      <p className="font-bold text-xs text-gray-900 dark:text-white truncate mt-0.5">{post.title}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleTogglePublish(post)} title={post.status === 'published' ? 'Jadikan draft' : 'Publish'}
                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                        {post.status === 'published' ? <EyeSlash className="w-3.5 h-3.5" weight="duotone" /> : <Eye className="w-3.5 h-3.5" weight="duotone" />}
                      </button>
                      <button onClick={() => startEditBlog(post)} title="Edit"
                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                        <PencilSimple className="w-3.5 h-3.5" weight="duotone" />
                      </button>
                      <button onClick={() => handleDeleteBlog(post.id)} title="Hapus"
                        className="p-1.5 rounded-lg text-berlin-red hover:bg-red-50 cursor-pointer transition-colors">
                        <Trash className="w-3.5 h-3.5" weight="duotone" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {panelTab === 'promo' && (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div className="card-padded space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Popup Promosi Landing Page</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{promoEnabled ? 'Aktif' : 'Nonaktif'}</span>
                <button
                  type="button"
                  onClick={() => setPromoEnabled(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${promoEnabled ? 'bg-berlin-navy' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${promoEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </label>
            </div>

            {isLoadingPromo ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Memuat...</p>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Muncul otomatis di landing page publik beberapa detik setelah dibuka. Matiin toggle di atas buat nonaktifin tanpa hapus isinya.
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Judul</label>
                  <input type="text" value={promoTitle} onChange={e => setPromoTitle(e.target.value)}
                    placeholder="Cth: Promo Servis AC — Diskon 20%"
                    className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Deskripsi</label>
                  <textarea value={promoDescription} onChange={e => setPromoDescription(e.target.value)} rows={2}
                    placeholder="Cth: Berlaku sampai akhir bulan, khusus booking online."
                    className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Teks Tombol</label>
                    <input type="text" value={promoCtaText} onChange={e => setPromoCtaText(e.target.value)}
                      placeholder="Cth: Booking Sekarang"
                      className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Link Tombol</label>
                    <input type="text" value={promoCtaLink} onChange={e => setPromoCtaLink(e.target.value)}
                      placeholder="https://wa.me/62..."
                      className="w-full bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Muncul Setelah (detik)</label>
                  <input type="number" min={0} max={60} value={promoDelaySeconds}
                    onChange={e => setPromoDelaySeconds(Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 bg-gray-50 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] rounded-lg py-2.5 px-3.5 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-berlin-navy transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Gambar (opsional)</label>
                  <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#22252c] transition-colors text-xs text-gray-500 dark:text-gray-400 font-semibold">
                    <UploadSimple className="w-4 h-4" weight="duotone" /> {promoImageFile ? promoImageFile.name : existingPromoImageUrl ? 'Ganti gambar' : 'Pilih Gambar'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePromoImagePick(f); }} />
                  </label>
                  {(promoImagePreview || existingPromoImageUrl) && (
                    <img src={promoImagePreview || existingPromoImageUrl!} alt="" className="mt-2 w-full aspect-[16/9] object-cover rounded-lg border border-gray-200 dark:border-[#2a2d35]" />
                  )}
                </div>
                <button
                  onClick={handleSavePromo}
                  disabled={isSavingPromo}
                  className="w-full flex items-center justify-center gap-1.5 bg-berlin-navy hover:bg-berlin-navy/90 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  {isSavingPromo ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <FloppyDisk className="w-3.5 h-3.5" weight="duotone" />}
                  {isSavingPromo ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            )}
          </div>

          <div className="card-padded space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Preview</h4>
            <div className="relative bg-gray-900/90 rounded-xl p-6 flex items-center justify-center min-h-[300px]">
              <div className="bg-white dark:bg-[#1a1d23] rounded-2xl overflow-hidden shadow-2xl max-w-xs w-full">
                {(promoImagePreview || existingPromoImageUrl) && (
                  <img src={promoImagePreview || existingPromoImageUrl!} alt="" className="w-full aspect-[16/9] object-cover" />
                )}
                <div className="p-4 space-y-2">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{promoTitle || 'Judul promo muncul di sini'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{promoDescription || 'Deskripsi promo muncul di sini.'}</p>
                  {promoCtaText && (
                    <div className="bg-berlin-red text-white text-xs font-bold text-center py-2 rounded-lg mt-2">{promoCtaText}</div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
              {promoEnabled
                ? `Aktif — muncul ${promoDelaySeconds} detik setelah landing page dibuka.`
                : 'Nonaktif — nggak muncul di landing page.'}
            </p>
          </div>
        </div>
      )}

      {panelTab === 'galeri' && (
      <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'WO Selesai', value: completedOrders.length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Foto Pengerjaan', value: allPhotos.filter(p => p.type === 'Bukti Pengerjaan').length, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Foto Temuan', value: allPhotos.filter(p => p.type === 'Temuan Diagnosis').length, color: 'text-purple-600 dark:text-purple-400' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Gallery foto */}
      {allPhotos.length > 0 && (
        <div className="card-padded space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
            <Camera className="w-4 h-4" weight="duotone" /> Galeri Foto Pengerjaan & Temuan
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allPhotos.map((photo, idx) => (
              <div key={idx} className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-[#2a2d35] aspect-square bg-gray-100 dark:bg-[#22252c]">
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
                  <button
                    type="button"
                    onClick={() => useOrderAsPortfolioSeed(photo.order, photo.url)}
                    title="Jadikan konten portofolio"
                    className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-white text-berlin-navy p-1.5 rounded-lg cursor-pointer"
                  >
                    <Star className="w-3 h-3" weight="fill" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portofolio order selesai */}
      <div className="card-padded space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
            <Star className="w-4 h-4" weight="duotone" /> Portofolio Kendaraan Selesai
          </h4>
          <div className="flex gap-1.5 flex-wrap">
            {brands.map(b => (
              <button key={b} onClick={() => setSelectedBrand(b)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedBrand === b ? 'bg-berlin-navy text-white' : 'bg-gray-100 dark:bg-[#22252c] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
              <div key={o.id} className="border border-gray-150 dark:border-[#2a2d35] rounded-xl p-4 space-y-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-[10px] font-bold text-gray-500 dark:text-gray-400">{o.id}</span>
                      <span className="text-[9px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">SELESAI</span>
                    </div>
                    <h5 className="font-bold text-gray-900 dark:text-white text-sm">{o.carBrand} {o.carModel}</h5>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{o.serviceType} · {o.plateNumber}</p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 italic">{o.complaints.map(c => `"${c}"`).join(', ')}</p>
                  </div>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 font-sans shrink-0">{new Date(o.createdAt).toLocaleDateString('id-ID')}</span>
                </div>

                {/* Temuan */}
                {o.findings.filter(f => f.status === 'approved').length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-extrabold tracking-wider text-gray-400 dark:text-gray-500">Temuan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {o.findings.filter(f => f.status === 'approved').map(f => (
                        <span key={f.id} className="text-[10px] bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-2 py-0.5 rounded-full font-semibold">{f.description.split(',')[0]}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Foto preview */}
                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {photos.slice(0, 5).map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => useOrderAsPortfolioSeed(o, url)}
                        title="Jadikan konten portofolio"
                        className="group relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-[#2a2d35] cursor-pointer"
                      >
                        <img src={url} alt="Foto pengerjaan" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Star className="w-4 h-4 text-white" weight="fill" />
                        </div>
                      </button>
                    ))}
                    {photos.length > 5 && (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-[#22252c] border border-gray-200 dark:border-[#2a2d35] flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-500">
                        +{photos.length - 5}
                      </div>
                    )}
                  </div>
                )}

                {photos.length === 0 && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">Belum ada foto pengerjaan untuk order ini.</p>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-xs text-gray-400 dark:text-gray-500">Belum ada order selesai untuk ditampilkan.</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
