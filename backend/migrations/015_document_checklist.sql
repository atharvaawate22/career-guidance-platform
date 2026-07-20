-- Migration 015: Document Checklist
-- Purpose: Structured "documents needed for CAP" content for the chatbot,
-- replacing what would otherwise be a hardcoded string in application code.
-- Idempotent (safe to re-run).
--
-- The UNIQUE (category, document_name) constraint is what makes the seed
-- below idempotent: without it, `ON CONFLICT DO NOTHING` can never fire
-- (the only other constraint is the primary key on a freshly generated
-- UUID, which never collides), so every re-run would append a duplicate
-- copy of the whole checklist. Same pattern as 014's
-- UNIQUE (academic_year, cap_round, event_name).

CREATE TABLE IF NOT EXISTS document_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'general',
  display_order INTEGER NOT NULL DEFAULT 0,
  document_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (category, document_name)
);

-- Backfill the constraint for any database that applied an earlier version
-- of this migration, which created the table without it. `CREATE TABLE IF
-- NOT EXISTS` above is a no-op there, so the inline UNIQUE alone would
-- never reach those databases.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'document_checklist'::regclass
      AND conname = 'document_checklist_category_document_name_key'
  ) THEN
    ALTER TABLE document_checklist
      ADD CONSTRAINT document_checklist_category_document_name_key
      UNIQUE (category, document_name);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_document_checklist_category
ON document_checklist(category, display_order);

INSERT INTO document_checklist (category, display_order, document_name, description) VALUES
  ('general', 1, '10th Standard Marksheet', 'Original + one photocopy'),
  ('general', 2, '12th Standard Marksheet', 'Original + one photocopy'),
  ('general', 3, 'MHT-CET Scorecard', 'Downloaded from the official CET Cell website'),
  ('general', 4, 'School/College Leaving Certificate', 'a.k.a. Transfer Certificate (TC)'),
  ('general', 5, 'Domicile Certificate', 'Proof of Maharashtra residency'),
  ('general', 6, 'Nationality/Indian Certificate', 'Or birth certificate as proof of nationality'),
  ('general', 7, 'Aadhaar Card', 'Original + photocopy'),
  ('general', 8, 'Passport-size Photographs', 'Usually 4-6 copies, check specific college requirements'),
  ('general', 9, 'Provisional Allotment Letter', 'Printed after each CAP round result'),
  ('general', 10, 'Category Certificate (if applicable)', 'Caste Certificate + Caste Validity Certificate for reserved categories'),
  ('general', 11, 'Non-Creamy Layer Certificate (if applicable)', 'Required for OBC/SBC/NT candidates, valid for the current financial year'),
  ('general', 12, 'Income Certificate (if applicable)', 'Required for EWS and fee concession categories'),
  ('general', 13, 'Gap Certificate (if applicable)', 'Required if there is a gap year between 12th and admission')
ON CONFLICT (category, document_name) DO NOTHING;

ALTER TABLE document_checklist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'document_checklist' AND policyname = 'document_checklist_public_read_active'
  ) THEN
    CREATE POLICY document_checklist_public_read_active ON document_checklist FOR SELECT USING (is_active = true);
  END IF;
END
$$;
