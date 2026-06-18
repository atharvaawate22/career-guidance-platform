/**
 * Canonical site origin — single source of truth for SEO/metadata.
 *
 * The production site is served at https://www.cethub.in (the bare apex
 * cethub.in 308-redirects to www), so www is the canonical host for every
 * canonical tag, Open Graph URL, sitemap entry, and JSON-LD node. Override per
 * environment (e.g. preview deployments) with NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://www.cethub.in").replace(/\/$/, "");

export const SITE_NAME = "CET Hub";

/** Build an absolute URL for canonical/OG tags and structured data. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}
