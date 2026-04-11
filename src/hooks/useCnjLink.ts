'use client'

/**
 * Hook que orquestra a construção do link do CNJ para o tribunal.
 *
 * Fluxo:
 * 1. Render síncrono imediato com o parser estático (via `buildTribunalUrl`)
 * 2. Se o tribunal é ambíguo (hoje: TJSP) e não há cache em `sistema_tribunal`,
 *    dispara `detectSistemaViaDataJud` em background
 * 3. Ao receber resposta: salva no banco via `salvarSistemaNoCache` e
 *    atualiza o estado local → re-renderiza o link
 *
 * Graceful degradation: qualquer falha do DataJud mantém o link estático.
 * Multitenancy: `salvarSistemaNoCache` filtra por `escritorio_id`.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  buildTribunalUrl,
  detectSistemaViaDataJud,
  salvarSistemaNoCache,
  tribunalPrecisaDeteccao,
  type SistemaTribunal,
  type TribunalLink,
} from '@/lib/tribunais'

interface UseCnjLinkParams {
  /** CNJ do processo (com ou sem máscara) */
  numeroCnj: string | null | undefined
  /** ID do processo (necessário para salvar cache) */
  processoId: string | null | undefined
  /** ID do escritório ativo (necessário para multitenancy) */
  escritorioId: string | null | undefined
  /**
   * Sistema já cacheado no banco (coluna `processos_processos.sistema_tribunal`).
   * Se preenchido, é usado como override e o DataJud não é chamado.
   */
  sistemaCache?: SistemaTribunal | null
  /**
   * Override manual do link completo (coluna `processos_processos.link_tribunal`).
   * Se preenchido, tem prioridade absoluta sobre qualquer lógica.
   */
  linkManual?: string | null
}

interface UseCnjLinkResult {
  /** Link calculado (ou null se o CNJ é inválido / tribunal não suportado) */
  link: TribunalLink | null
  /** Indica se uma detecção em background está em andamento */
  detecting: boolean
}

export function useCnjLink({
  numeroCnj,
  processoId,
  escritorioId,
  sistemaCache,
  linkManual,
}: UseCnjLinkParams): UseCnjLinkResult {
  // Estado local para armazenar o sistema detectado em runtime (sobrescreve cache inicial)
  const [sistemaDetectado, setSistemaDetectado] = useState<SistemaTribunal | null>(null)
  const [detecting, setDetecting] = useState(false)

  // Reset quando mudar de processo
  useEffect(() => {
    setSistemaDetectado(null)
    setDetecting(false)
  }, [processoId, numeroCnj])

  // Link calculado (síncrono — parser estático + cache)
  const link = useMemo<TribunalLink | null>(() => {
    // 1. Override manual tem prioridade absoluta
    if (linkManual && typeof linkManual === 'string' && linkManual.trim() !== '') {
      return {
        url: linkManual.trim(),
        tipo: 'direct',
        tribunalSigla: 'Manual',
        tribunalNome: 'Link manual cadastrado',
        sistema: 'outro',
      }
    }

    // 2. Parser estático + cache (detectado em runtime ou vindo do banco)
    const sistemaEfetivo = sistemaDetectado ?? sistemaCache ?? null
    return buildTribunalUrl(numeroCnj, sistemaEfetivo)
  }, [numeroCnj, sistemaCache, sistemaDetectado, linkManual])

  // Efeito: detecção via DataJud em background (só se tribunal ambíguo e sem cache)
  useEffect(() => {
    // Condições para NÃO fazer fetch:
    // - sem CNJ ou CNJ inválido
    // - link manual preenchido (override total)
    // - sistema já em cache no banco
    // - tribunal não precisa de detecção (maioria dos casos)
    // - sem ID de processo ou escritório (não tem como salvar)
    if (!numeroCnj || linkManual) return
    if (sistemaCache) return
    if (!tribunalPrecisaDeteccao(numeroCnj)) return
    if (!processoId || !escritorioId) return

    let cancelled = false
    setDetecting(true)

    detectSistemaViaDataJud(numeroCnj)
      .then((sistema) => {
        if (cancelled) return
        if (sistema && sistema !== 'outro') {
          setSistemaDetectado(sistema)
          // Salva em background sem bloquear a UI
          void salvarSistemaNoCache(processoId, escritorioId, sistema)
        }
      })
      .catch((err) => {
        console.warn('[useCnjLink] Detecção DataJud falhou:', err)
      })
      .finally(() => {
        if (!cancelled) setDetecting(false)
      })

    return () => {
      cancelled = true
    }
  }, [numeroCnj, linkManual, sistemaCache, processoId, escritorioId])

  return { link, detecting }
}
