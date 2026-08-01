import { supabase } from './supabase';
import { Product, CATEGORIES } from '../data/products';

const FALLBACK_LIMIT = 40;

function buildCatalogSummary(products: Product[]) {
  const catCounts: Record<string, number> = {};
  const brands = new Set<string>();
  products.forEach(p => {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    brands.add(p.brand);
  });

  return `Katalog Sparepart Berlin 188 Garage — ${products.length} produk.
Merek: ${[...brands].join(', ')}.
Kategori: ${CATEGORIES.map(c => `${c} (${catCounts[c] || 0})`).join(', ')}.`;
}

function quickMatch(query: string, products: Product[], limit = 50): Product[] {
  const q = query.toLowerCase();
  const scored = products.map(p => {
    let score = 0;
    const name = p.name.toLowerCase();
    const cat = p.category.toLowerCase();
    const brand = p.brand.toLowerCase();
    const compat = p.compatibility.toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length > 1);
    words.forEach(w => {
      if (name.includes(w)) score += 10;
      if (cat.includes(w)) score += 8;
      if (compat.includes(w)) score += 6;
      if (brand.includes(w)) score += 5;
    });
    return { p, score };
  });
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.p);
}

interface AiResponse {
  text: string;
  productIds: string[];
  needsInspection: boolean;
}

export async function askAi(query: string, allProducts: Product[]): Promise<AiResponse> {
  if (!supabase) {
    return { text: 'AI tidak tersedia — server belum dikonfigurasi.', productIds: [], needsInspection: false };
  }

  const candidates = quickMatch(query, allProducts);
  const context = candidates.length > 0 ? candidates : allProducts.slice(0, FALLBACK_LIMIT);

  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        query,
        products: context.map(p => ({
          id: p.id, code: p.code, name: p.name, brand: p.brand,
          category: p.category, compatibility: p.compatibility,
          price: p.price, stock: p.stock,
        })),
        catalogSummary: buildCatalogSummary(allProducts),
      },
    });

    if (error) throw error;

    return {
      text: data?.text || 'Maaf, saya tidak bisa memberikan rekomendasi saat ini.',
      productIds: Array.isArray(data?.productIds) ? data.productIds : [],
      needsInspection: Boolean(data?.needsInspection),
    };
  } catch (err) {
    console.error('AI error:', err);
    return {
      text: 'Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi nanti atau hubungi kami via WhatsApp ya.',
      productIds: [],
      needsInspection: false,
    };
  }
}
