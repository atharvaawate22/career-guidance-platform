import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for API routes and SSR responses.
  // If your reverse proxy (nginx/Cloudflare) already compresses, this is
  // a safe no-op; enabling it here ensures compression even without a proxy.
  compress: true,
  // Remove the 'X-Powered-By: Next.js' header to avoid fingerprinting.
  poweredByHeader: false,
  // Security and caching headers applied to every response.
  async headers() {
    const baseHeaders = [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Allow embedding only from same origin
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Limit referrer info cross-origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
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
