import { query } from '../../config/database';
import { CutoffData, CutoffFilters, BulkCutoffInsert } from './cutoffs.types';

export class CutoffsRepository {
  async getCutoffs(
    filters: CutoffFilters,
  ): Promise<{ rows: CutoffData[]; total: number }> {
    const citySqlExpr =
      "LOWER(TRIM(TRAILING '.' FROM TRIM(SPLIT_PART(college_name, ',', 2))))";

    const conditions: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    if (filters.year !== undefined) {
      conditions.push(`year = $${p++}`);
      values.push(filters.year);
    }
    if (filters.branches && filters.branches.length > 0) {
      const branchConditions = filters.branches.map(
        () => `branch ILIKE $${p++}`,
      );
      conditions.push(`(${branchConditions.join(' OR ')})`);
      filters.branches.forEach((b) => values.push(`%${b}%`));
    }
    if (filters.category) {
      conditions.push(`category = $${p++}`);
      values.push(filters.category);
    }
    if (filters.gender) {
      conditions.push(`gender = $${p++}`);
      values.push(filters.gender);
    }
    if (filters.home_university) {
      conditions.push(`home_university = $${p++}`);
      values.push(filters.home_university);
    }
    if (filters.college_name) {
      conditions.push(`college_name ILIKE $${p++}`);
      values.push(`%${filters.college_name}%`);
    }
    if (filters.college_code) {
      conditions.push(`college_code = $${p++}`);
      values.push(filters.college_code);
    }
    if (filters.branch_code) {
      conditions.push(`branch_code = $${p++}`);
      values.push(filters.branch_code);
    }
    if (filters.stage) {
      conditions.push(`stage = $${p++}`);
      values.push(filters.stage);
    }
    if (filters.level) {
      conditions.push(`level = $${p++}`);
      values.push(filters.level);
    }
    if (filters.cities && filters.cities.length > 0) {
      const cityConditions = filters.cities.map(() => `${citySqlExpr} = $${p++}`);
      conditions.push(`(${cityConditions.join(' OR ')})`);
      filters.cities.forEach((c) => values.push(c.trim().toLowerCase()));
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching rows
    const countResult = await query(
      `SELECT COUNT(*) FROM cutoff_data ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch rows with limit
    const LIMIT = 500;
    const sql = `
      SELECT
        id, year, college_code, college_name, branch_code, branch,
        category, gender, home_university, college_status,
        stage, level, percentile, cutoff_rank, created_at
      FROM cutoff_data
      ${whereClause}
      ORDER BY year DESC, college_name ASC, branch ASC, percentile DESC
      LIMIT ${LIMIT}
    `;

    const result = await query(sql, values);
    return { rows: result.rows, total };
  }

  async bulkInsertCutoffs(cutoffs: BulkCutoffInsert[]): Promise<CutoffData[]> {
    if (cutoffs.length === 0) return [];

    const values: unknown[] = [];
    const placeholders: string[] = [];
    let p = 1;

    const COLS = 13; // number of value columns per row

    cutoffs.forEach((c) => {
      placeholders.push(
        `(gen_random_uuid(), $${p}, $${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7}, $${p + 8}, $${p + 9}, $${p + 10}, $${p + 11}, $${p + 12})`,
      );
      values.push(
        c.year,
        c.college_code || null,
        c.college_name,
        c.branch_code || null,
        c.branch,
        c.category,
        c.gender || null,
        c.home_university || 'All',
        c.college_status || null,
        c.stage || null,
        c.level || null,
        c.percentile,
        c.cutoff_rank ?? null,
      );
      p += COLS;
    });

    const sql = `
      INSERT INTO cutoff_data
        (id, year, college_code, college_name, branch_code, branch,
         category, gender, home_university, college_status,
         stage, level, percentile, cutoff_rank)
      VALUES ${placeholders.join(', ')}
      RETURNING
        id, year, college_code, college_name, branch_code, branch,
        category, gender, home_university, college_status,
        stage, level, percentile, cutoff_rank, created_at
    `;

    const result = await query(sql, values);
    return result.rows;
  }
}
