// =====================================================
// TIPOS DO MÓDULO DE BUSCA GLOBAL
// Busca simplificada: Processos e Consultivo
// =====================================================

export type TipoResultadoBusca =
  | 'processo'
  | 'consultivo'

export interface ResultadoBuscaBase {
  id: string
  tipo: TipoResultadoBusca
  titulo: string
  subtitulo?: string
  navegacao: string
  destaque?: string
  icone: string
  modulo: string
  data?: string
  status?: string
}

export interface ResultadoProcesso extends ResultadoBuscaBase {
  tipo: 'processo'
  numero_cnj?: string
  numero_pasta?: string
  area?: string
  tribunal?: string
  cliente_nome?: string
  parte_contraria?: string
}

export interface ResultadoConsultivo extends ResultadoBuscaBase {
  tipo: 'consultivo'
  numero?: string
  cliente_nome?: string
}

export type ResultadoBusca =
  | ResultadoProcesso
  | ResultadoConsultivo

export interface ResultadosBuscaAgrupados {
  processos: ResultadoProcesso[]
  consultivo: ResultadoConsultivo[]
}

export interface RespostaBuscaGlobal {
  sucesso: boolean
  resultados: ResultadoBusca[]
  total: number
  tempo_busca_ms: number
  erro?: string
}

// =====================================================
// CONFIGURAÇÃO DE MÓDULOS BUSCÁVEIS
// =====================================================

export const MODULOS_BUSCA = {
  processo: {
    label: 'Processos',
    icone: 'Scale',
    cor: '#34495e',
    rota: '/dashboard/processos'
  },
  consultivo: {
    label: 'Consultivo',
    icone: 'BookOpen',
    cor: '#7c3aed',
    rota: '/dashboard/consultivo'
  }
} as const

export const TIPO_LABELS: Record<TipoResultadoBusca, string> = {
  processo: 'Processo',
  consultivo: 'Consultivo'
}
