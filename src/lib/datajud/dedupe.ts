// ============================================
// DEDUPE DE MOVIMENTAÇÕES - DataJud + Escavador
// ============================================
// Hash universal para evitar duplicatas entre fontes diferentes.
//
// O hash usa duas estratégias:
//   - DataJud: granularidade MINUTO + código CNJ (mais preciso)
//   - Legado/Escavador: granularidade DIA + descrição (compatível)
//
// O cron faz fuzzy match por dia na primeira passagem para
// "promover" hashes legados para a forma DataJud sem duplicar.

import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Códigos CNJ que indicam encerramento do processo.
 * Geram alerta no card "Atenção Imediata" do dashboard.
 */
export const CODIGOS_CNJ_ENCERRAMENTO = [
  22,  // Baixa Definitiva
  848, // Trânsito em julgado
  246, // Arquivamento
] as const

/**
 * Gera SHA1 hex de uma string.
 */
function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex')
}

/**
 * Hash de movimentação para dados vindos do DataJud.
 * Granularidade: minuto + código CNJ.
 *
 * Mais preciso que o legado porque DataJud retorna horário real e código padronizado.
 */
export function gerarHashMovimentacaoDataJud(
  processoId: string,
  dataHoraIso: string,
  codigoCnj: number
): string {
  // Trunca para minuto: "2025-10-22T17:02:59" → "2025-10-22T17:02"
  const minuto = dataHoraIso.slice(0, 16)
  return sha1(`${processoId}|${minuto}|${codigoCnj}`)
}

/**
 * Hash de movimentação para dados legado (Escavador).
 * Granularidade: dia + descrição.
 *
 * Usado como fallback porque o sistema atual força T12:00:00Z e o
 * Escavador nem sempre traz código CNJ padronizado.
 */
export function gerarHashMovimentacaoLegado(
  processoId: string,
  dataMovimento: Date | string,
  descricao: string
): string {
  const data = typeof dataMovimento === 'string' ? new Date(dataMovimento) : dataMovimento
  const dia = data.toISOString().slice(0, 10) // YYYY-MM-DD
  return sha1(`${processoId}|${dia}|${descricao}`)
}

/**
 * Procura uma movimentação existente do mesmo processo, no mesmo dia,
 * com descrição similar ao nome do evento DataJud.
 *
 * Usado na primeira passagem do cron DataJud para promover hashes legados
 * sem duplicar movimentações que o Escavador já trouxe.
 */
export async function fuzzyMatchPorDia(
  supabase: SupabaseClient,
  processoId: string,
  dataHoraIso: string,
  nomeEvento: string
): Promise<{ id: string; hash_movimento: string | null } | null> {
  const dia = dataHoraIso.slice(0, 10)
  const inicio = `${dia}T00:00:00Z`
  const fim = `${dia}T23:59:59Z`

  // Pega os primeiros 30 chars do nome do evento (lowercase) para o ILIKE
  const termo = nomeEvento.toLowerCase().slice(0, 30)

  const { data } = await supabase
    .from('processos_movimentacoes')
    .select('id, hash_movimento, descricao, tipo_descricao')
    .eq('processo_id', processoId)
    .gte('data_movimento', inicio)
    .lte('data_movimento', fim)
    .or(`descricao.ilike.%${termo}%,tipo_descricao.ilike.%${termo}%`)
    .limit(1)
    .maybeSingle()

  return data
}

/**
 * Detecta se uma movimentação representa encerramento do processo.
 * Retorna o código CNJ se for encerramento, null caso contrário.
 */
export function detectarEncerramento(codigoCnj: number | null | undefined): number | null {
  if (codigoCnj == null) return null
  if ((CODIGOS_CNJ_ENCERRAMENTO as readonly number[]).includes(codigoCnj)) {
    return codigoCnj
  }
  return null
}
