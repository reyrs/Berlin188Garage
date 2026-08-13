-- Adds a free-text "specialization" column to profiles (e.g. "Mercedes-Benz,
-- BMW") so mechanics can be assigned by brand expertise, not just
-- availability. Additive only — nullable, no RLS change needed (existing
-- profiles policies are role-based, not column-based). Already reconciled
-- into the base CREATE TABLE in supabase-schema.sql; this migration exists
-- for the already-provisioned live database.
--
-- Run this once in the Supabase Dashboard SQL Editor.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization TEXT;
