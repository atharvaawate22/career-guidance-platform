-- Migration 017: Updates Source URL
-- Purpose: Link each MHT-CET update to its official source notice (the
-- notice/PDF on the State CET Cell site) so students can jump straight to
-- the original. Nullable — historical rows are not backfilled, only new
-- updates going forward populate it.
-- Idempotent (safe to re-run).

ALTER TABLE updates ADD COLUMN IF NOT EXISTS source_url TEXT;
