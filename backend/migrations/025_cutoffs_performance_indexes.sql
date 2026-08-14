-- 025: Align the cutoffs indexes with the queries that actually run.
--
-- DESTRUCTIVE STEPS (see migrations/README.md rule 4) — three DROP INDEX
-- statements at the bottom of this file. All three are superseded or provably
-- unused; each carries its evidence inline. Dropping an index is reversible by
-- re-running the CREATE, and none of them backs a constraint.
--
-- Measured on the production database (92,050 cutoff rows) before this
-- migration, via EXPLAIN (ANALYZE, BUFFERS) and pg_stat_statements:
--
--   estimateRankFromPercentile      483 ms, 69,007 shared buffer hits, 2 rows
--                                   (1,011 calls, 233 ms mean — the #1
--                                    application query by total time)
--   cutoffs explorer DISTINCT ON    637 ms, 79,808 of 92,050 rows discarded
--                                   by filter; worst normalized variant
--                                   averaged 1,300 ms over 53 calls
--
-- And after, verified by building these indexes inside a transaction against a
-- copy of production state and rolling back:
--
--   estimateRankFromPercentile      483 ms -> 1.97 ms, 69,007 -> 11 buffers
--   cutoffs explorer                637 ms -> 83 ms,   13,142 -> 360 buffers
--   predictor (per-tier)                     10.8 ms
--
-- Net index size change: +9.6 MB (explorer) +5.3 (predict_v2) +3.7 (percentile)
--                        -5.7 (predict v1)  -1.4 (courses trgm) = ~+11.5 MB.
--
-- Plain CREATE INDEX, not CONCURRENTLY: config/migrations.ts runs each file as
-- a single implicit transaction, where CONCURRENTLY is illegal. That is safe
-- here because `cutoffs` is written only by the offline ETL
-- (scripts/parse_cutoffs_v2.py -> backend/scripts/load_cutoffs.js), never by
-- the running app, and CREATE INDEX takes only a SHARE lock so concurrent
-- reads are unaffected.
--
-- Idempotent (IF NOT EXISTS / IF EXISTS), so re-running is a no-op.


-- ─────────────────────────────────────────────────────────────────
-- 1. Percentile -> rank lookup (PredictorRepository)
--
-- idx_cutoffs_predict placed `category` between the (academic_year, cap_round)
-- equality prefix and any percentile ordering, and kept closing_percentile in
-- INCLUDE — which stores the value but cannot supply an ordering. So each of
-- the two bracketing CTEs scanned ~33k rows and top-N sorted them.
--
-- closing_rank is a KEY column here, not INCLUDE, on purpose: it provides the
-- secondary sort direction (the `below` CTE scans backward, `above` forward),
-- which an INCLUDE column cannot do.
--
-- Partial, because the query already spells out both IS NOT NULL predicates,
-- so implication is trivial for the planner and the index skips every row that
-- could never be an answer.
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cutoffs_percentile_lookup
  ON cutoffs (academic_year, cap_round, stage, closing_percentile, closing_rank)
  WHERE closing_rank IS NOT NULL AND closing_percentile IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────
-- 2. The cutoff explorer (CutoffsRepository.getCutoffs)
--
-- The first attempt at this index matched the DISTINCT ON key order
-- (academic_year, course_id, cap_round, allotment_pool, category_code,
-- closing_rank DESC) on the theory that the sort was the cost. Measured: the
-- planner refused it and stayed on idx_cutoffs_course. The theory was wrong —
-- the incremental sort was only ~17 ms of a 637 ms query. The real cost was
-- that category/subquota/gender lived in no index, so every one of the 92,050
-- rows was fetched from the heap and re-checked (79,808 discarded).
--
-- This index covers the filter instead, and INCLUDEs everything the SELECT and
-- the DISTINCT ON need so the heap is never touched at all. cap_round is
-- deliberately NOT a key column: `round` is an optional filter, and any index
-- leading with it is unusable on the (common) unfiltered-round request.
--
-- Measured after: Index Only Scan, Heap Fetches: 0, 9,887 rows filtered
-- (gender only, which `IS DISTINCT FROM` cannot express as an index cond).
--   637 ms -> 83 ms, 13,142 buffers -> 360.
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cutoffs_explorer
  ON cutoffs (academic_year, category, subquota, gender)
  INCLUDE (course_id, cap_round, allotment_pool, category_code,
           closing_rank, closing_percentile, id, stage);


