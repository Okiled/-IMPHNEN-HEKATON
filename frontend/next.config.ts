import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'date-fns'],
  },
  
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*(js|css)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { 
            key: 'Content-Security-Policy', 
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel.app",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://*.supabase.co https://*.vercel.app wss://*.supabase.co https://vercel.live http://localhost:* http://127.0.0.1:*",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; ')
          },
          { 
            key: 'Permissions-Policy', 
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
