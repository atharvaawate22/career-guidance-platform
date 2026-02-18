import { Request, Response, NextFunction } from 'express';
import { PredictorService } from './predictor.service';
import { PredictorRequest } from './predictor.types';

const predictorService = new PredictorService();

export class PredictorController {
  async predict(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body = req.body as PredictorRequest;

      // Validate required fields
      if (body.percentile === undefined || body.percentile === null) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Percentile is required',
          },
        });
        return;
      }

      if (!body.year) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Year is required',
          },
        });
        return;
      }

      const predictions = await predictorService.predictColleges(body);

      res.status(200).json({
        success: true,
        data: predictions,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PREDICTION_ERROR',
            message: error.message,
          },
        });
      } else {
        next(error);
      }
    }
  }
}
