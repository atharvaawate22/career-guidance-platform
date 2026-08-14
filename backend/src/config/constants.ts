/**
 * Shared application constants.
 *
 * Centralised here so that controllers, services, and repositories all
 * reference the same values instead of duplicating magic numbers.
 */

/** The cutoff / predictor year currently active for public-facing queries. */
export const ACTIVE_CUTOFF_YEAR = Number(
  process.env.ACTIVE_CUTOFF_YEAR || '2025',
);

/**
 * The CAP round the predictor compares a student against. Round 1 is the
 * default because later rounds have sparse data (seats fill up earlier), so
 * Round 1 gives the most complete cutoff coverage. The cutoff explorer shows
 * all rounds; only the predictor is pinned to this one.
 */
export const ACTIVE_CAP_ROUND = Number(process.env.ACTIVE_CAP_ROUND || '1');

/**
 * The year whose CAP *schedule* (registration/choice-filling/allotment dates)
 * the chatbot quotes. Deliberately separate from ACTIVE_CUTOFF_YEAR: cutoff
 * data is intentionally a year behind (last year's closing percentiles are
 * used to predict this year's admissions), but the schedule the chatbot
 * quotes must be for the admission cycle actually in progress right now —
 * conflating the two would have the bot quoting last year's CAP dates.
 * Defaults to the current calendar year; override if a cycle spans a
 * year boundary in a way the default gets wrong.
 */
export const ACTIVE_CAP_SCHEDULE_YEAR = Number(
  process.env.ACTIVE_CAP_SCHEDULE_YEAR || new Date().getFullYear(),
);

/**
 * Maximum number of array filter values accepted in a single request.
 * Applied to branches, cities, minority_types, minority_groups, etc.
 * Prevents clients from generating unbounded SQL via massive arrays.
 * There are ~98 distinct branch_group values today (a single "quick group"
 * like Computer & Allied already spans 30), so this needs real headroom
 * above the raw filter counts, not just the current dataset size.
 */
export const MAX_FILTER_ARRAY_LENGTH = 120;

/**
 * Rows the predictor returns per Safe/Target/Dream tier.
 *
 * Lives here rather than in the repository because both sides need it: the
 * repository caps each tier with it in SQL, and the service reports it in
 * `meta.perTierLimit` so the UI can say "top N of M" instead of silently
 * truncating.
 *
 * It replaces a flat `LIMIT 800` applied after `ORDER BY cutoff_rank ASC`.
 * Ascending cutoff rank means hardest-college-first, so that single cap could
 * only ever truncate the SAFE end of the list — and because the relevance
 * window widens as 50*sqrt(rank), a high-rank student's window covers the
 * densest part of the distribution. At rank 150,000 the window spans ~38,700
 * ranks, Dream and Target alone exhausted 800 rows, and the student was told
 * they had no safe options at all. Classifying in SQL lets the cap apply per
 * tier instead. 200 is roughly 4x what the UI renders before "show more".
 */
export const PER_TIER_LIMIT = 200;
