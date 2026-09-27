-- Migration 008: Drop unused indexes & fix pg_trgm schema
-- Addresses all Supabase Performance Advisor warnings:
--   1. Security  – pg_trgm extension installed in public schema
--   2. Unused indexes on cutoff_data, faqs, resources,
--      guide_downloads, bookings, and updates

-- ─────────────────────────────────────────────────────────────────
-- 1. Move pg_trgm to the extensions schema (security fix)
--    The extension must be re-created in the correct schema.
--    GIN indexes that depend on gin_trgm_ops survive because the
--    operator class moves with the extension.
-- ─────────────────────────────────────────────────────────────────
--
-- Guarded (2026-09-27) so this file also runs on a brand-new database.
-- As originally written it assumed Supabase's `extensions` schema and the
-- legacy `cutoff_data` table both existed; on plain Postgres (e.g. the
-- docker-compose setup), where schema.sql creates neither, it failed here and
-- left the server in degraded mode. The guards change nothing where 008
-- already ran (it is recorded in schema_migrations and never re-runs), and
-- on a database that does have both, the statements run exactly as before.
-- `cutoff_data` itself was dropped by migration 029.
DO $$
DECLARE
  trgm_schema text :=
    CASE WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions')
      THEN 'extensions' ELSE 'public' END;
BEGIN
  DROP EXTENSION IF EXISTS pg_trgm CASCADE;
  EXECUTE format('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA %I', trgm_schema);

  -- Recreate the two GIN indexes that were dropped by CASCADE above.
  IF to_regclass('public.cutoff_data') IS NOT NULL THEN
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_cutoff_branch_trgm ON cutoff_data USING GIN (branch %I.gin_trgm_ops)',
      trgm_schema);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_cutoff_college_name_trgm ON cutoff_data USING GIN (college_name %I.gin_trgm_ops)',
      trgm_schema);
  END IF;
END
$$;


-- ─────────────────────────────────────────────────────────────────
-- 2. cutoff_data – drop single-column indexes made redundant by
--    the composite indexes already present on the table.
--
--  Composite indexes that cover these columns:
--    idx_cutoff_composite            → (year, category, branch)
--    idx_cutoff_predictor_filters    → (year, stage, category, level, cutoff_rank)
--    idx_cutoff_year_stage_category_city_home
--                                   → (year, stage, category, city_normalized, home_university)
--    idx_cutoff_meta_year_branch     → (year, branch)
--    idx_cutoff_meta_year_college_code_name
--                                   → (year, college_code, college_name)
-- ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_cutoff_year;           -- covered by all composite (year, …)
DROP INDEX IF EXISTS idx_cutoff_category;       -- covered by idx_cutoff_composite
DROP INDEX IF EXISTS idx_cutoff_branch;         -- covered by idx_cutoff_composite / idx_cutoff_meta_year_branch
DROP INDEX IF EXISTS idx_cutoff_home_university;-- covered by idx_cutoff_year_stage_category_city_home
DROP INDEX IF EXISTS idx_cutoff_college_name;   -- covered by idx_cutoff_meta_year_college_code_name
DROP INDEX IF EXISTS idx_cutoff_college_code;   -- covered by idx_cutoff_meta_year_college_code_name
DROP INDEX IF EXISTS idx_cutoff_meta_year_city_normalized_col; -- covered by idx_cutoff_year_stage_category_city_home
DROP INDEX IF EXISTS idx_cutoff_meta_year_branch;              -- covered by idx_cutoff_composite (year, category, branch) & predictor


-- ─────────────────────────────────────────────────────────────────
-- 3. Keep idx_cutoff_percentile only if queries ORDER/FILTER on it
--    alone.  Supabase flagged it unused → drop it.
-- ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_cutoff_percentile;


-- ─────────────────────────────────────────────────────────────────
-- 4. faqs – single composite already covers all access patterns
--    Drop any extra indexes flagged unused
-- ─────────────────────────────────────────────────────────────────
-- idx_faqs_active_display_order covers (is_active, display_order, created_at)
-- Nothing else to drop unless Supabase flagged the composite itself.
-- If the advisor flagged idx_faqs_active_display_order as unused,
-- that means the app fetches all FAQs without filtering; replace
-- with a lighter index just on display_order.
DROP INDEX IF EXISTS idx_faqs_active_display_order;
CREATE INDEX IF NOT EXISTS idx_faqs_display_order
  ON faqs(display_order);


-- ─────────────────────────────────────────────────────────────────
-- 5. resources – composite (is_active, category, created_at DESC)
--    flagged unused; replace with a simple created_at index since
--    resources are likely fetched ordered by date, not filtered.
-- ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_resources_active_category_created_at;
CREATE INDEX IF NOT EXISTS idx_resources_created_at
  ON resources(created_at DESC);


-- ─────────────────────────────────────────────────────────────────
-- 6. guide_downloads – drop unused email index; guide_id FK index
--    is kept because JOIN queries need it.
-- ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_guide_downloads_email;


-- ─────────────────────────────────────────────────────────────────
-- 7. bookings – drop individual column indexes made redundant or
--    flagged unused; keep booking_status for status-filter queries.
-- ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_bookings_email;        -- flagged unused
-- idx_bookings_meeting_time and idx_bookings_status are kept


-- ─────────────────────────────────────────────────────────────────
-- 8. updates – drop unused edited_at index
-- ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_updates_edited_at;
