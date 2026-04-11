/**
 * Barril de exports da biblioteca de tribunais.
 *
 * Uso típico no resto do app:
 *
 *   import { buildTribunalUrl, parseCnj, type TribunalLink } from '@/lib/tribunais'
 */

export { parseCnj } from './parser'
export { buildTribunalUrl, tribunalPrecisaDeteccao } from './build-tribunal-url'
export { getTribunalConfig, TRIBUNAIS_MAP } from './tribunais-map'
export { normalizeDataJudSistema } from './normalize-datajud-sistema'
export { detectSistemaViaDataJud, salvarSistemaNoCache } from './detect-sistema'
export type {
  CnjParsed,
  TribunalConfig,
  TribunalLink,
  SistemaTribunal,
} from './types'
