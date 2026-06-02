/*
 * Optimized Next.js config for SismosCR.
 * - image optimization: remote patterns for Leaflet tiles
 * - compression: enabled in production
 * - security headers: X-Content-Type-Options, X-Frame-Options, etc.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress responses with gzip
  compress: true,

  // HTTP headers for security + caching
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },

  // Remote images for Leaflet tile attribution
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.basemaps.cartocdn.com",
      },
    ],
  },

};

export default nextConfig;
