-- Migration: Drop the lead-capture gate on guide downloads
-- Guides can now be downloaded directly with no form — name/email are no
-- longer collected, so the columns become nullable. Kept (not dropped) so
-- historical download leads captured before this change aren't lost.

ALTER TABLE guide_downloads
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;
