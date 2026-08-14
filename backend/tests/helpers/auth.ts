import jwt from 'jsonwebtoken';
import { ADMIN_AUTH_COOKIE, ADMIN_CSRF_COOKIE } from '../../src/modules/auth/auth.constants';

/**
 * Admin-session helpers for the API tests.
 *
 * There used to be three spellings of this — `signToken` in
 * security.boundary, `buildAdminSessionCookie` in csrf.protection, and an
 * inline `jwt.sign` in api.contract — and they did not even agree on the
 * payload shape: two used `{ userId, role }` (what JWTPayload actually
 * declares and what authMiddleware reads) while the third used
 * `{ id, email, role }`, which authMiddleware silently ignores. A test that
 * passes with the wrong payload shape is testing the wrong thing.
 *
 * Reads JWT_SECRET at call time rather than module load so a test that
 * temporarily unsets it (auth.service.test.ts does) still behaves predictably.
 */

export interface TestTokenClaims {
  userId?: string;
  role?: 'admin' | 'user';
  [key: string]: unknown;
}

/** Signs a JWT with the same payload shape JWTPayload declares. */
export function signAdminToken(
  overrides: TestTokenClaims = {},
  options: jwt.SignOptions = { expiresIn: '1h' },
): string {
  return jwt.sign(
    { userId: 'test-admin', role: 'admin', ...overrides },
    String(process.env.JWT_SECRET),
    options,
  );
}

/** `Cookie` header value carrying a valid admin session. */
export function adminSessionCookie(overrides?: TestTokenClaims): string {
  return `${ADMIN_AUTH_COOKIE}=${signAdminToken(overrides)}`;
}

/**
 * Cookie header plus the matching CSRF header value, for the mutating routes.
 * Both halves have to agree — that IS the double-submit check — so returning
 * them together removes the chance of a test setting only one.
 */
export function adminSessionWithCsrf(csrfToken = 'test-csrf-token'): {
  cookies: string[];
  csrfHeader: Record<string, string>;
} {
  return {
    cookies: [adminSessionCookie(), `${ADMIN_CSRF_COOKIE}=${csrfToken}`],
    csrfHeader: { 'x-csrf-token': csrfToken },
  };
}
