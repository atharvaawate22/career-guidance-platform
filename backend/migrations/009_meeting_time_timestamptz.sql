-- Migration: Convert meeting_time from TIMESTAMP to TIMESTAMPTZ
-- This ensures timezone-aware storage, eliminating ambiguity between
-- UTC and IST when querying booked slots.

-- The frontend sends ISO 8601 with +05:30 offset (e.g. 2026-05-20T10:00:00+05:30).
-- PostgreSQL TIMESTAMP silently stripped the offset. TIMESTAMPTZ stores as UTC.

ALTER TABLE bookings
  ALTER COLUMN meeting_time TYPE TIMESTAMPTZ
  USING meeting_time AT TIME ZONE 'Asia/Kolkata';

-- Add a partial index to speed up the duplicate-email-check query
-- that looks for future, non-cancelled bookings by email.
CREATE INDEX IF NOT EXISTS idx_bookings_email_active_future
  ON bookings (email, meeting_time)
  WHERE booking_status NOT IN ('cancelled', 'no_show', 'completed');
