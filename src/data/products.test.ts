import { describe, it, expect } from 'vitest';
import { PRODUCTS, CATEGORIES } from './products';

describe('PRODUCTS catalog data integrity', () => {
  it('has a non-trivial number of products', () => {
    expect(PRODUCTS.length).toBeGreaterThan(1000);
  });

  it('has no duplicate ids', () => {
    const ids = PRODUCTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every product has required non-empty fields', () => {
    for (const p of PRODUCTS) {
      expect(p.id, `product missing id`).toBeTruthy();
      expect(p.name.trim(), `product ${p.id} has empty name`).not.toBe('');
      expect(p.image, `product ${p.id} has empty image`).toBeTruthy();
      expect(p.brand.trim(), `product ${p.id} has empty brand`).not.toBe('');
    }
  });

  it('every product has a positive price and non-negative stock', () => {
    for (const p of PRODUCTS) {
      expect(p.price, `product ${p.id} has invalid price ${p.price}`).toBeGreaterThan(0);
      expect(p.stock, `product ${p.id} has negative stock`).toBeGreaterThanOrEqual(0);
    }
  });

  it('every product\'s category is one of the declared CATEGORIES', () => {
    for (const p of PRODUCTS) {
      expect(CATEGORIES, `product ${p.id} has unknown category "${p.category}"`).toContain(p.category);
    }
  });

  it('every product image URL looks like a real URL, not a placeholder', () => {
    for (const p of PRODUCTS) {
      expect(p.image, `product ${p.id} has a suspicious image value`).toMatch(/^https?:\/\//);
    }
  });
});
