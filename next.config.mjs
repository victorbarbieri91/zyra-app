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
    // TODO: Corrigir erros de tipo e remover esta configuração
    ignoreBuildErrors: true,
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

    // Remover logger do bundle de produção
    disableLogger: true,
  }
);
