
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://picsum.photos;
      font-src 'self';
      object-src 'self' blob: data:;
      frame-src 'self' blob: data: https://view.officeapps.live.com;
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      media-src 'self' blob: data:;
      block-all-mixed-content;
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
           {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: "camera=(), microphone=(), geolocation=(), payment=()"
          }
        ],
      },
    ];
  },

  // Server Actions body size limit: configurable via env var `SERVER_ACTION_BODY_SIZE_LIMIT`.
  // WARNING: increasing/removing this limit can expose the server to large request bodies and potential DoS attacks.
  // If you need to allow larger Server Action payloads (e.g., large JSON payloads), set the env var to a sensible value
  // like '10mb' or '50mb'. Avoid setting this to an unbounded value in production.
  //
  // Middleware-specific note: the middleware runs at the edge and has a separate client body size limit
  // (default 10MB). Large POST/PUT payloads that reach middleware (e.g., administrative course JSON) can hit
  // the 10MB limit and cause `Unterminated string` JSON errors when parsing in middleware. To raise that limit,
  // set `MIDDLEWARE_CLIENT_MAX_BODY_SIZE` (env var) to a value like '50mb' below.
  experimental: {
    serverActions: {
      bodySizeLimit: (process.env.SERVER_ACTION_BODY_SIZE_LIMIT as any) || '50mb',
    },
    // Controls how large a request body the middleware client will accept (default 10mb).
    // Use with caution; do not set to an unbounded value in production.
    middlewareClientMaxBodySize: (process.env.MIDDLEWARE_CLIENT_MAX_BODY_SIZE as any) || '50mb',
  },
};

export default nextConfig;
