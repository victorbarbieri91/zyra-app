/**
 * Helpers canônicos para trabalhar com formas de cobrança de contratos.
 *
 * Um contrato pode ter MÚLTIPLAS formas de cobrança configuradas em paralelo
 * (ex: por_pasta + por_cargo + por_ato simultaneamente). A fonte da verdade é
 * a coluna `formas_pagamento` (jsonb) em `financeiro_contratos_honorarios`,
 * que contém um array no formato `[{ forma, ordem }]`.
 *
 * O campo legado `forma_cobranca` (string única) é mantido apenas durante a
 * janela de coexistência da Fase 5, sempre sincronizado com a primeira forma
 * do array via trigger `trg_validar_formas_pagamento`. Não confiar nele para
 * decisões de UI ou lógica de negócio.
 */

export type FormaCobranca =
  | 'fixo'
  | 'por_hora'
  | 'por_cargo'
  | 'por_pasta'
  | 'por_ato'
  | 'por_etapa'
  | 'misto'
  | 'pro_bono'

export const TODAS_FORMAS: FormaCobranca[] = [
  'fixo',
  'por_hora',
  'por_cargo',
  'por_pasta',
  'por_ato',
  'por_etapa',
  'misto',
  'pro_bono',
]

/**
 * Formas que tornam horas faturáveis quando presentes em um contrato.
 * Espelha a lógica da função SQL `calcular_faturavel_timesheet`.
 */
export const FORMAS_FATURAVEIS_HORA: FormaCobranca[] = ['por_hora', 'por_cargo']

/**
 * Formato bruto do array `formas_pagamento` no banco.
 */
export interface FormaPagamentoItem {
  forma: FormaCobranca
  ordem: number
}

/**
 * Normaliza o jsonb `formas_pagamento` em array tipado de FormaCobranca.
 * Aceita os formatos:
 *   - array de objetos `[{forma, ordem}]` (canônico)
 *   - array de strings `['fixo','por_ato']` (compatibilidade)
 *   - undefined/null (retorna [])
 * Sempre retorna ordenado por `ordem`.
 */
export function parseFormasPagamento(
  raw: unknown
): FormaCobranca[] {
  if (!raw || !Array.isArray(raw)) return []

  const items: FormaPagamentoItem[] = raw
    .map((item, idx): FormaPagamentoItem | null => {
      if (typeof item === 'string') {
        return { forma: item as FormaCobranca, ordem: idx }
      }
      if (item && typeof item === 'object' && 'forma' in item) {
        const forma = (item as Record<string, unknown>).forma
        const ordem = (item as Record<string, unknown>).ordem
        if (typeof forma === 'string' && TODAS_FORMAS.includes(forma as FormaCobranca)) {
          return {
            forma: forma as FormaCobranca,
            ordem: typeof ordem === 'number' ? ordem : idx,
          }
        }
      }
      return null
    })
    .filter((item): item is FormaPagamentoItem => item !== null)
    .sort((a, b) => a.ordem - b.ordem)

  return items.map((i) => i.forma)
}

/**
 * Serializa um array de FormaCobranca de volta para o formato canônico do banco.
 */
export function serializeFormasPagamento(formas: FormaCobranca[]): FormaPagamentoItem[] {
  return formas.map((forma, ordem) => ({ forma, ordem }))
}

/**
 * Verifica se um contrato cobra horas (produz timesheet faturável por padrão).
 * Espelha exatamente a lógica de `calcular_faturavel_timesheet` no banco:
 *   1. pro_bono prevalece → false
 *   2. por_hora ou por_cargo presentes → true
 *   3. misto → usa flag horas_faturaveis (default true)
 *   4. demais combinações (fixo/por_pasta/por_ato/por_etapa) → false
 */
export function contratoCobraHoras(
  formas: FormaCobranca[],
  horasFaturaveisFlag?: boolean | null
): boolean {
  if (formas.length === 0) return true // sem contrato/sem formas: default conservador
  if (formas.includes('pro_bono')) return false
  if (formas.some((f) => FORMAS_FATURAVEIS_HORA.includes(f))) return true
  if (formas.includes('misto')) return horasFaturaveisFlag ?? true
  return false
}

/**
 * Verifica se uma forma específica está presente no contrato.
 * Substitui o padrão antigo `forma_cobranca === 'X' || formas_disponiveis?.includes('X')`.
 */
export function contratoTemForma(formas: FormaCobranca[], forma: FormaCobranca): boolean {
  return formas.includes(forma)
}

/**
 * Verifica se o contrato tem QUALQUER uma das formas listadas.
 */
export function contratoTemAlgumaForma(
  formas: FormaCobranca[],
  candidatas: FormaCobranca[]
): boolean {
  return candidatas.some((c) => formas.includes(c))
}

/**
 * Retorna a forma "principal" do contrato (primeira do array).
 * Usado para badges resumidas e compatibilidade com código que ainda
 * espera uma única forma. Para lógica de negócio, prefira sempre verificar
 * o array completo via `contratoTemForma`.
 */
export function formaPrincipal(formas: FormaCobranca[]): FormaCobranca | undefined {
  return formas[0]
}

/**
 * Verifica se o contrato cobra atos processuais (alertas de cobrança automática).
 */
export function contratoCobraAtos(formas: FormaCobranca[]): boolean {
  return formas.includes('por_ato')
}

/**
 * Verifica se o contrato tem cobrança recorrente mensal (gera receitas fixas).
 */
export function contratoTemCobrancaRecorrente(formas: FormaCobranca[]): boolean {
  return formas.includes('fixo') || formas.includes('por_pasta')
}

/**
 * Verifica se o contrato é exclusivamente pró-bono.
 */
export function contratoEhProBono(formas: FormaCobranca[]): boolean {
  return formas.includes('pro_bono')
}

/**
 * Labels em português brasileiro para exibição em badges, selects, etc.
 */
export const FORMA_COBRANCA_LABELS: Record<FormaCobranca, string> = {
  fixo: 'Valor Fixo',
  por_hora: 'Por Hora',
  por_cargo: 'Por Cargo',
  por_pasta: 'Por Pasta',
  por_ato: 'Por Ato',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
  pro_bono: 'Pró-bono',
}

/**
 * Labels curtas (para chips compactos).
 */
export const FORMA_COBRANCA_LABELS_CURTOS: Record<FormaCobranca, string> = {
  fixo: 'Fixo',
  por_hora: 'Hora',
  por_cargo: 'Cargo',
  por_pasta: 'Pasta',
  por_ato: 'Ato',
  por_etapa: 'Etapa',
  misto: 'Misto',
  pro_bono: 'Pró-bono',
}
