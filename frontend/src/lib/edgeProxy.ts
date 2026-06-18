import { NextRequest, NextResponse } from "next/server";

/**
 * Edge-cached reverse proxy for public, read-only backend data.
 *
 * The cutoffs data is identical for every visitor and changes only a few times
 * a year, so it is ideal for shared caching. Routing it through this proxy lets
 * Vercel's CDN serve repeat queries from an edge POP (e.g. Mumbai) in ~tens of
 * ms WITHOUT touching the small free-tier backend — which our load test showed
 * tops out around ~40 req/s on its 0.1 CPU. Cache hits never reach the origin.
 *
 * On a cache miss the function fetches the origin and forwards the real visitor
 * IP (authenticated with INTERNAL_PROXY_TOKEN) so the backend's per-IP rate
 * limit stays per-user instead of collapsing onto Vercel's shared egress IP.
 */

const BACKEND =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:5000" : "");

const PROXY_TOKEN = process.env.INTERNAL_PROXY_TOKEN || "";

// Mirrors the backend's referenceCache: 5 min in the browser, 6 h on the shared
// edge, served stale for up to a day while revalidating in the background.
const CACHE_OK =
  "public, max-age=300, s-maxage=21600, stale-while-revalidate=86400";

export async function proxyGet(
  req: NextRequest,
  backendPath: string,
): Promise<NextResponse> {
  if (!BACKEND) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MISCONFIGURED", message: "Data service URL is not configured." },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const target = `${BACKEND}${backendPath}${req.nextUrl.search}`;
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  const headers: Record<string, string> = { accept: "application/json" };
  if (PROXY_TOKEN) headers["x-internal-proxy-token"] = PROXY_TOKEN;
  if (clientIp) headers["x-real-client-ip"] = clientIp;

  let upstream: Response;
  try {
    // Always hit the origin on an edge miss; Vercel caches THIS function's
    // response via the Cache-Control header below, so we don't double-cache.
    upstream = await fetch(target, { headers, cache: "no-store" });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UPSTREAM_UNREACHABLE", message: "Could not reach the data service." },
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await upstream.text();
  const res = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      // Only cache successful responses; never cache errors.
      "Cache-Control": upstream.ok ? CACHE_OK : "no-store",
    },
  });

  // Pass the origin's Redis cache status through for diagnostics (HIT/MISS).
  const originCache = upstream.headers.get("x-cache");
  if (originCache) res.headers.set("x-origin-cache", originCache);

  return res;
}
