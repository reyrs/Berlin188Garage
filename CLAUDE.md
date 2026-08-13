# Berlin188 Garage — project notes

Car workshop management app (Indonesian, "Spesialis Bengkel Mobil Eropa"). React + Vite + Supabase.
Brand guideline PDF: `/Users/reyhanresha/Documents/project/Berlin188Garage_BrandGuideline_v3.pdf` (colors, Instrument Sans typeface, "never straight" accent rule — see `src/components/CurveAccent.tsx`).

## Backend status: provisioned and working (as of 2026-08-07)

**Update 2026-08-07**: the entry that used to live here (dated 2026-07-31) said the Supabase backend was never provisioned and that login was a mock check against `INITIAL_USERS`. That's now stale — confirmed live via a real browser login (`advisor@berlin188.com`) against the linked Supabase project: `profiles`/`orders`/etc. exist, staff login works, and creating a WO persists for real (e.g. `WO-260807-CDAKM`).

What actually happened instead of the fix that was originally planned (rewriting `profiles.id`/`orders.advisor_id` to `TEXT` and opening RLS to `anon`): the auth layer was rebuilt around **real Supabase Auth** instead of the old mock `INITIAL_USERS` check.
- `src/components/LoginModal.tsx` → `signInStaff()` (`src/lib/auth.ts`) now calls `supabase.auth.signInWithPassword` for real.
- `scripts/provision-staff.mjs` (service-role, run once via `npm run staff:provision`) creates real Supabase Auth accounts for each staff member and a matching `profiles` row using that same UUID.
- Because `activeUser.id` is now a real `auth.users` UUID instead of a mock string like `'owner-1'`, `profiles.id UUID REFERENCES auth.users(id)` and `orders.advisor_id/assigned_mechanic_id UUID REFERENCES profiles(id)` (still UUID in `supabase-schema.sql` — never rewritten to `TEXT`) just work.
- Because login establishes a real Supabase Auth session, requests hit Postgres as `authenticated`, not `anon` — so the original `FOR ALL TO authenticated` RLS policies also just work as originally written (also never rewritten to `TO anon, authenticated`).

So the 3 bugs originally logged here were real, but got resolved by fixing the auth architecture rather than loosening the schema — which is the better outcome (anon staying locked out of staff data is correct; a follow-up migration `20260803120000_fix_orders_anon_exposure.sql` even had to close an anon-read/write hole that briefly existed on `orders` for the public tracking portal, replacing it with narrow `SECURITY DEFINER` functions scoped by phone number).

Current known-good state: tables exist, staff login is real, WO create/update persists, orders realtime is live (`20260805130000_enable_orders_realtime.sql`), error logging has its own table (`20260806140000_create_error_logs.sql`). `dp_amount` migration (`20260731104328_add_dp_amount.sql`) referenced in the old entry is gone from `supabase/migrations/` — already reconciled into the base schema, nothing to do there.

**Correction (2026-08-07, same day)**: the "silent try/catch in `db.ts`" claim above was also carried over from the stale 2026-07-31 entry without re-checking — it's not accurate either. Every function in `src/lib/db.ts` does `if (error) throw error` (no swallowing), and every caller in `App.tsx` catches with `console.error` + a user-facing ❌ notification. The only intentional silent catch in the codebase is `src/lib/errorLogger.ts`'s own write failure (documented inline: logging the logger's failure risks an infinite loop). Don't re-flag this as a code-quality issue without re-verifying against the current file first.

## Other context from this session (2026-07-31)

- Marketplace direction: katalog + WhatsApp checkout (not a multi-vendor marketplace) — the old vendor/Supabase-checkout path was deliberately removed.
- AI Assistant chat in the marketplace calls Gemini through a Supabase Edge Function (`supabase/functions/ai-chat/`) specifically so the API key never reaches the browser — do not revert to calling `@google/generative-ai` client-side.
- Two DP-tracking / customer-approval bugs were found and fixed in the *app code* already (customer can now approve/reject their own findings in `TrackingPortal.tsx`; `Order.dpAmountPaid` tracks down-payments to avoid double-counting revenue) — these fixes are complete and correct, they're just waiting on the database above to actually exist so they can persist.
