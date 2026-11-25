-- Migration 030: FAQ explaining why "OPEN" has several different cutoffs
-- Purpose: "why 4 open have different cutoffs" reached the chatbot's
-- unanswered log (Nov 2026). Cutoff lists split OPEN into separate seat pools
-- (GOPENS/GOPENH/GOPENO and the ladies-only LOPENS/LOPENH/LOPENO — all six
-- codes are present in the 2026 cutoffs table), and a student reading the
-- explorer sees several OPEN rows for one branch with no explanation.
-- Facts stated are structural (seat-type and gender split) and match the
-- codes in the data; no year-specific figures.
--
-- The question text is short and names the codes on purpose: measured
-- against the live table, it scores 0.640 for the logged message and 0.482
-- for "why are there different open cutoffs" (both above
-- FAQ_OVERRIDE_CONFIDENCE 0.35, needed because "cutoffs" also triggers the
-- cutoff intent), while structured lookups like "open cutoff for coep cs"
-- stay at 0.19 or below.
--
-- Idempotent: guarded by WHERE NOT EXISTS on the exact question.

INSERT INTO faqs (question, answer, display_order)
SELECT
  $q$Why does OPEN have different cutoffs (GOPENS, GOPENH, GOPENO, LOPENS)?$q$,
  $q$Because OPEN is not one pool of seats. In the official cutoff lists it is split by seat type and by gender, and each pool fills separately from its own merit order, so each closes at its own cutoff. GOPENS is a state-level seat open to all eligible Maharashtra candidates; GOPENH is a Home University (HU) seat for candidates from the college's own university region; GOPENO is an Other Than Home University (OHU) seat for candidates from other regions. The versions starting with L (LOPENS, LOPENH, LOPENO) are the same seat types reserved for women. Only the cutoffs for seat types you are actually eligible for apply to you, which is why the predictor asks for your category and gender, and why your home university region matters.$q$,
  27
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $q$Why does OPEN have different cutoffs (GOPENS, GOPENH, GOPENO, LOPENS)?$q$);
