import { Request, Response, NextFunction } from 'express';

/**
 * Adds an HTTP `Cache-Control` header to *successful* responses on public,
 * read-only GET endpoints so that browsers and any shared cache / CDN
 * (Vercel's edge, Cloudflare, etc.) can serve repeat reads without hitting the
 * backend again.
 *
 * Why this matters for the current hosting: the API runs on a single small
 * Render instance (0.1 CPU / 512 MB) that also sleeps when idle. Every read a
 * cache can answer is a read that never wakes or loads that instance — this is
 * the cheapest available lever for both latency and capacity.
 *
 * Safety rules (read before mounting on a new route):
 *  - Only GET / HEAD requests are touched — mutations are never cached.
 *  - The header is attached lazily and ONLY when the final status is 2xx, so a
 *    transient 4xx/5xx error is never cached.
 *  - Mount this ONLY on endpoints whose response is identical for every visitor
 *    (no auth, no cookies, no per-user data). Caching a personalised or
 *    authenticated response in a shared cache would leak it to other users.
 *
 * Header semantics:
 *  - `max-age`                 — how long a *browser* may reuse the response.
 *  - `s-maxage`                — how long a *shared cache / CDN* may reuse it.
 *  - `stale-while-revalidate`  — serve stale instantly while refreshing in the
 *                                background, so a user never waits on a cold
 *                                backend once the cache is warm.
 */
interface PublicCacheOptions {
  /** Browser cache lifetime in seconds. */
  browserMaxAge: number;
  /** Shared-cache / CDN lifetime in seconds. Defaults to `browserMaxAge`. */
  sharedMaxAge?: number;
  /** stale-while-revalidate window in seconds. Defaults to `sharedMaxAge`. */
  staleWhileRevalidate?: number;
}

export function publicCache(options: PublicCacheOptions) {
  const browserMaxAge = Math.max(0, Math.floor(options.browserMaxAge));
  const sharedMaxAge = Math.max(
    0,
    Math.floor(options.sharedMaxAge ?? browserMaxAge),
  );
  const swr = Math.max(
    0,
    Math.floor(options.staleWhileRevalidate ?? sharedMaxAge),
  );

  const headerValue =
    `public, max-age=${browserMaxAge}, s-maxage=${sharedMaxAge}, ` +
    `stale-while-revalidate=${swr}`;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    // Attach the header lazily so it is only set on a successful (2xx) JSON
    // response — error bodies emitted by the central error handler must not be
    // cached.
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        res.setHeader('Cache-Control', headerValue);
      }
      return originalJson(body);
    }) as Response['json'];

    next();
  };
}
