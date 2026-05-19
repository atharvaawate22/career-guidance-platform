-- Migration 010: Platform Settings
-- Purpose: Admin-configurable platform settings (booking slots, announcements, contact info)
-- This migration is idempotent (safe to re-run).

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings (will not overwrite existing values)
INSERT INTO platform_settings (key, value) VALUES
  ('booking_slots', '{
    "enabled": true,
    "slot_duration_minutes": 30,
    "slots": ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"],
    "working_days": [1,2,3,4,5],
    "special_open_dates": [],
    "special_closed_dates": []
  }'),
  ('announcement', '{"enabled": false, "text": "", "type": "info"}'),
  ('contact_info', '{"email": "", "phone": ""}')
ON CONFLICT (key) DO NOTHING;
