/**
 * Builders de URL de consulta pública por sistema processual.
 *
 * Cada função recebe o CNJ parseado e a config do tribunal, e retorna
 * o `TribunalLink` pronto para ser renderizado.
 *
 * Dois tipos de link:
 * - 'direct': URL já abre na página do processo (e-SAJ, STJ)
 * - 'landing': URL abre a landing da consulta pública (PJe, eproc, Projudi)
 */

import type { CnjParsed, TribunalConfig, TribunalLink } from './types'

/**
 * Builder para e-SAJ (Softplan).
 *
 * Constrói URL com query string que abre direto na página do processo.
 * Endpoint muda conforme o grau:
 * - 1º grau: /cpopg/search.do
 * - 2º grau: /cposg/search.do
 *
 * O grau é inferido pelo primeiro dígito do sequencial (convenção TJSP
 * e-SAJ): 2xxxxxxx = 2º grau, demais = 1º grau.
 */
export function buildSajUrl(
  parsed: CnjParsed,
  config: TribunalConfig
): TribunalLink {
  if (!config.sajDomain) {
    // Sem domínio configurado → fallback para landing genérica
    return {
      url: `https://${config.sigla.toLowerCase()}.jus.br/`,
      tipo: 'landing',
      tribunalSigla: config.sigla,
      tribunalNome: config.nome,
      sistema: 'saj',
    }
  }

  // Grau: 2º se sequencial começa com '2', caso contrário 1º grau
  const isSegundoGrau = parsed.primeiroDigito === '2'
  const endpoint = isSegundoGrau ? 'cposg' : 'cpopg'

  const params = new URLSearchParams({
    cbPesquisa: 'NUMPROC',
    'dadosConsulta.tipoNuProcesso': 'UNIFICADO',
    'dadosConsulta.valorConsultaNuUnificado': parsed.numeroCompleto,
    foroNumeroUnificado: parsed.vara,
  })

  return {
    url: `https://${config.sajDomain}/${endpoint}/search.do?${params.toString()}`,
    tipo: 'direct',
    tribunalSigla: config.sigla,
    tribunalNome: config.nome,
    sistema: 'saj',
  }
}

/**
 * Builder para PJe (CNJ).
 *
 * PJe usa formulário POST via AJAX → não permite deep-link por query string.
 * Retorna apenas a landing da consulta pública do tribunal.
 */
export function buildPjeUrl(
  parsed: CnjParsed,
  config: TribunalConfig
): TribunalLink {
  return {
    url: config.pjeUrl ?? `https://pje.${config.sigla.toLowerCase()}.jus.br/`,
    tipo: 'landing',
    tribunalSigla: config.sigla,
    tribunalNome: config.nome,
    sistema: 'pje',
  }
}

/**
 * Builder para eproc (TRF4, TJRS, TJSC, TJTO, TJSP novo).
 *
 * eproc usa formulário POST + autenticação → só landing.
 */
export function buildEprocUrl(
  parsed: CnjParsed,
  config: TribunalConfig
): TribunalLink {
  return {
    url: config.eprocUrl ?? `https://eproc1g.${config.sigla.toLowerCase()}.jus.br/`,
    tipo: 'landing',
    tribunalSigla: config.sigla,
    tribunalNome: config.nome,
    sistema: 'eproc',
  }
}

/**
 * Builder para Projudi (TJGO, TJPR legado).
 */
export function buildProjudiUrl(
  parsed: CnjParsed,
  config: TribunalConfig
): TribunalLink {
  return {
    url: config.projudiUrl ?? `https://projudi.${config.sigla.toLowerCase()}.jus.br/`,
    tipo: 'landing',
    tribunalSigla: config.sigla,
    tribunalNome: config.nome,
    sistema: 'projudi',
  }
}

/**
 * Builder para sistemas proprietários (STJ, STF, TST, TSE).
 *
 * STJ suporta deep-link via query string `?termo={CNJ}`.
 * STF/TSE/TST só abrem a landing.
 */
export function buildProprioUrl(
  parsed: CnjParsed,
  config: TribunalConfig
): TribunalLink {
  // STJ tem deep-link próprio
  if (config.sigla === 'STJ' && config.pjeUrl) {
    const base = config.pjeUrl
    const separator = base.includes('?') ? '&' : '?'
    return {
      url: `${base}${separator}termo=${encodeURIComponent(parsed.numeroCompleto)}`,
      tipo: 'direct',
      tribunalSigla: config.sigla,
      tribunalNome: config.nome,
      sistema: 'proprio',
    }
  }

  // STF, TST, TSE e outros: só landing
  return {
    url: config.pjeUrl ?? `https://${config.sigla.toLowerCase()}.jus.br/`,
    tipo: 'landing',
    tribunalSigla: config.sigla,
    tribunalNome: config.nome,
    sistema: 'proprio',
  }
}
