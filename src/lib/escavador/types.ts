/**
 * Types para integracao com API do Escavador v2
 * Documentacao: https://api.escavador.com/v2/docs/
 */

// ============================================
// TIPOS DA RESPOSTA DA API ESCAVADOR
// ============================================

/**
 * Resposta da busca de processo por CNJ
 * GET /api/v2/processos/numero_cnj/{numero}
 */
export interface EscavadorProcessoResponse {
  numero_cnj: string
  titulo_polo_ativo: string
  titulo_polo_passivo: string
  ano_inicio: number
  data_inicio: string
  estado_origem: {
    nome: string
    sigla: string
  }
  unidade_origem: {
    nome: string
    endereco: string | null
    classificacao: string | null
    cidade: string
    estado: {
      nome: string
      sigla: string
    }
    tribunal_sigla: string
  }
  data_ultima_movimentacao: string
  quantidade_movimentacoes: number
  fontes_tribunais_estao_arquivadas: boolean
  data_ultima_verificacao: string
  tempo_desde_ultima_verificacao: string
  processos_relacionados: Array<{ numero: string }>
  fontes: EscavadorFonte[]
}

/**
 * Fonte onde o processo foi encontrado
 */
export interface EscavadorFonte {
  id: number
  processo_fonte_id: number
  descricao: string
  nome: string
  sigla: string
  tipo: 'TRIBUNAL' | 'DIARIO_OFICIAL' | 'OUTRO'
  data_inicio: string
  data_ultima_movimentacao: string
  segredo_justica: boolean | null
  arquivado: boolean | null
  status_predito: string | null
  grau: number
  grau_formatado: string
  fisico: boolean | null
  sistema: string
  capa: EscavadorCapa | null
  audiencias: EscavadorAudiencia[]
  url: string | null
  tribunal: {
    id: number
    nome: string
    sigla: string
    categoria: string | null
  }
  quantidade_envolvidos: number
  quantidade_movimentacoes: number
  data_ultima_verificacao: string
  envolvidos: EscavadorEnvolvido[]
}

/**
 * Dados da capa do processo
 */
export interface EscavadorCapa {
  classe: string
  assunto: string
  assuntos_normalizados: EscavadorAssuntoNormalizado[]
  assunto_principal_normalizado: EscavadorAssuntoNormalizado | null
  area: string
  orgao_julgador: string
  orgao_julgador_normalizado?: {
    nome: string
    endereco: string | null
    classificacao: string | null
    cidade: string
    estado: {
      nome: string
      sigla: string
    }
    tribunal_sigla: string
  } | null
  situacao: string | null
  valor_causa: {
    valor: string
    moeda: string
    valor_formatado: string
  } | null
  data_distribuicao: string
  data_arquivamento: string | null
  informacoes_complementares: Array<{
    tipo: string
    valor: string
  }> | null
}

/**
 * Assunto normalizado
 */
export interface EscavadorAssuntoNormalizado {
  id: number
  nome: string
  nome_com_pai: string
  path_completo: string
  categoria_raiz?: string
  bloqueado: boolean
}

/**
 * Audiência
 */
export interface EscavadorAudiencia {
  tipo: string
  data: string
  quantidade_pessoas: number
  situacao: string
}

/**
 * Envolvido no processo (parte, advogado, etc)
 */
export interface EscavadorEnvolvido {
  nome: string
  quantidade_processos: number
  tipo_pessoa: 'FISICA' | 'JURIDICA' | string
  advogados: EscavadorAdvogado[]
  prefixo: string | null
  sufixo: string | null
  tipo: string // Reqte, Reqdo, Advogado, Juiz, etc
  tipo_normalizado: string // Requerente, Requerido, Advogado, Juiz
  polo: 'ATIVO' | 'PASSIVO' | 'ADVOGADO' | 'DESCONHECIDO' | 'NENHUM' | string
  cpf: string | null
  cnpj: string | null
  oabs?: EscavadorOAB[]
}

