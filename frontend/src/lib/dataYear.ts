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
 * Academic-year span label: "2026" -> "2026-27".
 *
 * Used for any year that isn't yet the complete, final dataset — that is how
 * DTE labels an in-progress admission cycle. The final dataset is referred to
 * by the bare year, matching the existing site copy.
 */
export function academicYearSpan(year: string): string {
  const start = Number(year);
  if (!Number.isFinite(start)) return year;
  return `${start}-${String(start + 1).slice(2)}`;
}

/**
 * Which (academic_year, cap_round) combinations actually have data, as
 * returned by GET /cutoffs/meta. Drives the explorer's Academic Year and CAP
 * Round selectors — nothing here is hardcoded to a specific year, so a new
 * round or a new admission cycle just needs the data loaded, not a code
 * change and redeploy to "add" it to the UI.
 */
export interface AvailableYearRounds {
  year: number;
  rounds: number[];
}

/** MHT-CET engineering CAP always runs to Round IV; a year is "final" once
 *  all four are loaded. */
export const FULL_CAP_ROUNDS = 4;

const ROUND_ROMAN = ["", "I", "II", "III", "IV"];

/** DTE's own notation ("CAP Round-I", "CAP Round-II", ...) — used everywhere
 *  a round number is shown to a candidate, so it reads as it does on the
 *  official CET Cell site instead of a plain digit. */
export function roundRoman(round: number): string {
  return ROUND_ROMAN[round] ?? String(round);
}

export function isCompleteYear(rounds: number[]): boolean {
  return rounds.length >= FULL_CAP_ROUNDS;
}

/** "Round I" for a single round, "Rounds I–III" for a contiguous-or-not span. */
export function roundsRangeLabel(rounds: number[]): string {
  const sorted = [...rounds].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return `Round ${roundRoman(sorted[0])}`;
  return `Rounds ${roundRoman(sorted[0])}–${roundRoman(sorted[sorted.length - 1])}`;
}

/** Label for one entry in the Academic Year selector, e.g.
 *  "2025 · Final (Rounds I–IV)" or "2026-27 · Round I (1 of 4)". */
export function yearOptionLabel(year: number, rounds: number[]): string {
  const sorted = [...rounds].sort((a, b) => a - b);
  if (isCompleteYear(sorted)) {
    return `${year} · Final (${roundsRangeLabel(sorted)})`;
  }
  return `${academicYearSpan(String(year))} · ${roundsRangeLabel(sorted)} (${sorted.length} of ${FULL_CAP_ROUNDS})`;
}

/** CAP Round dropdown options for one year: "All CAP Rounds" only appears
 *  once there is more than one round to choose between. */
export function roundSelectOptions(
  rounds: number[],
): { value: string; label: string }[] {
  const sorted = [...rounds].sort((a, b) => a - b);
  const all = sorted.length > 1 ? [{ value: "", label: "All CAP Rounds" }] : [];
  return [
    ...all,
    ...sorted.map((r) => ({ value: String(r), label: `CAP Round ${roundRoman(r)}` })),
  ];
}

/**
 * The admission cycle the evergreen /mht-cet-cap-2026-schedule page covers.
 * The year is baked into that URL by design (a new cycle gets a new URL, per
 * the evergreen-page SEO pattern), so this isn't the "current" year like
 * CUTOFF_YEAR — it's fixed per page and only changes when a new page is
 * created for the next cycle.
 */
export const CAP_SCHEDULE_YEAR = Number(
  process.env.NEXT_PUBLIC_CAP_SCHEDULE_YEAR || "2026",
);
