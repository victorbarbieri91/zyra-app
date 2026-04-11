/**
 * Normalizador de valores retornados pelo campo `sistema.nome` da API DataJud
 * para o enum `SistemaTribunal` usado internamente.
 *
 * Descobertas do teste real da API DataJud:
 * - TJSP retorna: "SAJ", "Projudi", "Inválido"
 * - TRT2/TRF3 retornam: "Pje", "PJe" (case inconsistente)
 * - TJMG retorna: "PJe", "Eproc", "Themis"
 *
 * A normalização aqui deve ser resiliente a variações de case.
 */

import type { SistemaTribunal } from './types'

/**
 * Converte o valor bruto de `sistema.nome` do DataJud para o enum interno.
 * Retorna 'outro' para valores desconhecidos (inclui "Inválido", "Themis", etc.).
 */
export function normalizeDataJudSistema(raw: string | null | undefined): SistemaTribunal {
  if (!raw || typeof raw !== 'string') {
    return 'outro'
  }

  const lower = raw.trim().toLowerCase()

  if (lower === 'saj') return 'saj'
  if (lower === 'pje') return 'pje'
  if (lower === 'eproc') return 'eproc'
  if (lower === 'projudi') return 'projudi'

  // Valores desconhecidos / legados caem em 'outro'
  // Isso inclui: "Inválido", "Themis", "Outros", etc.
  return 'outro'
}
