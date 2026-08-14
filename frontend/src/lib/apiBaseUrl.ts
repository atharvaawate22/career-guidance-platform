/**
 * The one place the backend origin is resolved.
 *
 * This value was previously computed independently in three files
 * (apiBaseUrl.ts, edgeProxy.ts, serverCutoffs.ts) with byte-identical logic —
 * three chances to drift when an env var is renamed. edgeProxy and
 * serverCutoffs now import from here.
 *
 * In production an unset value resolves to "" so calls become same-origin
 * relative paths, which is what a reverse-proxy deployment wants. In dev it
 * points at the local API server.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");
