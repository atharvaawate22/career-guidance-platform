import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ZodError } from 'zod';

type ErrorWithMetadata = Error & {
  code?: string;
  statusCode?: number;
  publicMessage?: string;
};

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

  const typedError = err instanceof Error ? (err as ErrorWithMetadata) : null;
  const statusCode =
    typedError?.statusCode && typedError.statusCode >= 400
      ? typedError.statusCode
      : 500;
  const code =
    typedError?.code ||
    (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED');
  const publicMessage =
    typedError?.publicMessage ||
    (statusCode >= 500 ? 'Something went wrong' : 'Request failed');
  const message = typedError?.message || 'Something went wrong';

  logger.error(message, {
    requestId,
    path: req.originalUrl,
    method: req.method,
    code,
    statusCode,
    error:
      err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: publicMessage,
      requestId,
    },
  });
}
