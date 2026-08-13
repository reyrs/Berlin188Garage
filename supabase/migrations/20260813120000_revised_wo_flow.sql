-- Revised WO workflow, per manager instructions 2026-08-13:
-- 1. CHECK-IN: up to 3 separate complaints per WO (was a single `complaint` text).
-- 2. Estimasi gudang tetap di JSONB service_items (part+jasa), no schema change needed there.
-- 3. PENAWARAN tracked in findings JSONB (offeredAt) — app-level only, no schema change.
-- 4. PERSETUJUAN: customer-approval RPCs below now stamp `approvedBy: 'customer'`
--    on the item and write a timeline event, so a genuine customer ACC (via the
--    public tracking portal) is distinguishable from a staff-recorded one
--    (orderStore.approveFinding/approveServiceItem stamps `approvedBy: 'advisor'`).
-- 5. ACCOUNTING: explicit invoice-issued stage before payment (invoiced_at).

-- 1. CHECK-IN: complaints array -------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS complaints JSONB DEFAULT '[]'::jsonb;

UPDATE orders
SET complaints = CASE
  WHEN complaint IS NOT NULL AND complaint <> '' THEN to_jsonb(ARRAY[complaint])
  ELSE '[]'::jsonb
END
WHERE complaints = '[]'::jsonb OR complaints IS NULL;

ALTER TABLE orders ALTER COLUMN complaint DROP NOT NULL;
COMMENT ON COLUMN orders.complaint IS 'Deprecated — superseded by complaints (jsonb array, max 3 enforced in app). Kept for backward-compat, no longer written by the app.';

-- 5. ACCOUNTING: invoice-issued stage --------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ;

-- 4. Customer-approval RPCs: stamp approvedBy + write timeline ------------
CREATE OR REPLACE FUNCTION customer_set_finding_status(
  p_order_id TEXT, p_phone TEXT, p_finding_id TEXT, p_status TEXT
)
RETURNS SETOF orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_finding_desc TEXT;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  SELECT elem->>'description' INTO v_finding_desc
  FROM orders, jsonb_array_elements(findings) AS elem
  WHERE id = p_order_id AND customer_phone = p_phone AND elem->>'id' = p_finding_id;

  RETURN QUERY
  UPDATE orders
  SET findings = (
        SELECT jsonb_agg(
          CASE WHEN elem->>'id' = p_finding_id
               THEN elem || jsonb_build_object('status', p_status, 'approvedBy', 'customer')
               ELSE elem
          END
        )
        FROM jsonb_array_elements(findings) AS elem
      ),
      timeline = timeline || jsonb_build_array(jsonb_build_object(
        'id', 'rpc-finding-' || md5(random()::text || clock_timestamp()::text),
        'status', status,
        'timestamp', now(),
        'title', CASE WHEN p_status = 'approved' THEN 'Temuan Disetujui Pemilik' ELSE 'Temuan Ditolak Pemilik' END,
        'description', format('Pemilik %s temuan: "%s" (via portal tracking).',
          CASE WHEN p_status = 'approved' THEN 'menyetujui' ELSE 'menolak' END,
          coalesce(v_finding_desc, p_finding_id)),
        'actor', 'Pemilik Kendaraan'
      ))
  WHERE id = p_order_id AND customer_phone = p_phone
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION customer_set_service_item_status(
  p_order_id TEXT, p_phone TEXT, p_item_id TEXT, p_status TEXT
)
RETURNS SETOF orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_item_name TEXT;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  SELECT elem->>'name' INTO v_item_name
  FROM orders, jsonb_array_elements(service_items) AS elem
  WHERE id = p_order_id AND customer_phone = p_phone AND elem->>'id' = p_item_id;

  RETURN QUERY
  UPDATE orders
  SET service_items = (
        SELECT jsonb_agg(
          CASE WHEN elem->>'id' = p_item_id
               THEN elem || jsonb_build_object('status', p_status, 'approvedBy', 'customer')
               ELSE elem
          END
        )
        FROM jsonb_array_elements(service_items) AS elem
      ),
      timeline = timeline || jsonb_build_array(jsonb_build_object(
        'id', 'rpc-item-' || md5(random()::text || clock_timestamp()::text),
        'status', status,
        'timestamp', now(),
        'title', CASE WHEN p_status = 'approved' THEN 'Estimasi Disetujui Pemilik' ELSE 'Estimasi Ditolak Pemilik' END,
        'description', format('Pemilik %s item: "%s" (via portal tracking).',
          CASE WHEN p_status = 'approved' THEN 'menyetujui' ELSE 'menolak' END,
          coalesce(v_item_name, p_item_id)),
        'actor', 'Pemilik Kendaraan'
      ))
  WHERE id = p_order_id AND customer_phone = p_phone
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION customer_set_finding_status(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION customer_set_service_item_status(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
