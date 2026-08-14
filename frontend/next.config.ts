import type { NextConfig } from "next";

/** Extract the scheme+host of a configured URL, ignoring anything unparseable. */
function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy.
 *
 * Helmet already sets a strict CSP on the Express API, where it protects
 * nothing — the API returns JSON, not documents. This app renders the HTML, so
 * this is the one that matters, and it matters more here than on a typical
 * site: the admin session cookie is SameSite=None (required by the split-origin
 * hosting), so the CSRF design rests on an attacker being unable to run script
 * on this origin. CSP is what keeps that assumption true.
 *
 * Ships as Content-Security-Policy-Report-Only unless CSP_ENFORCE=true, so
 * violations can be observed (Sentry already collects them) before anything is
 * actually blocked.
 *
 * KNOWN GAP, deliberately accepted for this pass: script-src carries
 * 'unsafe-inline'. Next.js App Router emits inline bootstrap/hydration scripts,
 * and removing that needs a per-request nonce, which in turn needs a
 * middleware.ts running on every request. That is a real follow-up, not
 * something to fake here — a CSP that claims to block inline script while
 * allowing it would be worse than one that is honest about the gap. The policy
 * still meaningfully constrains connect-src, object-src, base-uri,
 * form-action and frame-ancestors.
 */
function buildContentSecurityPolicy(): string {
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
    // Google Analytics via @next/third-parties.
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
  ].filter(Boolean) as string[];

  return [
    "default-src 'self'",
    // See the KNOWN GAP note above regarding 'unsafe-inline'.
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    // Inline style attributes are used pervasively across the public
    // components (design tokens are applied via style={{}} rather than Tailwind
    // utilities today), so style-src-attr must allow them.
    "style-src 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    // Fonts are self-hosted through next/font; data: covers inlined subsets.
    "font-src 'self' data:",
    // https: covers GA's tracking pixel and any Supabase Storage asset.
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Without this, frame-src inherits default-src 'self' and blocks Google
    // Analytics' iframe transport — which would fill the report-only feed with
    // violations nobody can act on, and is the one thing that would break when
    // CSP_ENFORCE is flipped on.
    "frame-src 'self' https://www.googletagmanager.com",
    // Matches X-Frame-Options: DENY below — the site is never legitimately
    // framed, including by itself.
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for API routes and SSR responses.
  // If your reverse proxy (nginx/Cloudflare) already compresses, this is
  // a safe no-op; enabling it here ensures compression even without a proxy.
  compress: true,
  // Remove the 'X-Powered-By: Next.js' header to avoid fingerprinting.
  poweredByHeader: false,
  // Security and caching headers applied to every response.
  async headers() {
    const cspHeaderName =
      process.env.CSP_ENFORCE === "true"
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only";

    const baseHeaders: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }> = [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nothing on this site is meant to be framed, by anyone.
          { key: "X-Frame-Options", value: "DENY" },
          // Limit referrer info cross-origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Drop access to device APIs the site never uses, so a future
          // third-party script can't quietly reach for them either.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: cspHeaderName, value: buildContentSecurityPolicy() },
        ],
      },
    ];

    // Production only: static assets get aggressive long-term caching because
    // Next.js content-hashes production filenames, so a code change always
    // gets a new URL. In dev, Turbopack's chunk URLs are path-stable (NOT
    // content-hashed) — an `immutable, max-age=1yr` header there tells the
    // browser to never revalidate a chunk again for an entire year, so a
    // long-lived dev browser profile can get permanently stuck serving a
    // pre-edit version of a component with no reload able to fix it.
    if (process.env.NODE_ENV === "production") {
      baseHeaders.push({
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      });
    }

    return baseHeaders;
  },
};

export default nextConfig;
