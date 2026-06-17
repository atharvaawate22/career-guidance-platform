# Cutoffs Database Redesign Plan

**Date:** 2026-06-15
**Author:** Senior engineering review (Claude)
**Status:** PLAN — approved direction, not yet implemented. Save-doc-only at owner's request.
**Source data:** `cutoff_pdfs/Round 1.pdf` … `Round 4.pdf` — official MHT-CET CAP **Cut Off Lists**, A.Y. 2025-26.

> Note: an earlier draft of this plan targeted *Seat Matrix* PDFs that were placed in
> `cutoff_pdfs/` by mistake. Those have been replaced with the correct **Cut Off List**
> PDFs. The seat-matrix data is a separate, also-useful dataset that could be integrated
> later as a complementary feature; it is out of scope here.

---

## 1. Why redesign

The current `cutoff_data` table is a single flat table with `percentile NOT NULL`, a
nullable `cutoff_rank`, denormalized college/branch strings repeated on every row, and —
most importantly — **no concept of CAP round**. The real source data is round-wise and
richer. Three things the old schema cannot represent properly:

1. **CAP round (1–4)** — the same course has different closing ranks each round.
2. **Both rank *and* percentile per cell** — the PDF gives both; the predictor and
   explorer should store both (rank for the predictor window, percentile for display and
   percentile→rank estimation).
3. **Decoded category codes** — each column header (`GOPENS`, `LSCH`, `PWDOBCS`, …) packs
   gender + reservation + seat-type into one token and must be decoded for filtering.

The old DB was also "not proper" because it was built without validation. This plan makes
validation a first-class step (§6).

---

## 2. Source data analysis (Round 1, measured)

| Metric | Value |
|---|---|
| Pages | 1,566 |
| Distinct colleges | 368 |
| Distinct courses (choice codes) | 2,178 (44 carry a suffix letter: F/K/L/U) |
| Allotment-pool sections | STATE 1,945 · HU→HU 1,367 · HU→OHU 580 · OHU→OHU 1,307 · OHU→HU 563 |
| Stage rows | Stage I: 5,717 · Stage II: 692 |
| Approx cutoff cells (rows) | ~34,000 |
| Distinct status strings | 29 (dominated by Un-Aided 1,186 + Un-Aided Autonomous 455; many minority variants) |

**Per-course structure in the PDF:**

```
01002 - Government College of Engineering, Amravati        ← college (5-digit code)
0100219110 - Civil Engineering                             ← course (10-digit choice code)
Status: Government Autonomous  Home University : Autonomous Institute
State Level                                                ← allotment-pool section header
Stage GOPENS GSCS GSTS ... EWS                             ← category-code column headers
I     37591  58518 94334 ... 90389                         ← Stage I closing ranks (merit no.)
     (88.95)(82.33)(69.49)...(71.47)                       ← matching closing percentiles
II    ...                                                  ← optional later stage
```

**Category-code anatomy** (per the PDF legend):

| Part | Position | Values |
|---|---|---|
| Gender | 1st char | `G` General · `L` Ladies · (PWD/DEF/TFWS/ORPHAN/EWS = non-gendered) |
| Reservation | middle | OPEN, SC, ST, VJ, NT1, NT2, NT3, OBC, SEBC + quotas PWD, DEF, TFWS, EWS, ORPHAN |
| Seat-type | last char | `S` State · `H` Home-University · `O` Other-than-HU · `AI` All-India |

**Allotment-pool section header → code:**

| Section header text | `allotment_pool` |
|---|---|
| `State Level` | `STATE` |
| `Home University Seats Allotted to Home University Candidates` | `HU_HU` |
| `Home University Seats Allotted to Other Than Home University Candidates` | `HU_OHU` |
| `Other Than Home University Seats Allotted to Other Than Home University Candidates` | `OHU_OHU` |
| `Other Than Home University Seats Allotted to Home University Candidates` | `OHU_HU` |
| (All-India / Minority sections, where present) | `AI` / `MINORITY` |

