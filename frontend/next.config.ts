import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone breaks Vercel experimentalServices routing for the frontend at /
  outputFileTracingRoot: path.join(process.cwd()),
// typescript: {
//     ignoreBuildErrors: true,
//   },
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["@radix-ui/react-dialog", "@radix-ui/react-select"],
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
      
      // Target ES2020+ browsers - no ES5 transpilation needed
      if (config.output) {
        config.output.environment = {
          ...config.output.environment,
          bigIntLiteral: true,
          dynamicImport: true,
          optionalChaining: true,
          arrowFunction: true,
          asyncFunction: true,
          const: true,
          forOf: true,
          destructuring: true,
          templateLiteral: true,
        };
      }
    }
    return config;
  },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "flexora.com" },
      { protocol: "https", hostname: "www.flexora.com" },
      { protocol: "https", hostname: "api.flexora.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Cloudflare R2 (pub-xxx.r2.dev)
      { protocol: "https", hostname: "**.r2.dev", pathname: "/**" },
    ],
  },

  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
async redirects() {
    return [
      { source: '/pages/blogs', destination: '/blogs', permanent: true },
      { source: '/products', destination: '/shop', permanent: true },
      { source: '/support', destination: '/contact', permanent: true },
    ]
  },
  async headers() {
    return [
      
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, s-maxage=3600",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      {
        source: "/shop/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400",
          },
        ],
      },
      {
        source: "/user/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=300, s-maxage=0",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=60, s-maxage=0",
          },
          {
            key: "Link",
            value: "</fonts/manrope-400.woff2>; rel=preload; as=font; type=font/woff2; crossorigin",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Font files caching - 1 year
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
