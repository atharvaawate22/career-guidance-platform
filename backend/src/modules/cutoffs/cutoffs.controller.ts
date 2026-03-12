import { Request, Response, NextFunction } from 'express';
import { CutoffsService } from './cutoffs.service';
import { CutoffFilters, BulkCutoffInsert } from './cutoffs.types';
import { query } from '../../config/database';

const cutoffsService = new CutoffsService();

export class CutoffsController {
  async getMeta(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const year = req.query.year ? Number(req.query.year) : null;
      const where = year ? `WHERE year = $1` : ``;
      const vals = year ? [year] : [];

      const [colleges, branches, cities] = await Promise.all([
        query(
          `SELECT DISTINCT college_name FROM cutoff_data ${where} ORDER BY college_name LIMIT 1000`,
          vals,
        ),
        query(
          `SELECT DISTINCT branch FROM cutoff_data ${where} ORDER BY branch LIMIT 500`,
          vals,
        ),
        query(
          `SELECT DISTINCT
             INITCAP(TRIM(TRAILING '.' FROM TRIM(REGEXP_REPLACE(college_name, '^.*,\\s*', '')))) AS city
           FROM cutoff_data
           ${year ? 'WHERE year = $1 AND' : 'WHERE'} college_name LIKE '%,%'
           ORDER BY city LIMIT 300`,
          vals,
        ),
      ]);

      const EXCLUDE_KEYWORDS =
        /college|inst(itute)?|tech(nolog|nical)|engg|engineer|univer|campus|school|manage|society|group|research|centre|center|iceem|vjti|coep|somaiya|gramin/i;
      const EXCLUDE_TAL_DIST = /\btal\b|\btal\.|\bdist\b|\bdist\.|\bdistrict\b/i;

      res.json({
        success: true,
        data: {
          colleges: colleges.rows.map((r) => r.college_name),
          branches: branches.rows.map((r) => r.branch),
          cities: cities.rows
            .map((r) => r.city as string)
            .filter((c) => {
              if (!c || c.length < 3 || c.length > 25) return false;
              if (/\d/.test(c)) return false; // PIN codes or mixed digits
              if (EXCLUDE_KEYWORDS.test(c)) return false; // college name fragments
              if (EXCLUDE_TAL_DIST.test(c)) return false; // taluka/district refs
              if (/[()]/.test(c)) return false; // parenthesised variants
              if (/-/.test(c)) return false; // hyphenated address combos
              if (c.split(/\s+/).length > 3) return false; // long address phrases
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
        year: req.query.year ? Number(req.query.year) : undefined,
        branch: req.query.branch as string | undefined,
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
