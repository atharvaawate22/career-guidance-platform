import { Request, Response, NextFunction } from 'express';
import { CutoffsService } from './cutoffs.service';
import { CutoffFilters } from './cutoffs.types';
import { query } from '../../config/database';
import {
  ACTIVE_CUTOFF_YEAR,
  MAX_FILTER_ARRAY_LENGTH,
} from '../../config/constants';
import { getOrLoadCutoffMeta } from './cutoffsMetaCache';

const cutoffsService = new CutoffsService();

const parseArrayParam = (value: unknown): string[] => {
  const arr = (Array.isArray(value) ? value : value ? [value] : []) as string[];
  return arr.slice(0, MAX_FILTER_ARRAY_LENGTH);
};

const parseRound = (value: unknown): number | undefined => {
  if (value === undefined) return undefined;
  const n = parseInt(String(value), 10);
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : undefined;
};

export class CutoffsController {
  async getMeta(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Dropdowns now come straight from the normalized dimension tables — the
      // college/branch/city values are clean at load time, so the old runtime
      // city-normalization heuristics are no longer needed.
      const metaData = await getOrLoadCutoffMeta(
        { year: ACTIVE_CUTOFF_YEAR },
        async () => {
          const [colleges, branches, cities] = await Promise.all([
            query(
              `SELECT college_code AS code, name
               FROM colleges
               ORDER BY name
               LIMIT 1000`,
            ),
            query(
              `SELECT DISTINCT branch_group
               FROM courses
               WHERE branch_group IS NOT NULL AND TRIM(branch_group) <> ''
               ORDER BY branch_group`,
            ),
            query(
              `SELECT DISTINCT INITCAP(city) AS city
               FROM colleges
               WHERE city IS NOT NULL AND TRIM(city) <> ''
               ORDER BY 1`,
            ),
          ]);

          return {
            colleges: colleges.rows.map((row) => ({
              code: (row.code as string | null) || null,
              name: row.name as string,
            })),
            branches: branches.rows.map((row) => row.branch_group as string),
            cities: cities.rows
              .map((row) => row.city as string)
              .filter(Boolean),
          };
        },
      );

      res.json({ success: true, data: metaData });
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
      const branches = parseArrayParam(req.query.branch);
      const minorityTypes = parseArrayParam(req.query.minority_type);
      const minorityGroups = parseArrayParam(req.query.minority_group);
      const cities = parseArrayParam(req.query.city);

      const filters: CutoffFilters = {
        year: ACTIVE_CUTOFF_YEAR,
        round: parseRound(req.query.round),
        branch_groups: branches.length > 0 ? branches : undefined,
        category: req.query.category as string | undefined,
        include_tfws:
          req.query.include_tfws === 'true' || req.query.include_tfws === '1',
        gender: req.query.gender as string | undefined,
        minority_types: minorityTypes.length > 0 ? minorityTypes : undefined,
        minority_groups: minorityGroups.length > 0 ? minorityGroups : undefined,
        college_name: req.query.college_name as string | undefined,
        college_code: req.query.college_code as string | undefined,
        cities: cities.length > 0 ? cities : undefined,
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
