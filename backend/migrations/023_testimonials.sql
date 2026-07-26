-- Migration: Testimonials / reviews
-- Purpose: Let students share their experience directly on the site.
-- Reviews auto-publish (no approval queue) behind a hard-abuse-word filter
-- enforced in the application layer; the admin can edit or delete any
-- review at any time. email is collected for admin reference only and is
-- never returned by the public API.

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_created_at
  ON testimonials(created_at DESC);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'testimonials' AND policyname = 'testimonials_public_read'
  ) THEN
    CREATE POLICY testimonials_public_read ON testimonials FOR SELECT USING (true);
  END IF;
END
$$;
