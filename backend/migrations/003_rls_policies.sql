-- Migration 003: Enable Row Level Security and create access policies
-- Protects Supabase Data API exposure while allowing intended public reads.

ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutoff_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'updates' AND policyname = 'updates_public_read'
  ) THEN
    CREATE POLICY updates_public_read ON updates FOR SELECT USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'faqs' AND policyname = 'faqs_public_read_active'
  ) THEN
    CREATE POLICY faqs_public_read_active ON faqs FOR SELECT USING (is_active = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cutoff_data' AND policyname = 'cutoff_data_public_read'
  ) THEN
    CREATE POLICY cutoff_data_public_read ON cutoff_data FOR SELECT USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'guides' AND policyname = 'guides_public_read_active'
  ) THEN
    CREATE POLICY guides_public_read_active ON guides FOR SELECT USING (is_active = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'resources' AND policyname = 'resources_public_read_active'
  ) THEN
    CREATE POLICY resources_public_read_active ON resources FOR SELECT USING (is_active = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'admin_users_no_access'
  ) THEN
    CREATE POLICY admin_users_no_access ON admin_users FOR ALL USING (false) WITH CHECK (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'bookings_no_access'
  ) THEN
    CREATE POLICY bookings_no_access ON bookings FOR ALL USING (false) WITH CHECK (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'guide_downloads' AND policyname = 'guide_downloads_no_access'
  ) THEN
    CREATE POLICY guide_downloads_no_access ON guide_downloads FOR ALL USING (false) WITH CHECK (false);
  END IF;
END
$$;
