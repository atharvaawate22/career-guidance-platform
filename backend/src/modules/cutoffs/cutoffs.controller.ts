import { Request, Response, NextFunction } from 'express';
import { CutoffsService } from './cutoffs.service';
import { CutoffFilters, BulkCutoffInsert } from './cutoffs.types';

const cutoffsService = new CutoffsService();

export class CutoffsController {
  async getCutoffs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const filters: CutoffFilters = {
        year: req.query.year ? Number(req.query.year) : undefined,
        branch: req.query.branch as string,
        category: req.query.category as string,
        gender: req.query.gender as string,
        home_university: req.query.home_university as string,
        college_name: req.query.college_name as string,
      };

      const cutoffs = await cutoffsService.getCutoffs(filters);

      res.json({
        success: true,
        data: cutoffs,
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
