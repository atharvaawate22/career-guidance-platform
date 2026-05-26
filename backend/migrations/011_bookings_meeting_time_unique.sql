-- Migration 011: Enforce unique active booking slots at the database level
-- Rationale: The booking service catches PG error code 23505 (unique_violation)
-- to detect slot collisions, but without a unique index there is no actual
-- constraint enforced — two simultaneous inserts can both succeed silently,
-- producing a double booking.
--
-- We use a PARTIAL unique index so that cancelled / no-show / completed
-- bookings do not block the same slot from being re-used in a new booking.
--
-- This index is idempotent (CREATE INDEX IF NOT EXISTS) and safe to re-run.

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_meeting_time_active_unique
  ON bookings (meeting_time)
  WHERE booking_status NOT IN ('cancelled', 'no_show', 'completed');

-- Also drop the older partial index added in migration 009 that only covered
-- the email-based duplicate check, so the two indexes don't overlap in purpose.
-- The new slot-uniqueness index together with the earlier email-active-future
-- index give us comprehensive collision protection.
-- (the email index is retained — it serves a different query pattern)
