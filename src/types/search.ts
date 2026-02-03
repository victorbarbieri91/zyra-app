// =====================================================
// TIPOS DO MÓDULO DE BUSCA GLOBAL
// Busca simplificada: Processos, Consultivo e CRM
// =====================================================

export type TipoResultadoBusca =
  | 'processo'
  | 'pessoa'
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

export interface ResultadoPessoa extends ResultadoBuscaBase {
  tipo: 'pessoa'
  tipo_cadastro?: string
  cpf_cnpj?: string
  email?: string
  telefone?: string
}

export interface ResultadoConsultivo extends ResultadoBuscaBase {
  tipo: 'consultivo'
  numero?: string
  cliente_nome?: string
}

export type ResultadoBusca =
  | ResultadoProcesso
  | ResultadoPessoa
  | ResultadoConsultivo

export interface ResultadosBuscaAgrupados {
  processos: ResultadoProcesso[]
  pessoas: ResultadoPessoa[]
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
  pessoa: {
    label: 'CRM',
    icone: 'Users',
    cor: '#1E3A8A',
    rota: '/dashboard/crm/pessoas'
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
  pessoa: 'CRM',
  consultivo: 'Consultivo'
}
