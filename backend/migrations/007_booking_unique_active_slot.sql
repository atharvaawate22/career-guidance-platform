-- Migration 007: Prevent double-booking the same slot atomically
-- A partial unique index ensures two active bookings cannot share the same
-- meeting_time. Cancelled and no_show bookings are excluded so a slot can
-- be reused after a cancellation without requiring any cleanup.

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_active_slot
  ON bookings(meeting_time)
  WHERE booking_status NOT IN ('cancelled', 'no_show');
