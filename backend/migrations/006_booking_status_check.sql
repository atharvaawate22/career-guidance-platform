-- Migration 006: Add CHECK constraint to bookings.booking_status
-- Prevents garbage status values and documents the valid booking lifecycle.
-- Valid statuses: scheduled → confirmed → completed | cancelled | no_show

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'bookings'
      AND constraint_name = 'bookings_booking_status_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_booking_status_check
        CHECK (booking_status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'));
  END IF;
END
$$;
