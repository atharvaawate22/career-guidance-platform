import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';
import { isSendConfigured } from './whatsapp.service';

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
 * WHATSAPP_APP_SECRET is optional ONLY while the bot can't send. The three
 * WhatsApp env vars are set independently, so the dangerous mistake is
 * configuring sends (ACCESS_TOKEN + PHONE_NUMBER_ID) but forgetting the app
 * secret — that would leave the webhook accepting unsigned payloads *while
 * dispatching real messages*. So:
 *
 *  - secret set                          -> verify every request (normal case).
 *  - secret unset AND sends configured   -> FAIL CLOSED: reject, this is a
 *    misconfigured live deployment, not local testing.
 *  - secret unset AND sends not configured -> mock/local mode, skip so the
 *    pipeline stays testable before any real credentials exist.
 */
export function verifyWhatsAppSignature(
  req: Request & { rawBody?: Buffer },
  res: Response,
  next: NextFunction,
): void {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    if (isSendConfigured()) {
      logger.error(
        '[whatsapp] WHATSAPP_APP_SECRET is not set but sending is configured — ' +
          'refusing unsigned webhook requests. Set WHATSAPP_APP_SECRET to enable the webhook.',
      );
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_MISCONFIGURED',
          message: 'Webhook signature verification is not configured.',
        },
      });
      return;
    }
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
