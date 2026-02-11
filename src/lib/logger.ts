import * as Sentry from '@sentry/nextjs'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  module?: string
  action?: string
  userId?: string
  escritorioId?: string
  [key: string]: unknown
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  const prefix = context?.module ? `[${context.module}]` : '[App]'

  // Console em desenvolvimento
  if (process.env.NODE_ENV === 'development' || typeof window === 'undefined') {
    const consoleMethod =
      level === 'error' ? console.error :
      level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
      console.log

    if (error) {
      consoleMethod(prefix, message, context || '', error)
    } else {
      consoleMethod(prefix, message, context || '')
    }
  }

  // Sentry em produção
  if (process.env.NODE_ENV === 'production') {
    if (level === 'error') {
      if (error) {
        Sentry.captureException(error, {
          tags: { module: context?.module, action: context?.action },
          extra: context,
        })
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          tags: { module: context?.module, action: context?.action },
          extra: context,
        })
      }
    } else if (level === 'warn') {
      Sentry.addBreadcrumb({
        category: context?.module || 'app',
        message,
        level: 'warning',
        data: context as Record<string, string>,
      })
    } else if (level === 'info') {
      Sentry.addBreadcrumb({
        category: context?.module || 'app',
        message,
        level: 'info',
        data: context as Record<string, string>,
      })
    }
  }
}

/**
 * Logger estruturado que integra com Sentry
 *
 * Em desenvolvimento: console colorido com prefixo de módulo
 * Em produção: erros → Sentry.captureException, warnings → breadcrumbs
 *
 * @example
 * logger.info('Processo carregado', { module: 'Processos', action: 'fetch' })
 * logger.error('Falha ao salvar', { module: 'Financeiro', action: 'save' }, error)
 * logger.warn('Cache expirado', { module: 'Dashboard' })
 */
export const logger = {
  debug: (message: string, context?: LogContext) =>
    log('debug', message, context),

  info: (message: string, context?: LogContext) =>
    log('info', message, context),

  warn: (message: string, context?: LogContext) =>
    log('warn', message, context),

  error: (message: string, context?: LogContext, error?: Error) =>
    log('error', message, context, error),
}
