const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

const devFallbackApiBaseUrl =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";

export const API_BASE_URL = configuredApiBaseUrl || devFallbackApiBaseUrl;

if (process.env.NODE_ENV === "production" && !configuredApiBaseUrl) {
  // This fires at module load time (both server-side and client-side).
  // An empty API_BASE_URL causes every fetch() to use a relative path and hit
  // the Next.js server instead of the Express backend, silently 404-ing.
  console.warn(
    "[config] NEXT_PUBLIC_API_BASE_URL is not set. " +
      "All API calls will use relative URLs which will return 404 in a " +
      "split frontend/backend deployment. " +
      "Set NEXT_PUBLIC_API_BASE_URL to your backend URL (e.g. https://api.example.com)."
  );
}
