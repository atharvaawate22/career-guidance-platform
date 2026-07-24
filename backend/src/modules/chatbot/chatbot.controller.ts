import { Request, Response, NextFunction } from 'express';
import * as chatbotService from './chatbot.service';
import * as chatbotRepository from './chatbot.repository';

/** Website adapter — thin translation of HTTP <-> the shared decision service. No chatbot logic lives here. */
export async function postMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { message, sessionId } = req.body as { message: string; sessionId?: string };
    const reply = await chatbotService.getReply(message, 'website', undefined, sessionId);
    res.json({ success: true, data: reply });
  } catch (error) {
    next(error);
  }
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 90;
const MAX_WINDOW_DAYS = 365;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/** Parse a positive-integer query param, clamped to [1, max], falling back to `fallback` on anything invalid. */
function parseBoundedInt(value: unknown, fallback: number, max: number): number {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

/**
 * Admin read of the chatbot fallback backlog — the questions students asked
 * that the bot couldn't answer, grouped by frequency. This is the feedback
 * loop that tells Phase 2 what content to prioritise (see
 * CHATBOT_ARCHITECTURE.md §2.7). Read-only; auth is enforced at the route.
 */
export async function getUnansweredQueries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const days = parseBoundedInt(req.query.days, DEFAULT_WINDOW_DAYS, MAX_WINDOW_DAYS);
    const limit = parseBoundedInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);

    const [summary, groups] = await Promise.all([
      chatbotRepository.getUnansweredQuerySummary(days),
      chatbotRepository.getUnansweredQueriesGrouped(days, limit),
    ]);

    res.json({
      success: true,
      data: { window_days: days, limit, summary, groups },
    });
  } catch (error) {
    next(error);
  }
}
