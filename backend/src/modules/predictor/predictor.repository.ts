import { query } from '../../config/database';
import { CollegeOption, PredictorFilters } from './predictor.types';
import { CITY_NORMALIZED_SQL } from '../../utils/cityNormalization';
import { buildCandidateGenderFilter } from '../../utils/candidateGenderFilter';
import { buildMinorityStatusFilter } from '../../utils/minorityStatus';

export class PredictorRepository {
  async estimateRankFromPercentile(
    year: number,
    percentile: number,
  ): Promise<number | null> {
    const sql = `
      WITH below AS (
        SELECT percentile, cutoff_rank
        FROM cutoff_data
        WHERE year = $1
          AND stage = 'I'
          AND cutoff_rank IS NOT NULL
          AND percentile IS NOT NULL
          AND percentile <= $2
        ORDER BY percentile DESC
        LIMIT 1
      ),
      above AS (
        SELECT percentile, cutoff_rank
        FROM cutoff_data
        WHERE year = $1
          AND stage = 'I'
          AND cutoff_rank IS NOT NULL
          AND percentile IS NOT NULL
          AND percentile >= $2
        ORDER BY percentile ASC
        LIMIT 1
      )
      SELECT cutoff_rank
      FROM (
        SELECT percentile, cutoff_rank FROM below
        UNION ALL
        SELECT percentile, cutoff_rank FROM above
      ) candidates
      ORDER BY ABS(percentile - $2), cutoff_rank ASC
      LIMIT 1
    `;

    const result = await query(sql, [year, percentile], {
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

    // Year is mandatory
    conditions.push(`year = $${p++}`);
    values.push(filters.year);

    // Default to Stage I (CAP Round 1) so we get opening cutoffs
    conditions.push(`stage = $${p++}`);
    values.push('I');

    // Optional category — when include_tfws is true, also match TFWS rows
    if (filters.category) {
      if (filters.include_tfws && filters.category !== 'TFWS') {
        conditions.push(`(category = $${p++} OR category = $${p++})`);
        values.push(filters.category, 'TFWS');
      } else {
        conditions.push(`category = $${p++}`);
        values.push(filters.category);
      }
    }

    const minorityFilter = buildMinorityStatusFilter(
      filters.minority_types,
      filters.minority_groups,
      p,
    );
    if (minorityFilter.condition) {
      conditions.push(minorityFilter.condition);
      values.push(...minorityFilter.values);
      p = minorityFilter.nextIndex;
    }

    // Candidate gender handling:
    // - Male candidates can compete for gender-neutral ('All') seats only.
    // - Female candidates can compete for both gender-neutral ('All') and ladies seats.
    // - Unspecified means no gender filter (all seat types).
    const genderFilter = buildCandidateGenderFilter(filters.gender, p);
    if (genderFilter.condition) {
      conditions.push(genderFilter.condition);
      values.push(...genderFilter.values);
      p = genderFilter.nextIndex;
    }

    // Optional seat level (State Level / Home University Level)
    if (filters.level) {
      conditions.push(`level = $${p++}`);
      values.push(filters.level);
    }

    if (filters.min_cutoff_rank !== undefined) {
      conditions.push(`cutoff_rank >= $${p++}`);
      values.push(filters.min_cutoff_rank);
    }

    if (filters.max_cutoff_rank !== undefined) {
      conditions.push(`cutoff_rank <= $${p++}`);
      values.push(filters.max_cutoff_rank);
    }

    // Optional preferred_branches (OR across branches)
    if (filters.preferred_branches && filters.preferred_branches.length > 0) {
      const branchConditions = filters.preferred_branches.map((_, idx) => {
        return `branch ILIKE $${p + idx}`;
      });
      conditions.push(`(${branchConditions.join(' OR ')})`);
      filters.preferred_branches.forEach((b) => {
        values.push(`%${b}%`);
        p++;
      });
    }

    // Optional cities filter (OR across selected cities)
    if (filters.cities && filters.cities.length > 0) {
      const cityParam = p++;
      conditions.push(`(
        LOWER(TRIM(city_normalized)) = ANY($${cityParam}::text[])
        OR (
          (city_normalized IS NULL OR TRIM(city_normalized) = '')
          AND LOWER(TRIM(${CITY_NORMALIZED_SQL})) = ANY($${cityParam}::text[])
        )
      )`);
      values.push(filters.cities.map((c) => c.trim().toLowerCase()));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      WITH filtered AS (
        SELECT
          id,
          college_code,
          college_name,
          branch,
          category,
          gender,
          college_status,
          level,
          stage,
          cutoff_rank,
          percentile,
          year,
          created_at
        FROM cutoff_data
        ${whereClause}
      ),
      deduped AS (
        SELECT DISTINCT ON (college_name, branch, category)
          id,
          college_code,
          college_name,
          branch,
          category,
          gender,
          college_status,
          level,
          stage,
          cutoff_rank,
          percentile,
          year
        FROM filtered
        ORDER BY
          college_name,
          branch,
          category,
          cutoff_rank DESC NULLS LAST,
          percentile ASC NULLS LAST,
          created_at DESC
      )
      SELECT
        id,
        college_code,
        college_name,
        branch,
        category,
        gender,
        college_status,
        level,
        stage,
        cutoff_rank,
        percentile AS cutoff_percentile,
        year
      FROM deduped
      ORDER BY cutoff_rank ASC NULLS LAST
      LIMIT 800
    `;

    const result = await query(sql, values, {
      name: 'predictor.get_eligible_colleges',
    });
    return result.rows as CollegeOption[];
  }
}
