import { API_BASE_URL } from "@/lib/apiBaseUrl";

/**
 * The single entry point for browser-side API calls.
 *
 * Before this, components picked their own transport and the same endpoint was
 * reached two different ways: CutoffsExplorer fetched `/cutoffs/meta` through
 * the Vercel edge proxy, while PredictorForm and the booking page fetched the
 * identical endpoint straight from the origin — so the site's highest-intent
 * page was the one skipping the cache that exists to keep the free-tier backend
 * awake. There was nothing wrong with either call; the problem was that the
 * choice existed at all, at 19 separate call sites.
 *
 * The split is now a property of the request, not of the developer:
 *
 *   publicGet   -> always via /api/* on this origin, so Vercel's CDN can serve
 *                  repeat reads without waking the backend. Cache lifetime is
 *                  decided by the backend's own Cache-Control and passed
 *                  through by the proxy (see edgeProxy.ts).
 *   publicPost  -> straight to the origin. POSTs are never shared-cacheable and
 *                  proxying them would only add a hop.
 *
 * Admin traffic does NOT belong here — it needs cookies and a CSRF header, and
 * the proxy deliberately forwards neither. Use `adminFetch` / `adminWriteFetch`
 * from AdminContext for that.
 */

/**
 * Public GET endpoints that have an edge-proxy route under `src/app/api/`.
 *
 * An explicit map rather than a pass-through path parameter: the proxy attaches
 * INTERNAL_PROXY_TOKEN to whatever it forwards, so an open path would let any
 * caller reach arbitrary backend routes with that token attached. Adding an
 * entry here without adding the matching route file is a 404, not a hole.
 */
const PROXIED_GET_ROUTES = {
  cutoffs: "/api/cutoffs",
  cutoffsMeta: "/api/cutoffs/meta",
  updates: "/api/updates",
  faqs: "/api/faqs",
  guides: "/api/guides",
  resources: "/api/resources",
  testimonials: "/api/testimonials",
  announcement: "/api/settings/announcement",
  bookingSlotsConfig: "/api/settings/booking-slots",
  bookingSlots: "/api/bookings/slots",
} as const;

export type PublicGetRoute = keyof typeof PROXIED_GET_ROUTES;

/** Build a proxied URL, appending an optional query string. */
export function publicUrl(
  route: PublicGetRoute,
  params?: Record<string, string | number | undefined> | URLSearchParams,
): string {
  const base = PROXIED_GET_ROUTES[route];
  if (!params) return base;

  const search =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== "")
            .map(([k, v]) => [k, String(v)]),
        );
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Cacheable public read. Returns the raw Response so callers keep their own
 * status and envelope handling.
 */
export function publicGet(
  route: PublicGetRoute,
  params?: Record<string, string | number | undefined> | URLSearchParams,
  init?: RequestInit,
): Promise<Response> {
  return fetch(publicUrl(route, params), init);
}

/** Absolute origin URL for endpoints that are not (and should not be) proxied. */
export function backendUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** Public write. Goes straight to the origin — see the note above. */
export function publicPost(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<Response> {
  return fetch(backendUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
    ...init,
  });
}
