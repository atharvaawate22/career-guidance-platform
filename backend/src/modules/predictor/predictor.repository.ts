import { query } from '../../config/database';
import { CollegeOption, PredictorFilters } from './predictor.types';
import { ACTIVE_CAP_ROUND, PER_TIER_LIMIT } from '../../config/constants';
import {
  buildCategoryCondition,
  buildGenderCondition,
  buildCollegeMinorityCondition,
} from '../../utils/cutoffFilters';

export class PredictorRepository {
  /**
   * Estimate a CET rank from a percentile by linearly interpolating between the
   * two bracketing known percentile→rank points in the active round's Stage I
   * cutoffs.
   *
   * Previously this snapped to whichever single bracketing point was nearest,
   * which quantises the estimate onto the discrete cutoff grid — across a
   * sparse stretch, two students a few hundredths of a percentile apart got the
   * same rank back, and a percentile falling mid-gap was off by however wide
   * the gap happened to be. Interpolating uses both points it already fetched.
   *
   * Both CTEs are single-row index scans on idx_cutoffs_percentile_lookup
   * (migration 025), which exists specifically for this query — see that file
   * for the before/after measurements.
   *
   * Returns null ONLY when the table holds no usable point at all for
   * (year, ACTIVE_CAP_ROUND, stage 'I'). PredictorService maps that to a 422
   * RANK_ESTIMATION_FAILED. Every other case — percentile above the maximum
   * known, below the minimum, or landing exactly on a known point — clamps to a
   * real rank, which is the pre-existing behaviour and is preserved exactly.
   */
  async estimateRankFromPercentile(
    year: number,
    percentile: number,
  ): Promise<number | null> {
    const sql = `
      WITH below AS (
        SELECT closing_percentile AS pct, closing_rank AS rnk
        FROM cutoffs
        WHERE academic_year = $1
          AND cap_round = $2
          AND stage = 'I'
          AND closing_rank IS NOT NULL
          AND closing_percentile IS NOT NULL
          AND closing_percentile <= $3::numeric
        -- Backward index scan. The secondary DESC takes the WORST rank among
        -- rows sharing the bracketing percentile, which keeps below.rnk >=
        -- above.rnk (rank falls as percentile rises) and so keeps the
        -- interpolation monotonic even where percentiles tie.
        ORDER BY closing_percentile DESC, closing_rank DESC
        LIMIT 1
      ),
      above AS (
        SELECT closing_percentile AS pct, closing_rank AS rnk
        FROM cutoffs
        WHERE academic_year = $1
          AND cap_round = $2
          AND stage = 'I'
          AND closing_rank IS NOT NULL
          AND closing_percentile IS NOT NULL
          AND closing_percentile >= $3::numeric
        -- Forward scan, mirror-image tie-break (BEST rank).
        ORDER BY closing_percentile ASC, closing_rank ASC
        LIMIT 1
      )
      SELECT
        CASE
          -- No usable data at all for this (year, round, stage) -> caller 422s.
          WHEN b.pct IS NULL AND a.pct IS NULL THEN NULL
          -- Below the minimum known percentile: clamp to the worst known rank
          -- rather than extrapolating past the data.
          WHEN b.pct IS NULL THEN a.rnk
          -- Above the maximum known percentile (e.g. 100): clamp to the best
          -- known rank.
          WHEN a.pct IS NULL THEN b.rnk
          -- Exact hit: both brackets collapse onto one percentile, so the
          -- interpolation denominator would be zero. LEAST reproduces the old
          -- "ORDER BY ABS(...), cutoff_rank ASC" tie-break exactly.
          WHEN a.pct = b.pct THEN LEAST(a.rnk, b.rnk)
          ELSE GREATEST(
            1,
            ROUND(b.rnk + (a.rnk - b.rnk) * (($3::numeric - b.pct) / (a.pct - b.pct)))
          )::int
        END AS cutoff_rank
      -- LEFT JOIN onto a one-row anchor so the statement always returns exactly
      -- one row, with NULL meaning "bracket not found" rather than no row at all.
      FROM (VALUES (1)) AS anchor(one)
      LEFT JOIN below b ON TRUE
      LEFT JOIN above a ON TRUE
    `;

    const result = await query(sql, [year, ACTIVE_CAP_ROUND, percentile], {
      name: 'predictor.estimate_rank_from_percentile',
    });
    const estimated = result.rows[0]?.cutoff_rank;
    // Explicit null check rather than `if (!estimated)`: rank 0 is not a valid
    // CET rank, but reaching the 422 by way of 0 being falsy would be accidental.
    if (estimated === undefined || estimated === null) return null;
    return Number(estimated);
  }

