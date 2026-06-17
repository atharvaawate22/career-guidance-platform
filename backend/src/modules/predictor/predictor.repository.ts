import { query } from '../../config/database';
import { CollegeOption, PredictorFilters } from './predictor.types';
import { ACTIVE_CAP_ROUND } from '../../config/constants';
import {
  buildCategoryCondition,
  buildGenderCondition,
  buildCollegeMinorityCondition,
} from '../../utils/cutoffFilters';

export class PredictorRepository {
  /**
   * Estimate a CET rank from a percentile using the nearest known
   * percentile→rank pairs in the active round's Stage I cutoffs.
   */
  async estimateRankFromPercentile(
    year: number,
    percentile: number,
  ): Promise<number | null> {
    const sql = `
      WITH below AS (
        SELECT closing_percentile AS percentile, closing_rank AS cutoff_rank
        FROM cutoffs
        WHERE academic_year = $1
          AND cap_round = $2
          AND stage = 'I'
          AND closing_rank IS NOT NULL
          AND closing_percentile IS NOT NULL
          AND closing_percentile <= $3
        ORDER BY closing_percentile DESC
        LIMIT 1
      ),
      above AS (
        SELECT closing_percentile AS percentile, closing_rank AS cutoff_rank
        FROM cutoffs
        WHERE academic_year = $1
          AND cap_round = $2
          AND stage = 'I'
          AND closing_rank IS NOT NULL
          AND closing_percentile IS NOT NULL
          AND closing_percentile >= $3
        ORDER BY closing_percentile ASC
        LIMIT 1
      )
      SELECT cutoff_rank
      FROM (
        SELECT percentile, cutoff_rank FROM below
        UNION ALL
        SELECT percentile, cutoff_rank FROM above
      ) candidates
      ORDER BY ABS(percentile - $3), cutoff_rank ASC
      LIMIT 1
    `;

    const result = await query(sql, [year, ACTIVE_CAP_ROUND, percentile], {
      name: 'predictor.estimate_rank_from_percentile',
    });
    if (result.rows.length === 0) return null;
    return Number(result.rows[0].cutoff_rank);
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
      )
      SELECT
        id, college_code, college_name, branch, category, gender,
        college_status, cap_round,
        CASE cap_round WHEN 1 THEN 'I' WHEN 2 THEN 'II' WHEN 3 THEN 'III' WHEN 4 THEN 'IV' END AS stage,
        cutoff_rank, cutoff_percentile, year
      FROM deduped
      ORDER BY cutoff_rank ASC NULLS LAST
      LIMIT 800
    `;

    const result = await query(sql, values, { name: 'predictor.eligible' });
    return result.rows as CollegeOption[];
  }
}
