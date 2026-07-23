import logger from '../../utils/logger';
import { getRedis } from '../../config/redis';

const GRAPH_API_VERSION = 'v21.0';

/**
 * Meta retries a failed webhook delivery for up to 7 days (exponential
 * backoff) before discarding it — https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview.
 * The dedup TTL matches that worst case so a very late redelivery still gets
 * caught.
 */
const MSG_ID_DEDUP_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * True if this message id has already been processed. WhatsApp's Cloud API
 * delivery is at-least-once, not exactly-once, so a redelivered message must
 * not be answered a second time (duplicate reply to the student, and a
 * duplicate row in unanswered_queries if it falls through to the fallback
 * path). `SET ... NX` is atomic — first caller to mark a given id wins, no
 * check-then-set race between near-simultaneous redeliveries.
 *
 * When Redis isn't configured (or errors), this returns false — never dedup
 * — rather than risk dropping a real student's message over a cache hiccup.
 * Matches the "cache failure must never break the request" rule used
 * elsewhere in this codebase (see config/redis.ts).
 */
export async function isDuplicateMessage(msgId: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  try {
    const result = await client.set(
      `whatsapp:msgid:${msgId}`,
      '1',
      'EX',
      MSG_ID_DEDUP_TTL_SECONDS,
      'NX',
    );
    return result === null;
  } catch (error) {
    logger.error('[whatsapp] dedup check failed', error);
    return false;
  }
}

/**
 * True once outgoing sends are wired up (access token + phone number id
 * present). Exported so the webhook signature check can tell a live deployment
 * apart from local mock mode: once we can actually send, an unsigned webhook is
 * a security hole, not a convenience.
 */
export function isSendConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Sends a plain-text WhatsApp message via the Cloud API's Graph endpoint.
 * Mirrors the mock-mode pattern used by email/calendar (EMAIL_PROVIDER=mock,
 * GOOGLE_CLIENT_ID optional): when credentials aren't configured yet, this
 * logs and no-ops instead of throwing, so the webhook stays functional
 * end-to-end (verification handshake, message receipt, chatbot logic, DB
 * logging) before a real WhatsApp Business number is connected.
 */
export async function sendTextMessage(to: string, body: string): Promise<boolean> {
  if (!isSendConfigured()) {
    logger.warn(
      '[whatsapp] WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID not set — skipping send (mock mode)',
      { to, bodyPreview: body.slice(0, 80) },
    );
    return false;
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });

    if (!res.ok) {
      logger.error('[whatsapp] send failed', {
        status: res.status,
        body: await res.text().catch(() => ''),
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.error('[whatsapp] send error', error);
    return false;
  }
}
