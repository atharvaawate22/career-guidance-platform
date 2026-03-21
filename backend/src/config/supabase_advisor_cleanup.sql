-- Supabase Advisor cleanup script
-- Run once in Supabase SQL Editor (production) to reduce write I/O overhead
-- from unused indexes and clear "RLS Enabled No Policy" warnings.

BEGIN;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'faqs' AND policyname = 'faqs_public_read_active'
  ) THEN
    CREATE POLICY faqs_public_read_active
      ON public.faqs
      FOR SELECT
      USING (is_active = true);
  END IF;
END
$$;

-- Drop indexes that are typically high-write and low-read for this app pattern.
DROP INDEX IF EXISTS public.idx_updates_edited_at;
DROP INDEX IF EXISTS public.idx_cutoff_branch;
DROP INDEX IF EXISTS public.idx_cutoff_percentile;
DROP INDEX IF EXISTS public.idx_guide_downloads_email;
DROP INDEX IF EXISTS public.idx_bookings_email;
DROP INDEX IF EXISTS public.idx_resources_category;

-- Keep a targeted resources index used by listing queries.
CREATE INDEX IF NOT EXISTS idx_resources_active_category_created_at
ON public.resources(is_active, category, created_at DESC);

-- Explicit deny policies on private tables to satisfy advisor checks while
-- retaining secure default-deny behavior.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'admin_users_no_access'
  ) THEN
    CREATE POLICY admin_users_no_access
      ON public.admin_users
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'bookings_no_access'
  ) THEN
    CREATE POLICY bookings_no_access
      ON public.bookings
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'guide_downloads' AND policyname = 'guide_downloads_no_access'
  ) THEN
    CREATE POLICY guide_downloads_no_access
      ON public.guide_downloads
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

COMMIT;

-- Optional: refresh planner stats after index changes.
ANALYZE public.updates;
ANALYZE public.cutoff_data;
ANALYZE public.resources;
ANALYZE public.bookings;
ANALYZE public.guide_downloads;
