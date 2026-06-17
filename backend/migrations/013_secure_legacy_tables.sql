-- 013: Enable Row Level Security on two public tables the Supabase linter
-- flagged as exposed (RLS disabled). Both are safe to apply automatically:
--
--   * platform_settings — read by public endpoints, so it gets a public-read
--     policy. The backend connects with a privileged role that bypasses RLS, so
--     server behavior is unchanged; this only stops the anon key from writing.
--   * schema_migrations — internal bookkeeping. RLS with no policy; the
--     migration runner uses the privileged role (bypasses RLS), while the anon
--     key is blocked, which is the intended posture.

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_settings' AND policyname = 'platform_settings_public_read'
  ) THEN
    CREATE POLICY platform_settings_public_read ON platform_settings FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
