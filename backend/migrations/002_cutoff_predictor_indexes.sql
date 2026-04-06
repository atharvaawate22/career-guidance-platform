-- Migration 002: Add performance indexes for cutoff_data predictor queries
-- These indexes were added after the initial schema to support the predictor
-- algorithm and city-based search features.

CREATE INDEX IF NOT EXISTS idx_cutoff_college_code
  ON cutoff_data(college_code);

CREATE INDEX IF NOT EXISTS idx_cutoff_meta_year_branch
  ON cutoff_data(year, branch);

CREATE INDEX IF NOT EXISTS idx_cutoff_meta_year_college_code_name
  ON cutoff_data(year, college_code, college_name);

CREATE INDEX IF NOT EXISTS idx_cutoff_meta_year_city_normalized_col
  ON cutoff_data(year, city_normalized);

CREATE INDEX IF NOT EXISTS idx_cutoff_year_stage_percentile_rank
  ON cutoff_data(year, stage, percentile, cutoff_rank)
  WHERE cutoff_rank IS NOT NULL AND percentile IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cutoff_year_stage_rank
  ON cutoff_data(year, stage, cutoff_rank)
  WHERE cutoff_rank IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_cutoff_branch_trgm
  ON cutoff_data USING GIN (branch gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cutoff_college_name_trgm
  ON cutoff_data USING GIN (college_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cutoff_year_stage_category_city_home
  ON cutoff_data(year, stage, category, city_normalized, home_university);

CREATE INDEX IF NOT EXISTS idx_cutoff_predictor_filters
  ON cutoff_data(year, stage, category, level, cutoff_rank)
  WHERE cutoff_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cutoff_search_city_norm
  ON cutoff_data(year, stage, category, gender, (LOWER(TRIM(city_normalized))))
  WHERE city_normalized IS NOT NULL AND TRIM(city_normalized) <> '';
