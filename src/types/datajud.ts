// ============================================
// TIPOS PARA INTEGRACAO COM API DATAJUD (CNJ)
// ============================================

/**
 * Informacoes do tribunal extraidas do numero CNJ
 */
export interface TribunalInfo {
  alias: string      // api_publica_tjsp
  nome: string       // TJSP
  segmento: string   // estadual, federal, trabalhista, superior
}

/**
 * Estrutura bruta de um hit retornado pela API DataJud (Elasticsearch)
 */
export interface DataJudHit {
  _index: string
  _id: string
  _score: number
  _source: {
    id: string
    numeroProcesso: string
    classe: {
      codigo: number
      nome: string
    }
    sistema: {
      codigo: number
      nome: string
    }
    formato: {
      codigo: number
      nome: string // "Eletrônico" ou "Físico"
    }
    tribunal: string
    dataHoraUltimaAtualizacao: string
    grau: string // "G1", "G2", "JE", "SUP", "TR", "STF", "STJ", "TST"
    dataAjuizamento: string
    nivelSigilo: number // 0 = público, >0 = sigiloso
    orgaoJulgador: {
      codigo: number
      nome: string
      codigoMunicipioIBGE?: number
    }
    assuntos: Array<{
      codigo: number
      nome: string
    }>
    movimentos: Array<{
      codigo: number
      nome: string
      dataHora: string
      complementosTabelados?: Array<{
        codigo: number
        nome: string
        valor: string
        descricao: string
      }>
    }>
  }
}

/**
 * Resposta completa da API DataJud (formato Elasticsearch)
 */
export interface DataJudResponse {
  took: number
  timed_out: boolean
  _shards: {
    total: number
    successful: number
    skipped: number
    failed: number
  }
  hits: {
    total: {
      value: number
      relation: string
    }
    max_score: number | null
    hits: DataJudHit[]
  }
}

/**
 * Movimentacao normalizada para o sistema
 */
export interface MovimentacaoDataJud {
  codigo: number
  descricao: string
  data: string
}

/**
 * Processo normalizado para o sistema Zyra Legal
 */
export interface ProcessoDataJud {
  numero_cnj: string
  tribunal: string
  classe: string
  classe_codigo?: number
  orgao_julgador: string
  orgao_julgador_codigo?: number
  comarca_ibge?: number
  data_ajuizamento: string
  grau: string
  instancia: string
  formato: string
  assuntos: string[]
  objeto_acao: string
  movimentacoes: MovimentacaoDataJud[]
  sigilo: boolean
  ultima_atualizacao?: string
}

/**
 * Resultado da consulta a API DataJud
 */
export interface ConsultaDataJudResult {
  sucesso: boolean
  dados?: ProcessoDataJud
  tribunal?: TribunalInfo
  erro?: string
  fonte?: 'api' | 'cache'
}

/**
 * Registro de cache de consulta DataJud
 */
export interface DataJudCacheRecord {
  id: string
  numero_cnj: string
  tribunal: string | null
  dados_normalizados: ProcessoDataJud
  consultado_em: string
  expira_em: string
  user_id: string | null
  created_at: string
}
