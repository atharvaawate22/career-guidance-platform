import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export default function errorHandler(
  err: Error | unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const message = err instanceof Error ? err.message : 'Something went wrong';
  logger.error(message, err instanceof Error ? undefined : err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
    },
  });
}
