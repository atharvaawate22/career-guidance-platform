-- Migration 014: CAP Schedule
-- Purpose: Structured CAP round dates for the chatbot's "when is round X"
-- lookups. Previously this only existed as free-text prose inside the
-- `updates` table, which isn't queryable. This is idempotent (safe to re-run).
--
-- Seeded rows are PLACEHOLDERS (is_confirmed = false, dates NULL) — the
-- official MHT-CET CAP schedule for academic_year 2026 has not been released
-- by DTE Maharashtra yet. Update via a future admin UI or a direct UPDATE
-- once the official notice is published; the chatbot checks is_confirmed
-- before quoting a date to a student.

CREATE TABLE IF NOT EXISTS cap_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year SMALLINT NOT NULL,
  cap_round SMALLINT NOT NULL CHECK (cap_round BETWEEN 1 AND 4),
  event_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (academic_year, cap_round, event_name)
);

CREATE INDEX IF NOT EXISTS idx_cap_schedule_year_round
ON cap_schedule(academic_year, cap_round);

INSERT INTO cap_schedule (academic_year, cap_round, event_name, is_confirmed, notes) VALUES
  (2026, 1, 'Registration & Document Upload', false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 1, 'Choice Filling & Confirmation',   false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 1, 'Seat Allotment Result',           false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 1, 'Reporting & Fee Payment',         false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 2, 'Choice Filling & Confirmation',   false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 2, 'Seat Allotment Result',           false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 2, 'Reporting & Fee Payment',         false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 3, 'Choice Filling & Confirmation',   false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 3, 'Seat Allotment Result',           false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 3, 'Reporting & Fee Payment',         false, 'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.')
ON CONFLICT (academic_year, cap_round, event_name) DO NOTHING;

ALTER TABLE cap_schedule ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cap_schedule' AND policyname = 'cap_schedule_public_read'
  ) THEN
    CREATE POLICY cap_schedule_public_read ON cap_schedule FOR SELECT USING (true);
  END IF;
END
$$;
