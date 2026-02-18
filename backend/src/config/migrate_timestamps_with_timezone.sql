-- Migration: Convert TIMESTAMP to TIMESTAMPTZ for timezone awareness

-- Update published_date to use TIMESTAMPTZ
ALTER TABLE updates 
ALTER COLUMN published_date TYPE TIMESTAMPTZ USING published_date AT TIME ZONE 'UTC';

-- Update edited_at to use TIMESTAMPTZ
ALTER TABLE updates 
ALTER COLUMN edited_at TYPE TIMESTAMPTZ USING edited_at AT TIME ZONE 'UTC';

-- Update created_at to use TIMESTAMPTZ
ALTER TABLE updates 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- Update default for published_date
ALTER TABLE updates 
ALTER COLUMN published_date SET DEFAULT NOW();

-- Update default for created_at
ALTER TABLE updates 
ALTER COLUMN created_at SET DEFAULT NOW();
