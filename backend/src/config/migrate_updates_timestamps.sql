-- Migration: Add timestamp support and edited_at field to updates table
-- This migration converts published_date from DATE to TIMESTAMP and adds edited_at

-- Step 1: Add edited_at column
ALTER TABLE updates 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

-- Step 2: Change published_date from DATE to TIMESTAMP
-- First, add a temporary column
ALTER TABLE updates 
ADD COLUMN IF NOT EXISTS published_date_temp TIMESTAMP;

-- Copy data from DATE to TIMESTAMP (will be at midnight)
UPDATE updates 
SET published_date_temp = published_date::TIMESTAMP 
WHERE published_date_temp IS NULL;

-- Drop the old DATE column
ALTER TABLE updates 
DROP COLUMN IF EXISTS published_date;

-- Rename the temp column to published_date
ALTER TABLE updates 
RENAME COLUMN published_date_temp TO published_date;

-- Set NOT NULL constraint
ALTER TABLE updates 
ALTER COLUMN published_date SET NOT NULL;

-- Set default to NOW() for new records
ALTER TABLE updates 
ALTER COLUMN published_date SET DEFAULT NOW();

-- Update index to use new TIMESTAMP column
DROP INDEX IF EXISTS idx_updates_published_date;
CREATE INDEX idx_updates_published_date ON updates(published_date DESC);

-- Add index for edited_at
CREATE INDEX IF NOT EXISTS idx_updates_edited_at ON updates(edited_at DESC);
