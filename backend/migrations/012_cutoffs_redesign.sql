-- 012: Normalized cutoffs schema (colleges + courses + cutoffs).
--
-- Replaces the legacy flat `cutoff_data` table, which is now retained ONLY as a
-- revert backup and is no longer referenced by any application code. Cutoff data
-- is loaded via scripts/parse_cutoffs_v2.py + scripts/load_cutoffs.js.
--
-- Idempotent (IF NOT EXISTS / guarded policies): on the live database where the
-- loader already created these tables this is a no-op that simply records the
-- migration; on a fresh database it builds the full schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS colleges (
  college_code     TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  status           TEXT,
  minority_type    TEXT,
  minority_group   TEXT,
  home_university  TEXT,
  city             TEXT,
  city_normalized  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_colleges_city_norm ON colleges(city_normalized);
CREATE INDEX IF NOT EXISTS idx_colleges_minority  ON colleges(minority_type, minority_group);

CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choice_code   TEXT NOT NULL UNIQUE,
  college_code  TEXT NOT NULL REFERENCES colleges(college_code) ON DELETE CASCADE,
  course_name   TEXT NOT NULL,
  branch_group  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_college   ON courses(college_code);
CREATE INDEX IF NOT EXISTS idx_courses_branch    ON courses(branch_group);
CREATE INDEX IF NOT EXISTS idx_courses_name_trgm ON courses USING gin (course_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS cutoffs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year       SMALLINT NOT NULL,
  cap_round           SMALLINT NOT NULL CHECK (cap_round BETWEEN 1 AND 4),
  allotment_pool      TEXT NOT NULL,
  stage               TEXT NOT NULL,
  category_code       TEXT NOT NULL,
  gender              TEXT,
  category            TEXT,
  subquota            TEXT,
  closing_rank        INTEGER,
  closing_percentile  NUMERIC(10,7),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, academic_year, cap_round, allotment_pool, stage, category_code)
);
CREATE INDEX IF NOT EXISTS idx_cutoffs_predict
  ON cutoffs (academic_year, cap_round, category, gender, closing_rank)
  INCLUDE (closing_percentile);
CREATE INDEX IF NOT EXISTS idx_cutoffs_course ON cutoffs (course_id);

ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutoffs  ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'colleges' AND policyname = 'colleges_public_read')
    THEN CREATE POLICY colleges_public_read ON colleges FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'courses_public_read')
    THEN CREATE POLICY courses_public_read ON courses FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cutoffs' AND policyname = 'cutoffs_public_read')
    THEN CREATE POLICY cutoffs_public_read ON cutoffs FOR SELECT USING (true); END IF;
END $$;
