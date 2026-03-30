import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ZodError } from 'zod';

export default function errorHandler(
  err: Error | unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues[0]?.message || 'Invalid request payload',
        requestId,
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Something went wrong';
  logger.error(message, {
    requestId,
    path: req.originalUrl,
    method: req.method,
    error:
      err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
      requestId,
    },
  });
}
