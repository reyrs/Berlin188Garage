-- Self-hosted client-side error monitoring — avoids adding a third-party
-- dependency (Sentry etc.) that would need its own account/DSN before it
-- could log anything. Errors are captured client-side (see
-- src/lib/errorLogger.ts) and written here; owner/manager can review them
-- in the staff dashboard's Log Aktivitas panel.
--
-- INSERT is open to anon too: an uncaught error on the public landing page
-- or marketplace happens before/without any login, so restricting writes
-- to `authenticated` would silently drop exactly the errors public
-- visitors hit. There is nothing sensitive in this table to protect on
-- the write side — only SELECT (reading other people's error reports)
-- needs to be role-gated.

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack TEXT,
  source TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  staff_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "error_logs_insert_anyone"
  ON error_logs FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "error_logs_select_owner_manager"
  ON error_logs FOR SELECT TO authenticated
  USING (current_staff_role() IN ('owner', 'manager'));

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs (created_at DESC);
