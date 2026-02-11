import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // Performance: 10% em produção
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Ativo em todos os ambientes exceto test
  enabled: process.env.NODE_ENV !== "test",
});
