import { query } from '../../config/database';
import { CollegeOption, PredictorFilters } from './predictor.types';

export class PredictorRepository {
  async getEligibleColleges(
    filters: PredictorFilters,
  ): Promise<CollegeOption[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    // Year is mandatory
    conditions.push(`year = $${paramCounter}`);
    values.push(filters.year);
    paramCounter++;

    // Optional category filter
    if (filters.category) {
      conditions.push(`category = $${paramCounter}`);
      values.push(filters.category);
      paramCounter++;
    }

    // Optional gender filter
    if (filters.gender) {
      conditions.push(`gender = $${paramCounter}`);
      values.push(filters.gender);
      paramCounter++;
    }

    // Optional home_university filter
    if (filters.home_university) {
      conditions.push(`home_university = $${paramCounter}`);
      values.push(filters.home_university);
      paramCounter++;
    }

    // Optional preferred_branches filter
    if (filters.preferred_branches && filters.preferred_branches.length > 0) {
      const branchConditions = filters.preferred_branches.map((_, index) => {
        const placeholder = `$${paramCounter + index}`;
        return `branch ILIKE ${placeholder}`;
      });
      conditions.push(`(${branchConditions.join(' OR ')})`);
      
      filters.preferred_branches.forEach((branch) => {
        values.push(`%${branch}%`);
        paramCounter++;
      });
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT 
        id, 
        college_name, 
        branch, 
        category, 
        gender, 
        home_university, 
        percentile as cutoff_percentile,
        year
      FROM cutoff_data
      ${whereClause}
      ORDER BY percentile DESC
    `;

    const result = await query(sql, values);
    return result.rows;
  }
}
