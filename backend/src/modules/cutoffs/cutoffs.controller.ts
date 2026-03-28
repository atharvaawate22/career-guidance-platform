import { Request, Response, NextFunction } from 'express';
import { CutoffsService } from './cutoffs.service';
import { CutoffFilters, BulkCutoffInsert } from './cutoffs.types';
import { query } from '../../config/database';
import { CITY_FILTER_SQL } from '../../utils/cityNormalization';
import {
  getOrLoadCutoffMeta,
  invalidateCutoffMetaCache,
} from './cutoffsMetaCache';

const cutoffsService = new CutoffsService();
const ACTIVE_CUTOFF_YEAR = 2025;

export class CutoffsController {
  async getMeta(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const year = ACTIVE_CUTOFF_YEAR;
      const filterCollege = req.query.college_name as string | undefined;
      const filterCollegeCode = req.query.college_code as string | undefined;
      const filterBranches: string[] = req.query.branch
        ? ((Array.isArray(req.query.branch)
            ? req.query.branch
            : [req.query.branch]) as string[])
        : [];
      const filterCities: string[] = req.query.city
        ? ((Array.isArray(req.query.city)
            ? req.query.city
            : [req.query.city]) as string[])
        : [];

      const metaData = await getOrLoadCutoffMeta(
        {
          year,
          collegeCode: filterCollegeCode,
          collegeName: filterCollege,
          branches: filterBranches,
          cities: filterCities,
        },
        async () => {
          // Build per-query conditions independently
          // Colleges: filtered by year + branches (OR) + cities (OR)
          const collegeVals: unknown[] = [];
          const collegeConditions: string[] = [];
          if (year) {
            collegeConditions.push(`year = $${collegeVals.length + 1}`);
            collegeVals.push(year);
          }
          if (filterBranches.length > 0) {
            const orParts = filterBranches.map(
              (_, i) => `branch ILIKE $${collegeVals.length + 1 + i}`,
            );
            collegeConditions.push(`(${orParts.join(' OR ')})`);
            filterBranches.forEach((b) => collegeVals.push(`%${b}%`));
          }
          if (filterCities.length > 0) {
            const orParts = filterCities.map(
              (_, i) => `${CITY_FILTER_SQL} = $${collegeVals.length + 1 + i}`,
            );
            collegeConditions.push(`(${orParts.join(' OR ')})`);
            filterCities.forEach((c) =>
              collegeVals.push(c.trim().toLowerCase()),
            );
          }
          const collegeWhere = collegeConditions.length
            ? `WHERE ${collegeConditions.join(' AND ')}`
            : '';

          // Branches: filtered by year + selected college.
          const branchVals: unknown[] = [];
          const branchConditions: string[] = [];
          if (year) {
            branchConditions.push(`year = $${branchVals.length + 1}`);
            branchVals.push(year);
          }
          if (filterCollegeCode) {
            branchConditions.push(`college_code = $${branchVals.length + 1}`);
            branchVals.push(filterCollegeCode);
          } else if (filterCollege) {
            branchConditions.push(
              `college_name ILIKE $${branchVals.length + 1}`,
            );
            branchVals.push(`%${filterCollege}%`);
          }
          if (filterCities.length > 0) {
            const orParts = filterCities.map(
              (_, i) => `${CITY_FILTER_SQL} = $${branchVals.length + 1 + i}`,
            );
            branchConditions.push(`(${orParts.join(' OR ')})`);
            filterCities.forEach((city) =>
              branchVals.push(city.trim().toLowerCase()),
            );
          }
          const branchWhere = branchConditions.length
            ? `WHERE ${branchConditions.join(' AND ')}`
            : '';

          // Cities: filtered by year + selected college + selected branches.
          const cityVals: unknown[] = [];
          const cityConditions: string[] = [`${CITY_FILTER_SQL} IS NOT NULL`];
          if (year) {
            cityConditions.push(`year = $${cityVals.length + 1}`);
            cityVals.push(year);
          }
          if (filterCollegeCode) {
            cityConditions.push(`college_code = $${cityVals.length + 1}`);
            cityVals.push(filterCollegeCode);
          } else if (filterCollege) {
            cityConditions.push(`college_name ILIKE $${cityVals.length + 1}`);
            cityVals.push(`%${filterCollege}%`);
          }
          if (filterBranches.length > 0) {
            const orParts = filterBranches.map(
              (_, i) => `branch ILIKE $${cityVals.length + 1 + i}`,
            );
            cityConditions.push(`(${orParts.join(' OR ')})`);
            filterBranches.forEach((branch) => cityVals.push(`%${branch}%`));
          }
          const cityWhere = `WHERE ${cityConditions.join(' AND ')}`;

          const [colleges, branches, cities] = await Promise.all([
            query(
              // Deduplicate by college_code so that slight name changes across years
              // (e.g. "(Autonomous)" suffix, abbreviation differences) don't produce
              // duplicate dropdown entries. For each unique code we take the most
              // recent year's name; rows without a code are deduplicated by name.
              `SELECT college_code, college_name
               FROM (
                 SELECT DISTINCT ON (COALESCE(college_code::text, college_name))
                   college_code, college_name
                 FROM cutoff_data
                 ${collegeWhere}
                 ORDER BY COALESCE(college_code::text, college_name), year DESC NULLS LAST
               ) deduped
               ORDER BY college_name
               LIMIT 1000`,
              collegeVals,
            ),
            query(
              `SELECT DISTINCT branch FROM cutoff_data ${branchWhere} ORDER BY branch LIMIT 500`,
              branchVals,
            ),
            query(
              `SELECT DISTINCT
                 INITCAP(${CITY_FILTER_SQL}) AS city
               FROM cutoff_data
               ${cityWhere}
               ORDER BY city LIMIT 300`,
              cityVals,
            ),
          ]);

          const EXCLUDE_KEYWORDS =
            /college|inst(itute)?|tech(nolog|nical)|engg|engineer|univer|campus|school|manage|society|group|research|centre|center|iceem|vjti|coep|somaiya|gramin/i;
          const EXCLUDE_TAL_DIST =
            /\btal\b|\btal\.|\bdist\b|\bdist\.|\bdistrict\b/i;
          const EXCLUDE_ADDRESS_PREFIX =
            /^(a\.?\s*p\.?|at\/?post|at post|post|near)\b/i;
          const KNOWN_NON_CITY = new Set([
            'nepti',
            'nile',
            'yelgaon',
            'wadwadi',
            'dumbarwadi',
            'sasewadi',
            'babulgaon',
            'bota sangamner',
            'shirgaon',
            'someshwar nagar',
            'mouza bamni',
            'kokamthan',
            'kuran',
            'haveli',
            'bhima',
          ]);

          return {
            colleges: colleges.rows.map((row) => ({
              code: (row.college_code as string | null) || null,
              name: row.college_name as string,
            })),
            branches: branches.rows
              .map((row) => row.branch as string)
              .filter((branch) => {
                if (!branch) return false;
                const trimmed = branch.trim();
                if (trimmed.length < 4) return false;
                if (/^[0-9 ./,()_-]+$/.test(trimmed)) return false;
                return true;
              }),
            cities: cities.rows
              .map((row) => row.city as string)
              .filter((city) => {
                if (!city || city.length < 3 || city.length > 30) return false;
                if (/\d/.test(city)) return false;
                if (EXCLUDE_ADDRESS_PREFIX.test(city)) return false;
                if (EXCLUDE_KEYWORDS.test(city)) return false;
                if (EXCLUDE_TAL_DIST.test(city)) return false;
                if (/[()]/.test(city)) return false;
                if (/-/.test(city)) return false;
                if (city.split(/\s+/).length > 3) return false;
                if (KNOWN_NON_CITY.has(city.toLowerCase())) return false;
                return true;
              })
              .sort((left, right) => left.localeCompare(right)),
          };
        },
      );

      res.json({
        success: true,
        data: metaData,
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
      const filters: CutoffFilters = {
        year: ACTIVE_CUTOFF_YEAR,
        branches: req.query.branch
          ? ((Array.isArray(req.query.branch)
              ? req.query.branch
              : [req.query.branch]) as string[])
          : undefined,
        category: req.query.category as string | undefined,
        include_tfws:
          req.query.include_tfws === 'true' || req.query.include_tfws === '1',
        gender: req.query.gender as string | undefined,
        minority_types: req.query.minority_type
          ? ((Array.isArray(req.query.minority_type)
              ? req.query.minority_type
              : [req.query.minority_type]) as string[])
          : undefined,
        minority_groups: req.query.minority_group
          ? ((Array.isArray(req.query.minority_group)
              ? req.query.minority_group
              : [req.query.minority_group]) as string[])
          : undefined,
        home_university: req.query.home_university as string | undefined,
        college_name: req.query.college_name as string | undefined,
        college_code: req.query.college_code as string | undefined,
        branch_code: req.query.branch_code as string | undefined,
        stage: req.query.stage as string | undefined,
        level: req.query.level as string | undefined,
        cities: req.query.city
          ? ((Array.isArray(req.query.city)
              ? req.query.city
              : [req.query.city]) as string[])
          : undefined,
      };

      const { rows, total } = await cutoffsService.getCutoffs(filters);

      res.json({
        success: true,
        data: rows,
        total,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkInsertCutoffs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const cutoffs = req.body as BulkCutoffInsert[];

      if (!Array.isArray(cutoffs)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body must be an array of cutoff data',
          },
        });
        return;
      }

      const insertedCutoffs = await cutoffsService.bulkInsertCutoffs(cutoffs);
      invalidateCutoffMetaCache();

      res.status(201).json({
        success: true,
        data: insertedCutoffs,
        message: `Successfully inserted ${insertedCutoffs.length} cutoff records`,
      });
    } catch (error) {
      next(error);
    }
  }
}
