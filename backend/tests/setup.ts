/**
 * Global test environment. Registered via `setupFiles` in vitest.config.ts, so
 * it runs before any test file — and therefore before `src/server.ts` pulls in
 * `config/sentry.ts`, whose first two lines are `dotenv.config()`.
 *
 * That ordering is the whole point. Without it, `npm test` on a developer
 * machine loaded the real .env and pointed the suite at the PRODUCTION Supabase
 * database: the health-check assertions in api.contract and security.boundary
 * accept either 200 or 503, so live round trips to production passed silently
 * and nobody noticed the suite had a network dependency.
 *
 * Note these are ASSIGNMENTS, not deletes. `dotenv.config()` does not override
 * a variable that is already present in process.env, but it happily fills in
 * one that has been deleted — so deleting DATABASE_URL here would simply let
 * dotenv put the production value back a moment later. Setting a deliberately
 * unreachable value is what actually holds.
 */

process.env.NODE_ENV = 'test';

/**
 * Port 1 is reserved and never listening, so pg fails fast with ECONNREFUSED
 * rather than hanging on a DNS or TCP timeout. Tests that touch the database
 * therefore get a deterministic failure instead of a flaky one.
 */
process.env.DATABASE_URL =
  'postgresql://test:test@127.0.0.1:1/cethub_test?sslmode=disable';

/** Empty string is falsy, and getRedis() treats that as "not configured" —
 *  so the suite uses the in-memory rate-limit store and never dials Redis. */
process.env.REDIS_URL = '';

/** Long enough to satisfy the production-length check in startServer(). */
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';

/** Pinned so CORS assertions have a known allow-list. */
process.env.FRONTEND_URL = 'https://app.cethub.test';

/**
 * Everything below is assigned '' rather than deleted, for the same reason
 * DATABASE_URL is assigned above — and this is not hypothetical. An earlier
 * version of this file used `delete` here, and `.env` carries GEMINI_API_KEY,
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, so dotenv put all three straight
 * back the moment a test imported src/server.ts. The suite ran with live
 * credentials for the RAG embed function and Supabase Storage while the
 * isolation test still passed, because that test does not import server.ts.
 *
 * Empty string is safe for every consumer here: each one gates on falsiness
 * (`if (!process.env.X)`), so '' reads exactly like absent.
 */

/** Off by default: individual tests opt in when they exercise the send path. */
process.env.WHATSAPP_APP_SECRET = '';
process.env.WHATSAPP_ACCESS_TOKEN = '';
process.env.WHATSAPP_PHONE_NUMBER_ID = '';

/** No outbound AI or storage calls from the suite. */
process.env.GEMINI_API_KEY = '';
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';

/** Sentry must never receive events from a test run. */
process.env.SENTRY_DSN = '';

/** The sample seed writes rows; it has no business running against a test boot. */
process.env.ENABLE_SAMPLE_SEED = 'false';
