import { describe, expect, it } from 'vitest';
// Imported for its SIDE EFFECT, and it is load-bearing: src/server.ts pulls in
// config/sentry.ts, whose first statement is dotenv.config(). That is the only
// thing in the process that can put a real credential back into process.env, so
// a guard that does not trigger it cannot observe the failure it exists to
// catch. Without this import these assertions passed while the suite was
// running against live Supabase and Gemini credentials.
import '../src/server';
import { getRedis } from '../src/config/redis';

/**
 * Guards the property that tests/setup.ts exists to establish: the suite must
 * never talk to a real database, cache, or third-party service.
 *
 * This is a regression test for a silent failure, not a hypothetical. The
 * health-check assertions accept either 200 or 503, so when `npm test` was
 * picking up the real .env — which it did on every developer machine, because
 * src/server.ts imports config/sentry.ts and that calls dotenv.config() at the
 * top of the file — the suite made live round trips to the PRODUCTION Supabase
 * instance and still went green. Nothing in the output said so.
 *
 * If someone later removes setupFiles from vitest.config.ts, reorders it after
 * an import, or "helpfully" deletes these env assignments so the vars fall
 * through to .env, this test fails immediately and says why.
 */
describe('test environment isolation', () => {
  it('points DATABASE_URL at the unreachable sentinel, not a real database', () => {
    const url = process.env.DATABASE_URL ?? '';

    expect(url).toContain('127.0.0.1:1');
    // The two shapes a real connection string would take here.
    expect(url).not.toContain('supabase');
    expect(url).not.toContain('pooler');
  });

  it('leaves Redis unconfigured so no cache client is ever constructed', () => {
    expect(process.env.REDIS_URL).toBe('');
    expect(getRedis()).toBeNull();
  });

  it('configures a JWT secret long enough for the production-length check', () => {
    expect(String(process.env.JWT_SECRET).length).toBeGreaterThanOrEqual(32);
  });

  it('disables every outbound integration', () => {
    // Gemini generation, the Supabase embed function and Storage uploads, and
    // Sentry reporting all no-op when their config is falsy — which is what
    // keeps the suite offline and deterministic.
    //
    // `toBeFalsy`, not `toBeUndefined`: setup.ts assigns '' rather than
    // deleting, precisely so dotenv cannot refill these. Asserting undefined
    // would fail against the correct fix.
    expect(process.env.GEMINI_API_KEY).toBeFalsy();
    expect(process.env.SUPABASE_URL).toBeFalsy();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeFalsy();
    expect(process.env.SENTRY_DSN).toBeFalsy();
  });

  it('does not let the WhatsApp send path be configured', () => {
    expect(process.env.WHATSAPP_ACCESS_TOKEN).toBeFalsy();
    expect(process.env.WHATSAPP_PHONE_NUMBER_ID).toBeFalsy();
  });

  it('does not run the sample seed, which writes rows', () => {
    expect(process.env.ENABLE_SAMPLE_SEED).toBe('false');
  });
});
