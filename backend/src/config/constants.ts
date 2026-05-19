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
 * Maximum number of array filter values accepted in a single request.
 * Applied to branches, cities, minority_types, minority_groups, etc.
 * Prevents clients from generating unbounded SQL via massive arrays.
 */
export const MAX_FILTER_ARRAY_LENGTH = 30;
