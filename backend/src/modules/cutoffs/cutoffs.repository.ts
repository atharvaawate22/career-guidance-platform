import { query } from '../../config/database';
import { CutoffData, CutoffFilters, BulkCutoffInsert } from './cutoffs.types';

export class CutoffsRepository {
  async getCutoffs(filters: CutoffFilters): Promise<CutoffData[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (filters.year !== undefined) {
      conditions.push(`year = $${paramCounter}`);
      values.push(filters.year);
      paramCounter++;
    }

    if (filters.branch) {
      conditions.push(`branch ILIKE $${paramCounter}`);
      values.push(`%${filters.branch}%`);
      paramCounter++;
    }

    if (filters.category) {
      conditions.push(`category = $${paramCounter}`);
      values.push(filters.category);
      paramCounter++;
    }

    if (filters.gender) {
      conditions.push(`gender = $${paramCounter}`);
      values.push(filters.gender);
      paramCounter++;
    }

    if (filters.home_university) {
      conditions.push(`home_university = $${paramCounter}`);
      values.push(filters.home_university);
      paramCounter++;
    }

    if (filters.college_name) {
      conditions.push(`college_name ILIKE $${paramCounter}`);
      values.push(`%${filters.college_name}%`);
      paramCounter++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        id, year, college_name, branch, category, 
        gender, home_university, percentile, created_at
      FROM cutoff_data
      ${whereClause}
      ORDER BY year DESC, percentile DESC
    `;

    const result = await query(sql, values);
    return result.rows;
  }

  async bulkInsertCutoffs(cutoffs: BulkCutoffInsert[]): Promise<CutoffData[]> {
    if (cutoffs.length === 0) {
      return [];
    }

    const values: any[] = [];
    const placeholders: string[] = [];
    let paramCounter = 1;

    cutoffs.forEach((cutoff) => {
      const placeholder = `(gen_random_uuid(), $${paramCounter}, $${paramCounter + 1}, $${paramCounter + 2}, $${paramCounter + 3}, $${paramCounter + 4}, $${paramCounter + 5}, $${paramCounter + 6})`;
      placeholders.push(placeholder);

      values.push(
        cutoff.year,
        cutoff.college_name,
        cutoff.branch,
        cutoff.category,
        cutoff.gender || null,
        cutoff.home_university,
        cutoff.percentile,
      );

      paramCounter += 7;
    });

    const sql = `
      INSERT INTO cutoff_data 
        (id, year, college_name, branch, category, gender, home_university, percentile)
      VALUES ${placeholders.join(', ')}
      RETURNING id, year, college_name, branch, category, gender, home_university, percentile, created_at
    `;

    const result = await query(sql, values);
    return result.rows;
  }
}
