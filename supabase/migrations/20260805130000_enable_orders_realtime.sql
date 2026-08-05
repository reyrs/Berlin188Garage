-- Enables Supabase Realtime (postgres_changes) on the `orders` table.
-- Without this, the app's realtime subscription (App.tsx, "REALTIME
-- ORDERS" effect) silently receives zero events — no error, it just never
-- fires. RLS still applies to realtime payloads exactly like normal
-- queries, so anon/public sessions won't receive staff order data via
-- this channel either.
--
-- Run this once in the Supabase Dashboard SQL Editor.

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
