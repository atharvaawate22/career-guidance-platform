import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

const REQUEST_ID_HEADER = 'x-request-id';

const getRequestIdFromHeader = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return null;
  return trimmed;
};

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const incoming = getRequestIdFromHeader(req.headers[REQUEST_ID_HEADER]);
  const requestId = incoming || randomUUID();
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info('HTTP request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(elapsedMs.toFixed(2)),
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
    });
  });

  next();
};
