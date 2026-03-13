import { query } from '../../config/database';
import { CollegeOption, PredictorFilters } from './predictor.types';
import { CITY_NORMALIZED_SQL } from '../../utils/cityNormalization';

export class PredictorRepository {
  async estimateRankFromPercentile(
    year: number,
    percentile: number,
  ): Promise<number | null> {
    const sql = `
      SELECT cutoff_rank
      FROM cutoff_data
      WHERE year = $1
        AND stage = 'I'
        AND cutoff_rank IS NOT NULL
        AND percentile IS NOT NULL
      ORDER BY ABS(percentile - $2), cutoff_rank ASC
      LIMIT 1
    `;

    const result = await query(sql, [year, percentile]);
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

    // Optional category
    if (filters.category) {
      conditions.push(`category = $${p++}`);
      values.push(filters.category);
    }

    // Optional gender — if not specified, return 'All' gender rows
    // (avoids duplicating entries for Male/Female-only seats)
    if (filters.gender) {
      conditions.push(`gender = $${p++}`);
      values.push(filters.gender);
    } else {
      conditions.push(`gender = $${p++}`);
      values.push('All');
    }

    // Optional seat level (State Level / Home University Level)
    if (filters.level) {
      conditions.push(`level = $${p++}`);
      values.push(filters.level);
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
      const cityConditions = filters.cities.map(
        () => `${CITY_NORMALIZED_SQL} = $${p++}`,
      );
      conditions.push(`(${cityConditions.join(' OR ')})`);
      filters.cities.forEach((c) => values.push(c.trim().toLowerCase()));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        id,
        college_code,
        college_name,
        branch,
        category,
        gender,
        level,
        stage,
        cutoff_rank,
        percentile AS cutoff_percentile,
        year
      FROM cutoff_data
      ${whereClause}
      ORDER BY percentile DESC
      LIMIT 1000
    `;

    const result = await query(sql, values);
    return result.rows as CollegeOption[];
  }
}
