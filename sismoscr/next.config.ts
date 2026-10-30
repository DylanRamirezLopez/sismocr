/*
 * Optimized Next.js config for SismosCR.
 * - images: optimizador desactivado; la app no usa next/image
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

  images: { unoptimized: true },
};

export default nextConfig;
