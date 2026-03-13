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
      if (
        (body.rank === undefined || body.rank === null) &&
        (body.percentile === undefined || body.percentile === null)
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either rank or percentile is required',
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
      // Only service-level validation errors should return 400
      if (
        error instanceof Error &&
        (error.message.includes('Rank must be a positive') ||
          error.message.includes('Percentile must be between') ||
          error.message.includes('Either rank or percentile is required') ||
          error.message.includes('Unable to estimate rank from percentile') ||
          error.message.includes('Invalid year'))
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  }
}
