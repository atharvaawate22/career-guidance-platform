import { Request, Response } from 'express';
import * as chatbotService from '../chatbot/chatbot.service';
import * as whatsappService from './whatsapp.service';
import { MENU_TEXT } from '../chatbot/chatbot.constants';
import { WhatsAppWebhookPayload } from './whatsapp.types';
import logger from '../../utils/logger';

/** GET /webhook — Meta's one-time verification handshake when the webhook URL is registered. */
export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && expectedToken && token === expectedToken) {
    res.status(200).send(String(challenge ?? ''));
    return;
  }
  res.sendStatus(403);
}

/**
 * POST /webhook — WhatsApp adapter. Thin translation of the Cloud API payload
 * <-> the shared decision service, same role as chatbot.controller.ts plays
 * for the website. All matching/answer logic lives in chatbot.service.ts.
 */
export async function receiveMessage(req: Request, res: Response): Promise<void> {
  // Acknowledge immediately: Meta treats a slow or non-2xx response as
  // delivery failure and retries aggressively, which would fan out into
  // duplicate replies once sendTextMessage actually sends.
  res.sendStatus(200);

  try {
    const payload = req.body as WhatsAppWebhookPayload;
    const messages =
      payload.entry?.flatMap((entry) =>
        entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? [],
      ) ?? [];

    for (const msg of messages) {
      if (msg.type !== 'text' || !msg.text?.body) continue;

      const reply = await chatbotService.getReply(msg.text.body, 'whatsapp', msg.from);
      // The menu text already lists numbered options; every other reply gets
      // a short nudge instead of repeating the full menu on each message.
      const outgoing =
        reply.text === MENU_TEXT ? reply.text : `${reply.text}\n\n(Reply "menu" to see all options)`;
      await whatsappService.sendTextMessage(msg.from, outgoing);
    }
  } catch (error) {
    logger.error('[whatsapp] webhook processing error', error);
  }
}
