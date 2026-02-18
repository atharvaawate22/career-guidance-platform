import { Request, Response, NextFunction } from 'express';

// Assume logger exists and is imported
import logger from '../utils/logger';

export default function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error(err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
    },
  });
}
