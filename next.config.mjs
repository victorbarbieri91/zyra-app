import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

// Sentry wraps outermost, Serwist wraps inner
export default withSentryConfig(
  withSerwist(nextConfig),
  {
    // Suprimir logs do Sentry exceto em CI
    silent: !process.env.CI,

    // Upload de source maps mais amplo
    widenClientFileUpload: true,

    // Ocultar source maps do browser
    hideSourceMaps: true,

    // Tree-shake debug statements em producao (substitui disableLogger deprecated)
    bundleSizeOptimizations: {
      excludeDebugStatements: true,
    },
  }
);
