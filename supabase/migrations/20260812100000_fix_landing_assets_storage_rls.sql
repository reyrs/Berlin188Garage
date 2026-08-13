-- storage.objects RLS for the `landing-assets` bucket was never migrated
-- (set up manually via dashboard at some point, but apparently never
-- actually granted authenticated staff INSERT/UPDATE — MarketingPanel's
-- promo-popup/hero/blog-cover image uploads fail with "new row violates
-- row-level security policy"). Scope matches the same marketing/owner/
-- advisor set already used for promo_popup/hero_content/portfolio_items
-- table writes (see 20260810130000_grant_advisor_full_write_access.sql).

DROP POLICY IF EXISTS "landing_assets_write_marketing" ON storage.objects;
CREATE POLICY "landing_assets_write_marketing"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'landing-assets' AND current_staff_role() IN ('marketing', 'owner', 'advisor'));

DROP POLICY IF EXISTS "landing_assets_update_marketing" ON storage.objects;
CREATE POLICY "landing_assets_update_marketing"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'landing-assets' AND current_staff_role() IN ('marketing', 'owner', 'advisor'))
  WITH CHECK (bucket_id = 'landing-assets' AND current_staff_role() IN ('marketing', 'owner', 'advisor'));

-- Public read so the live landing page (anon visitors) can load the images.
DROP POLICY IF EXISTS "landing_assets_read_public" ON storage.objects;
CREATE POLICY "landing_assets_read_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'landing-assets');
