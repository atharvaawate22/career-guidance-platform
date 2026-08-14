import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';

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

  // `code` is only surfaced to the client when the author deliberately shaped
  // this error for clients — i.e. it is an HttpError, or it carries a
  // publicMessage (the pattern auth.service.ts uses). Everything else falls
  // back to a generic code.
  //
  // Without that gate, any library error with a `code` property leaked it
  // straight into the API contract: pg sets SQLSTATE codes, so a unique
  // violation escaping a service returned {"code":"23505"} and a bad cast
  // returned {"code":"22P02"}, while Node system errors would return
  // {"code":"ECONNREFUSED"}. Minor disclosure on its own, but it also made
  // client codes indistinguishable from driver codes.
  const isClientShaped =
    err instanceof HttpError || typeof typedError?.publicMessage === 'string';
  const code =
    (isClientShaped ? typedError?.code : undefined) ||
    (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED');
  const publicMessage =
    typedError?.publicMessage ||
    (statusCode >= 500 ? 'Something went wrong' : 'Request failed');
  const message = typedError?.message || 'Something went wrong';

  // Client errors (4xx) are expected and logged at warn; only 5xx are errors.
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel](message, {
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
