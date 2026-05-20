import { Request, Response, NextFunction } from 'express';
import { PredictorService } from './predictor.service';
import { PredictorRequest } from './predictor.types';
import { predictorRequestSchema } from './predictor.schemas';

const predictorService = new PredictorService();

export class PredictorController {
  async predict(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parsed = predictorRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: firstIssue?.message || 'Invalid request payload',
            details: parsed.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        });
        return;
      }

      const body = parsed.data as PredictorRequest;
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
