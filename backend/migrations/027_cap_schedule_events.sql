-- Migration 027: CAP Schedule Events
-- Purpose: Structured, revision-tracked CAP admission-cycle timeline powering
-- the evergreen /mht-cet-cap-2026-schedule page — registration through the
-- post-CAP institute-level cutoff date. Deliberately a separate table from
-- `cap_schedule` (migrations/014_cap_schedule.sql): that table stays exactly
-- as-is for the chatbot's round-date lookups, so this migration cannot change
-- chatbot behaviour. The two are not merged; keeping dates in sync between
-- them (once official dates are known) is a manual admin step for now.
-- Idempotent (safe to re-run).
--
-- Seeded rows are PLACEHOLDERS (status = 'upcoming', dates NULL) — the
-- official MHT-CET CAP schedule for academic_year 2026 has not been released
-- by DTE Maharashtra yet. Update via the admin UI (or a direct UPDATE) once
-- the official notice is published.

CREATE TABLE IF NOT EXISTS cap_schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year SMALLINT NOT NULL,
  round_label TEXT NOT NULL,
  event_label TEXT NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 0,
  planned_date DATE,
  revised_date DATE,
  -- Append-only log of superseded dates, written by the repository whenever
  -- planned_date/revised_date changes: [{ "previous_date": "2026-05-10",
  -- "changed_at": "2026-05-01T10:00:00Z" }, ...]. Never hand-edited.
  revision_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'today', 'completed', 'postponed')),
  result_url TEXT,
  result_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (academic_year, round_label, event_label)
);

CREATE INDEX IF NOT EXISTS idx_cap_schedule_events_year_order
ON cap_schedule_events(academic_year, display_order);

INSERT INTO cap_schedule_events
  (academic_year, round_label, event_label, display_order, notes) VALUES
  (2026, 'Registration', 'Registration & Document Upload', 10,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'Merit List', 'Provisional Merit List Declaration', 20,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'Merit List', 'Grievance & Final Merit List', 30,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'CAP Round 1', 'Option Form Submission', 40,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'CAP Round 1', 'Seat Allotment Result', 50,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'CAP Round 1', 'Seat Acceptance & Reporting (Fee Payment)', 60,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'CAP Round 2', 'Option Form Submission', 70,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'CAP Round 2', 'Seat Allotment Result', 80,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'CAP Round 2', 'Seat Acceptance & Reporting (Fee Payment)', 90,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'CAP Round 3', 'Option Form Submission', 100,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'CAP Round 3', 'Seat Allotment Result', 110,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'CAP Round 3', 'Seat Acceptance & Reporting (Fee Payment)', 120,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.'),
  (2026, 'Post-CAP', 'Institute-Level (Post-CAP) Admission Cutoff Date', 130,
   'Official dates not yet released by DTE Maharashtra — check /updates for the latest notice.')
ON CONFLICT (academic_year, round_label, event_label) DO NOTHING;

ALTER TABLE cap_schedule_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cap_schedule_events' AND policyname = 'cap_schedule_events_public_read'
  ) THEN
    CREATE POLICY cap_schedule_events_public_read ON cap_schedule_events FOR SELECT USING (true);
  END IF;
END
$$;
