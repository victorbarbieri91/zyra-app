/**
 * Tipos para a biblioteca de tribunais.
 * Contém as interfaces usadas pelo parser, builders e orquestrador.
 */

/**
 * Sistemas processuais reconhecidos.
 * Mesmos valores do CHECK da coluna `processos_processos.sistema_tribunal`.
 */
export type SistemaTribunal =
  | 'saj'       // e-SAJ (Softplan) — deep-link completo
  | 'pje'       // PJe do CNJ — só landing (POST AJAX)
  | 'eproc'     // eproc (TRF4, TJRS, TJSC, TJMG partial, TJSP novo) — só landing
  | 'projudi'   // Projudi (TJPR, TJGO legado) — só landing
  | 'proprio'   // sistemas proprietários (STJ, STF, TSE, TST)
  | 'outro'     // desconhecido / inválido

/**
 * CNJ parseado nos seus componentes.
 * Formato de entrada: NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export interface CnjParsed {
  /** CNJ original com máscara, ex: "5018983-55.2024.8.24.0008" */
  numeroCompleto: string
  /** CNJ limpo (só dígitos), 20 chars */
  numeroLimpo: string
  /** 7 dígitos: número sequencial */
  sequencial: string
  /** 2 dígitos: dígito verificador */
  digitoVerificador: string
  /** 4 dígitos: ano de autuação */
  ano: string
  /** 1 dígito: segmento do judiciário (1=STF, 3=STJ, 4=Federal, 5=Trabalho, 6=Eleitoral, 8=Estadual, ...) */
  segmento: string
  /** 2 dígitos: código do tribunal (01..27 para estadual, 01..06 para TRF, 01..24 para TRT) */
  tr: string
  /** 4 dígitos: código do órgão/vara/foro */
  vara: string
  /** Primeiro dígito do sequencial — usado para heurísticas (ex: TJSP eproc=4) */
  primeiroDigito: string
}

/**
 * Configuração de um tribunal no mapa `tribunais-map.ts`.
 * Cada tribunal define seu sistema padrão + parâmetros para o builder.
 */
export interface TribunalConfig {
  /** Sigla curta, ex: "TJSP", "TRT2", "TRF3" */
  sigla: string
  /** Nome completo, ex: "Tribunal de Justiça de São Paulo" */
  nome: string
  /** Sistema processual padrão do tribunal */
  sistemaDefault: SistemaTribunal
  /**
   * Domínio base do e-SAJ, quando `sistemaDefault === 'saj'`.
   * Ex: "esaj.tjsp.jus.br", "esaj.tjba.jus.br"
   */
  sajDomain?: string
  /**
   * URL completa da consulta pública PJe.
   * Ex: "https://pje.trt2.jus.br/consultaprocessual/"
   */
  pjeUrl?: string
  /**
   * URL completa da consulta pública eproc.
   * Ex: "https://eproc1g.tjsp.jus.br/eproc"
   */
  eprocUrl?: string
  /**
   * URL completa do Projudi (casos TJPR, TJGO legado).
   */
  projudiUrl?: string
  /**
   * Builder customizado para sistemas próprios (STJ, STF, TSE).
   * Recebe o CNJ parseado e retorna o TribunalLink pronto.
   */
  customBuilder?: (parsed: CnjParsed, config: TribunalConfig) => TribunalLink
  /**
   * Função especial para determinar o sistema baseado no CNJ.
   * Usada para casos ambíguos como TJSP (onde o prefixo do sequencial indica e-SAJ vs eproc).
   */
  resolveSistema?: (parsed: CnjParsed) => SistemaTribunal
}

/**
 * Resultado do `buildTribunalUrl`. Representa o link pronto para ser renderizado.
 */
export interface TribunalLink {
  /** URL a ser aberta em nova aba */
  url: string
  /**
   * Tipo do link:
   * - 'direct': já abre na página do processo (ex: e-SAJ com CNJ na query string)
   * - 'landing': abre a landing da consulta pública (usuário ainda precisa colar o CNJ)
   */
  tipo: 'direct' | 'landing'
  /** Sigla do tribunal, ex: "TJSP" */
  tribunalSigla: string
  /** Nome completo do tribunal */
  tribunalNome: string
  /** Sistema processual efetivo (após aplicar cache/heurísticas) */
  sistema: SistemaTribunal
}
