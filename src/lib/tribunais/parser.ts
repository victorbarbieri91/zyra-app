/**
 * Parser de números CNJ.
 *
 * Entrada: string no formato NNNNNNN-DD.AAAA.J.TR.OOOO (com ou sem máscara)
 * Saída: `CnjParsed` com todos os componentes extraídos, ou `null` se inválido.
 *
 * Reutiliza utilitários de `@/lib/datajud/validators` para manter consistência
 * com o resto da integração DataJud.
 */

import {
  limparNumeroCNJ,
  formatarNumeroCNJ,
} from '@/lib/datajud/validators'
import type { CnjParsed } from './types'

/**
 * Faz o parse de um número CNJ em seus componentes estruturais.
 *
 * Não valida o dígito verificador (usa `validarNumeroCNJCompleto` de
 * `@/lib/datajud/validators` quando precisar de validação forte).
 * Aqui apenas exige que o número tenha exatamente 20 dígitos após limpar.
 *
 * @param cnj - CNJ em qualquer formato (com ou sem pontuação)
 * @returns CnjParsed com componentes extraídos, ou null se inválido
 */
export function parseCnj(cnj: string | null | undefined): CnjParsed | null {
  if (!cnj || typeof cnj !== 'string') {
    return null
  }

  const limpo = limparNumeroCNJ(cnj.trim())

  // Estrutura: NNNNNNN(0-6) DD(7-8) AAAA(9-12) J(13) TR(14-15) OOOO(16-19)
  if (limpo.length !== 20 || !/^\d{20}$/.test(limpo)) {
    return null
  }

  return {
    numeroCompleto: formatarNumeroCNJ(limpo),
    numeroLimpo: limpo,
    sequencial: limpo.substring(0, 7),
    digitoVerificador: limpo.substring(7, 9),
    ano: limpo.substring(9, 13),
    segmento: limpo.substring(13, 14),
    tr: limpo.substring(14, 16),
    vara: limpo.substring(16, 20),
    primeiroDigito: limpo.charAt(0),
  }
}
