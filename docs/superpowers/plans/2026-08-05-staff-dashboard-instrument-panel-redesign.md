# Staff Dashboard Instrument-Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the repeated generic card pattern across the 10 staff-only dashboard panels with a two-tier "instrument panel" elevation system and a Phosphor duotone icon set, without touching any public/customer-facing code or backend logic.

**Architecture:** Two new shared UI components (`<IconTile>`, `<KpiTile>`) consume the existing `KPI_TONE` tokens from `src/lib/design.ts`. Two CSS-level tokens define the tiers: the existing `.card`/`.card-padded` utilities in `src/index.css` become the flat "Tier 2" treatment (already mostly correct — just a radius fix), and a new `.card-instrument` utility becomes the tinted-shadow "Tier 1" treatment used only by `<KpiTile>`. Each of the 10 panel files gets its `lucide-react` import swapped for `@phosphor-icons/react` (duotone weight) and its hand-rolled KPI/card markup swapped for the shared components or the `.card`/`.card-padded` utility classes.

**Tech Stack:** React 19, Vite, Tailwind CSS v4 (`@theme`/`@utility` syntax in `src/index.css`), TypeScript. New dependency: `@phosphor-icons/react` (verified latest: `2.1.10`).

## Global Constraints

- Do NOT modify `src/components/LandingPage.tsx`, `ProductMarketplace.tsx`, `ProductCard.tsx`, `CartDrawer.tsx`, `WishlistDrawer.tsx`, `AiChat.tsx`, `TrackingPortal.tsx`, `BlogEditor.tsx`, `BlogListPage.tsx`, `BlogPostPage.tsx`, `ThemeToggle.tsx` — these stay on `lucide-react` and their current styling, untouched.
- Do NOT modify `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/supabase.ts`, or any Supabase schema/migration. This is a pure visual restyle — zero logic/data changes.
- Do NOT modify the structure of `KPI_TONE`/`STATUS_CONFIG`/`STATUS_SOLID`/`formatRupiah` in `src/lib/design.ts` — only consume them.
- Every task's file edits must leave `npm run lint` (which runs `tsc --noEmit`) passing with no new errors.
- Verification is visual (screenshot comparison via the already-installed `agent-browser` skill), not unit tests — this codebase has no test runner configured (`package.json` has no `test` script).
- Leftover test data `WO-260805-G2LBP` in the live database is explicitly out of scope — do not touch it as part of this work.

---

### Task 1: CSS tokens — Tier 1 (`card-instrument`) and Tier 2 (`card`/`card-padded` radius fix)

**Files:**
- Modify: `src/index.css:58-107`

**Interfaces:**
- Produces: CSS utility classes `card-instrument` (Tier 1, tinted shadow, no border, `rounded-lg`) and `card`/`card-padded` (Tier 2, unchanged bg/border, radius changed to `rounded-md`) — every later task's JSX references these two class names by name.

- [ ] **Step 1: Add the `--shadow-instrument` token to the `@theme` block**

In `src/index.css`, inside the existing `@theme { ... }` block, right after the `--shadow-modal` line (line 68), add:

```css
  --shadow-instrument: 0 4px 6px -1px rgb(0 101 192 / 0.06), 0 2px 4px -2px rgb(0 101 192 / 0.04);
```

- [ ] **Step 2: Change the Tier 2 `card` utility's radius from `rounded-2xl` to `rounded-md`**

Find (around line 102-104):

```css
@utility card {
  @apply bg-white border border-gray-150 rounded-2xl;
}
```

Replace with:

```css
@utility card {
  @apply bg-white border border-gray-150 rounded-md;
}
```

(`.card-padded` right below it is `@apply card p-5;` — leave that line unchanged, it inherits the radius fix automatically.)

- [ ] **Step 3: Add the new Tier 1 `card-instrument` utility**

Directly below the `.card-padded` block (after line 107), add:

```css
/* Tier 1 — KPI tiles: tinted shadow, no border, used only by <KpiTile>. */
@utility card-instrument {
  @apply bg-white rounded-lg;
  box-shadow: var(--shadow-instrument);
}
```

- [ ] **Step 4: Verify no build errors**

Run: `npm run dev` (or if already running, check the terminal/browser for Vite/PostCSS errors) — Tailwind v4's `@utility` directive will fail the build loudly if the syntax is wrong.
Expected: dev server starts / hot-reloads with no CSS compile errors.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: add instrument-panel CSS tokens (Tier 1 card-instrument, Tier 2 card radius fix)"
```

---

### Task 2: `<IconTile>` shared component

**Files:**
- Create: `src/components/ui/IconTile.tsx`

**Interfaces:**
- Consumes: `KpiTone` type and `KPI_TONE` map from `src/lib/design.ts` (existing, unchanged — `KPI_TONE: Record<KpiTone, { bg: string; text: string; border: string }>`).
- Produces: `export default function IconTile({ icon, tone }: IconTileProps)` — a React component. Later tasks (`KpiTile`, and any panel needing a standalone toned icon box) import it as `import IconTile from '../ui/IconTile'` (or `'./ui/IconTile'` depending on file depth).

- [ ] **Step 1: Create the component file**

```tsx
import type { ComponentType } from 'react';
import { KPI_TONE, type KpiTone } from '../../lib/design';

interface IconTileProps {
  icon: ComponentType<{ className?: string; weight?: string }>;
  tone: KpiTone;
}

