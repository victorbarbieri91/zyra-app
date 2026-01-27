// =====================================================
// TIPOS DO MÓDULO DE BUSCA GLOBAL
// =====================================================

export type TipoResultadoBusca =
  | 'processo'
  | 'pessoa'
  | 'tarefa'
  | 'evento'
  | 'audiencia'
  | 'contrato'
  | 'publicacao'
  | 'consultivo'
  | 'produto'
  | 'projeto'

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
}

export interface ResultadoPessoa extends ResultadoBuscaBase {
  tipo: 'pessoa'
  tipo_cadastro?: string
  cpf_cnpj?: string
  email?: string
  telefone?: string
}

export interface ResultadoTarefa extends ResultadoBuscaBase {
  tipo: 'tarefa'
  data_inicio?: string
  data_fim?: string
  prioridade?: string
}

export interface ResultadoEvento extends ResultadoBuscaBase {
  tipo: 'evento'
  data_hora?: string
  local?: string
}

export interface ResultadoAudiencia extends ResultadoBuscaBase {
  tipo: 'audiencia'
  data_hora?: string
  tipo_audiencia?: string
  processo_numero?: string
}

export interface ResultadoContrato extends ResultadoBuscaBase {
  tipo: 'contrato'
  numero_contrato?: string
  cliente_nome?: string
  valor?: number
  forma_cobranca?: string
}

export interface ResultadoPublicacao extends ResultadoBuscaBase {
  tipo: 'publicacao'
  tipo_publicacao?: string
  data_publicacao?: string
  processo_numero?: string
}

export interface ResultadoConsultivo extends ResultadoBuscaBase {
  tipo: 'consultivo'
  numero?: string
  cliente_nome?: string
}

export interface ResultadoProduto extends ResultadoBuscaBase {
  tipo: 'produto'
  codigo?: string
  area_juridica?: string
  categoria?: string
}

export interface ResultadoProjeto extends ResultadoBuscaBase {
  tipo: 'projeto'
  cliente_nome?: string
}

export type ResultadoBusca =
  | ResultadoProcesso
  | ResultadoPessoa
  | ResultadoTarefa
  | ResultadoEvento
  | ResultadoAudiencia
  | ResultadoContrato
  | ResultadoPublicacao
  | ResultadoConsultivo
  | ResultadoProduto
  | ResultadoProjeto

export interface ResultadosBuscaAgrupados {
  processos: ResultadoProcesso[]
  pessoas: ResultadoPessoa[]
  agenda: (ResultadoTarefa | ResultadoEvento | ResultadoAudiencia)[]
  financeiro: ResultadoContrato[]
  publicacoes: ResultadoPublicacao[]
  consultivo: ResultadoConsultivo[]
  portfolio: (ResultadoProduto | ResultadoProjeto)[]
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
    label: 'Pessoas/CRM',
    icone: 'Users',
    cor: '#1E3A8A',
    rota: '/dashboard/crm/pessoas'
  },
  tarefa: {
    label: 'Tarefas',
    icone: 'CheckSquare',
    cor: '#f97316',
    rota: '/dashboard/agenda'
  },
  evento: {
    label: 'Eventos',
    icone: 'Calendar',
    cor: '#8b5cf6',
    rota: '/dashboard/agenda'
  },
  audiencia: {
    label: 'Audiências',
    icone: 'Gavel',
    cor: '#dc2626',
    rota: '/dashboard/agenda'
  },
  contrato: {
    label: 'Contratos',
    icone: 'FileText',
    cor: '#059669',
    rota: '/dashboard/financeiro'
  },
  publicacao: {
    label: 'Publicações',
    icone: 'Newspaper',
    cor: '#0891b2',
    rota: '/dashboard/publicacoes'
  },
  consultivo: {
    label: 'Consultivo',
    icone: 'BookOpen',
    cor: '#7c3aed',
    rota: '/dashboard/consultivo'
  },
  produto: {
    label: 'Produtos',
    icone: 'Package',
    cor: '#84cc16',
    rota: '/dashboard/portfolio'
  },
  projeto: {
    label: 'Projetos',
    icone: 'Briefcase',
    cor: '#ea580c',
    rota: '/dashboard/portfolio'
  }
} as const

export const TIPO_LABELS: Record<TipoResultadoBusca, string> = {
  processo: 'Processo',
  pessoa: 'Pessoa',
  tarefa: 'Tarefa',
  evento: 'Evento',
  audiencia: 'Audiência',
  contrato: 'Contrato',
  publicacao: 'Publicação',
  consultivo: 'Consultivo',
  produto: 'Produto',
  projeto: 'Projeto'
}
