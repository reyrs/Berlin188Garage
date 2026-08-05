# Marketplace Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the marketplace shopping UI (product cards, grid, cart, wishlist) from a generic monochrome e-commerce template into a premium look carrying Berlin188's brand identity (navy/red/gold, "never straight" asymmetry, price-first hierarchy, scroll motion).

**Architecture:** Two new CSS utilities (`.badge-brand`, `.card-product`) in `src/index.css` replace ad hoc gray classes. One new hook (`src/lib/useScrollReveal.ts`) extracts the existing `data-reveal`/`IntersectionObserver` pattern already live in `LandingPage.tsx` (read-only reference, not modified) so `ProductMarketplace.tsx` can reuse it without duplicating observer boilerplate. `ProductCard.tsx` gains one new optional prop (`featured`) so the grid's non-uniform layout is driven by the parent (`ProductMarketplace.tsx`), keeping `ProductCard` a dumb presentational component.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, TypeScript, `@phosphor-icons/react` (already a dependency from the staff dashboard redesign).

## Global Constraints

- Do NOT modify `LandingPage.tsx`, `AiChat.tsx`, `TrackingPortal.tsx`, any blog component, `src/lib/db.ts`, `src/lib/supabase.ts`, or `src/data/products.ts` (no new fields on `Product`).
- Only 4 component files change, plus one new CSS block and one new hook file.
- Every task's edits must leave `npm run lint` (`tsc --noEmit`) passing with no new errors.
- No automated test suite exists in this project — verification is `npm run lint` plus visual check via the `agent-browser` skill.
- Icon migration in these 4 files: `lucide-react` → `@phosphor-icons/react`, verified mapping table below (checked against the actual installed package during the dashboard redesign this session — reuse those names, don't re-guess).

| Lucide | Phosphor |
|---|---|
| ShoppingCart | ShoppingCart (same name) |
| Eye | Eye (same name) |
| Heart | Heart (same name) |
| Search | MagnifyingGlass |
| ChevronLeft | CaretLeft |
| ChevronRight | CaretRight |
| X | X (same name) |
| Package | Package (same name) |
| SlidersHorizontal | SlidersHorizontal (same name) |
| MessageCircle | ChatCircle |
| Sparkles | Sparkle |
| Trash2 | Trash |

---

### Task 1: CSS tokens — `.badge-brand` and `.card-product`

**Files:**
- Modify: `src/index.css:110-115` (right after the existing `card-instrument` utility block)

**Interfaces:**
- Produces: CSS classes `badge-brand` and `card-product`, plus CSS variable `--shadow-product` — Tasks 3-6 reference these class names directly.

- [ ] **Step 1: Add the `--shadow-product` token to the `@theme` block**

In `src/index.css`, inside the `@theme { ... }` block, right after the `--shadow-instrument` line, add:

```css
  --shadow-product: 0 8px 20px -4px rgb(0 101 192 / 0.10), 0 2px 6px -2px rgb(0 101 192 / 0.06);
```

- [ ] **Step 2: Add `.card-product` and `.badge-brand` after the existing `card-instrument` utility**

Find (around line 110-114):

```css
/* Tier 1 — KPI tiles: tinted shadow, no border, used only by <KpiTile>. */
@utility card-instrument {
  @apply bg-white rounded-lg;
  box-shadow: var(--shadow-instrument);
}
```

Add directly below it:

```css

/* Product cards — separate token from card-instrument (different context,
   should be free to evolve independently). Bigger radius than dashboard
   cards so photos feel "displayed" rather than boxed in. */
@utility card-product {
  @apply bg-white dark:bg-[#1a1d23] rounded-xl overflow-hidden;
  box-shadow: var(--shadow-product);
}

/* Brand badge — deliberately not a symmetric pill (brand guideline: accents
   are never perfectly straight/symmetric). One corner stays sharp. */
@utility badge-brand {
  @apply inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-berlin-navy/10 text-berlin-navy dark:bg-berlin-gold/10 dark:text-berlin-gold w-fit;
  border-radius: 999px 999px 999px 4px;
}
```

- [ ] **Step 3: Verify no CSS compile errors**

Run: `npm run dev` (or check the already-running dev server's terminal/browser console) for Tailwind `@utility` syntax errors.
Expected: no PostCSS/Tailwind errors, dev server hot-reloads cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat: add marketplace premium tokens (card-product, badge-brand)"
```

---

### Task 2: `useScrollReveal` hook

**Files:**
- Create: `src/lib/useScrollReveal.ts`

**Interfaces:**
- Consumes: nothing new — mirrors the existing `[data-reveal]`/`.is-visible` CSS already defined in `src/index.css:131-151` (unchanged, already present from the landing page work).
- Produces: `export function useScrollReveal(): RefObject<HTMLDivElement | null>` — Task 4 imports this and attaches the returned ref to the grid's container element, then marks each card with a `data-reveal` attribute exactly like `LandingPage.tsx` already does for its portfolio cards.

- [ ] **Step 1: Create the hook, mirroring `LandingPage.tsx`'s existing observer exactly**

```ts
import { useEffect, useRef } from 'react';

export function useScrollReveal() {
  const rootRef = useRef<HTMLDivElement>(null);

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
  });

  return rootRef;
}
```

Note: unlike `LandingPage.tsx`'s version (which has `[filtered.length]` as a dependency array because its portfolio list can be filtered), this hook's `useEffect` has **no dependency array** — it re-runs after every render of whatever component uses it. This is intentional and safe: `querySelectorAll` + `IntersectionObserver` are cheap, `io.unobserve` after reveal prevents re-triggering, and the marketplace grid re-renders on every filter/sort/page change, so re-scanning for new `[data-reveal]` elements each time is exactly the desired behavior (new page of products should also reveal on scroll).

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `useScrollReveal.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/useScrollReveal.ts
git commit -m "feat: extract useScrollReveal hook from landing page's reveal pattern"
```

---

### Task 3: `ProductCard.tsx` — brand tokens, price hierarchy, featured layout

**Files:**
- Modify: `src/components/ProductCard.tsx` (full file rewrite — it's only 52 lines)

**Interfaces:**
- Consumes: `card-product`, `badge-brand` CSS classes (Task 1).
- Produces: `ProductCard` now accepts an additional optional prop `featured?: boolean` (default `false`). Task 4 passes this prop based on grid position.

- [ ] **Step 1: Replace the entire file**

```tsx
import React from 'react';
import { ShoppingCart, Eye, Heart } from '@phosphor-icons/react';
import { Product } from '../data/products';

