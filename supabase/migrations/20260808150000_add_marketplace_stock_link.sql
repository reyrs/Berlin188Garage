-- Links a real gudang inventory row to a specific public marketplace listing
-- (src/data/products.ts, a static client-side catalog scraped from Shopee —
-- not a DB table, so no real FK is possible; marketplace_product_id is a
-- plain TEXT reference by convention, set explicitly by staff, never
-- auto-matched by name/code since the two catalogs use unrelated numbering).
--
-- warehouse_stock itself stays staff-only (RLS: owner/gudang, unchanged).
-- The public marketplace only ever needs (product id -> current stock) for
-- rows that have been explicitly linked, so — same pattern as
-- 20260803120000_fix_orders_anon_exposure.sql — that's exposed via a narrow
-- SECURITY DEFINER function instead of opening warehouse_stock to anon.
--
-- Run this once in the Supabase Dashboard SQL Editor.

ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS marketplace_product_id TEXT;

CREATE OR REPLACE FUNCTION public_marketplace_stock_lookup()
RETURNS TABLE(marketplace_product_id TEXT, stock INTEGER)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.marketplace_product_id, w.stock
  FROM warehouse_stock w
  WHERE w.marketplace_product_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public_marketplace_stock_lookup() TO anon, authenticated;
