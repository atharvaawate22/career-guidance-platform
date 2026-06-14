import { Request, Response, NextFunction } from 'express';
import { PredictorService } from './predictor.service';
import { PredictorRequest } from './predictor.types';
import { predictorRequestSchema } from './predictor.schemas';
import { sanitizeText } from '../../utils/sanitize';

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

      const body = {
        ...parsed.data,
        preferred_branches: parsed.data.preferred_branches?.map(sanitizeText),
        cities: parsed.data.cities?.map(sanitizeText),
        homeUniversity: parsed.data.homeUniversity
          ? sanitizeText(parsed.data.homeUniversity)
          : parsed.data.homeUniversity,
        branch: parsed.data.branch
          ? sanitizeText(parsed.data.branch)
          : parsed.data.branch,
      } as PredictorRequest;
      const predictions = await predictorService.predictColleges(body);

      res.status(200).json({
        success: true,
        data: predictions,
      });
    } catch (error) {
      // The service throws typed HttpError instances (see utils/httpError),
      // which the central errorHandler maps to the correct status code and
      // client-safe message — no per-message string matching needed here.
      next(error);
    }
  }
}
