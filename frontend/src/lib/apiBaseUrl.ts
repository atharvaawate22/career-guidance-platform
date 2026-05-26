// Retrieve configured API base URL from env
const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

// Dev fallback is local. In production, if no URL is provided, we fall back to an
// empty string, meaning the client will make relative calls to the same origin.
// This is intentional and convenient behind reverse-proxy setups.
const devFallbackApiBaseUrl =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";

export const API_BASE_URL = configuredApiBaseUrl || devFallbackApiBaseUrl;

