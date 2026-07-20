import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';

/** Passed as express.json()'s `verify` option to retain the raw bytes needed for HMAC signature verification (JSON.parse output can't be re-serialized byte-identically). */
export function captureRawBody(
  req: Request & { rawBody?: Buffer },
  _res: Response,
  buf: Buffer,
): void {
  req.rawBody = buf;
}

/**
 * Verifies Meta's X-Hub-Signature-256 header so the webhook only accepts
 * requests actually signed with our app secret — otherwise anyone who finds
 * the URL could feed arbitrary "incoming messages" into the chatbot pipeline
 * (and cause unlimited sendTextMessage calls once real credentials are set).
 *
 * WHATSAPP_APP_SECRET is optional: while unset (no WhatsApp app configured
 * yet), verification is skipped so the endpoint remains testable during
 * initial setup. Once set, every request must carry a valid signature.
 */
export function verifyWhatsAppSignature(
  req: Request & { rawBody?: Buffer },
  res: Response,
  next: NextFunction,
): void {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    next();
    return;
  }

  const signature = req.get('x-hub-signature-256');
  if (!signature || !req.rawBody) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing webhook signature' },
    });
    return;
  }

  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

  if (!valid) {
    logger.warn('[whatsapp] rejected webhook request with invalid signature');
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' },
    });
    return;
  }

  next();
}
