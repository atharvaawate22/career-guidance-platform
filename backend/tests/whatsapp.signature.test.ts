import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { verifyWhatsAppSignature } from '../src/modules/whatsapp/whatsapp.middleware';

/**
 * Guards the fail-closed behaviour of the WhatsApp webhook signature check.
 * The three WhatsApp env vars are set independently, so the dangerous mistake
 * is enabling sends (ACCESS_TOKEN + PHONE_NUMBER_ID) while forgetting
 * WHATSAPP_APP_SECRET — that must NOT leave the webhook accepting unsigned
 * payloads while dispatching real messages.
 */

const SECRET = 'test-app-secret';

function invoke(rawBody: Buffer, signatureHeader?: string) {
  const headers: Record<string, string> = {};
  if (signatureHeader) headers['x-hub-signature-256'] = signatureHeader;

  const req = {
    rawBody,
    get: (h: string) => headers[h.toLowerCase()],
  } as unknown as Request & { rawBody?: Buffer };

  const state: { status?: number; body?: unknown; nexted: boolean } = {
    nexted: false,
  };
  const res = {
    status(code: number) {
      state.status = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
  } as unknown as Response;

  verifyWhatsAppSignature(req, res, () => {
    state.nexted = true;
  });
  return state;
}

const BODY = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
const validSignature = () =>
  'sha256=' + crypto.createHmac('sha256', SECRET).update(BODY).digest('hex');

function resetEnv() {
  delete process.env.WHATSAPP_APP_SECRET;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
}

afterEach(() => {
  resetEnv();
  vi.restoreAllMocks();
});

describe('verifyWhatsAppSignature', () => {
  it('skips verification in mock mode (no secret, sends not configured)', () => {
    resetEnv();
    const r = invoke(BODY);
    expect(r.nexted).toBe(true);
    expect(r.status).toBeUndefined();
  });

  it('FAILS CLOSED when sends are configured but the app secret is missing', () => {
    resetEnv();
    process.env.WHATSAPP_ACCESS_TOKEN = 'tok';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    const r = invoke(BODY);
    expect(r.nexted).toBe(false);
    expect(r.status).toBe(500);
    expect(r.body).toMatchObject({ error: { code: 'WEBHOOK_MISCONFIGURED' } });
  });

  it('accepts a request carrying a valid signature', () => {
    resetEnv();
    process.env.WHATSAPP_APP_SECRET = SECRET;
    process.env.WHATSAPP_ACCESS_TOKEN = 'tok';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    const r = invoke(BODY, validSignature());
    expect(r.nexted).toBe(true);
    expect(r.status).toBeUndefined();
  });

  it('rejects a request with an invalid signature', () => {
    resetEnv();
    process.env.WHATSAPP_APP_SECRET = SECRET;
    const r = invoke(BODY, 'sha256=deadbeef');
    expect(r.nexted).toBe(false);
    expect(r.status).toBe(401);
  });

  it('rejects a request with no signature header when the secret is set', () => {
    resetEnv();
    process.env.WHATSAPP_APP_SECRET = SECRET;
    const r = invoke(BODY);
    expect(r.nexted).toBe(false);
    expect(r.status).toBe(401);
  });
});
