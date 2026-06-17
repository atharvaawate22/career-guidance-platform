import { query } from '../../config/database';
import { CutoffRow, CutoffFilters } from './cutoffs.types';
import {
  buildCategoryCondition,
  buildGenderCondition,
  buildCollegeMinorityCondition,
} from '../../utils/cutoffFilters';

const RESULT_LIMIT = 500;

export class CutoffsRepository {
  async getCutoffs(
    filters: CutoffFilters,
  ): Promise<{ rows: CutoffRow[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    conditions.push(`co.academic_year = $${p++}`);
    values.push(filters.year);

    if (filters.round !== undefined) {
      conditions.push(`co.cap_round = $${p++}`);
      values.push(filters.round);
    }

    if (filters.branch_groups && filters.branch_groups.length > 0) {
      conditions.push(`c.branch_group = ANY($${p++}::text[])`);
      values.push(filters.branch_groups);
    }

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

    if (filters.college_code) {
      conditions.push(`col.college_code = $${p++}`);
      values.push(filters.college_code);
    } else if (filters.college_name) {
      conditions.push(`col.name ILIKE $${p++}`);
      values.push(`%${filters.college_name}%`);
    }

    if (filters.cities && filters.cities.length > 0) {
      conditions.push(`col.city_normalized = ANY($${p++}::text[])`);
      values.push(filters.cities.map((c) => c.trim().toLowerCase()));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // DISTINCT ON collapses stage I/II of the same course/round/pool/category
    // to the closing cutoff (highest rank = last admitted), then we order the
    // result set by percentile for display and cap it.
    const sql = `
      WITH deduped AS (
        SELECT DISTINCT ON (co.course_id, co.cap_round, co.allotment_pool, co.category_code)
          co.id,
          co.academic_year AS year,
          col.college_code,
          col.name           AS college_name,
          col.status         AS college_status,
          col.city,
          c.choice_code,
          c.course_name      AS branch,
          c.branch_group,
          co.cap_round,
          co.stage,
          co.allotment_pool,
          co.category_code,
          COALESCE(co.category, co.subquota) AS category,
          co.gender,
          co.closing_rank       AS cutoff_rank,
          co.closing_percentile AS percentile
        FROM cutoffs co
        JOIN courses  c   ON c.id = co.course_id
        JOIN colleges col ON col.college_code = c.college_code
        ${whereClause}
        ORDER BY co.course_id, co.cap_round, co.allotment_pool, co.category_code,
                 co.closing_rank DESC NULLS LAST
      )
      SELECT *, COUNT(*) OVER()::int AS total_count
      FROM deduped
      ORDER BY percentile DESC NULLS LAST, college_name ASC, branch ASC
      LIMIT ${RESULT_LIMIT}
    `;

    // No named prepared statement: the WHERE clause is built dynamically from
    // user filters, so each call may be structurally different.
    const result = await query(sql, values, { name: 'cutoffs.getCutoffs' });
    const total =
      result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    const rows = result.rows.map(
      ({ total_count: _totalCount, ...row }) => row,
    ) as CutoffRow[];
    return { rows, total };
  }
}