/**
 * Advogado
 */
export interface EscavadorAdvogado {
  nome: string
  quantidade_processos: number
  tipo_pessoa: string
  prefixo: string | null
  sufixo: string | null
  tipo: string
  tipo_normalizado: string
  polo: string
  cpf: string | null
  cnpj: string | null
  oabs: EscavadorOAB[]
}

/**
 * OAB do advogado
 */
export interface EscavadorOAB {
  uf: string
  tipo: string
  numero: number
}

/**
 * Movimentacao processual
 */
export interface EscavadorMovimentacao {
  id?: number
  data: string
  tipo?: string
  conteudo: string
  fonte?: string
  fonte_id?: number
  fonte_nome?: string
  fonte_sigla?: string
  fonte_tipo?: string
  fonte_grau?: number
  resumo?: string
  titulo?: string
}

// ============================================
// TIPOS PARA MONITORAMENTO
// ============================================

/**
 * Request para criar monitoramento
 */
export interface EscavadorCriarMonitoramentoRequest {
  numero_cnj: string
  tribunal?: string
  callback_url?: string
}

/**
 * Resposta de monitoramento criado
 */
export interface EscavadorMonitoramentoResponse {
  id: number
  numero_cnj: string
  tribunal?: string
  status: 'PENDENTE' | 'ENCONTRADO' | 'NAO_ENCONTRADO' | 'ERRO'
  data_criacao: string
  data_ultima_verificacao?: string
  data_proxima_verificacao?: string
  processo_id?: number
}

// ============================================
// TIPOS NORMALIZADOS PARA O SISTEMA
// ============================================

/**
 * Dados do processo normalizados para o sistema Zyra
 */
export interface ProcessoEscavadorNormalizado {
  // Identificacao
  numero_cnj: string

  // Titulos das partes (vem direto da API)
  titulo_polo_ativo: string
  titulo_polo_passivo: string

  // Classificacao
  tipo: 'judicial' | 'administrativo' | 'arbitragem'
  area: string
  classe: string
  assunto: string
  assunto_principal: string

  // Localizacao
  tribunal: string
  tribunal_nome: string
  instancia: string
  grau: number
  comarca: string
  vara: string
  orgao_julgador: string
  estado: string
  cidade: string
  url_processo: string | null

  // Datas
  data_distribuicao: string | null
  data_inicio: string | null
  data_ultima_movimentacao: string | null

  // Valores
  valor_causa: number | null
  valor_causa_formatado: string | null

  // Status
  situacao: string | null
  segredo_justica: boolean
  status_predito: string | null

  // Juiz (extraído das informações complementares ou envolvidos)
  juiz: string | null

  // Partes
  partes: ParteNormalizada[]

  // Metadados
  fonte_id: number | null
  quantidade_movimentacoes: number
  consultado_em: string
}

/**
 * Parte do processo normalizada
 */
export interface ParteNormalizada {
  nome: string
  tipo_pessoa: 'fisica' | 'juridica' | 'desconhecido'
  tipo_participacao: string
  tipo_normalizado: string
  polo: 'ativo' | 'passivo' | 'terceiro' | 'outro'
  documento: string | null
  advogados: AdvogadoNormalizado[]
}

/**
 * Advogado normalizado
 */
export interface AdvogadoNormalizado {
  nome: string
  oab: string | null
  oab_uf: string | null
}

// ============================================
// TIPOS DE ERRO E RESULTADO
// ============================================

/**
 * Erro retornado pela API Escavador
 */
export interface EscavadorErro {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

/**
 * Resultado da consulta
 */
export interface ResultadoConsultaEscavador {
  sucesso: boolean
  dados?: ProcessoEscavadorNormalizado
  erro?: string
  creditos_utilizados?: number
}

/**
 * Resultado da criacao de monitoramento
 */
export interface ResultadoMonitoramento {
  sucesso: boolean
  monitoramento_id?: number
  status?: string
  erro?: string
}