const fmt = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

interface ProductCardProps {
  product: Product;
  onAdd: (p: Product) => void;
  onDetail: (p: Product) => void;
  inCart: boolean;
  wishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  featured?: boolean;
}

export default function ProductCard({ product, onAdd, onDetail, inCart, wishlisted, onToggleWishlist, featured = false }: ProductCardProps) {
  return (
    <div className={`group card-product hover:shadow-lg transition-shadow ${featured ? 'sm:col-span-2' : ''}`}>
      <div className={`bg-gray-50 dark:bg-[#22252c] overflow-hidden relative ${featured ? 'aspect-[16/9]' : 'aspect-square'}`}>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <button
          onClick={() => onToggleWishlist(product.id)}
          className={`absolute top-2 left-2 w-8 h-8 backdrop-blur rounded-lg flex items-center justify-center cursor-pointer transition-all ${wishlisted ? 'bg-white/90 opacity-100' : 'bg-white/90 opacity-0 group-hover:opacity-100 hover:bg-white'}`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'text-berlin-red' : 'text-gray-700'}`} weight={wishlisted ? 'fill' : 'duotone'} />
        </button>
        <button
          onClick={() => onDetail(product)}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white"
        >
          <Eye className="w-4 h-4 text-gray-700" weight="duotone" />
        </button>
      </div>
      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="badge-brand">{product.category}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans shrink-0">{product.code}</span>
        </div>
        <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">{product.name}</h3>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{product.brand}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-black text-berlin-navy dark:text-berlin-gold tabular-nums">{fmt(product.price)}</span>
          <button
            onClick={() => onAdd(product)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              inCart
                ? 'bg-berlin-navy text-white'
                : 'bg-berlin-navy/10 text-berlin-navy hover:bg-berlin-navy hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" weight="duotone" />
            {inCart ? 'Di keranjang' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `ProductCard.tsx`. (Task 4 hasn't updated its caller yet, so a missing-prop error is fine at this point since `featured` is optional — there should be no error at all.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ProductCard.tsx
git commit -m "refactor: redesign ProductCard with brand tokens, price hierarchy, featured layout"
```

---

### Task 4: `ProductMarketplace.tsx` — brand colors, non-uniform grid, scroll reveal

**Files:**
- Modify: `src/components/ProductMarketplace.tsx`

**Interfaces:**
- Consumes: `useScrollReveal` from `../lib/useScrollReveal` (Task 2), `featured` prop on `ProductCard` (Task 3).

- [ ] **Step 1: Replace the icon import**

Find (line 2-4):

```tsx
import {
  Search, ShoppingCart, ChevronLeft, ChevronRight, X, Package, SlidersHorizontal, Heart, MessageCircle, Sparkles,
} from 'lucide-react';
```

Replace with:

```tsx
import {
  MagnifyingGlass, ShoppingCart, CaretLeft, CaretRight, X, Package, SlidersHorizontal, Heart, ChatCircle, Sparkle,
} from '@phosphor-icons/react';
```

- [ ] **Step 2: Add the `useScrollReveal` import**

After `import { useWishlist } from '../lib/wishlist';` add:

```tsx
import { useScrollReveal } from '../lib/useScrollReveal';
```

- [ ] **Step 3: Call the hook inside the component**

Find the line `const { theme } = useTheme();` (near the top of the component body) and add right after it:

```tsx
  const revealRef = useScrollReveal();
```

- [ ] **Step 4: Rename the two search icon usages**

Run: `grep -n "<Search " src/components/ProductMarketplace.tsx` — there are 2 (desktop header search, mobile search). Rename both JSX tags from `<Search` to `<MagnifyingGlass`, keeping props identical, and add `weight="duotone"` to each.

- [ ] **Step 5: Rename the chat trigger icon and add duotone weight**

Find:

```tsx
              <Sparkles className="w-4 h-4" />
```

Replace with:

```tsx
              <Sparkle className="w-4 h-4" weight="duotone" />
```

- [ ] **Step 6: Sidebar category filter — brand color for active state**

Find (in `FilterContent`, both the "Semua Kategori" button and the `CATEGORIES.map` button):

```tsx
${!category ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]'}
```

Replace with:

```tsx
${!category ? 'bg-berlin-navy text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]'}
```

And find:

```tsx
${active ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]'}
```

Replace with:

```tsx
${active ? 'bg-berlin-navy text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]'}
```

Also update the two count-badge spans right below each button (the small number pill showing product count) — find both occurrences of:

```tsx
className={`text-[11px] font-sans font-semibold ${!category ? 'text-white/70 dark:text-gray-900/60' : 'text-gray-400 dark:text-gray-500'}`}
```

Replace with:

```tsx
className={`text-[11px] font-sans font-semibold ${!category ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}
```

And:

```tsx
className={`text-[11px] font-sans font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20 dark:bg-gray-900/20 text-white/80 dark:text-gray-900/70' : 'bg-gray-100 dark:bg-[#22252c] text-gray-400 dark:text-gray-500'}`}
```

Replace with:

```tsx
className={`text-[11px] font-sans font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20 text-white/80' : 'bg-gray-100 dark:bg-[#22252c] text-gray-400 dark:text-gray-500'}`}
```

- [ ] **Step 7: Sort dropdown — brand focus color**

Find:

```tsx
className="bg-white dark:bg-[#22252c] border border-gray-300 dark:border-[#2a2d35] rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:border-gray-500 dark:text-gray-100 cursor-pointer transition-colors"
```

Replace with:

```tsx
className="bg-white dark:bg-[#22252c] border border-gray-300 dark:border-[#2a2d35] rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:border-berlin-navy dark:text-gray-100 cursor-pointer transition-colors"
```

- [ ] **Step 8: Pagination — brand color for active page**

Find:

```tsx
className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums ${p === page ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]'}`}
```

Replace with:

```tsx
className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums ${p === page ? 'bg-berlin-navy text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#22252c]'}`}
```

- [ ] **Step 9: Attach the reveal ref to the grid container and mark each card `data-reveal`, wire up `featured`**

Find:

```tsx
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paged.map((p: Product) => (
                    <React.Fragment key={p.id}>
                      <ProductCard product={p} onAdd={addToCart} onDetail={setDetail} inCart={inCart(p.id)} wishlisted={isWishlisted(p.id)} onToggleWishlist={toggleWishlist} />
                    </React.Fragment>
                  ))}
                </div>
```

Replace with:

```tsx
                <div ref={revealRef} className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paged.map((p: Product, i: number) => (
                    <div key={p.id} data-reveal style={{ transitionDelay: `${(i % 12) * 60}ms` }} className={i % 5 === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}>
                      <ProductCard product={p} onAdd={addToCart} onDetail={setDetail} inCart={inCart(p.id)} wishlisted={isWishlisted(p.id)} onToggleWishlist={toggleWishlist} featured={i % 5 === 0} />
                    </div>
                  ))}
                </div>
```

Note: the `sm:col-span-2 lg:col-span-2` wrapper div span is needed **in addition to** `ProductCard`'s own `featured`-driven `sm:col-span-2` class, because the grid's `gap`/column tracks are controlled by the parent grid, and the wrapping `data-reveal` div must itself span the same columns as its child for the layout to actually widen — otherwise the featured card would render full-width content squeezed into a single grid cell. Both the wrapper and `ProductCard` carry the span class; this is intentional, not a duplicate mistake.

- [ ] **Step 10: Price hierarchy in the product detail modal**

Find (around line 375-378):

```tsx
              <div className="flex items-center justify-between bg-gray-50 dark:bg-[#22252c] rounded-xl p-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Harga</span>
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">{fmt(detail.price)}</span>
              </div>
```

Replace with:

```tsx
              <div className="flex items-center justify-between bg-gray-50 dark:bg-[#22252c] rounded-xl p-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Harga</span>
                <span className="text-2xl font-black text-berlin-navy dark:text-berlin-gold tabular-nums">{fmt(detail.price)}</span>
              </div>
```

- [ ] **Step 11: Rename remaining icon usages and add duotone weight**

Run: `grep -n "<ChevronLeft\|<ChevronRight\|<MessageCircle\|<Package \|<SlidersHorizontal\|<Heart \|<ShoppingCart \|<X\b" src/components/ProductMarketplace.tsx`

For each match: rename `ChevronLeft`→`CaretLeft`, `ChevronRight`→`CaretRight`, `MessageCircle`→`ChatCircle` (these 3 tag renames are required — the old names no longer exist in the new import). For `Package`, `SlidersHorizontal`, `Heart`, `ShoppingCart`, `X` (same names in both libraries, no rename needed), just add `weight="duotone"` to each JSX usage that doesn't already have a `weight` prop.

- [ ] **Step 12: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `ProductMarketplace.tsx`.

- [ ] **Step 13: Commit**

```bash
git add src/components/ProductMarketplace.tsx
git commit -m "refactor: brand colors, non-uniform grid, scroll reveal for marketplace"
```

---

### Task 5: `CartDrawer.tsx` — icons and price hierarchy

**Files:**
- Modify: `src/components/CartDrawer.tsx`

- [ ] **Step 1: Replace the icon import**

Find:

```tsx
import { X, ShoppingCart, Trash2, MessageCircle } from 'lucide-react';
```

Replace with:

```tsx
import { X, ShoppingCart, Trash, ChatCircle } from '@phosphor-icons/react';
```

- [ ] **Step 2: Rename JSX tags and add duotone weight**

Find:

```tsx
            <ShoppingCart className="w-5 h-5 text-berlin-navy dark:text-berlin-gold" />
```

Replace with:

```tsx
            <ShoppingCart className="w-5 h-5 text-berlin-navy dark:text-berlin-gold" weight="duotone" />
```

Find:

```tsx
            <X className="w-4 h-4 text-gray-400" />
```

Replace with:

```tsx
            <X className="w-4 h-4 text-gray-400" weight="duotone" />
```

Find:

```tsx
            <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
```

Replace with:

```tsx
            <ShoppingCart className="w-12 h-12 mb-3 opacity-50" weight="duotone" />
```

Find:

```tsx
                  <button onClick={() => onRemove(p.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </button>
```

Replace with:

```tsx
                  <button onClick={() => onRemove(p.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                    <Trash className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" weight="duotone" />
                  </button>
```

Find:

```tsx
                <MessageCircle className="w-4 h-4" /> Pesan via WhatsApp
```

Replace with:

```tsx
                <ChatCircle className="w-4 h-4" weight="duotone" /> Pesan via WhatsApp
```

- [ ] **Step 3: Price hierarchy — per-item price and total**

Find:

```tsx
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">{fmt(p.price)}</p>
```

Replace with:

```tsx
                  <p className="text-sm font-black text-berlin-navy dark:text-berlin-gold tabular-nums mt-0.5">{fmt(p.price)}</p>
```

Find:

```tsx
                <span className="text-lg font-extrabold text-gray-900 dark:text-white">{fmt(total)}</span>
```

Replace with:

```tsx
                <span className="text-xl font-black text-berlin-navy dark:text-berlin-gold tabular-nums">{fmt(total)}</span>
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `CartDrawer.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/components/CartDrawer.tsx
git commit -m "refactor: migrate CartDrawer to Phosphor icons + price hierarchy"
```

---

### Task 6: `WishlistDrawer.tsx` — icons and price hierarchy

**Files:**
- Modify: `src/components/WishlistDrawer.tsx`

- [ ] **Step 1: Replace the icon import**

Find:

```tsx
import { X, Heart, Trash2, ShoppingCart } from 'lucide-react';
```

Replace with:

```tsx
import { X, Heart, Trash, ShoppingCart } from '@phosphor-icons/react';
```

- [ ] **Step 2: Rename JSX tags and add duotone weight**

Find:

```tsx
            <Heart className="w-5 h-5 text-berlin-red" />
```

Replace with:

```tsx
            <Heart className="w-5 h-5 text-berlin-red" weight="duotone" />
```

Find:

```tsx
            <X className="w-4 h-4 text-gray-400" />
```

Replace with:

```tsx
            <X className="w-4 h-4 text-gray-400" weight="duotone" />
```

Find:

```tsx
            <Heart className="w-12 h-12 mb-3 opacity-50" />
```

Replace with:

```tsx
            <Heart className="w-12 h-12 mb-3 opacity-50" weight="duotone" />
```

Find:

```tsx
                    <ShoppingCart className="w-3 h-3" /> Pindah ke Keranjang
```

Replace with:

```tsx
                    <ShoppingCart className="w-3 h-3" weight="duotone" /> Pindah ke Keranjang
```

Find:

```tsx
                <button onClick={() => onRemove(p.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
```

Replace with:

```tsx
                <button onClick={() => onRemove(p.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                  <Trash className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" weight="duotone" />
                </button>
```

- [ ] **Step 3: Price hierarchy**

Find:

```tsx
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">{fmt(p.price)}</p>
```

Replace with:

```tsx
                  <p className="text-sm font-black text-berlin-navy dark:text-berlin-gold tabular-nums mt-0.5">{fmt(p.price)}</p>
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `WishlistDrawer.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/components/WishlistDrawer.tsx
git commit -m "refactor: migrate WishlistDrawer to Phosphor icons + price hierarchy"
```

---

### Task 7: Visual verification pass

**Files:**
- None modified — verifies Tasks 1-6 using the `agent-browser` skill (already installed).

- [ ] **Step 1: Confirm the dev server is running**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/` (adjust port if different) — expect `200`. If not running, start with `npm run dev`.

- [ ] **Step 2: Open the public marketplace route and screenshot**

The marketplace is reachable from the landing page's "Marketplace" nav link, or check `src/App.tsx` for the exact `currentView`/route trigger if it's not a direct URL path.

```bash
npx agent-browser open http://localhost:3001/
npx agent-browser find text "Marketplace" click
npx agent-browser wait --load networkidle
npx agent-browser screenshot /tmp/verify-marketplace.png --full
npx agent-browser console
```

Expected: no `[error]` lines in console output.

- [ ] **Step 3: Read the screenshot and confirm visually**

Check: sidebar category active state and pagination active page are navy (not black/white), every 5th product card is visibly wider with a 16:9 image, price is the largest/boldest text on each card (bigger than the product name), icons render as Phosphor duotone shapes (not missing/broken glyphs).

- [ ] **Step 4: Verify scroll reveal**

```bash
npx agent-browser scroll down 800
```

Then screenshot again — cards that were off-screen on initial load should now be at full opacity (the `is-visible` class applied). If unsure visually, this is also checkable via `agent-browser` snapshot/get calls, but a visual screenshot comparison is sufficient here.

- [ ] **Step 5: Open cart and wishlist drawers**

```bash
npx agent-browser find text "Tambah" click
npx agent-browser screenshot /tmp/verify-cart-badge.png
```

Then open the cart drawer (click the cart icon in the header) and screenshot to confirm the price inside the drawer also uses the new brand-navy bold treatment.

- [ ] **Step 6: Report results**

Summarize what was verified and any discrepancy found (fixed inline or flagged), then close out the task list.
