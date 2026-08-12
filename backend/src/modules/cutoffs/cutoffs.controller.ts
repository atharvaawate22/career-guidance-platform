import { Request, Response, NextFunction } from 'express';
import { CutoffsService } from './cutoffs.service';
import { CutoffFilters } from './cutoffs.types';
import { query } from '../../config/database';
import { ACTIVE_CUTOFF_YEAR } from '../../config/constants';
import { getOrLoadCutoffMeta } from './cutoffsMetaCache';
import { CutoffsQuery, CutoffsMetaQuery } from './cutoffs.schemas';

const cutoffsService = new CutoffsService();

export class CutoffsController {
  async getMeta(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Scoping params: selecting a college narrows the branch list to what
      // that college actually offers; selecting a city (district) narrows
      // the college list to colleges in that city. Both are optional — with
      // neither set this returns the full, cacheable dataset as before.
      // Trimming and empty-filtering now happen in cutoffsMetaQuerySchema.
      const q = req.validatedQuery as CutoffsMetaQuery;
      const collegeCode = q.college_code;
      const cities = q.city ?? [];

      // Dropdowns now come straight from the normalized dimension tables — the
      // college/branch/city values are clean at load time, so the old runtime
      // city-normalization heuristics are no longer needed.
      const metaData = await getOrLoadCutoffMeta(
        {
          year: ACTIVE_CUTOFF_YEAR,
          collegeCode: collegeCode || undefined,
          cities: cities.length > 0 ? cities : undefined,
        },
        async () => {
          const lowerCities = cities.map((c) => c.toLowerCase());

          const collegesQuery =
            cities.length > 0
              ? query(
                  `SELECT college_code AS code, name
                   FROM colleges
                   WHERE LOWER(city_normalized) = ANY($1::text[])
                   ORDER BY name
                   LIMIT 1000`,
                  [lowerCities],
                )
              : query(
                  `SELECT college_code AS code, name
                   FROM colleges
                   ORDER BY name
                   LIMIT 1000`,
                );

          const branchesQuery = collegeCode
            ? query(
                `SELECT DISTINCT branch_group
                 FROM courses
                 WHERE college_code = $1
                   AND branch_group IS NOT NULL AND TRIM(branch_group) <> ''
                 ORDER BY branch_group`,
                [collegeCode],
              )
            : cities.length > 0
              ? query(
                  `SELECT DISTINCT c.branch_group
                   FROM courses c
                   JOIN colleges col ON col.college_code = c.college_code
                   WHERE LOWER(col.city_normalized) = ANY($1::text[])
                     AND c.branch_group IS NOT NULL AND TRIM(c.branch_group) <> ''
                   ORDER BY c.branch_group`,
                  [lowerCities],
                )
              : query(
                  `SELECT DISTINCT branch_group
                   FROM courses
                   WHERE branch_group IS NOT NULL AND TRIM(branch_group) <> ''
                   ORDER BY branch_group`,
                );

          // The city list itself is never scoped — it's the top-level filter
          // used to narrow colleges, so it always shows every option.
          const citiesQuery = query(
            // Source the dropdown from city_normalized (the district-level
            // value the cutoffs filter matches on) — NOT the raw display
            // `city` — so the listed cities line up with what filtering queries.
            `SELECT DISTINCT INITCAP(city_normalized) AS city
             FROM colleges
             WHERE city_normalized IS NOT NULL AND TRIM(city_normalized) <> ''
             ORDER BY 1`,
          );

          // Which (academic_year, cap_round) combinations actually have rows —
          // never scoped by collegeCode/cities, since it drives the year/round
          // selectors themselves, not a filtered results view. Cheap: at most a
          // few dozen distinct pairs.
          const availableRoundsQuery = query(
            `SELECT academic_year, cap_round
             FROM cutoffs
             GROUP BY academic_year, cap_round
             ORDER BY academic_year, cap_round`,
          );

          const [colleges, branches, citiesResult, availableRoundsResult] =
            await Promise.all([
              collegesQuery,
              branchesQuery,
              citiesQuery,
              availableRoundsQuery,
            ]);

          const roundsByYear = new Map<number, number[]>();
          for (const row of availableRoundsResult.rows) {
            const year = row.academic_year as number;
            const rounds = roundsByYear.get(year) ?? [];
            rounds.push(row.cap_round as number);
            roundsByYear.set(year, rounds);
          }
          const availableRounds = [...roundsByYear.entries()]
            .sort(([a], [b]) => a - b)
            .map(([year, rounds]) => ({ year, rounds }));

          return {
            colleges: colleges.rows.map((row) => ({
              code: (row.code as string | null) || null,
              name: row.name as string,
            })),
            branches: branches.rows.map((row) => row.branch_group as string),
            cities: citiesResult.rows
              .map((row) => row.city as string)
              .filter(Boolean),
            availableRounds,
          };
        },
      );

      res.json({ success: true, data: metaData });
    } catch (error) {
      next(error);
    }
  }

  async getCollegeCutoffs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const code = String(req.params.code || '').trim();
      // DTE college codes are short numeric strings; reject junk early.
      if (!/^[A-Za-z0-9]{1,10}$/.test(code)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_COLLEGE_CODE', message: 'Invalid college code.' },
        });
        return;
      }

      const { college, rows, cached } =
        await cutoffsService.getCollegeCutoffs(code);
      if (!college) {
        res.status(404).json({
          success: false,
          error: { code: 'COLLEGE_NOT_FOUND', message: 'College not found.' },
        });
        return;
      }

      res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
      res.json({
        success: true,
        data: { college, cutoffs: rows, year: ACTIVE_CUTOFF_YEAR },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCutoffs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Already parsed, type-narrowed and normalized by cutoffsQuerySchema.
      // `year` defaults to ACTIVE_CUTOFF_YEAR (the final, primary dataset) but
      // can be overridden — e.g. by the explorer's year toggle — to reach an
      // additional year/round loaded separately (see
      // backend/scripts/load_cutoffs_incremental.js), such as a new cycle's
      // CAP Round-I provisional cutoffs.
      const q = req.validatedQuery as CutoffsQuery;

      const filters: CutoffFilters = {
        year: q.year ?? ACTIVE_CUTOFF_YEAR,
        round: q.round,
        branch_groups: q.branch,
        category: q.category,
        include_tfws: q.include_tfws,
        gender: q.gender,
        minority_types: q.minority_type,
        minority_groups: q.minority_group,
        college_name: q.college_name,
        college_code: q.college_code,
        cities: q.city,
      };

      const { rows, total, cached } = await cutoffsService.getCutoffs(filters);

      // Surface server-side Redis cache behavior so it is observable in prod
      // (and through the edge proxy). HIT = served from Redis, no DB query.
      res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
      res.json({ success: true, data: rows, total });
    } catch (error) {
      next(error);
    }
  }
}