export default function IconTile({ icon: Icon, tone }: IconTileProps) {
  const t = KPI_TONE[tone];
  return (
    <div className={`w-8 h-8 rounded-lg ${t.bg} ${t.text} flex items-center justify-center shrink-0`}>
      <Icon className="w-4 h-4" weight="duotone" />
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no new TypeScript errors referencing `IconTile.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/IconTile.tsx
git commit -m "feat: add shared IconTile component for toned KPI icons"
```

---

### Task 3: `<KpiTile>` shared component

**Files:**
- Create: `src/components/ui/KpiTile.tsx`

**Interfaces:**
- Consumes: `IconTile` from Task 2 (`import IconTile from './IconTile'`), `KpiTone` from `src/lib/design.ts`.
- Produces: `export default function KpiTile({ label, value, sublabel, icon, tone }: KpiTileProps)`. Tasks 5-8 import this as `import KpiTile from './ui/KpiTile'` and render `<KpiTile label="..." value="..." sublabel="..." icon={SomeIcon} tone="success" />`.

- [ ] **Step 1: Create the component file**

```tsx
import type { ComponentType } from 'react';
import type { KpiTone } from '../../lib/design';
import IconTile from './IconTile';

interface KpiTileProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: ComponentType<{ className?: string; weight?: string }>;
  tone: KpiTone;
}

export default function KpiTile({ label, value, sublabel, icon, tone }: KpiTileProps) {
  return (
    <div className="card-instrument p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</span>
        <IconTile icon={icon} tone={tone} />
      </div>
      <div className="space-y-0.5">
        <div className="text-lg sm:text-xl font-bold text-black font-sans tabular-nums">{value}</div>
        {sublabel && (
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no new TypeScript errors referencing `KpiTile.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/KpiTile.tsx
git commit -m "feat: add shared KpiTile component (Tier 1 instrument-panel KPI card)"
```

---

### Task 4: Install `@phosphor-icons/react` and record the verified icon mapping

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm install)

**Interfaces:**
- Produces: the `@phosphor-icons/react` package available for import in Tasks 5-14. Every icon import in those tasks uses `weight="duotone"` (or, per `IconTile`, that prop is already baked in — panels that use icons *outside* `IconTile`, e.g. inline in headers, must add `weight="duotone"` manually).

The table below was verified against the actual installed package (`npm pack @phosphor-icons/react@2.1.10`, checked real `.d.ts` export names) — every mapping is a real export, not a guess. Use this table verbatim in Tasks 5-14; do not invent alternate names.

| Lucide (current) | Phosphor (verified export name) |
|---|---|
| DollarSign | CurrencyDollar |
| ShieldAlert | ShieldWarning |
| Users | Users |
| Car | Car |
| Wrench | Wrench |
| Clock | Clock |
| Calendar | Calendar |
| CheckSquare | CheckSquare |
| Sparkles | Sparkle |
| Award | Medal |
| TrendingUp | TrendUp |
| TrendingDown | TrendDown |
| UserPlus | UserPlus |
| ChevronRight | CaretRight |
| ChevronDown | CaretDown |
| Check | Check |
| CheckCircle | CheckCircle |
| CheckCircle2 | CheckCircle |
| HelpCircle | Question |
| FileText | FileText |
| ArrowRight | ArrowRight |
| ArrowLeft | ArrowLeft |
| Search | MagnifyingGlass |
| Filter | Funnel |
| AlertTriangle | Warning |
| AlertCircle | WarningCircle |
| Package | Package |
| PackagePlus | Package (no direct Phosphor equivalent — use plain `Package`) |
| MapPin | MapPin |
| Trash2 | Trash |
| ClipboardList | ClipboardText |
| Compass | Compass |
| Sliders | Sliders |
| Hash | HashStraight |
| X | X |
| RotateCcw | ArrowCounterClockwise |
| Info | Info |
| BarChart2 | ChartBar |
| Camera | Camera |
| Image | Image |
| Star | Star |
| Upload | UploadSimple |
| Save | FloppyDisk |
| Loader2 | CircleNotch |
| Plus | Plus |
| Eye | Eye |
| EyeOff | EyeSlash |
| Pencil | PencilSimple |
| Wallet | Wallet |
| FileBarChart | ChartBarHorizontal |
| Zap | Lightning |
| PlusCircle | PlusCircle |
| Printer | Printer |
| Banknote | Money |
| CreditCard | CreditCard |
| ShoppingCart | ShoppingCart |
| MoreHorizontal | DotsThree |
| Settings | Gear |
| Send | PaperPlaneTilt |
| RefreshCw | ArrowsClockwise |
| Smartphone | DeviceMobile |
| CornerDownRight | ArrowElbowDownRight |

- [ ] **Step 1: Install the dependency**

Run: `npm install @phosphor-icons/react@2.1.10`
Expected: `package.json` gains `"@phosphor-icons/react": "2.1.10"` under `dependencies`.

- [ ] **Step 2: Verify the import resolves**

Run: `echo "import { CurrencyDollar } from '@phosphor-icons/react';" > /tmp/phosphor-check.tsx && npx tsc --noEmit --jsx react-jsx --esModuleInterop --moduleResolution bundler /tmp/phosphor-check.tsx`
Expected: no "Cannot find module '@phosphor-icons/react'" error (unrelated JSX-config warnings from this throwaway one-off check are fine — this step only confirms the package resolves, not that the whole throwaway file type-checks cleanly).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @phosphor-icons/react dependency for staff dashboard icon migration"
```

---

### Task 5: `OwnerPanel.tsx` — migrate to `<KpiTile>` + Phosphor icons

**Files:**
- Modify: `src/components/OwnerPanel.tsx:1-105`

**Interfaces:**
- Consumes: `KpiTile` from `./ui/KpiTile` (Task 3), Phosphor icons (Task 4 table).

This file hand-rolls 4 near-identical KPI cards (lines 49-103) using ad hoc colors (`emerald-50/emerald-800`, `red-50/red-800`, `sky-50/sky-800`, `gray-100/black`) instead of the existing `KPI_TONE` tokens — migrating to `<KpiTile>` both removes the duplication *and* fixes this inconsistency (KPI_TONE's `success`/`danger`/`info`/`neutral` become the source of truth instead of ad hoc Tailwind colors).

- [ ] **Step 1: Replace the icon import**

Find (lines 2-4):

```tsx
import {
  DollarSign, Car, Users, TrendingUp, ShieldAlert, Clock, Calendar, CheckSquare, Sparkles, Award
} from 'lucide-react';
```

Replace with:

```tsx
import {
  CurrencyDollar, Car, Users, TrendUp, ShieldWarning, Clock, Calendar, CheckSquare, Sparkle, Medal
} from '@phosphor-icons/react';
```

- [ ] **Step 2: Add the `KpiTile` and `KPI_TONE` imports**

After the existing `import { Order, ... } from '../types';` line (line 8), add:

```tsx
import KpiTile from './ui/KpiTile';
```

- [ ] **Step 3: Replace the 4 hand-rolled KPI cards (lines 47-105) with `<KpiTile>`**

Find the entire block from `{/* Metrics Row */}` through the closing `</div>` right before `{/* Main Charts & History rows */}` (lines 46-105) and replace with:

```tsx
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          label="TOTAL PENDAPATAN"
          value={formatRupiah(totalRevenue)}
          sublabel="Lunas Diterima"
          icon={CurrencyDollar}
          tone="success"
        />
        <KpiTile
          label="BELUM DIBAYAR"
          value={formatRupiah(pendingRevenue)}
          sublabel="Tagihan Tertunda (Outstanding)"
          icon={ShieldWarning}
          tone="danger"
        />
        <KpiTile
          label="ORDERAN AKTIF"
          value={`${orders.filter(o => o.status !== 'selesai').length} WO`}
          sublabel="Sedang Dikerjakan"
          icon={Car}
          tone="info"
        />
        <KpiTile
          label="TIM STAF AKTIF"
          value={`${staffUsers.length} Orang`}
          sublabel="Teknisi & Administrasi"
          icon={Users}
          tone="neutral"
        />
      </div>
```

- [ ] **Step 4: Add `weight="duotone"` to every remaining inline icon usage in this file**

Run: `grep -n "<TrendUp\|<Clock\|<Calendar\|<CheckSquare\|<Sparkle\|<Medal" src/components/OwnerPanel.tsx`
For every match found (icons used directly in JSX outside the removed KPI block, e.g. in the chart legend or history section), add the `weight="duotone"` prop to that JSX tag.

- [ ] **Step 5: Verify it compiles and renders**

Run: `npm run lint`
Expected: no new errors referencing `OwnerPanel.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/components/OwnerPanel.tsx
git commit -m "refactor: migrate OwnerPanel KPI cards to KpiTile + Phosphor icons"
```

---

### Task 6: `ManagerPanel.tsx` — migrate to `<KpiTile>` + Phosphor icons

**Files:**
- Modify: `src/components/ManagerPanel.tsx:1-100`

**Interfaces:**
- Consumes: `KpiTile` from `./ui/KpiTile` (Task 3), Phosphor icons (Task 4 table).

This file already maps over an array of `{ label, value, icon, color, bg }` (lines 85-99) — the closest of all 10 panels to `<KpiTile>`'s shape already. Note the original array reuses `TrendingUp` for both "Pemasukan" (should trend up, tone success) and "Pengeluaran" (an expense — visually still shown with the same up-arrow icon in the current code, just recolored red). Keep that as-is (not a bug this plan should silently fix beyond icon migration) — do not swap it for `TrendDown`.

- [ ] **Step 1: Replace the icon import**

Find (line 2):

```tsx
import { TrendingUp, Car, Users, CheckCircle2, Clock, AlertTriangle, BarChart2, Calendar, Filter } from 'lucide-react';
```

Replace with:

```tsx
import { TrendUp, Car, Users, CheckCircle, Clock, Warning, ChartBar, Calendar, Funnel } from '@phosphor-icons/react';
```

- [ ] **Step 2: Add the `KpiTile` import**

After `import { STATUS_CONFIG, STATUS_SOLID, KPI_TONE } from '../lib/design';` (line 4), add:

```tsx
import KpiTile from './ui/KpiTile';
```

- [ ] **Step 3: Replace the KPI array shape and rendering (lines 84-100)**

Find:

```tsx
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pemasukan', value: fmt(totalPemasukan), icon: TrendingUp, color: KPI_TONE.success.text, bg: `${KPI_TONE.success.bg} ${KPI_TONE.success.border}` },
          { label: 'Pengeluaran', value: fmt(totalPengeluaran), icon: TrendingUp, color: KPI_TONE.danger.text, bg: `${KPI_TONE.danger.bg} ${KPI_TONE.danger.border}` },
          { label: 'WO Selesai', value: selesai.toString(), icon: CheckCircle2, color: KPI_TONE.success.text, bg: `${KPI_TONE.success.bg} ${KPI_TONE.success.border}` },
          { label: 'WO Aktif', value: aktif.toString(), icon: Clock, color: KPI_TONE.info.text, bg: `${KPI_TONE.info.bg} ${KPI_TONE.info.border}` },
        ].map(s => (
          <div key={s.label} className={`bg-white border ${s.bg} p-5 rounded-2xl shadow-sm space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-gray-400">{periodLabel[period]}</p>
          </div>
        ))}
      </div>
