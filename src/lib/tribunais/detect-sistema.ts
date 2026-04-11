/**
 * Detector do sistema processual via API pública DataJud (CNJ).
 *
 * Faz uma chamada direta à API (bypass do `consultarDataJud` existente, que
 * normaliza a resposta e descarta o campo `sistema`) apenas para extrair
 * `_source.sistema.nome` e normalizar via `normalizeDataJudSistema`.
 *
 * Também salva o resultado em `processos_processos.sistema_tribunal` como
 * cache permanente, filtrando por `escritorio_id` para respeitar multitenancy.
 */

import { DATAJUD_API_URL, DATAJUD_API_KEY } from '@/lib/datajud/constants'
import { extrairTribunalDoNumero } from '@/lib/datajud/validators'
import { createClient } from '@/lib/supabase/client'
import { normalizeDataJudSistema } from './normalize-datajud-sistema'
import type { SistemaTribunal } from './types'

interface DataJudSistemaResponse {
  hits?: {
    total?: { value: number }
    hits?: Array<{
      _source?: {
        sistema?: {
          nome?: string
        }
      }
    }>
  }
}

/**
 * Consulta o DataJud apenas para extrair o sistema processual.
 *
 * @param numeroCnj - CNJ com ou sem máscara (validação básica: 20 dígitos após limpar)
 * @returns Sistema normalizado, ou null se a consulta falhar / processo não existir
 */
export async function detectSistemaViaDataJud(
  numeroCnj: string
): Promise<SistemaTribunal | null> {
  try {
    const tribunal = extrairTribunalDoNumero(numeroCnj)
    if (!tribunal) return null

    const numeroLimpo = numeroCnj.replace(/[.-]/g, '')
    if (numeroLimpo.length !== 20) return null

    const endpoint = `${DATAJUD_API_URL}/api_publica_${tribunal.alias}/_search`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `APIKey ${DATAJUD_API_KEY}`,
      },
      body: JSON.stringify({
        query: {
          match: { numeroProcesso: numeroLimpo },
        },
        size: 1,
        _source: ['sistema'],
      }),
    })

    if (!response.ok) {
      console.warn('[detectSistemaViaDataJud] HTTP não-OK:', response.status)
      return null
    }

    const data: DataJudSistemaResponse = await response.json()
    const hit = data.hits?.hits?.[0]
    const sistemaNome = hit?._source?.sistema?.nome

    if (!sistemaNome) {
      // Processo não encontrado no DataJud ou sem campo sistema
      return null
    }

    return normalizeDataJudSistema(sistemaNome)
  } catch (err) {
    console.warn('[detectSistemaViaDataJud] falha:', err)
    return null
  }
}

/**
 * Salva o sistema detectado em `processos_processos.sistema_tribunal`.
 * Respeita multitenancy filtrando por `id` + `escritorio_id`.
 *
 * Não lança em caso de erro — apenas loga warning. O cache é "best effort".
 *
 * @param processoId - UUID do processo
 * @param escritorioId - UUID do escritório (obrigatório para segurança RLS)
 * @param sistema - Sistema detectado (normalizado)
 */
export async function salvarSistemaNoCache(
  processoId: string,
  escritorioId: string,
  sistema: SistemaTribunal
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('processos_processos')
      .update({ sistema_tribunal: sistema })
      .eq('id', processoId)
      .eq('escritorio_id', escritorioId)

    if (error) {
      console.warn('[salvarSistemaNoCache] erro ao salvar:', error.message)
    }
  } catch (err) {
    console.warn('[salvarSistemaNoCache] exceção:', err)
  }
}
