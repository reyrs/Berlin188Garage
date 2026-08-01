# Berlin188 Garage — project notes

Car workshop management app (Indonesian, "Spesialis Bengkel Mobil Eropa"). React + Vite + Supabase.
Brand guideline PDF: `/Users/reyhanresha/Documents/project/Berlin188Garage_BrandGuideline_v3.pdf` (colors, Instrument Sans typeface, "never straight" accent rule — see `src/components/CurveAccent.tsx`).

## ⚠️ PENDING: backend database was never actually provisioned

**Status as of 2026-07-31**: `supabase-schema.sql` exists in the repo but was **never executed** against the live linked Supabase project (`berlin188`, ref `bkwosbuifkelucwxjtqp`, created 2026-07-29). Confirmed via `supabase db dump` (empty `public` schema) and the Supabase Dashboard SQL Editor itself returning `relation "orders" does not exist`. Every Supabase call in `src/lib/db.ts` is wrapped in silent `try/catch`, so the app has been running purely on in-memory mock data (`src/data/mockData.ts`) this whole time — nothing typed in by staff has ever actually persisted.

Auditing `supabase-schema.sql` against `src/lib/db.ts` while investigating turned up **two more bugs** that would keep the backend broken even after creating the tables:

1. `profiles.id` is `UUID PRIMARY KEY REFERENCES auth.users(id)` — but staff login (`src/components/LoginModal.tsx`) is a mock client-side check against `INITIAL_USERS` (plain string ids like `'owner-1'`, `'advisor-1'`), not real Supabase Auth. `seedProfiles()` would fail on every insert.
2. `orders.advisor_id` / `orders.assigned_mechanic_id` are `UUID REFERENCES profiles(id)` — same mismatch, same string ids passed in from `App.tsx`. Every `createOrder`/`updateOrder` call setting these would fail (invalid UUID syntax).
3. Every RLS policy is `FOR ALL TO authenticated` only — but this app never establishes a real Supabase Auth session (no code path calls `supabase.auth.signInWithPassword` anymore since the marketplace's customer/vendor auth was removed), so every request hits Postgres as `anon`. Anon gets silently denied everywhere, even once #1/#2 are fixed.

### The fix (already planned, not yet applied)

Rewrite `supabase-schema.sql`:
- `profiles.id`: `TEXT PRIMARY KEY` (drop the `auth.users` FK).
- `orders.advisor_id` / `orders.assigned_mechanic_id`: `TEXT REFERENCES profiles(id)` (was `UUID`).
- Every RLS policy: `TO anon, authenticated` (was `TO authenticated` only).
- Keep `dp_amount NUMERIC` on `orders` (already added this session, see below).
- Everything else (table list, JSONB columns, indexes, `updated_at` trigger) stays as-is.

No data-migration risk — nothing has ever actually been written, so this is a plain `CREATE`, not an `ALTER` of live data.

**Next step**: rewrite `supabase-schema.sql` with the three fixes above, then the user runs it once via the Supabase Dashboard SQL Editor (confirmed-working connection path — the failed `ALTER TABLE` proved the editor itself works, it correctly reported the missing table). After that, delete `supabase/migrations/20260731104328_add_dp_amount.sql` (redundant once `dp_amount` is in the base `CREATE TABLE`), then verify: staff login → create a WO → reload the page → confirm it survived (proof of real persistence, not just React state).

**Explicit constraint from the user**: do not touch `src/components/LandingPage.tsx`, the marketplace feature (`ProductMarketplace.tsx`, `ProductCard.tsx`, `CartDrawer.tsx`, `WishlistDrawer.tsx`, `AiChat.tsx`, `src/lib/ai.ts`, `supabase/functions/ai-chat/`, `src/data/products.ts`) while doing this backend fix — none of the above touches those anyway.

## Other context from this session (2026-07-31)

- Marketplace direction: katalog + WhatsApp checkout (not a multi-vendor marketplace) — the old vendor/Supabase-checkout path was deliberately removed.
- AI Assistant chat in the marketplace calls Gemini through a Supabase Edge Function (`supabase/functions/ai-chat/`) specifically so the API key never reaches the browser — do not revert to calling `@google/generative-ai` client-side.
- Two DP-tracking / customer-approval bugs were found and fixed in the *app code* already (customer can now approve/reject their own findings in `TrackingPortal.tsx`; `Order.dpAmountPaid` tracks down-payments to avoid double-counting revenue) — these fixes are complete and correct, they're just waiting on the database above to actually exist so they can persist.