-- ─────────────────────────────────────────────────────────────────
-- 3. Predictor filter index, now including subquota
--
-- buildCategoryCondition (utils/cutoffFilters.ts) puts subquota in nearly every
-- category predicate — `category = X AND subquota IS NULL` for social
-- categories, `subquota = X` for EWS/TFWS/ORPHAN/MI, and
-- `subquota = PWD|DEF AND category = X` for the reserved variants — yet
-- subquota appeared in no index at all, so it was always a heap re-check.
--
-- v2 is a strict superset for every shape the app issues: the
-- (academic_year, cap_round, category) prefix is unchanged, subquota is
-- inserted where the predicates use it, and gender/closing_rank follow. Unlike
-- the explorer, the predictor IS pinned to a single cap_round
-- (ACTIVE_CAP_ROUND), so leading with it here is correct.
--
-- Measured after: the whole per-tier predictor query runs in 10.8 ms, with the
-- index cond covering academic_year, cap_round, category, subquota AND the
-- closing_rank range, and only 615 rows left for the gender filter.
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cutoffs_predict_v2
  ON cutoffs (academic_year, cap_round, category, subquota, gender, closing_rank)
  INCLUDE (closing_percentile);


-- ─────────────────────────────────────────────────────────────────
-- 4. Trigram index for the chatbot's fuzzy college lookup
--
-- chatbot.repository.searchCollegesByTrigram runs
-- `WHERE similarity(name, $1) > 0.25 ORDER BY sim DESC` against colleges with
-- no supporting index, so every fuzzy lookup computed similarity across the
-- whole table. Small today (372 rows) but it is the one trigram index the app
-- actually queries through.
--
-- gin_trgm_ops is left unqualified deliberately. pg_trgm lives in the
-- `extensions` schema on Supabase, but migration 012 created
-- idx_courses_name_trgm with the unqualified operator class and it resolved
-- fine, so the search_path covers it — and unqualified additionally works on a
-- plain local Postgres where the extension lands in public. Schema-qualifying
-- (as 008 did) would break the local case.
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_colleges_name_trgm
  ON colleges USING gin (name gin_trgm_ops);


-- ─────────────────────────────────────────────────────────────────
-- 5. Drops
--
-- Evidence from pg_stat_user_indexes on production, over a window in which
-- idx_cutoffs_course recorded 342,120 scans and colleges_pkey 134,205 — so a
-- zero here is a real zero, not a recently-reset counter.
--
--   idx_courses_name_trgm    1,432 kB, 0 scans. courses lookups always filter
--                            by college_code first (~6 rows), so the planner
--                            correctly never reaches for trigram.
--   idx_faqs_display_order      16 kB, 0 scans. faqs holds 25 rows; a seq scan
--                            plus sort is cheaper and always will be.
--   idx_cutoffs_predict      5,728 kB, superseded by idx_cutoffs_predict_v2
--                            above. Dropped last so the replacement exists
--                            first and no window is left without either.
-- ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_courses_name_trgm;
DROP INDEX IF EXISTS idx_faqs_display_order;
DROP INDEX IF EXISTS idx_cutoffs_predict;


-- Refresh planner statistics so the new indexes are costed against current
-- data. ANALYZE is legal inside a transaction block (unlike VACUUM), so it is
-- safe in a migration file.
ANALYZE cutoffs;
ANALYZE colleges;
