import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],

  allowedDevOrigins: [
    "192.168.0.101",
  ],

  experimental: {
    optimizePackageImports: ["lucide-react", "@base-ui/react"],
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://res.cloudinary.com https://*.r2.dev https://lh3.googleusercontent.com https://logo.clearbit.com",
              "font-src 'self'",
              "media-src 'self' https://res.cloudinary.com https://*.r2.dev blob:",
              "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.google-analytics.com",
              "frame-src https://api.razorpay.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/(auth|payment|cart|upload|user|studio|admin)(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      {
        source: "/api/(marketplace|beats|beat-packs|producers)(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=120",
          },
        ],
      },
    ];
  },
};

export default nextConfig;