**The blank-cell problem (critical for the parser):** column counts vary per course, and
cells can be blank. On Round 1 page 700 a row has **8 headers but only 7 values**. Naive
whitespace splitting misaligns every column after the gap. The parser **must** align rank
and percentile tokens to headers by **x-coordinate**, not token order. This is the single
biggest correctness risk and is addressed in §6.

**Choice-code format & column wrap:** choice codes are `\d{10}[A-Z]?` — the optional suffix
marks special seats (`T` TFWS, `F` female-only, `K` Konkan, `L` regional-language, `U`
university/minority); 44 of 2,178 Round-1 courses carry one. There are **no cross-page
continuations** (every page begins at a college or course heading — measured: 0). However, a
course with many categories can **wrap its columns onto a second `Stage` block within the
same page that carries no course heading**. Rule (owner-confirmed): a `Stage`/section/data
block with **no preceding course heading is a continuation of the current course** — its
columns simply wrapped. The parser carries college/course/section context forward and resets
the course only on a real course-heading line.

**Confirmed empirically:** the widest course has **32 category columns** (page 1170) and its
rank row renders on a *single* logical line — pdfplumber reassembles wrapped columns by
y-band, so extracted text contains no orphan blocks. The state-machine rule is therefore a
safety net; in practice the y-band/x-coordinate parser reassembles wraps automatically.

---

## 3. New schema

```sql
-- ── Dimension: colleges (deduped, enriched) ─────────────────────────────
CREATE TABLE colleges (
  college_code     TEXT PRIMARY KEY,            -- '01002'
  name             TEXT NOT NULL,
  status           TEXT,                         -- raw, e.g. 'Un-Aided Autonomous'
  is_autonomous    BOOLEAN NOT NULL DEFAULT false,
  minority_type    TEXT,                         -- 'Religious' | 'Linguistic' | NULL
  minority_group   TEXT,                         -- 'Muslim','Jain','Gujarathi','Hindi',... | NULL
  home_university  TEXT,                         -- 'Autonomous Institute' / actual university
  city             TEXT,
  city_normalized  TEXT,                         -- parsed at load → replaces runtime heuristics
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_colleges_city_norm ON colleges(city_normalized);
CREATE INDEX idx_colleges_minority  ON colleges(minority_type, minority_group);

-- ── Dimension: courses ──────────────────────────────────────────────────
CREATE TABLE courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choice_code   TEXT NOT NULL UNIQUE,            -- '\d{10}[A-Z]?' e.g. '0100219110', '0302524270U'
  college_code  TEXT NOT NULL REFERENCES colleges(college_code) ON DELETE CASCADE,
  course_name   TEXT NOT NULL,
  branch_group  TEXT,                            -- canonical bucket: 'Computer','ENTC','Mechanical','AI/DS'...
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_courses_college ON courses(college_code);
CREATE INDEX idx_courses_branch  ON courses(branch_group);
-- trigram for fuzzy course-name search in the explorer
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_courses_name_trgm ON courses USING gin (course_name gin_trgm_ops);

-- ── Fact: cutoffs (one row per course × round × pool × stage × category col) ──
CREATE TABLE cutoffs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year       SMALLINT NOT NULL,                       -- 2025
  cap_round           SMALLINT NOT NULL CHECK (cap_round BETWEEN 1 AND 4),
  allotment_pool      TEXT NOT NULL,   -- STATE | HU_HU | HU_OHU | OHU_OHU | OHU_HU | AI | MINORITY
  stage               TEXT NOT NULL,   -- 'I','II',...
  category_code       TEXT NOT NULL,   -- raw: 'GOPENS','LSCH','PWDOBCS','TFWS','EWS'
  gender              TEXT,            -- 'G','L', NULL for non-gendered quotas
  reservation         TEXT,            -- 'OPEN','SC',...,'PWD','DEF','TFWS','EWS','ORPHAN'
  seat_type           TEXT,            -- 'S','H','O','AI'
  closing_rank        INTEGER,         -- Maharashtra State General Merit No.
  closing_percentile  NUMERIC(10,7),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, academic_year, cap_round, allotment_pool, stage, category_code)
);

-- Predictor: filter by year+round+reservation+gender+seat_type, window by rank.
CREATE INDEX idx_cutoffs_predict
  ON cutoffs (academic_year, cap_round, reservation, gender, seat_type, closing_rank)
  INCLUDE (closing_percentile);
CREATE INDEX idx_cutoffs_course ON cutoffs (course_id);
```

