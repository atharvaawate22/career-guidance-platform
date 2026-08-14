-- 026: Moderation gate for testimonials.
--
-- 023 created this table with reviews auto-publishing, gated only by the
-- 26-term exact-word list in utils/abuseFilter.ts. That filter stops a slur and
-- misses everything else a public, unmoderated, permanently-visible text field
-- attracts: spam links, competitor promotion, phone numbers, and defamatory
-- claims about named colleges — none of which contain a slur. The admin already
-- receives an email on every submission, so the detection loop existed; only
-- the publish gate was missing.
--
-- Existing rows are grandfathered to 'approved' so nothing already live
-- disappears when this deploys.
--
-- No destructive steps. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'testimonials'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE testimonials
      ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected'));

    -- Grandfather everything that predates the gate.
    UPDATE testimonials SET status = 'approved';
  END IF;
END
$$;

-- The public list filters on status and orders by recency, so index the pair.
CREATE INDEX IF NOT EXISTS idx_testimonials_status_created
  ON testimonials (status, created_at DESC);

-- 023's public-read RLS policy allowed SELECT on every row. The backend reads
-- through a direct Postgres connection outside the Data API so the policy is
-- not what protects the endpoint, but leaving a permissive policy on a table
-- that now has an unpublished state would be misleading if the Data API is ever
-- switched on. Narrow it to approved rows only.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'testimonials'
      AND policyname = 'testimonials_public_read'
  ) THEN
    DROP POLICY testimonials_public_read ON testimonials;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'testimonials'
      AND policyname = 'testimonials_approved_read'
  ) THEN
    CREATE POLICY testimonials_approved_read ON testimonials
      FOR SELECT USING (status = 'approved');
  END IF;
END
$$;
