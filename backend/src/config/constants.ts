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
 * Maximum number of array filter values accepted in a single request.
 * Applied to branches, cities, minority_types, minority_groups, etc.
 * Prevents clients from generating unbounded SQL via massive arrays.
 */
export const MAX_FILTER_ARRAY_LENGTH = 30;
