// ============================================
// CLIENTE DataJud - BUSCA DE MOVIMENTAÇÕES EM BATCH
// ============================================
// Estende src/lib/datajud/client.ts para suportar busca de movimentações
// em batch (chunks de 15 por requisição), com retry automático.
//
// Limite de chunk descoberto empiricamente: chamadas com mais de 15 CNJs
// frequentemente dão timeout no DataJud.

import { DATAJUD_API_URL, DATAJUD_API_KEY } from './constants'
import { extrairTribunalDoNumero, limparNumeroCNJ } from './validators'

/**
 * Movimentação retornada pelo DataJud (estrutura interna do _source.movimentos[]).
 */
export interface MovimentacaoDataJud {
  codigo: number
  nome: string
  dataHora: string
  complementosTabelados?: Array<{
    codigo: number
    valor: number
    nome: string
    descricao: string
  }>
  orgaoJulgador?: {
    codigo: string
    nome: string
  }
}

/**
 * Resultado da busca em batch para um tribunal.
 * Map de numeroProcesso (limpo, 20 dígitos) → array de movimentações.
 */
export type BatchResult = Map<string, {
  movimentos: MovimentacaoDataJud[]
  dataHoraUltimaAtualizacao: string | null
}>

const CHUNK_SIZE = 15
const MAX_RETRIES = 3
const REQUEST_TIMEOUT_MS = 60000

/**
 * Faz uma chamada DataJud para até CHUNK_SIZE processos de uma vez.
 *
 * @param alias Alias do tribunal (tjsp, trt2, trf3, etc.)
 * @param numerosLimpos Array de números CNJ sem formatação (20 dígitos)
 * @returns Map de número → dados, ou null em caso de erro
 */
async function consultarChunk(
  alias: string,
  numerosLimpos: string[],
  attempt = 1
): Promise<BatchResult | null> {
  const body = {
    query: {
      terms: {
        'numeroProcesso.keyword': numerosLimpos
      }
    },
    _source: ['numeroProcesso', 'dataHoraUltimaAtualizacao', 'movimentos'],
    size: numerosLimpos.length + 50
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${DATAJUD_API_URL}/api_publica_${alias}/_search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `APIKey ${DATAJUD_API_KEY}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[DataJud Batch] ${alias} chunk falhou: ${response.status}`)
      if (attempt < MAX_RETRIES) {
        const delay = 1000 * attempt
        await new Promise(r => setTimeout(r, delay))
        return consultarChunk(alias, numerosLimpos, attempt + 1)
      }
      return null
    }

    const data = await response.json()
    const result: BatchResult = new Map()

    for (const hit of data.hits?.hits || []) {
      const source = hit._source
      result.set(source.numeroProcesso, {
        movimentos: source.movimentos || [],
        dataHoraUltimaAtualizacao: source.dataHoraUltimaAtualizacao || null
      })
    }

    return result
  } catch (error) {
    clearTimeout(timeoutId)
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    console.warn(`[DataJud Batch] ${alias} chunk erro (${isTimeout ? 'timeout' : 'fetch'}), tentativa ${attempt}/${MAX_RETRIES}`)

    if (attempt < MAX_RETRIES) {
      const delay = 1000 * attempt
      await new Promise(r => setTimeout(r, delay))
      return consultarChunk(alias, numerosLimpos, attempt + 1)
    }
    return null
  }
}

/**
 * Busca movimentações de múltiplos processos do mesmo tribunal em batch.
 * Quebra automaticamente em chunks de CHUNK_SIZE (15) e faz retry em caso de timeout.
 *
 * @param alias Alias do tribunal
 * @param numerosLimpos Array de números CNJ sem formatação
 * @returns Map de número → dados (ou Map vazio em caso de falha total)
 */
export async function buscarMovimentacoesBatch(
  alias: string,
  numerosLimpos: string[]
): Promise<BatchResult> {
  const final: BatchResult = new Map()

  for (let i = 0; i < numerosLimpos.length; i += CHUNK_SIZE) {
    const chunk = numerosLimpos.slice(i, i + CHUNK_SIZE)
    const result = await consultarChunk(alias, chunk)

    if (result) {
      for (const [num, data] of result) {
        final.set(num, data)
      }
    }
  }

  return final
}

/**
 * Helper: extrai o alias do tribunal a partir de um número CNJ.
 * Wrapper sobre extrairTribunalDoNumero para retornar só o alias.
 */
export function tribunalAliasFromCNJ(cnj: string): string | null {
  const tribunal = extrairTribunalDoNumero(cnj)
  return tribunal?.alias || null
}

/**
 * Agrupa CNJs por tribunal para batch processing.
 * Retorna Map de alias → array de números limpos.
 */
export function agruparPorTribunal(
  cnjs: string[]
): Map<string, string[]> {
  const grupos = new Map<string, string[]>()

  for (const cnj of cnjs) {
    const alias = tribunalAliasFromCNJ(cnj)
    if (!alias) continue

    const limpo = limparNumeroCNJ(cnj)
    if (!grupos.has(alias)) {
      grupos.set(alias, [])
    }
    grupos.get(alias)!.push(limpo)
  }

  return grupos
}
