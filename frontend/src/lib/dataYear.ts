/**
 * The academic years the site talks about, in one place.
 *
 * The year used to be written out as a literal in ~35 places across four
 * different mechanisms — `const CUTOFF_YEAR = "2025"` in three files, a
 * `DEFAULT_META_YEAR` in a fourth, a `NEXT_PUBLIC_PREDICTOR_YEAR` env var in
 * two more, and inline prose in page copy, FAQ answers, JSON-LD and OG images.
 * Rolling the site over to a new dataset meant finding all of them by hand
 * mid-admission-season, and a missed one shows a student last year's cutoffs
 * under this year's heading.
 *
 * Both values are env-overridable so the rollover is a config change, not a
 * code sweep. They are read at build time (NEXT_PUBLIC_*), which is what the
 * static `metadata` exports and prerendered copy need — a value fetched at
 * runtime could not drive those.
 */

/**
 * The complete, final CAP dataset: all four rounds. This is the reference year
 * for the predictor, for every piece of site copy, and the explorer's default.
 */
export const CUTOFF_YEAR =
  process.env.NEXT_PUBLIC_CUTOFF_YEAR ||
  // Back-compat: the predictor and booking pages previously read this.
  process.env.NEXT_PUBLIC_PREDICTOR_YEAR ||
  "2025";

/**
 * An additional, in-progress year the explorer can search — provisional CAP
 * Round I (MH quota) only, loaded separately by
 * backend/scripts/load_cutoffs_incremental.js. Deliberately NOT used by the
 * predictor, whose model needs a complete multi-round dataset.
 *
 * Set NEXT_PUBLIC_PROVISIONAL_CUTOFF_YEAR to "" to hide the year toggle
 * entirely once the season ends and the data is folded into CUTOFF_YEAR.
 */
export const PROVISIONAL_YEAR =
  process.env.NEXT_PUBLIC_PROVISIONAL_CUTOFF_YEAR ?? "2026";

/** True when the explorer should offer a year toggle at all. */
export const HAS_PROVISIONAL_YEAR = PROVISIONAL_YEAR.length > 0;

/**
 * Academic-year span label: "2026" -> "2026-27".
 *
 * Used for the provisional year, which the copy refers to by its span because
 * that is how DTE labels an in-progress admission cycle. The final dataset is
 * referred to by the bare year, matching the existing site copy.
 */
export function academicYearSpan(year: string): string {
  const start = Number(year);
  if (!Number.isFinite(start)) return year;
  return `${start}-${String(start + 1).slice(2)}`;
}

/** "2026-27" for the provisional year. */
export const PROVISIONAL_YEAR_LABEL = academicYearSpan(PROVISIONAL_YEAR);