```

Replace with:

```tsx
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Pemasukan', value: fmt(totalPemasukan), icon: TrendUp, tone: 'success' as KpiTone },
          { label: 'Pengeluaran', value: fmt(totalPengeluaran), icon: TrendUp, tone: 'danger' as KpiTone },
          { label: 'WO Selesai', value: selesai.toString(), icon: CheckCircle, tone: 'success' as KpiTone },
          { label: 'WO Aktif', value: aktif.toString(), icon: Clock, tone: 'info' as KpiTone },
        ]).map(s => (
          <KpiTile key={s.label} label={s.label} value={s.value} sublabel={periodLabel[period]} icon={s.icon} tone={s.tone} />
        ))}
      </div>
```

- [ ] **Step 4: Import the `KpiTone` type**

Change the import from `src/lib/design`:

```tsx
import { STATUS_CONFIG, STATUS_SOLID, KPI_TONE } from '../lib/design';
```

to:

```tsx
import { STATUS_CONFIG, STATUS_SOLID, KPI_TONE, type KpiTone } from '../lib/design';
```

- [ ] **Step 5: Add `weight="duotone"` to remaining inline icon usages**

Run: `grep -n "<Car\|<Users\|<AlertTriangle\|<ChartBar\|<Calendar\|<Funnel" src/components/ManagerPanel.tsx` (post-rename — run after Step 1) and add `weight="duotone"` to each remaining JSX usage outside the replaced KPI block.

- [ ] **Step 6: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `ManagerPanel.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/components/ManagerPanel.tsx
git commit -m "refactor: migrate ManagerPanel KPI cards to KpiTile + Phosphor icons"
```

---

### Task 7: `AccountingPanel.tsx` — migrate KPI array to `<KpiTile>`, remaining cards to `card`/`card-padded`, Phosphor icons

**Files:**
- Modify: `src/components/AccountingPanel.tsx` (KPI block at lines 142-160; ~19 other hand-rolled card wrappers throughout the file, found via the grep in Step 3)

**Interfaces:**
- Consumes: `KpiTile` from `./ui/KpiTile` (Task 3), Phosphor icons (Task 4 table), `.card`/`.card-padded` utilities (Task 1).

This file already types its KPI array as `tone: KpiTone` (line 144-147) — the least work of any panel to migrate.

- [ ] **Step 1: Replace the icon import**

Find:

```tsx
import {
  DollarSign, TrendingDown, TrendingUp, PlusCircle, FileText, X,
  Calendar, Filter, ChevronDown, Printer, Banknote, CreditCard,
  ShoppingCart, Zap, Users, MoreHorizontal, CheckCircle2, AlertCircle
} from 'lucide-react';
```

Replace with:

```tsx
import {
  CurrencyDollar, TrendDown, TrendUp, PlusCircle, FileText, X,
  Calendar, Funnel, CaretDown, Printer, Money, CreditCard,
  ShoppingCart, Lightning, Users, DotsThree, CheckCircle, WarningCircle
} from '@phosphor-icons/react';
```

- [ ] **Step 2: Add the `KpiTile` import**

Add near the top of the file, after the `KPI_TONE`-related import:

```tsx
import KpiTile from './ui/KpiTile';
```

- [ ] **Step 3: Replace the KPI grid rendering (around line 148-159)**

Find:

```tsx
            ].map((kpi, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{kpi.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${KPI_TONE[kpi.tone].bg} ${KPI_TONE[kpi.tone].text} flex items-center justify-center`}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900 font-sans">{kpi.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</div>
              </div>
            ))}
```

Replace with:

```tsx
            ].map((kpi, i) => (
              <KpiTile key={i} label={kpi.label} value={kpi.value} sublabel={kpi.sub} icon={kpi.icon} tone={kpi.tone} />
            ))}
```

- [ ] **Step 4: Update the icon references inside the KPI array definition (2 lines above the block replaced in Step 3)**

Find:

```tsx
              { label: 'Pendapatan Hari Ini', value: formatRp(todayIncome), icon: TrendingUp, tone: 'success' as KpiTone, sub: `${todayTx.filter(t=>t.type==='masuk').length} transaksi` },
              { label: 'Pengeluaran Hari Ini', value: formatRp(todayExpenses), icon: TrendingDown, tone: 'danger' as KpiTone, sub: 'Biaya operasional' },
              { label: 'Total Pendapatan', value: formatRp(totalIncome), icon: DollarSign, tone: 'info' as KpiTone, sub: 'Sejak awal' },
              { label: 'Net Profit', value: formatRp(netProfit), icon: CheckCircle2, tone: (netProfit >= 0 ? 'success' : 'danger') as KpiTone, sub: 'Pendapatan - Pengeluaran' },
```

Replace with:

```tsx
              { label: 'Pendapatan Hari Ini', value: formatRp(todayIncome), icon: TrendUp, tone: 'success' as KpiTone, sub: `${todayTx.filter(t=>t.type==='masuk').length} transaksi` },
              { label: 'Pengeluaran Hari Ini', value: formatRp(todayExpenses), icon: TrendDown, tone: 'danger' as KpiTone, sub: 'Biaya operasional' },
              { label: 'Total Pendapatan', value: formatRp(totalIncome), icon: CurrencyDollar, tone: 'info' as KpiTone, sub: 'Sejak awal' },
              { label: 'Net Profit', value: formatRp(netProfit), icon: CheckCircle, tone: (netProfit >= 0 ? 'success' : 'danger') as KpiTone, sub: 'Pendapatan - Pengeluaran' },
```

- [ ] **Step 4: Replace remaining hand-rolled card wrappers with `card`/`card-padded`**

Run: `grep -n "bg-white border border-gray-200" src/components/AccountingPanel.tsx`
For each match (there are roughly 19 outside the KPI block, e.g. `"bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"` at line 185, `"bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"` at line 317): replace the `bg-white border border-gray-200 rounded-2xl ... shadow-sm` portion of each class string with `card` (if the rest of the string only adds layout modifiers like `overflow-hidden` or `flex items-center justify-between`, keep those alongside `card`, e.g. `"card overflow-hidden"`), or `card-padded` if the original included exactly `p-5` (drop the now-redundant `p-5` since `card-padded` already includes it). Where the original padding was `p-4` or `p-6` instead of `p-5`, use `card p-4` / `card p-6` instead of `card-padded` (keep the original padding value, just replace `bg-white border border-gray-200 rounded-2xl` + `shadow-sm`/`shadow-xs` with `card`).

- [ ] **Step 5: Add `weight="duotone"` to remaining inline icon usages**

Run: `grep -n "<CurrencyDollar\|<TrendDown\|<TrendUp\|<PlusCircle\|<FileText\|<Calendar\|<Funnel\|<CaretDown\|<Printer\|<Money\|<CreditCard\|<ShoppingCart\|<Lightning\|<Users\|<DotsThree\|<CheckCircle\|<WarningCircle" src/components/AccountingPanel.tsx` and add `weight="duotone"` to each match not already inside `<KpiTile>`/`<IconTile>` (those already set it internally).

- [ ] **Step 6: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `AccountingPanel.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/components/AccountingPanel.tsx
git commit -m "refactor: migrate AccountingPanel KPI cards + secondary cards to instrument-panel tokens"
```

---

### Task 8: `FinanceReportPanel.tsx` — bespoke Tier 1 headline card + `card`/`card-padded` for the rest, Phosphor icons

**Files:**
- Modify: `src/components/FinanceReportPanel.tsx`

**Interfaces:**
- Consumes: Phosphor icons (Task 4 table), `.card`/`.card-padded`/`.card-instrument` utilities (Task 1). Does **not** use `<KpiTile>` — the "Laba/Rugi" headline card has a different shape (large single metric, icon on the right at `w-10 h-10`, not top-right at `w-8 h-8`) and forcing it into `<KpiTile>` would require changing that component's API for one caller. Per the spec's hybrid approach, this one stays hand-styled but uses the same Tier 1 token directly.

- [ ] **Step 1: Replace the icon import**

Find (line 2):

```tsx
import { TrendingUp, TrendingDown, Wallet, FileBarChart } from 'lucide-react';
```

Replace with:

```tsx
import { TrendUp, TrendDown, Wallet, ChartBarHorizontal } from '@phosphor-icons/react';
```

- [ ] **Step 2: Restyle the header card (line 79) to Tier 2**

Find:

```tsx
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
```

Replace with:

```tsx
      <div className="card p-6">
```

- [ ] **Step 3: Restyle the Laba/Rugi headline card (line 100) to Tier 1, using the `card-instrument` token directly**

Find:

```tsx
      <div className={`border rounded-2xl p-6 shadow-sm ${isProfit ? `${KPI_TONE.success.bg} ${KPI_TONE.success.border}` : `${KPI_TONE.danger.bg} ${KPI_TONE.danger.border}`}`}>
```

Replace with:

```tsx
      <div className="card-instrument p-6">
```

(The tinted background/border that distinguished profit vs. loss is dropped in favor of the tinted shadow doing that job instead — the icon and large colored number, changed in Step 4 below, already carry the success/danger meaning without needing a colored card background too.)

- [ ] **Step 4: Update the icon usages in the headline card and update it to use `weight="duotone"`**

Find:

```tsx
          {isProfit ? <TrendingUp className={`w-10 h-10 ${KPI_TONE.success.text}`} /> : <TrendingDown className={`w-10 h-10 ${KPI_TONE.danger.text}`} />}
```

Replace with:

```tsx
          {isProfit ? <TrendUp className={`w-10 h-10 ${KPI_TONE.success.text}`} weight="duotone" /> : <TrendDown className={`w-10 h-10 ${KPI_TONE.danger.text}`} weight="duotone" />}
```

- [ ] **Step 5: Replace the two remaining hand-rolled Tier 2 cards (lines 115, 138) with `card-padded`**

Find both occurrences of:

```tsx
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
```

Replace each with:

```tsx
        <div className="card-padded space-y-4">
```

- [ ] **Step 6: Replace the third card at line 162 (verify exact class string first)**

Run: `grep -n "bg-white border border-gray-200" src/components/FinanceReportPanel.tsx` to confirm the remaining match's exact class string (padding may differ), then apply the same `card`/`card-padded` substitution rule as Task 7 Step 4.

- [ ] **Step 7: Add `weight="duotone"` to any remaining `<Wallet` / `<ChartBarHorizontal` usages**

Run: `grep -n "<Wallet\|<ChartBarHorizontal" src/components/FinanceReportPanel.tsx` and add the prop to any match not already updated.

- [ ] **Step 8: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `FinanceReportPanel.tsx`.

- [ ] **Step 9: Commit**

```bash
git add src/components/FinanceReportPanel.tsx
git commit -m "refactor: restyle FinanceReportPanel to instrument-panel tokens + Phosphor icons"
```

---

### Task 9: `WarehousePanel.tsx` — `card`/`card-padded` conversion + Phosphor icons

**Files:**
- Modify: `src/components/WarehousePanel.tsx` (icon import; ~10 hand-rolled card wrappers found via grep)

**Interfaces:**
- Consumes: Phosphor icons (Task 4 table), `.card`/`.card-padded` utilities (Task 1). No `<KpiTile>` usage — this file has no KPI-grid section (verified: no `grid grid-cols-2 lg:grid-cols-4` pattern present).

- [ ] **Step 1: Replace the icon import**

Find:

```tsx
import { 
  Package, Search, Plus, MapPin, Trash2, ClipboardList, AlertCircle, CheckCircle2, ChevronRight, CornerDownRight, PackagePlus, Compass, Sliders, Hash, Check, X, RotateCcw
} from 'lucide-react';
```

Replace with:

```tsx
import { 
  Package, MagnifyingGlass, Plus, MapPin, Trash, ClipboardText, WarningCircle, CheckCircle, CaretRight, ArrowElbowDownRight, Compass, Sliders, HashStraight, Check, X, ArrowCounterClockwise
} from '@phosphor-icons/react';
```

(`PackagePlus` had no direct Phosphor equivalent per the Task 4 table — it's dropped from the import since plain `Package` is already imported and covers both uses. Step 2 below finds every call site that needs updating to use `Package` instead.)

- [ ] **Step 2: Replace every `<PackagePlus` JSX usage with `<Package`**

Run: `grep -n "<PackagePlus" src/components/WarehousePanel.tsx`
For each match, replace the tag name `PackagePlus` with `Package` (keep all props/classes on that tag as-is).

- [ ] **Step 3: Replace hand-rolled card wrappers with `card`/`card-padded`**

Run: `grep -n "bg-white border border-gray-200\|bg-white border border-gray-150" src/components/WarehousePanel.tsx`
For each of the ~10 matches, apply the same substitution rule as Task 7 Step 4: replace the `bg-white border border-gray-{150,200} rounded-{xl,2xl} ... shadow-{sm,xs}` portion with `card` (plus any remaining layout modifier classes), or `card-padded` when the original padding is exactly `p-5`.

- [ ] **Step 4: Add `weight="duotone"` to every remaining icon JSX usage**

Run: `grep -n "<Package\|<MagnifyingGlass\|<Plus\|<MapPin\|<Trash\|<ClipboardText\|<WarningCircle\|<CheckCircle\|<CaretRight\|<ArrowElbowDownRight\|<Compass\|<Sliders\|<HashStraight\|<Check\|<X\|<ArrowCounterClockwise" src/components/WarehousePanel.tsx` and add `weight="duotone"` to each match.

- [ ] **Step 5: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `WarehousePanel.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/components/WarehousePanel.tsx
git commit -m "refactor: migrate WarehousePanel cards to card/card-padded tokens + Phosphor icons"
```

---

### Task 10: `TechnicianPanel.tsx` — Phosphor icons only

**Files:**
- Modify: `src/components/TechnicianPanel.tsx:1-99`

**Interfaces:**
- Consumes: Phosphor icons (Task 4 table). This file already uses `card-padded`/`card` (lines 26, 88) — it gets the Tier 2 radius fix from Task 1 automatically, with zero JSX changes needed for card styling.

- [ ] **Step 1: Replace the icon import**

Find (line 2):

```tsx
import { ClipboardList, FileText, Wrench, Users, Info } from 'lucide-react';
```

Replace with:

```tsx
import { ClipboardText, FileText, Wrench, Users, Info } from '@phosphor-icons/react';
```

- [ ] **Step 2: Rename the one `<ClipboardList` JSX usage and add `weight="duotone"` to all 5 icons**

Find (line 67):

```tsx
              <ClipboardList className="w-8 h-8 text-gray-200 mx-auto" />
```

Replace with:

```tsx
              <ClipboardText className="w-8 h-8 text-gray-200 mx-auto" weight="duotone" />
```

Then find the remaining 4 usages (lines 28, 53, 80, 89 — `Users`, `Wrench`, `Info`, `FileText`) and add `weight="duotone"` to each.

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `TechnicianPanel.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/TechnicianPanel.tsx
git commit -m "refactor: migrate TechnicianPanel to Phosphor icons"
```

---

### Task 11: `AdvisorDashboard.tsx` — `card`/`card-padded` conversion + Phosphor icons (stats grid left bespoke)

**Files:**
- Modify: `src/components/AdvisorDashboard.tsx` (icon import at lines 6-8; ~14 hand-rolled card wrappers found via grep)

**Interfaces:**
- Consumes: Phosphor icons (Task 4 table), `.card`/`.card-padded` utilities (Task 1).

This file's "Stats Grid" (lines 866-899+, labels like "TOTAL AKTIF"/"BUTUH ACC SA") is intentionally **not** migrated to `<KpiTile>` — it already uses a flat, no-shadow, tinted-background treatment (`bg-amber-50/50`, `bg-blue-50/40`, etc., value+sublabel on one row via `flex items-baseline justify-between`) that's a different, already-understated shape than the icon-top-right `<KpiTile>` layout. Forcing it into `<KpiTile>` would require changing that component's layout for one caller and would lose the value-and-sublabel-inline treatment. Leave that grid's JSX structure as-is; only its icons change.

- [ ] **Step 1: Replace the icon import**

Find:

```tsx
import {
  Wrench, Users, CheckCircle2, ChevronRight, AlertTriangle, Search, Filter,
  Clock, Sparkles, User, FileText, ArrowLeft, Check, X, ShieldAlert, Car, RefreshCw, Smartphone,
  Camera, Upload, Trash2, AlertCircle, Plus, Send, Package, Settings
} from 'lucide-react';
```

Replace with:

```tsx
import {
  Wrench, Users, CheckCircle, CaretRight, Warning, MagnifyingGlass, Funnel,
  Clock, Sparkle, User, FileText, ArrowLeft, Check, X, ShieldWarning, Car, ArrowsClockwise, DeviceMobile,
  Camera, UploadSimple, Trash, WarningCircle, Plus, PaperPlaneTilt, Package, Gear
} from '@phosphor-icons/react';
```

- [ ] **Step 2: Replace renamed JSX tag usages**

Run each of the following and rename the JSX tag (keep all props on the tag as-is) for every match:

```bash
grep -n "<CheckCircle2\b" src/components/AdvisorDashboard.tsx   # → CheckCircle
grep -n "<ChevronRight\b" src/components/AdvisorDashboard.tsx   # → CaretRight
grep -n "<AlertTriangle\b" src/components/AdvisorDashboard.tsx  # → Warning
grep -n "<Search\b" src/components/AdvisorDashboard.tsx         # → MagnifyingGlass
grep -n "<Filter\b" src/components/AdvisorDashboard.tsx         # → Funnel
grep -n "<Sparkles\b" src/components/AdvisorDashboard.tsx       # → Sparkle
grep -n "<ShieldAlert\b" src/components/AdvisorDashboard.tsx    # → ShieldWarning
grep -n "<RefreshCw\b" src/components/AdvisorDashboard.tsx      # → ArrowsClockwise
grep -n "<Smartphone\b" src/components/AdvisorDashboard.tsx     # → DeviceMobile
grep -n "<Upload\b" src/components/AdvisorDashboard.tsx         # → UploadSimple
grep -n "<Trash2\b" src/components/AdvisorDashboard.tsx         # → Trash
grep -n "<AlertCircle\b" src/components/AdvisorDashboard.tsx    # → WarningCircle
grep -n "<Send\b" src/components/AdvisorDashboard.tsx           # → PaperPlaneTilt
grep -n "<Settings\b" src/components/AdvisorDashboard.tsx       # → Gear
```

- [ ] **Step 3: Replace hand-rolled card wrappers with `card`/`card-padded`**

Run: `grep -n "bg-white border border-gray-200\|bg-white border border-gray-150" src/components/AdvisorDashboard.tsx`
For each of the ~14 matches (excluding the Stats Grid tinted-color cards from Step 0's exclusion note above — those keep their `bg-{color}-50/xx border-{color}-200/xx` classes untouched), apply the same substitution rule as Task 7 Step 4.

- [ ] **Step 4: Add `weight="duotone"` to every icon JSX usage in the file**

Run: `grep -nE "<(Wrench|Users|CheckCircle|CaretRight|Warning|MagnifyingGlass|Funnel|Clock|Sparkle|User|FileText|ArrowLeft|Check|X|ShieldWarning|Car|ArrowsClockwise|DeviceMobile|Camera|UploadSimple|Trash|WarningCircle|Plus|PaperPlaneTilt|Package|Gear)\b" src/components/AdvisorDashboard.tsx` and add `weight="duotone"` to each match that doesn't already have a `weight` prop.

- [ ] **Step 5: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `AdvisorDashboard.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/components/AdvisorDashboard.tsx
git commit -m "refactor: migrate AdvisorDashboard cards to card/card-padded tokens + Phosphor icons"
```

---

### Task 12: `AdvisorPanel.tsx` — `card`/`card-padded` conversion + Phosphor icons

**Files:**
- Modify: `src/components/AdvisorPanel.tsx` (icon import at line 2; ~12 hand-rolled card wrappers found via grep)

**Interfaces:**
- Consumes: Phosphor icons (Task 4 table), `.card`/`.card-padded` utilities (Task 1).

This is the 5-step "Buat WO" wizard verified working end-to-end earlier this session (order creation + persistence) — be careful this task changes **only** class strings and icon imports, never the wizard's state/logic (`step`, `handleNext`, `handleSubmit`, form field state).

- [ ] **Step 1: Replace the icon import**

Find:

```tsx
import { UserPlus, Car, Wrench, ChevronRight, Check, Sparkles, User, HelpCircle, FileText, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react';
```

Replace with:

```tsx
import { UserPlus, Car, Wrench, CaretRight, Check, Sparkle, User, Question, FileText, ArrowRight, ShieldWarning, CheckCircle } from '@phosphor-icons/react';
```

- [ ] **Step 2: Replace renamed JSX tag usages**

Run each and rename the JSX tag (keep all props as-is):

```bash
grep -n "<ChevronRight\b" src/components/AdvisorPanel.tsx   # → CaretRight
grep -n "<Sparkles\b" src/components/AdvisorPanel.tsx       # → Sparkle
grep -n "<HelpCircle\b" src/components/AdvisorPanel.tsx     # → Question
grep -n "<ShieldAlert\b" src/components/AdvisorPanel.tsx    # → ShieldWarning
```

- [ ] **Step 3: Replace hand-rolled card wrappers with `card`/`card-padded`**

Run: `grep -n "bg-white border border-gray-200\|bg-white border border-gray-150" src/components/AdvisorPanel.tsx`
For each of the ~12 matches, apply the same substitution rule as Task 7 Step 4. Do not touch the step-indicator pill classes (the numbered circle badges like `bg-berlin-navy` for the active step) — only the outer card wrapper divs.

- [ ] **Step 4: Add `weight="duotone"` to every icon JSX usage in the file**

Run: `grep -nE "<(UserPlus|Car|Wrench|CaretRight|Check|Sparkle|User|Question|FileText|ArrowRight|ShieldWarning|CheckCircle)\b" src/components/AdvisorPanel.tsx` and add `weight="duotone"` to each match without one already.

- [ ] **Step 5: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `AdvisorPanel.tsx`.

- [ ] **Step 6: Manually re-verify the wizard still works** (this file was touched live in an earlier session — confirm the restyle didn't break it)

Using the already-installed `agent-browser` skill: start the dev server, log in as `owner@berlin188.com` (credentials in `STAFF_CREDENTIALS.local.md`), open "Buat WO", step through all 5 steps with any test data, confirm the "LANJUT"/"SIMPAN & TERBITKAN WORK ORDER" buttons are still clickable and the success screen still appears. Do not actually submit unless you intend to create another test WO — clicking through to the review step (step 5) without pressing submit is enough to confirm the wizard isn't broken.

- [ ] **Step 7: Commit**

```bash
git add src/components/AdvisorPanel.tsx
git commit -m "refactor: migrate AdvisorPanel cards to card/card-padded tokens + Phosphor icons"
```

---

### Task 13: `MarketingPanel.tsx` — `card`/`card-padded` conversion + Phosphor icons

**Files:**
- Modify: `src/components/MarketingPanel.tsx` (icon import at line 2; ~8 hand-rolled card wrappers found via grep)

**Interfaces:**
- Consumes: Phosphor icons (Task 4 table), `.card`/`.card-padded` utilities (Task 1).

- [ ] **Step 1: Replace the icon import**

Find:

```tsx
import { Camera, Image, Star, Upload, Save, Loader2, Trash2, Plus, FileText, Eye, EyeOff, Pencil } from 'lucide-react';
```

Replace with:

```tsx
import { Camera, Image, Star, UploadSimple, FloppyDisk, CircleNotch, Trash, Plus, FileText, Eye, EyeSlash, PencilSimple } from '@phosphor-icons/react';
```

- [ ] **Step 2: Replace renamed JSX tag usages**

Run each and rename the JSX tag (keep all props as-is):

```bash
grep -n "<Upload\b" src/components/MarketingPanel.tsx    # → UploadSimple
grep -n "<Save\b" src/components/MarketingPanel.tsx      # → FloppyDisk
grep -n "<Loader2\b" src/components/MarketingPanel.tsx   # → CircleNotch
grep -n "<Trash2\b" src/components/MarketingPanel.tsx    # → Trash
grep -n "<EyeOff\b" src/components/MarketingPanel.tsx    # → EyeSlash
grep -n "<Pencil\b" src/components/MarketingPanel.tsx    # → PencilSimple
```

Note: if `<CircleNotch` is used as a spinning loading indicator (check for a `animate-spin` class alongside it), keep that class — only the tag name and Phosphor's `weight` prop change, not the animation.

- [ ] **Step 3: Replace hand-rolled card wrappers with `card`/`card-padded`**

Run: `grep -n "bg-white border border-gray-200\|bg-white border border-gray-150" src/components/MarketingPanel.tsx`
For each of the ~8 matches, apply the same substitution rule as Task 7 Step 4.

- [ ] **Step 4: Add `weight="duotone"` to every icon JSX usage in the file**

Run: `grep -nE "<(Camera|Image|Star|UploadSimple|FloppyDisk|CircleNotch|Trash|Plus|FileText|Eye|EyeSlash|PencilSimple)\b" src/components/MarketingPanel.tsx` and add `weight="duotone"` to each match without one already (skip the `CircleNotch` spinner if `weight="duotone"` visually conflicts with the spin animation — `weight="regular"` is also acceptable there since it's a functional spinner, not a KPI icon).

- [ ] **Step 5: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `MarketingPanel.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/components/MarketingPanel.tsx
git commit -m "refactor: migrate MarketingPanel cards to card/card-padded tokens + Phosphor icons"
```

---

### Task 14: `SlotBoard.tsx` — Phosphor icons only (dark monitor board styling untouched)

**Files:**
- Modify: `src/components/SlotBoard.tsx:1-2`

**Interfaces:**
- Consumes: Phosphor icons (Task 4 table).

This component renders a dark-background (`bg-gray-850`) monitor/status board meant for display on a shop-floor screen — it's already flat with no shadow, and its dark theme is a deliberate different context from the light-mode staff panels (not a generic "forgot to redesign it" card). Per the spec's hybrid approach, do **not** apply `card`/`card-padded` (both are `bg-white`, which would break the dark board) — this task is icon-only.

- [ ] **Step 1: Replace the icon import**

Find (line 2):

```tsx
import { Wrench, X } from 'lucide-react';
```

Replace with:

```tsx
import { Wrench, X } from '@phosphor-icons/react';
```

- [ ] **Step 2: Add `weight="duotone"` to both icon usages**

Run: `grep -n "<Wrench\|<X\b" src/components/SlotBoard.tsx` and add `weight="duotone"` to each of the 2 matches.

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `SlotBoard.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/SlotBoard.tsx
git commit -m "refactor: migrate SlotBoard to Phosphor icons (board styling unchanged)"
```

---

### Task 15: Full visual verification pass across all 10 panels

**Files:**
- None modified — this task only verifies Tasks 1-14 with the `agent-browser` skill (already installed this session).

**Interfaces:**
- Consumes: the running dev server (`npm run dev`) and the `agent-browser` CLI (`npx agent-browser ...`, per the skill's own `SKILL.md` at `.agents/skills/agent-browser/SKILL.md`).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (in the background, or in a separate terminal — note the port it picks; 3000 may already be in use per earlier sessions, in which case Vite falls back to 3001).

- [ ] **Step 2: Log in and screenshot each panel that got KPI-tile treatment**

```bash
npx agent-browser open http://localhost:3001/staff
# fill in owner@berlin188.com / the password from STAFF_CREDENTIALS.local.md, click MASUK
npx agent-browser screenshot /tmp/verify-owner-laporan.png --full
npx agent-browser find text "Kelola WO" click
npx agent-browser screenshot /tmp/verify-owner-kelolawo.png --full
```

Repeat `find text "<Tab Name>" click` + `screenshot` for every remaining staff tab visible to the owner role (Buat WO, Gudang, Monitor Service, Monitor Tunggu, Akunting, Laporan Keuangan) to cover Tasks 5-13.

- [ ] **Step 3: Check the browser console for errors after each screenshot**

Run: `npx agent-browser console` after visiting each tab.
Expected: no new `[error]` lines beyond what's already known-expected (there should be none now that Task 1's `getSession()` guard from the earlier session fix is in place — any `warehouse_stock` RLS error here would mean a regression, not this redesign's doing, but still worth flagging if seen).

- [ ] **Step 4: Read each screenshot and visually confirm**

For each `/tmp/verify-*.png`: KPI tiles show the tinted shadow (Tier 1) with no border, icons render as Phosphor duotone (two-tone fill, not flat outline), secondary list/table cards show the flat hairline border with no shadow (Tier 2), and no layout is broken (no overlapping text, no missing icons/broken image placeholders).

- [ ] **Step 5: Spot-check one non-owner role** (confirms the redesign didn't break role-gated rendering)

```bash
npx agent-browser open http://localhost:3001/staff
# log out if needed, log in as advisor@berlin188.com
npx agent-browser screenshot /tmp/verify-advisor.png --full
```

- [ ] **Step 6: Report results to the user**

Summarize which panels were visually verified, any discrepancy found (and whether it was fixed inline or needs follow-up), and close out the task list.
