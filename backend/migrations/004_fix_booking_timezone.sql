-- Migration 004: Fix bookings.meeting_time timezone
-- Converts meeting_time from TIMESTAMP (no timezone) to TIMESTAMPTZ so that
-- all booking times are stored and compared unambiguously in UTC.

ALTER TABLE bookings
  ALTER COLUMN meeting_time TYPE TIMESTAMPTZ
  USING meeting_time AT TIME ZONE 'Asia/Kolkata';
