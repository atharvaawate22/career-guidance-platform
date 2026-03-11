import { Request, Response, NextFunction } from 'express';
import { CutoffsService } from './cutoffs.service';
import { CutoffFilters, BulkCutoffInsert } from './cutoffs.types';
import { query } from '../../config/database';

const cutoffsService = new CutoffsService();

export class CutoffsController {
  async getMeta(req: Request, res: Response, next: NextFunction): Promise<void> {
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
          `SELECT DISTINCT TRIM(REGEXP_REPLACE(college_name, '^.*,', '')) AS city
           FROM cutoff_data ${where}
           ORDER BY city LIMIT 300`,
          vals,
        ),
      ]);

      res.json({
        success: true,
        data: {
          colleges: colleges.rows.map((r) => r.college_name),
          branches: branches.rows.map((r) => r.branch),
          cities: cities.rows.map((r) => r.city as string).filter((c) => c && c.length > 2 && c.length < 40),
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
        year:           req.query.year         ? Number(req.query.year) : undefined,
        branch:         req.query.branch        as string | undefined,
        category:       req.query.category      as string | undefined,
        gender:         req.query.gender        as string | undefined,
        home_university: req.query.home_university as string | undefined,
        college_name:   req.query.college_name  as string | undefined,
        college_code:   req.query.college_code  as string | undefined,
        branch_code:    req.query.branch_code   as string | undefined,
        stage:          req.query.stage         as string | undefined,
        level:          req.query.level         as string | undefined,
        cities:         req.query.city
          ? (Array.isArray(req.query.city) ? req.query.city : [req.query.city]) as string[]
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
