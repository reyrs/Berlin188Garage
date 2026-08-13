import { create } from 'zustand';
import type { WarehouseStockItem, HeroContent, PortfolioItem } from '@shared/types';
import { genId } from '@shared/id';
import {
  fetchWarehouseStock, adjustWarehouseStock, updateWarehouseStockMarketplaceLink,
  fetchHeroContent, fetchPortfolioItems,
  createPortfolioItem, deletePortfolioItem,
} from '@shared/db';

interface WarehouseState {
  stock: WarehouseStockItem[];
  isLoading: boolean;

  setStock: (items: WarehouseStockItem[]) => void;
  adjustStock: (itemId: string, newStock: number) => void;
  updateMarketplaceLink: (itemId: string, productId: string | null) => void;
  loadStock: () => Promise<void>;
}

interface ContentState {
  heroContent: HeroContent | null;
  portfolioItems: PortfolioItem[];
  isLoading: boolean;

  setHero: (h: HeroContent | null) => void;
  setItems: (items: PortfolioItem[]) => void;
  addItem: (item: Omit<PortfolioItem, 'id' | 'createdAt'>) => void;
  removeItem: (id: string) => void;
  loadContent: () => Promise<void>;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  stock: [],
  isLoading: false,

  setStock: (stock) => set({ stock }),

  adjustStock: (itemId, newStock) => {
    const previousItem = get().stock.find((item) => item.id === itemId);
    const delta = newStock - (previousItem?.stock ?? newStock);
    set((state) => ({
      stock: state.stock.map((item) =>
        item.id === itemId ? { ...item, stock: newStock } : item
      ),
    }));
    adjustWarehouseStock(itemId, delta).catch((err) => {
      console.error('Failed to adjust warehouse stock:', err);
      if (previousItem) {
        set((state) => ({
          stock: state.stock.map((item) => item.id === itemId ? { ...item, stock: previousItem.stock } : item),
        }));
      }
    });
  },

  updateMarketplaceLink: (itemId, productId) => {
    set((state) => ({
      stock: state.stock.map((item) =>
        item.id === itemId ? { ...item, marketplaceProductId: productId || undefined } : item
      ),
    }));
    updateWarehouseStockMarketplaceLink(itemId, productId).catch((err) => {
      console.error('Failed to update marketplace link:', err);
    });
  },

  loadStock: async () => {
    set({ isLoading: true });
    try {
      const data = await fetchWarehouseStock();
      set({ stock: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));

export const useContentStore = create<ContentState>((set) => ({
  heroContent: null,
  portfolioItems: [],
  isLoading: false,

  setHero: (heroContent) => set({ heroContent }),
  setItems: (portfolioItems) => set({ portfolioItems }),

  addItem: (item) => {
    const tempId = genId('temp');
    const optimisticItem: PortfolioItem = { ...item, id: tempId, createdAt: new Date().toISOString() };
    set((state) => ({ portfolioItems: [optimisticItem, ...state.portfolioItems] }));
    createPortfolioItem(item)
      .then(() => fetchPortfolioItems())
      .then((items) => set({ portfolioItems: items }))
      .catch((err) => {
        console.error('Failed to create portfolio item:', err);
        set((state) => ({ portfolioItems: state.portfolioItems.filter((i) => i.id !== tempId) }));
      });
  },

  removeItem: (id) => {
    set((state) => ({ portfolioItems: state.portfolioItems.filter((i) => i.id !== id) }));
    deletePortfolioItem(id).catch((err) => {
      console.error('Failed to delete portfolio item:', err);
    });
  },

  loadContent: async () => {
    set({ isLoading: true });
    try {
      const [hero, portfolio] = await Promise.allSettled([fetchHeroContent(), fetchPortfolioItems()]);
      if (hero.status === 'fulfilled') set({ heroContent: hero.value });
      if (portfolio.status === 'fulfilled') set({ portfolioItems: portfolio.value });
    } catch {
    } finally {
      set({ isLoading: false });
    }
  },
}));
