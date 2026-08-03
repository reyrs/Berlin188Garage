-- Fix: orders table was fully readable AND writable by anon (unauthenticated)
-- requests. `orders_select_anyone` used `USING (true)` for `TO anon,
-- authenticated`, and `orders_write_staff_or_customer` allowed any write
-- from anon with no per-row restriction at all (`auth.role() = 'anon'`).
-- Confirmed live via a plain curl with only the public anon key: it returned
-- every customer's name/phone/address, and would have accepted an UPDATE/
-- DELETE on any order too.
--
-- The public "Cek Servis" tracking portal only ever needed: (1) look up
-- order(s) by phone number, (2) let the customer approve/reject their own
-- pending findings and service items. Both are now narrow SECURITY DEFINER
-- functions that check customer_phone server-side, instead of an open table
-- policy. Everything else on `orders` (status changes, SPK, payment,
-- assigning a mechanic, etc.) is staff-only, unchanged.
--
-- Run this once in the Supabase Dashboard SQL Editor.

-- 1. Anon lookup: replaces client-side "fetch all orders, filter by phone"
-- with a server-side scoped lookup. Runs as SECURITY DEFINER so it can read
-- the table despite the caller having no direct SELECT grant on `orders`.
CREATE OR REPLACE FUNCTION track_orders_by_phone(p_phone TEXT)
RETURNS SETOF orders
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM orders WHERE customer_phone = p_phone;
$$;

-- 2. Customer self-service: approve/reject one of their own findings.
-- Only flips that finding's `status` field inside the findings JSONB array;
-- everything else on the row is untouched. No-op (returns no row) if the
-- phone doesn't match the order, so a wrong/guessed phone can't affect
-- someone else's order.
CREATE OR REPLACE FUNCTION customer_set_finding_status(
  p_order_id TEXT, p_phone TEXT, p_finding_id TEXT, p_status TEXT
)
RETURNS SETOF orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  RETURN QUERY
  UPDATE orders
  SET findings = (
    SELECT jsonb_agg(
      CASE WHEN elem->>'id' = p_finding_id
           THEN elem || jsonb_build_object('status', p_status)
           ELSE elem
      END
    )
    FROM jsonb_array_elements(findings) AS elem
  )
  WHERE id = p_order_id AND customer_phone = p_phone
  RETURNING *;
END;
$$;

-- 3. Customer self-service: approve/reject one of their own service items
-- (jasa/sparepart tambahan). Same shape as above, on service_items instead.
CREATE OR REPLACE FUNCTION customer_set_service_item_status(
  p_order_id TEXT, p_phone TEXT, p_item_id TEXT, p_status TEXT
)
RETURNS SETOF orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  RETURN QUERY
  UPDATE orders
  SET service_items = (
    SELECT jsonb_agg(
      CASE WHEN elem->>'id' = p_item_id
           THEN elem || jsonb_build_object('status', p_status)
           ELSE elem
      END
    )
    FROM jsonb_array_elements(service_items) AS elem
  )
  WHERE id = p_order_id AND customer_phone = p_phone
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION track_orders_by_phone(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION customer_set_finding_status(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION customer_set_service_item_status(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 4. Close the open table policies. Staff (authenticated) keep full access,
-- exactly as before — only the anon branch is removed.
DROP POLICY IF EXISTS "orders_select_anyone" ON orders;
CREATE POLICY "orders_select_staff"
  ON orders FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "orders_write_staff_or_customer" ON orders;
CREATE POLICY "orders_write_staff"
  ON orders FOR ALL TO authenticated
  USING (current_staff_role() IN ('advisor','owner','mekanik','gudang','kasir'))
  WITH CHECK (current_staff_role() IN ('advisor','owner','mekanik','gudang','kasir'));
