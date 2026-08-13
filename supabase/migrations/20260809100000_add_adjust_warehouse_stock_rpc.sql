-- Bug: warehouse_stock RLS only allows owner/gudang to write (see
-- warehouse_stock_role_based policy), but every stock mutation actually
-- triggered from the app (Pasang part ke WO, resolve temuan pakai stock,
-- hapus part dari WO, reject service item) is reachable by advisor too
-- (Gudang tab is open to advisor, and reject-ACC lives in AdvisorDashboard).
-- Postgres/PostgREST doesn't throw when an UPDATE's RLS clause excludes the
-- row — it just matches 0 rows and returns success — so these writes were
-- silently no-op-ing for advisor: UI showed the optimistic new stock number,
-- DB never changed. Fix: a narrow SECURITY DEFINER RPC that does an atomic
-- delta adjustment, open to the exact roles that can reach these UI actions
-- (advisor/gudang/owner), instead of widening the blanket RLS policy.
CREATE OR REPLACE FUNCTION adjust_warehouse_stock(p_item_id TEXT, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  IF current_staff_role() NOT IN ('advisor', 'owner', 'gudang') THEN
    RAISE EXCEPTION 'Not authorized to adjust warehouse stock';
  END IF;

  UPDATE warehouse_stock
  SET stock = stock + p_delta
  WHERE id = p_item_id AND stock + p_delta >= 0
  RETURNING stock INTO v_new_stock;

  IF v_new_stock IS NULL THEN
    RAISE EXCEPTION 'Stok tidak mencukupi atau item tidak ditemukan';
  END IF;

  RETURN v_new_stock;
END;
$$;
