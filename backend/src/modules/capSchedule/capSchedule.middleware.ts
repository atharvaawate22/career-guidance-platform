import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

/** Constant-time string compare, mirroring middleware/rateLimit.ts's proxy-token check. */
function safeTokenEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Guards the reminder-check endpoint, which is called by a scheduled GitHub
 * Actions workflow rather than a logged-in admin — there is no browser
 * session to check, so this is a shared-secret header instead of
 * authMiddleware/requireAdminRole.
 */
export function verifyReminderToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const configured = process.env.CAP_SCHEDULE_REMINDER_TOKEN;
  if (!configured) {
    res.status(503).json({
      success: false,
      error: { code: 'NOT_CONFIGURED', message: 'CAP_SCHEDULE_REMINDER_TOKEN is not set' },
    });
    return;
  }

  const provided = req.get('x-reminder-token') ?? '';
  if (!provided || !safeTokenEqual(provided, configured)) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing reminder token' },
    });
    return;
  }

  next();
}
