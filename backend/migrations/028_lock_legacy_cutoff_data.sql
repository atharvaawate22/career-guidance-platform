-- 028: Actually lock the legacy `cutoff_data` table.
--
-- `cutoff_data` is the flat pre-2026-06 cutoffs table, superseded by
-- colleges/courses/cutoffs (012) and kept only as a revert backup. No
-- application code reads it. It has had RLS enabled since the March 2026
-- security pass (commit 1d8d9e6), but that pass also gave it a public-read
-- policy, so anyone with the Supabase anon key could still read all of it
-- through the Data API. Several docs described it as "RLS-locked"; this makes
-- that true.
--
-- With RLS enabled and no policy, the Data API (anon/authenticated roles)
-- can neither read nor write it, while the backend's privileged connection
-- (which bypasses RLS) and direct SQL still can, so the revert path is intact.
--
-- DESTRUCTIVE STEP (see migrations/README.md rule 4): drops a policy.
-- Reversible with:
--   CREATE POLICY cutoff_data_public_read ON cutoff_data FOR SELECT USING (true);
--
-- Idempotent, and a no-op on a fresh database where `cutoff_data` never
-- existed (schema.sql intentionally does not recreate it).

DO $$
BEGIN
  IF to_regclass('public.cutoff_data') IS NOT NULL THEN
    ALTER TABLE cutoff_data ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS cutoff_data_public_read ON cutoff_data;
  END IF;
END
$$;
