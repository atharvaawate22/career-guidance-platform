/**
 * Dataset sizes quoted in site copy, titles, OG images and JSON-LD — in one
 * place, so a reload can't leave "90,000+" on one page and the real number on
 * another (which is exactly what had happened by Nov 2026).
 *
 * Re-measure after each cutoff load and round DOWN to a safe "N+" figure:
 *   SELECT cap_round, count(*) FROM cutoffs WHERE academic_year = <CUTOFF_YEAR> GROUP BY 1;
 *   SELECT count(*) FROM colleges;
 *
 * Measured 2026-11-25 for the 2026 dataset: 103,085 cutoff rows across CAP
 * Rounds I-IV (Round I alone: 38,008), 390 colleges.
 */

/** Every cutoff row in the explorer for CUTOFF_YEAR (all CAP rounds). */
export const CUTOFF_RECORDS_LABEL = "100,000+";

/** What the predictor actually compares against: CAP Round I only. */
export const PREDICTOR_RECORDS_LABEL = "38,000+";

/** Colleges with cutoff pages / in the explorer. */
export const COLLEGE_COUNT = 390;
