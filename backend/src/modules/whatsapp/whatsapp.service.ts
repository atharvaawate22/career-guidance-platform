import logger from '../../utils/logger';

const GRAPH_API_VERSION = 'v21.0';

function isConfigured(): boolean {
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
  if (!isConfigured()) {
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
