// Next.js 16+ client instrumentation file
// Configuracao do Sentry no cliente (migrado de sentry.client.config.ts)
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ambiente
  environment: process.env.NODE_ENV,

  // Performance: 100% em dev, 10% em producao
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay: 5% normal, 100% quando ha erro
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Ativo em todos os ambientes para testar; em producao ajustar se necessario
  enabled: process.env.NODE_ENV !== "test",

  // Filtrar ruido comum
  ignoreErrors: [
    "ResizeObserver loop",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error exception captured",
    "Network request failed",
    "Load failed",
    "AbortError",
    "ChunkLoadError",
    "Loading chunk",
    // Erros de navegacao do Next.js
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    // Service Worker em previews da Vercel
    "Failed to register a ServiceWorker",
    "The script resource is behind a redirect",
  ],

  beforeSend(event) {
    // Nao enviar erros em desenvolvimento (para evitar poluir o dashboard)
    if (process.env.NODE_ENV === "development") {
      console.warn("[Sentry] Erro capturado (nao enviado em dev):", event.exception?.values?.[0]?.value)
      return null
    }
    return event
  },
})

// Necessario para o Sentry instrumentar navegacoes no Next.js 16+
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