  async getEligibleColleges(
    filters: PredictorFilters,
  ): Promise<CollegeOption[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    conditions.push(`co.academic_year = $${p++}`);
    values.push(filters.year);

    conditions.push(`co.cap_round = $${p++}`);
    values.push(filters.cap_round);

    const cat = buildCategoryCondition(
      filters.category,
      !!filters.include_tfws,
      p,
      'co',
    );
    if (cat.condition) {
      conditions.push(cat.condition);
      values.push(...cat.values);
      p = cat.nextIndex;
    }

    const gen = buildGenderCondition(filters.gender, p, 'co');
    if (gen.condition) {
      conditions.push(gen.condition);
      values.push(...gen.values);
      p = gen.nextIndex;
    }

    const min = buildCollegeMinorityCondition(
      filters.minority_types,
      filters.minority_groups,
      p,
      'col',
    );
    if (min.condition) {
      conditions.push(min.condition);
      values.push(...min.values);
      p = min.nextIndex;
    }

    if (filters.preferred_branches && filters.preferred_branches.length > 0) {
      conditions.push(`c.branch_group = ANY($${p++}::text[])`);
      values.push(filters.preferred_branches);
    }

    if (filters.cities && filters.cities.length > 0) {
      conditions.push(`col.city_normalized = ANY($${p++}::text[])`);
      values.push(filters.cities.map((cty) => cty.trim().toLowerCase()));
    }

    if (filters.min_cutoff_rank !== undefined) {
      conditions.push(`co.closing_rank >= $${p++}`);
      values.push(filters.min_cutoff_rank);
    }
    if (filters.max_cutoff_rank !== undefined) {
      conditions.push(`co.closing_rank <= $${p++}`);
      values.push(filters.max_cutoff_rank);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Tier-classification parameters, allocated LAST on purpose. By this point
    // `p` has advanced past every placeholder consumed by
    // buildCategoryCondition (1-3, depending on the category token and
    // include_tfws), buildGenderCondition (0) and buildCollegeMinorityCondition
    // (1 plus one per minority-group alias) — a variable count, which is
    // exactly why these indices cannot be hard-coded. They are referenced only
    // in the outer SELECT, but pg binds `values` positionally across the whole
    // statement, so the push order below must match the allocation order here.
    const pRank = p++;
    const pAbove = p++;
    const pBelow = p++;
    values.push(
      filters.effective_rank,
      filters.target_above,
      filters.target_below,
    );

    // Dedupe to one representative cutoff per college+branch+category, taking the
    // loosest (highest) closing rank across pools/stages — the most inclusive
    // "could I get in" threshold. Stage is rendered as the CAP round.
    const sql = `
      WITH filtered AS (
        SELECT
          co.id,
          col.college_code,
          col.name           AS college_name,
          c.course_name      AS branch,
          COALESCE(co.category, co.subquota) AS category,
          co.gender,
          col.status         AS college_status,
          co.cap_round,
          co.closing_rank       AS cutoff_rank,
          co.closing_percentile AS cutoff_percentile,
          co.academic_year   AS year
        FROM cutoffs co
        JOIN courses  c   ON c.id = co.course_id
        JOIN colleges col ON col.college_code = c.college_code
        ${whereClause}
      ),
      deduped AS (
        SELECT DISTINCT ON (college_name, branch, category)
          id, college_code, college_name, branch, category, gender,
          college_status, cap_round, cutoff_rank, cutoff_percentile, year
        FROM filtered
        ORDER BY
          college_name, branch, category,
          cutoff_rank DESC NULLS LAST,
          cutoff_percentile ASC NULLS LAST
      ),
      -- Tier classification lives here rather than in predictor.service.ts so
      -- the row cap can be applied per tier (see PER_TIER_LIMIT in
      -- config/constants.ts, which carries the full rationale). This
      -- ladder must stay in lockstep with getDynamicThresholds() in the
      -- service:
      --   safe   : cr >  r + targetBelow
      --   target : r - targetAbove <= cr <= r + targetBelow
      --   dream  : cr <  r - targetAbove
      -- The ::int casts are required — '$a + $b' with two untyped parameters
      -- raises "operator is not unique: unknown + unknown".
      tiered AS (
        SELECT
          d.*,
          CASE
            WHEN d.cutoff_rank >  $${pRank}::int + $${pBelow}::int THEN 'safe'
            WHEN d.cutoff_rank >= $${pRank}::int - $${pAbove}::int THEN 'target'
            ELSE 'dream'
          END AS tier
        FROM deduped d
        WHERE d.cutoff_rank IS NOT NULL
      ),
      ranked AS (
        SELECT
          t.*,
          row_number() OVER (
            PARTITION BY t.tier
            -- Priority is closeness to the student's rank, which resolves to
            -- ascending cutoff_rank for Safe and descending for Dream — i.e.
            -- exactly the "most attainable first" order the service already
            -- displays. One expression, correct truncation for all three tiers.
            ORDER BY ABS(t.cutoff_rank - $${pRank}::int) ASC,
                     t.college_name ASC,
                     t.branch ASC
          ) AS tier_rank
        FROM tiered t
      )
      SELECT
        id, college_code, college_name, branch, category, gender,
        college_status, cap_round,
        CASE cap_round WHEN 1 THEN 'I' WHEN 2 THEN 'II' WHEN 3 THEN 'III' WHEN 4 THEN 'IV' END AS stage,
        cutoff_rank, cutoff_percentile, year, tier
      FROM ranked
      WHERE tier_rank <= ${PER_TIER_LIMIT}
      ORDER BY tier, tier_rank
    `;

    const result = await query(sql, values, { name: 'predictor.eligible' });
    return result.rows as CollegeOption[];
  }
}
