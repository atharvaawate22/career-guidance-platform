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
    return [
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
      {
        // Static assets — aggressive long-term caching (Next.js includes content hash in filenames)
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
