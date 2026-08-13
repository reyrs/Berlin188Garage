-- User: akun advisor dipakai sebagai developer/tester internal sampai web
-- ini beneran dipakai penuh sama perusahaan — kasih akses tulis penuh ke
-- semua tabel yang tadinya cuma marketing/owner/kasir/gudang/accounting.

ALTER POLICY "blog_posts_write_marketing" ON blog_posts
  USING (current_staff_role() IN ('marketing', 'owner', 'advisor'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner', 'advisor'));

ALTER POLICY "hero_content_write_marketing" ON hero_content
  USING (current_staff_role() IN ('marketing', 'owner', 'advisor'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner', 'advisor'));

ALTER POLICY "portfolio_items_write_marketing" ON portfolio_items
  USING (current_staff_role() IN ('marketing', 'owner', 'advisor'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner', 'advisor'));

ALTER POLICY "promo_popup_write_marketing" ON promo_popup
  USING (current_staff_role() IN ('marketing', 'owner', 'advisor'))
  WITH CHECK (current_staff_role() IN ('marketing', 'owner', 'advisor'));

ALTER POLICY "closings_role_based" ON closings
  USING (current_staff_role() IN ('owner', 'kasir', 'accounting', 'advisor'))
  WITH CHECK (current_staff_role() IN ('owner', 'kasir', 'advisor'));

ALTER POLICY "expenses_role_based" ON expenses
  USING (current_staff_role() IN ('owner', 'kasir', 'accounting', 'advisor'))
  WITH CHECK (current_staff_role() IN ('owner', 'kasir', 'advisor'));

ALTER POLICY "stock_mutations_role_based" ON stock_mutations
  USING (current_staff_role() IN ('owner', 'gudang', 'advisor'))
  WITH CHECK (current_staff_role() IN ('owner', 'gudang', 'advisor'));

ALTER POLICY "warehouse_stock_role_based" ON warehouse_stock
  USING (current_staff_role() IN ('owner', 'gudang', 'advisor'))
  WITH CHECK (current_staff_role() IN ('owner', 'gudang', 'advisor'));
