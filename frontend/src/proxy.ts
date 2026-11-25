import { NextRequest, NextResponse } from 'next/server';

/**
 * Per-request CSP nonce proxy (formerly middleware.ts — renamed to proxy.ts
 * per the Next.js 16 convention; see: nextjs.org/docs/messages/middleware-to-proxy).
 *
 * Generates a fresh cryptographic nonce on every navigation/document request and
 * injects it into the Content-Security-Policy header, replacing the static
 * `'unsafe-inline'` that `next.config.ts` previously carried in script-src.
 *
 * Why here instead of next.config.ts:
 *   next.config.ts headers() runs once at build time — the nonce value would be
 *   the same for every visitor and every request, which defeats the purpose
 *   (an attacker who reads it once can reuse it forever). Edge proxy runs
 *   on every request, so each navigation gets a unique nonce.
 *
 * The nonce is forwarded to the server component tree via the `x-nonce`
 * request header; layout.tsx reads it with `next/headers` and passes it to
 * any components that render inline scripts (e.g. GoogleAnalytics).
 *
 * Static assets (/_next/static/*) are excluded — they never carry inline
 * script and excluding them saves the per-request overhead on ~100% of CDN
 * traffic. The static asset Cache-Control rule remains in next.config.ts.
 */

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildCsp(nonce: string): string {
  const apiOrigin =
    originOf(process.env.NEXT_PUBLIC_API_BASE_URL) ??
    originOf(process.env.NEXT_PUBLIC_API_URL);
  const sentryOrigin = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const errorWebhookOrigin = originOf(
    process.env.NEXT_PUBLIC_CLIENT_ERROR_WEBHOOK_URL,
  );

  const connectSrc = [
    "'self'",
    apiOrigin,
    sentryOrigin,
    errorWebhookOrigin,
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://www.googletagmanager.com',
  ]
    .filter(Boolean)
    .join(' ');

  return [
    "default-src 'self'",
    // nonce-based: no more 'unsafe-inline'. The nonce is unique per request,
    // so an injected script without the correct nonce attribute is blocked.
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'self' https://www.googletagmanager.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
}

export function proxy(request: NextRequest): NextResponse {
  // Generate a new nonce for this request.
  // crypto.randomUUID() is available in the Edge runtime.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const cspHeaderName =
    process.env.CSP_ENFORCE === 'true'
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only';

  const csp = buildCsp(nonce);

  // Forward the nonce to Server Components via a request header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set the CSP on the response. The other security headers (X-Frame-Options,
  // Referrer-Policy, etc.) remain in next.config.ts — they are static and
  // do not need a per-request nonce.
  response.headers.set(cspHeaderName, csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (static assets — excluded for performance; see header comment)
     *   - _next/image   (image optimisation endpoints)
     *   - favicon.ico   (browser built-in fetch)
     *   - public assets (png, svg, jpg, etc.)
     *
     * The negative lookahead mirrors Next.js's own docs recommendation.
     */
    {
      source:
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
