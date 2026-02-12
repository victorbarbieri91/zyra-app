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

// ============================================================
// CAPTURA ESPECIALIZADA PARA ERROS DE OPERAÇÃO (Supabase, API)
// ============================================================

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

interface OperationErrorContext {
  /** Modulo do sistema: 'Processos', 'Financeiro', 'Agenda', etc. */
  module: string
  /** Operacao que falhou: 'criar', 'atualizar', 'excluir', 'buscar' */
  operation: string
  /** Tabela do Supabase afetada (opcional) */
  table?: string
  /** ID do registro sendo manipulado (opcional) */
  recordId?: string
  /** Dados adicionais para debug (sem dados sensiveis!) */
  details?: Record<string, unknown>
}

/**
 * Extrai informacoes uteis de um erro do Supabase/PostgreSQL
 */
function parseSupabaseError(err: unknown): {
  message: string
  code: string | null
  hint: string | null
  details: string | null
} {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return {
      message: String(e.message || e.error_description || e.msg || 'Erro desconhecido'),
      code: (e.code as string) || null,
      hint: (e.hint as string) || null,
      details: (e.details as string) || null,
    }
  }
  if (typeof err === 'string') {
    return { message: err, code: null, hint: null, details: null }
  }
  return { message: 'Erro desconhecido', code: null, hint: null, details: null }
}

/**
 * Determina a severidade baseado no tipo de operacao e codigo de erro
 */
function inferSeverity(operation: string, errorCode: string | null): ErrorSeverity {
  // Erros de escrita sao mais graves que erros de leitura
  const isWrite = ['criar', 'atualizar', 'excluir', 'pagar', 'gerar', 'cancelar'].includes(operation)

  // Codigos de erro do PostgreSQL
  if (errorCode) {
    // Constraint violations (23xxx) - dados invalidos
    if (errorCode.startsWith('23')) return isWrite ? 'high' : 'medium'
    // Permission denied (42501) - problema de RLS/permissao
    if (errorCode === '42501') return 'critical'
    // Undefined table/column (42P01, 42703) - bug no codigo
    if (errorCode.startsWith('42')) return 'critical'
    // Connection errors
    if (errorCode === '08001' || errorCode === '08006') return 'critical'
  }

  return isWrite ? 'high' : 'medium'
}

/**
 * Captura erros de operacoes (Supabase, API, etc.) com contexto rico.
 * Envia para o Sentry em producao e loga no console em dev.
 *
 * Substitui os `console.error` espalhados nos hooks.
 *
 * @example
 * // Em um hook:
 * const { data, error } = await supabase.from('processos').insert({ ... })
 * if (error) {
 *   captureOperationError(error, {
 *     module: 'Processos',
 *     operation: 'criar',
 *     table: 'processos_processos',
 *   })
 *   throw error
 * }
 *
 * @example
 * // Em um catch:
 * catch (err) {
 *   captureOperationError(err, {
 *     module: 'Financeiro',
 *     operation: 'gerar',
 *     table: 'financeiro_faturamento_faturas',
 *     details: { clienteId, periodo },
 *   })
 * }
 */
export function captureOperationError(
  err: unknown,
  context: OperationErrorContext
): void {
  const parsed = parseSupabaseError(err)
  const severity = inferSeverity(context.operation, parsed.code)
  const moduleName = context.module
  const summary = `[${moduleName}] Erro ao ${context.operation}${context.table ? ` em ${context.table}` : ''}: ${parsed.message}`

  // Console em dev (sempre)
  if (process.env.NODE_ENV === 'development') {
    console.error(summary, {
      code: parsed.code,
      hint: parsed.hint,
      details: parsed.details,
      ...context.details,
    })
    return
  }

  // Sentry em producao
  const sentryError = err instanceof Error
    ? err
    : new Error(parsed.message)

  Sentry.withScope((scope) => {
    // Tags para filtrar no dashboard do Sentry
    scope.setTag('module', moduleName)
    scope.setTag('operation', context.operation)
    scope.setTag('severity', severity)
    if (context.table) scope.setTag('table', context.table)
    if (parsed.code) scope.setTag('pg_error_code', parsed.code)

    // Nivel de severidade no Sentry
    scope.setLevel(
      severity === 'critical' ? 'fatal' :
      severity === 'high' ? 'error' :
      severity === 'medium' ? 'warning' :
      'info'
    )

    // Contexto extra para debug
    scope.setContext('operation', {
      module: moduleName,
      operation: context.operation,
      table: context.table || 'N/A',
      recordId: context.recordId || 'N/A',
    })

    scope.setContext('supabase_error', {
      message: parsed.message,
      code: parsed.code,
      hint: parsed.hint,
      details: parsed.details,
    })

    if (context.details) {
      scope.setContext('additional_details', context.details)
    }

    // Fingerprint para agrupar erros similares
    const fingerprint = [moduleName, context.operation, context.table || 'unknown']
    if (parsed.code) fingerprint.push(parsed.code)
    scope.setFingerprint(fingerprint)

    Sentry.captureException(sentryError)
  })
}

/**
 * Reporta um clique/acao do usuario que falhou silenciosamente.
 * Util para botoes que nao fazem nada, forms que nao salvam, etc.
 *
 * @example
 * const handleClick = async () => {
 *   const { error } = await supabase.from('tabela').update(...)
 *   if (error) {
 *     captureUserFacingError('Nao foi possivel salvar as alteracoes', {
 *       module: 'Escritorio',
 *       operation: 'atualizar',
 *       table: 'escritorios',
 *     })
 *     toast.error('Erro ao salvar')
 *   }
 * }
 */
export function captureUserFacingError(
  userMessage: string,
  context: OperationErrorContext,
  originalError?: unknown
): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context.module}] ${userMessage}`, originalError || '')
    return
  }

  Sentry.withScope((scope) => {
    scope.setTag('module', context.module)
    scope.setTag('operation', context.operation)
    scope.setTag('error_type', 'user_facing')
    if (context.table) scope.setTag('table', context.table)

    scope.setLevel('error')

    scope.setContext('operation', {
      module: context.module,
      operation: context.operation,
      table: context.table || 'N/A',
      userMessage,
    })

    if (originalError) {
      const parsed = parseSupabaseError(originalError)
      scope.setContext('original_error', {
        message: parsed.message,
        code: parsed.code,
        hint: parsed.hint,
        details: parsed.details,
      })
    }

    if (context.details) {
      scope.setContext('additional_details', context.details)
    }

    scope.setFingerprint([context.module, context.operation, 'user_facing'])

    Sentry.captureMessage(userMessage, 'error')
  })
}
