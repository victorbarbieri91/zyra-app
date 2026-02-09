/**
 * Constantes para os valores de campos de processos
 * Estes valores devem corresponder EXATAMENTE às check constraints do banco de dados
 *
 * IMPORTANTE: Se adicionar novos valores, atualizar também as constraints no banco
 */

// Valores aceitos pelo banco para o campo 'fase'
export const PROCESSO_FASE = {
  CONHECIMENTO: 'conhecimento',
  RECURSO: 'recurso',
  EXECUCAO: 'execucao',
  CUMPRIMENTO_SENTENCA: 'cumprimento_sentenca',
} as const

export const PROCESSO_FASE_LABELS: Record<string, string> = {
  conhecimento: 'Conhecimento',
  recurso: 'Recurso',
  execucao: 'Execução',
  cumprimento_sentenca: 'Cumprimento de Sentença',
}

// Valores aceitos pelo banco para o campo 'instancia'
export const PROCESSO_INSTANCIA = {
  PRIMEIRA: '1a',
  SEGUNDA: '2a',
  TERCEIRA: '3a',
  STJ: 'stj',
  STF: 'stf',
  TST: 'tst',
  ADMINISTRATIVA: 'administrativa',
} as const

export const PROCESSO_INSTANCIA_LABELS: Record<string, string> = {
  '1a': '1ª Instância',
  '2a': '2ª Instância',
  '3a': '3ª Instância',
  stj: 'STJ',
  stf: 'STF',
  tst: 'TST',
  administrativa: 'Administrativa',
}

// Valores aceitos pelo banco para o campo 'polo_cliente'
export const PROCESSO_POLO = {
  ATIVO: 'ativo',
  PASSIVO: 'passivo',
  TERCEIRO: 'terceiro',
} as const

export const PROCESSO_POLO_LABELS: Record<string, string> = {
  ativo: 'Polo Ativo',
  passivo: 'Polo Passivo',
  terceiro: 'Terceiro Interessado',
}

// Valores aceitos pelo banco para o campo 'provisao_perda'
export const PROCESSO_PROVISAO = {
  REMOTA: 'remota',
  POSSIVEL: 'possivel',
  PROVAVEL: 'provavel',
} as const

export const PROCESSO_PROVISAO_LABELS: Record<string, string> = {
  remota: 'Remota',
  possivel: 'Possível',
  provavel: 'Provável',
}

// Valores aceitos pelo banco para o campo 'rito'
export const PROCESSO_RITO = {
  ORDINARIO: 'ordinario',
  SUMARIO: 'sumario',
  ESPECIAL: 'especial',
  SUMARISSIMO: 'sumarissimo',
} as const

export const PROCESSO_RITO_LABELS: Record<string, string> = {
  ordinario: 'Ordinário',
  sumario: 'Sumário',
  especial: 'Especial',
  sumarissimo: 'Sumaríssimo',
}

// Valores aceitos pelo banco para o campo 'status'
export const PROCESSO_STATUS = {
  ATIVO: 'ativo',
  SUSPENSO: 'suspenso',
  ARQUIVADO: 'arquivado',
  BAIXADO: 'baixado',
  TRANSITO_JULGADO: 'transito_julgado',
  ACORDO: 'acordo',
} as const

export const PROCESSO_STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  arquivado: 'Arquivado',
  baixado: 'Baixado',
  transito_julgado: 'Trânsito em Julgado',
  acordo: 'Acordo',
}

// Valores aceitos pelo banco para o campo 'tipo'
export const PROCESSO_TIPO = {
  JUDICIAL: 'judicial',
  ADMINISTRATIVO: 'administrativo',
  ARBITRAGEM: 'arbitragem',
} as const

export const PROCESSO_TIPO_LABELS: Record<string, string> = {
  judicial: 'Judicial',
  administrativo: 'Administrativo',
  arbitragem: 'Arbitragem',
}

// Valores aceitos pelo banco para o campo 'modalidade_cobranca'
export const PROCESSO_MODALIDADE_COBRANCA = {
  FIXO: 'fixo',
  POR_HORA: 'por_hora',
  POR_ETAPA: 'por_etapa',
  MISTO: 'misto',
  POR_PASTA: 'por_pasta',
  POR_ATO: 'por_ato',
  POR_CARGO: 'por_cargo',
} as const

export const PROCESSO_MODALIDADE_COBRANCA_LABELS: Record<string, string> = {
  fixo: 'Valor Fixo',
  por_hora: 'Por Hora',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
  por_pasta: 'Por Pasta',
  por_ato: 'Por Ato',
  por_cargo: 'Por Cargo',
}

// Valores aceitos pelo banco para o campo 'resultado' (encerramento)
export const PROCESSO_RESULTADO = {
  FAVORAVEL: 'favoravel',
  DESFAVORAVEL: 'desfavoravel',
  PARCIAL: 'parcial',
  SEM_MERITO: 'sem_merito',
} as const

export const PROCESSO_RESULTADO_LABELS: Record<string, string> = {
  favoravel: 'Favorável',
  desfavoravel: 'Desfavorável',
  parcial: 'Parcialmente Favorável',
  sem_merito: 'Sem Mérito / N/A',
}

// Status que representam processo encerrado (para filtros de listagem)
export const PROCESSO_STATUS_ENCERRADO = [
  'arquivado', 'baixado', 'transito_julgado', 'acordo'
] as const

// Types para TypeScript
export type ProcessoFase = typeof PROCESSO_FASE[keyof typeof PROCESSO_FASE]
export type ProcessoInstancia = typeof PROCESSO_INSTANCIA[keyof typeof PROCESSO_INSTANCIA]
export type ProcessoPolo = typeof PROCESSO_POLO[keyof typeof PROCESSO_POLO]
export type ProcessoProvisao = typeof PROCESSO_PROVISAO[keyof typeof PROCESSO_PROVISAO]
export type ProcessoRito = typeof PROCESSO_RITO[keyof typeof PROCESSO_RITO]
export type ProcessoStatus = typeof PROCESSO_STATUS[keyof typeof PROCESSO_STATUS]
export type ProcessoTipo = typeof PROCESSO_TIPO[keyof typeof PROCESSO_TIPO]
export type ProcessoModalidadeCobranca = typeof PROCESSO_MODALIDADE_COBRANCA[keyof typeof PROCESSO_MODALIDADE_COBRANCA]
export type ProcessoResultado = typeof PROCESSO_RESULTADO[keyof typeof PROCESSO_RESULTADO]
