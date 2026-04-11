/**
 * Orquestrador principal da biblioteca de tribunais.
 *
 * Recebe um CNJ (e opcionalmente o sistema em cache) e retorna o `TribunalLink`
 * pronto para ser renderizado. Aplica em ordem:
 *
 * 1. Parse do CNJ → estrutura `CnjParsed`
 * 2. Lookup na tabela `TRIBUNAIS_MAP` por `segmento.tr`
 * 3. Se o tribunal tem `customBuilder` → usa ele
 * 4. Determina o sistema efetivo:
 *    - `sistemaCache` (override via DataJud/manual), se presente
 *    - `config.resolveSistema(parsed)` (heurística por tribunal, ex: TJSP)
 *    - `config.sistemaDefault`
 * 5. Roteia para o builder correto (`buildSajUrl`, `buildPjeUrl`, etc.)
 */

import { parseCnj } from './parser'
import { getTribunalConfig } from './tribunais-map'
import {
  buildSajUrl,
  buildPjeUrl,
  buildEprocUrl,
  buildProjudiUrl,
  buildProprioUrl,
} from './url-builders'
import type { SistemaTribunal, TribunalLink } from './types'

/**
 * Constrói o link de consulta pública para um processo a partir do CNJ.
 *
 * @param numeroCnj - CNJ com ou sem máscara
 * @param sistemaCache - Sistema salvo no banco (opcional, override sobre heurística)
 * @returns TribunalLink pronto para renderizar, ou null se inválido / não suportado
 */
export function buildTribunalUrl(
  numeroCnj: string | null | undefined,
  sistemaCache?: SistemaTribunal | null
): TribunalLink | null {
  // 1. Parse
  const parsed = parseCnj(numeroCnj)
  if (!parsed) return null

  // 2. Lookup
  const config = getTribunalConfig(parsed.segmento, parsed.tr)
  if (!config) return null

  // 3. Custom builder (raro)
  if (config.customBuilder) {
    return config.customBuilder(parsed, config)
  }

  // 4. Determinar sistema efetivo
  const sistemaEfetivo: SistemaTribunal =
    sistemaCache ??
    config.resolveSistema?.(parsed) ??
    config.sistemaDefault

  // 5. Rotear para o builder correto
  switch (sistemaEfetivo) {
    case 'saj':
      return buildSajUrl(parsed, config)
    case 'pje':
      return buildPjeUrl(parsed, config)
    case 'eproc':
      return buildEprocUrl(parsed, config)
    case 'projudi':
      return buildProjudiUrl(parsed, config)
    case 'proprio':
      return buildProprioUrl(parsed, config)
    case 'outro':
    default:
      // Sistema desconhecido: tenta o default do tribunal se for diferente de 'outro'
      if (config.sistemaDefault !== 'outro') {
        return buildTribunalUrl(numeroCnj, config.sistemaDefault)
      }
      // Fallback: landing genérica com a primeira URL disponível do tribunal
      return {
        url: config.pjeUrl ?? config.eprocUrl ?? config.projudiUrl ??
             (config.sajDomain ? `https://${config.sajDomain}/` : `https://${config.sigla.toLowerCase()}.jus.br/`),
        tipo: 'landing',
        tribunalSigla: config.sigla,
        tribunalNome: config.nome,
        sistema: 'outro',
      }
  }
}

/**
 * Indica se é útil chamar o DataJud para refinar a detecção do sistema.
 *
 * Hoje, o único tribunal com ambiguidade estrutural é o TJSP (e-SAJ vs eproc,
 * em meio à migração de 2025). Para outros tribunais, o parser estático já
 * resolve com confiança e a chamada ao DataJud é redundante.
 *
 * Esta função é usada pelo hook para decidir se dispara fetch em background.
 */
export function tribunalPrecisaDeteccao(numeroCnj: string | null | undefined): boolean {
  const parsed = parseCnj(numeroCnj)
  if (!parsed) return false

  const config = getTribunalConfig(parsed.segmento, parsed.tr)
  if (!config) return false

  // Tem `resolveSistema` → tribunal ambíguo (hoje só TJSP)
  return typeof config.resolveSistema === 'function'
}
