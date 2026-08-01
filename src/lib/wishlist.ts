import { useEffect, useState } from 'react';

const STORAGE_KEY = 'berlin188-wishlist';

function readStored(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(() => readStored());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const isWishlisted = (id: string) => ids.includes(id);

  const toggle = (id: string) => {
    setIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const remove = (id: string) => {
    setIds(prev => prev.filter(x => x !== id));
  };

  return { ids, isWishlisted, toggle, remove };
}
