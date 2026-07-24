-- Migration 021: Fee Schedule
-- Purpose: Structured CAP seat-acceptance-fee amounts for the chatbot's "how
-- much is the seat acceptance fee" lookups. Previously the chatbot never
-- looked this up at all — it unconditionally deferred every fee question
-- with a static "amounts vary, check /updates" reply, even though the real
-- figure is public, small (3 flat tiers), and does NOT vary by category —
-- a wrong assumption the old defer copy itself encouraged.
--
-- Source: official State CET Cell public notice (Gazette No.
-- तंिशÖ-1226/प्र.क्र.07/जाÎवीशु/सूचना/कक्ष/2026/1733, dated 19.07.2026),
-- "Revision to the seat acceptance fee under CAP for First Year Engineering
-- (B.E./B.Tech) admissions, A.Y. 2026-27" — the same PDF already linked from
-- this site's `updates` and `resources` tables. The fee depends only on how
-- many times a student has accepted a NEW seat in CAP (1st / 2nd via
-- Betterment / 3rd via Betterment), independent of category and independent
-- of which CAP round that acceptance happens in.
--
-- Idempotent (safe to re-run), same shape as migrations/014_cap_schedule.sql.

CREATE TABLE IF NOT EXISTS fee_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year SMALLINT NOT NULL,
  seat_sequence SMALLINT NOT NULL CHECK (seat_sequence BETWEEN 1 AND 3),
  label TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (academic_year, seat_sequence)
);

CREATE INDEX IF NOT EXISTS idx_fee_schedule_year
ON fee_schedule(academic_year);

INSERT INTO fee_schedule (academic_year, seat_sequence, label, amount_inr, is_confirmed, notes, source_url) VALUES
  (2026, 1, '1st seat accepted', 1000, true,
   'Applies to a student''s first-ever seat acceptance no matter which CAP round it happens in (Round 1 through 4) — the sequence counts acceptances, not rounds. Same for every category (Open, OBC, SC, ST, VJ, NT1/2/3, SEBC, EWS, TFWS).',
   'https://cetcell.mahacet.org/wp-content/uploads/2026/07/BE-BTECH-FEES-Notice.pdf'),
  (2026, 2, '2nd seat accepted via Betterment (Float/Slide upgrade)', 2000, true,
   'Paid only if/when a Float or Slide upgrade is accepted in a later round. Same for every category.',
   'https://cetcell.mahacet.org/wp-content/uploads/2026/07/BE-BTECH-FEES-Notice.pdf'),
  (2026, 3, '3rd seat accepted via Betterment (Float/Slide upgrade)', 3000, true,
   'Paid only if/when a second Betterment upgrade is accepted in a still-later round. Same for every category.',
   'https://cetcell.mahacet.org/wp-content/uploads/2026/07/BE-BTECH-FEES-Notice.pdf')
ON CONFLICT (academic_year, seat_sequence) DO NOTHING;

ALTER TABLE fee_schedule ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fee_schedule' AND policyname = 'fee_schedule_public_read'
  ) THEN
    CREATE POLICY fee_schedule_public_read ON fee_schedule FOR SELECT USING (true);
  END IF;
END
$$;
