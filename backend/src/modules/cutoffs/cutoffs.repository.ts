import { query } from '../../config/database';
import { CutoffData, CutoffFilters, BulkCutoffInsert } from './cutoffs.types';
import { CITY_NORMALIZED_SQL } from '../../utils/cityNormalization';
import { buildCandidateGenderFilter } from '../../utils/candidateGenderFilter';
import { buildMinorityStatusFilter } from '../../utils/minorityStatus';

export class CutoffsRepository {
  async getCutoffs(
    filters: CutoffFilters,
  ): Promise<{ rows: CutoffData[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    if (filters.year !== undefined) {
      conditions.push(`year = $${p++}`);
      values.push(filters.year);
    }
    if (filters.branches && filters.branches.length > 0) {
      conditions.push(`branch ILIKE ANY($${p++}::text[])`);
      values.push(filters.branches.map((b) => `%${b}%`));
    }
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
    const genderFilter = buildCandidateGenderFilter(filters.gender, p);
    if (genderFilter.condition) {
      conditions.push(genderFilter.condition);
      values.push(...genderFilter.values);
      p = genderFilter.nextIndex;
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
      conditions.push(`(
        LOWER(TRIM(city_normalized)) = ANY($${p}::text[])
        OR (
          (city_normalized IS NULL OR TRIM(city_normalized) = '')
          AND LOWER(TRIM(${CITY_NORMALIZED_SQL})) = ANY($${p}::text[])
        )
      )`);
      values.push(filters.cities.map((c) => c.trim().toLowerCase()));
      p++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const dedupedRowsCte = `
      WITH ranked_cutoffs AS (
        SELECT
          id, year, college_code, college_name, branch_code, branch,
          category, gender, home_university, college_status,
          stage, level, percentile, cutoff_rank, created_at,
          ROW_NUMBER() OVER (
            PARTITION BY
              year,
              COALESCE(college_code, college_name),
              COALESCE(branch_code, branch),
              category,
              COALESCE(stage, ''),
              COALESCE(gender, ''),
              COALESCE(home_university, ''),
              COALESCE(college_status, ''),
              COALESCE(level, '')
            ORDER BY
              cutoff_rank DESC NULLS LAST,
              percentile ASC NULLS LAST,
              created_at DESC
          ) AS row_rank
        FROM cutoff_data
        ${whereClause}
      )
    `;

    // Fetch rows with limit
    const LIMIT = 500;
    const sql = `
      ${dedupedRowsCte}
      SELECT
        id, year, college_code, college_name, branch_code, branch,
        category, gender, home_university, college_status,
        stage, level, percentile, cutoff_rank, created_at,
        COUNT(*) OVER()::int AS total_count
      FROM ranked_cutoffs
      WHERE row_rank = 1
      ORDER BY year DESC, college_name ASC, branch ASC, percentile DESC
      LIMIT ${LIMIT}
    `;

    const result = await query(sql, values, {
      name: 'cutoffs.get_cutoffs',
    });
    const total =
      result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    const rows = result.rows.map(
      ({ total_count: _totalCount, ...row }) => row,
    ) as CutoffData[];
    return { rows, total };
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

    const insertedIds = result.rows.map((row) => row.id as string);
    if (insertedIds.length > 0) {
      await query(
        `
          UPDATE cutoff_data
          SET city_normalized = LOWER(TRIM(${CITY_NORMALIZED_SQL}))
          WHERE id = ANY($1::uuid[])
        `,
        [insertedIds],
      );
    }

    return result.rows;
  }
}
