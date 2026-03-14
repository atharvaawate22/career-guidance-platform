import { Request, Response, NextFunction } from 'express';
import { CutoffsService } from './cutoffs.service';
import { CutoffFilters, BulkCutoffInsert } from './cutoffs.types';
import { query } from '../../config/database';
import { CITY_NORMALIZED_SQL } from '../../utils/cityNormalization';

const cutoffsService = new CutoffsService();

export class CutoffsController {
  async getMeta(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const year = req.query.year ? Number(req.query.year) : 2025;
      const filterCollege = req.query.college_name as string | undefined;
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
          (_, i) => `${CITY_NORMALIZED_SQL} = $${collegeVals.length + 1 + i}`,
        );
        collegeConditions.push(`(${orParts.join(' OR ')})`);
        filterCities.forEach((c) => collegeVals.push(c.trim().toLowerCase()));
      }
      const collegeWhere = collegeConditions.length
        ? `WHERE ${collegeConditions.join(' AND ')}`
        : '';

      // Branches: filtered by year + college_name (if provided)
      const branchVals: unknown[] = [];
      const branchConditions: string[] = [];
      if (year) {
        branchConditions.push(`year = $${branchVals.length + 1}`);
        branchVals.push(year);
      }
      if (filterCollege) {
        branchConditions.push(`college_name ILIKE $${branchVals.length + 1}`);
        branchVals.push(`%${filterCollege}%`);
      }
      const branchWhere = branchConditions.length
        ? `WHERE ${branchConditions.join(' AND ')}`
        : '';

      // Cities: filtered by year only
      const cityVals: unknown[] = [];
      const cityConditions: string[] = [`${CITY_NORMALIZED_SQL} IS NOT NULL`];
      if (year) {
        cityConditions.push(`year = $${cityVals.length + 1}`);
        cityVals.push(year);
      }
      const cityWhere = `WHERE ${cityConditions.join(' AND ')}`;

      const [colleges, branches, cities] = await Promise.all([
        query(
          `SELECT DISTINCT college_name FROM cutoff_data ${collegeWhere} ORDER BY college_name LIMIT 1000`,
          collegeVals,
        ),
        query(
          `SELECT DISTINCT branch FROM cutoff_data ${branchWhere} ORDER BY branch LIMIT 500`,
          branchVals,
        ),
        query(
          `SELECT DISTINCT
             INITCAP(${CITY_NORMALIZED_SQL}) AS city
           FROM cutoff_data
           ${cityWhere}
           ORDER BY city LIMIT 300`,
          cityVals,
        ),
      ]);

      const EXCLUDE_KEYWORDS =
        /college|inst(itute)?|tech(nolog|nical)|engg|engineer|univer|campus|school|manage|society|group|research|centre|center|iceem|vjti|coep|somaiya|gramin/i;
      const EXCLUDE_TAL_DIST =
        /\btal\b|\btal\.|\bdist\b|\bdist\.|\bdistrict\b/i;      // Known localities/villages that are not city-level entries
      const KNOWN_NON_CITY = new Set([
        'nepti', 'nile', 'yelgaon', 'wadwadi', 'dumbarwadi', 'sasewadi',
        'babulgaon', 'bota sangamner', 'shirgaon', 'someshwar nagar',
        'mouza bamni', 'kokamthan', 'kuran', 'haveli', 'bhima',
      ]);
      res.json({
        success: true,
        data: {
          colleges: colleges.rows.map((r) => r.college_name),
          branches: branches.rows
            .map((r) => r.branch as string)
            .filter((branch) => {
              if (!branch) return false;
              const trimmed = branch.trim();
              if (trimmed.length < 4) return false;
              if (/^[0-9 ./,()_-]+$/.test(trimmed)) return false;
              return true;
            }),
          cities: cities.rows
            .map((r) => r.city as string)
            .filter((c) => {
              if (!c || c.length < 3 || c.length > 30) return false;
              if (/\d/.test(c)) return false; // PIN codes or mixed digits
              if (EXCLUDE_KEYWORDS.test(c)) return false; // college name fragments
              if (EXCLUDE_TAL_DIST.test(c)) return false; // taluka/district refs
              if (/[()]/.test(c)) return false; // parenthesised variants
              if (/-/.test(c)) return false; // hyphenated address combos
              if (c.split(/\s+/).length > 3) return false; // long address phrases
              if (KNOWN_NON_CITY.has(c.toLowerCase())) return false;
              return true;
            })
            .sort((a, b) => a.localeCompare(b)),
        },
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
        year: req.query.year ? Number(req.query.year) : 2025,
        branches: req.query.branch
          ? ((Array.isArray(req.query.branch)
              ? req.query.branch
              : [req.query.branch]) as string[])
          : undefined,
        category: req.query.category as string | undefined,
        gender: req.query.gender as string | undefined,
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
