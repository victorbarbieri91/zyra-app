// ============================================
// Rate Limiter - Protecao contra abuso de API
// Implementacao in-memory com sliding window
// ============================================

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

interface RateLimitEntry {
  timestamps: number[]
  lastCleanup: number
}

// Store global in-memory (persiste entre requests no mesmo serverless instance)
const store = new Map<string, RateLimitEntry>()

// Limpa entradas expiradas a cada 5 minutos
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

/**
 * Limpa entradas antigas do store para evitar memory leak
 */
function cleanupStore(windowMs: number): void {
  const now = Date.now()
  const cutoff = now - windowMs

  for (const [key, entry] of store.entries()) {
    // Remove timestamps antigos
    entry.timestamps = entry.timestamps.filter(t => t > cutoff)

    // Remove entrada se nao tem mais timestamps
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}

/**
 * Extrai identificador unico do request (IP ou user ID)
 */
function getIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`

  // Tenta headers comuns de proxy reverso (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')

  const ip = cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown'
  return `ip:${ip}`
}

interface RateLimitConfig {
  /** Numero maximo de requests permitidos na janela */
  maxRequests: number
  /** Janela de tempo em milissegundos (padrao: 60000 = 1 minuto) */
  windowMs?: number
  /** Prefixo para o identificador (evita colisao entre rotas) */
  prefix?: string
}

interface RateLimitResult {
  success: boolean
  remaining: number
  limit: number
  resetMs: number
}

/**
 * Verifica rate limit para um request
 *
 * @example
 * ```ts
 * const limiter = rateLimit({ maxRequests: 10, prefix: 'ai-comando' })
 * const result = limiter.check(request, userId)
 * if (!result.success) return limiter.errorResponse(result)
 * ```
 */
export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs = 60_000, prefix = 'default' } = config

  return {
    /**
     * Verifica se o request esta dentro do limite
     */
    check(request: Request, userId?: string): RateLimitResult {
      const identifier = `${prefix}:${getIdentifier(request, userId)}`
      const now = Date.now()
      const windowStart = now - windowMs

      // Cleanup periodico do store global
      if (store.size > 1000) {
        cleanupStore(windowMs)
      }

      // Busca ou cria entrada
      let entry = store.get(identifier)
      if (!entry) {
        entry = { timestamps: [], lastCleanup: now }
        store.set(identifier, entry)
      }

      // Remove timestamps fora da janela
      entry.timestamps = entry.timestamps.filter(t => t > windowStart)

      // Verifica limite
      if (entry.timestamps.length >= maxRequests) {
        const oldestInWindow = entry.timestamps[0]
        const resetMs = oldestInWindow + windowMs - now

        logger.warn('Rate limit atingido', {
          module: 'rate-limit',
          action: 'limit_exceeded',
          context: { identifier, maxRequests, windowMs, currentCount: entry.timestamps.length }
        })

        return {
          success: false,
          remaining: 0,
          limit: maxRequests,
          resetMs: Math.max(0, resetMs)
        }
      }

      // Registra novo request
      entry.timestamps.push(now)

      return {
        success: true,
        remaining: maxRequests - entry.timestamps.length,
        limit: maxRequests,
        resetMs: windowMs
      }
    },

    /**
     * Retorna resposta HTTP 429 padronizada
     */
    errorResponse(result: RateLimitResult): NextResponse {
      const retryAfterSeconds = Math.ceil(result.resetMs / 1000)

      return NextResponse.json(
        {
          sucesso: false,
          error: 'Muitas requisicoes. Tente novamente em alguns segundos.',
          retryAfter: retryAfterSeconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(retryAfterSeconds)
          }
        }
      )
    },

    /**
     * Adiciona headers de rate limit a uma resposta existente
     */
    addHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
      response.headers.set('X-RateLimit-Limit', String(result.limit))
      response.headers.set('X-RateLimit-Remaining', String(result.remaining))
      return response
    }
  }
}

// ============================================
// Rate limiters pre-configurados por categoria
// ============================================

/** Para rotas de AI (mais caras - 10 req/min) */
export const aiRateLimit = rateLimit({ maxRequests: 10, prefix: 'ai' })

/** Para rotas de integracao externa (20 req/min) */
export const integrationRateLimit = rateLimit({ maxRequests: 20, prefix: 'integration' })

/** Para rotas de migracao (10 req/min) */
export const migrationRateLimit = rateLimit({ maxRequests: 10, prefix: 'migration' })

/** Para rotas de busca (30 req/min) */
export const searchRateLimit = rateLimit({ maxRequests: 30, prefix: 'search' })

/** Para rotas de debug (5 req/min) */
export const debugRateLimit = rateLimit({ maxRequests: 5, prefix: 'debug' })

/** Para rotas de relatorios (10 req/min) */
export const reportRateLimit = rateLimit({ maxRequests: 10, prefix: 'report' })

/** Para rotas de publicacoes (20 req/min) */
export const publicationsRateLimit = rateLimit({ maxRequests: 20, prefix: 'publications' })