**Design notes**

- The `UNIQUE` constraint makes the data self-deduplicating, so the old repository's heavy
  `ROW_NUMBER()` dedup CTE is removed entirely.
- `category_code` is preserved raw (fidelity) **and** decoded into `gender` / `reservation`
  / `seat_type` so the predictor never parses strings at query time.
- `colleges` parses the status string into `is_autonomous` + `minority_type` +
  `minority_group`, which powers the existing minority filters cleanly (today they rely on
  string heuristics).
- `city_normalized` is computed once at load, replacing the fragile runtime city-cleaning
  heuristics in `cutoffs.controller.ts`.
- RLS public-read policies on all three tables, matching existing tables.

---

## 4. Predictor round policy

All four rounds are ingested and stored in `cutoffs`. The **Explorer serves all rounds**;
the **Predictor reads only `cap_round = 1`** (default, configurable via `ACTIVE_CAP_ROUND`).

Rationale (owner's domain insight, confirmed): later rounds have **sparse** cutoff data —
once seats fill in earlier rounds, many college/category cells are simply absent in Rounds
2–4. Round 1 has the most complete coverage and the most meaningful "what rank got in"
signal. The predictor must still **degrade gracefully** when a given college/category has
no row for the active round (skip, don't error).

Seat-type handling: the predictor primarily uses `STATE` pool + the student's category /
gender; HU vs OHU refinement (based on the student's home university) is an optional
enhancement to finalize during the rewire (Phase 4).

---

## 5. Implementation phases

| Phase | Work | Output |
|---|---|---|
| **1. Migration** | `migrations/012_cutoffs_redesign.sql`: 3 tables + indexes + `pg_trgm` + RLS public-read. Leave old `cutoff_data` in place. | Schema live, old path still works |
| **2. Parser** | `scripts/parse_cutoffs.py` (pdfplumber, position-based). Walk college→course→status→section→stage; x-align ranks & percentiles to headers; decode codes; parse status→minority; parse city; assign `branch_group`. Emit `colleges.csv`, `courses.csv`, `cutoffs.csv` + validation report. | Clean CSVs per round |
| **3. Loader** | `scripts/load_cutoffs.ts`: idempotent upsert (colleges→courses→cutoffs), one txn per round, `ON CONFLICT DO UPDATE`. | DB populated, re-runnable |
| **4. Backend rewire** | Update `cutoffs.repository.ts` / `predictor.repository.ts` to query new tables (join dims, add `cap_round`, return rank+percentile, drop dedup CTE). Replace city heuristics with stored column. Add `ACTIVE_CAP_ROUND` to `constants.ts`. Predictor windowing in `predictor.service.ts` unchanged. | New data served |
| **5. Frontend** | CAP-round selector on explorer (+ predictor); surface rank + percentile + pool/seat-type; update API client + types. | UI on new data |
| **6. Cutover** | Verify counts vs. PDFs; `013_drop_cutoff_data.sql`; remove dead code; add parser + repository tests; refresh `DATABASE_SCHEMA.md` / API spec. | Old table retired |

---

## 6. Parser design & validation (the part that was missing last time)

**Position-based extraction:** use `page.extract_words()` with `(x0, top)`. For each
`Stage`-header line, record the x-center of every category-code token. For each stage data
row, map each numeric token to the nearest header x-center; do the same for the following
bracketed percentile line. This correctly handles blank cells.

**Continuation state machine (owner-confirmed):** maintain `current_college`,
`current_course`, `current_pool`, `current_stage_headers` as you stream lines across the
whole document. Reset `current_course` **only** on a real course-heading line
(`\d{10}[A-Z]? - …`). A `Stage`/section/data block with no course heading = wrapped columns
of `current_course`; append them to that course's cutoff set under the active pool/stage.
The college header reprinted atop each page is idempotent (re-asserts, never resets course).
Choice-code regex must allow the optional suffix letter.

**Validation rules (a row failing these is logged, not loaded):**

- `count(ranks) == count(percentiles)` within a stage row, and each maps to a header.
- `closing_rank` ∈ [1, 300000]; `closing_percentile` ∈ [0, 100].
- `choice_code[:5] == college_code` (course belongs to the current college).
- Column count per stage row ≤ 32 (observed max, page 1170) — a higher count signals a
  parse/alignment error.
- Every `category_code` decodes via the known map; unknown codes flagged for review. The map
  must cover PWD/DEF reserved sub-categories confirmed in the data: `PWDSCS`, `PWDSTS`,
  `PWDOBCS`, `PWDSEBCS`, `DEFSCS`, `DEFSTS`, `DEFOBCS`, `DEFSEBCS`, `PWDRNT1S/2S/3S`,
  `PWDRSCS`, `DEFROBCS`, `DEFRNT3S`, `DEFRSEBC`, plus `TFWS`, `EWS`, `ORPHAN`.
- Sanity: within a column across stages, rank and percentile move consistently.

**Output report per round:** courses parsed, cells loaded, cells skipped (+reason),
unknown category codes, colleges with unparsed city. Reviewed before each load.

---

## 7. Code-change inventory

- `backend/src/config/schema.sql` — add the 3 tables (baseline), remove `cutoff_data` after cutover.
- `backend/migrations/012_cutoffs_redesign.sql`, `013_drop_cutoff_data.sql` — new.
- `backend/src/modules/cutoffs/{cutoffs.repository,cutoffs.controller,cutoffs.types,cutoffs.service}.ts` — rewire to new tables; simplify meta.
- `backend/src/modules/predictor/{predictor.repository,predictor.service,predictor.types}.ts` — query `cutoffs`, add round.
- `backend/src/config/constants.ts` — add `ACTIVE_CAP_ROUND` (default 1).
- `scripts/parse_cutoffs.py`, `scripts/load_cutoffs.ts` — new ETL.
- `frontend` cutoffs explorer + predictor pages, API client, types — round selector + new fields.
- Tests: parser unit tests (fixtures from a few PDF pages), repository tests on new schema.
- Docs: `DATABASE_SCHEMA.md`, API spec.

---

## 8. Data volume & free-tier impact

Round 1 ≈ 34k cutoff rows. Rounds 2–4 are progressively sparser (seats fill up). Total
across 4 rounds is on the order of **~100–150k narrow rows** (a few ints + short text).
With indexes that is well under **100 MB** — comfortable inside Supabase free (500 MB).
Dimensions are tiny: 368 colleges, ~2.1k courses.

---

## 9. Risks & edge cases

- **Column misalignment** (blank cells) — mitigated by x-coordinate parsing (§6). Highest risk.
- **Status string variety** (29 values incl. minority/autonomous combos) — handled by a
  documented parse map; unknowns flagged.
- **Course-name variants** → `branch_group` needs a maintained mapping dictionary; fall
  back to raw name when unmatched.
- **Column wrap / continuation** — dense courses (≈25 columns) wrap onto a heading-less
  `Stage` block *within the page* (no cross-page splits; measured 0). Handled by the
  continuation state machine + x-coordinate alignment (§6). Stitch word rows by `top` band,
  not `extract_text()` line breaks.
- **Suffixed choice codes** (`…U/F/K/L/T`, 44 in Round 1) — regex must allow the suffix or
  those courses are silently dropped (this is partly why the old import was incomplete).
- **HU/OHU predictor semantics** — finalize during Phase 4; default to STATE pool to ship.

---

## 10. Out of scope (future)

- Integrating the **Seat Matrix** PDFs (seat counts per category) as a complementary
  explorer feature, joined on the same `courses` dimension.
- Multi-year history (schema already carries `academic_year`).
