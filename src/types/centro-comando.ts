// ============================================
// TIPOS DO CENTRO DE COMANDO
// ============================================

// Mensagem do chat
export interface CentroComandoMensagem {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  tool_results?: ToolResult[]
  acoes_pendentes?: AcaoPendente[]
  loading?: boolean
  erro?: string
}

// Resultado de ferramenta (tool call)
export interface ToolResult {
  tool: string
  explicacao?: string
  dados?: any[]
  total?: number
  erro?: string
  acao_pendente?: boolean
  acao_id?: string
  preview?: any
  antes?: any
  alteracoes?: any
  registro?: any
  aviso?: string
  requer_dupla_confirmacao?: boolean
  campos_necessarios?: CampoNecessario[]
  contexto?: string
  aguardando_input?: boolean
  caminho?: string
  filtros?: Record<string, any>
  tipo?: string
}

// Campo solicitado pela IA
export interface CampoNecessario {
  campo: string
  descricao: string
  obrigatorio: boolean
  tipo: 'texto' | 'data' | 'numero' | 'selecao'
  opcoes?: string[]
}

// Ação pendente de confirmação
export interface AcaoPendente {
  id: string
  tipo: 'insert' | 'update' | 'delete'
  tabela: string
  dados?: any
  registro_id?: string
  antes?: any
  depois?: any
  registro?: any
  explicacao: string
  requer_dupla_confirmacao?: boolean
}

// Sessão do Centro de Comando
export interface CentroComandoSessao {
  id: string
  user_id: string
  escritorio_id: string
  titulo?: string
  contexto: Record<string, any>
  ativo: boolean
  inicio: Date
  fim?: Date
  mensagens_count: number
}

// Favorito salvo
export interface CentroComandoFavorito {
  id: string
  nome: string
  comando: string
  descricao?: string
  icone: string
  categoria: string
  ordem: number
  uso_count: number
  ultimo_uso?: Date
  compartilhado_equipe: boolean
}

// Resposta da Edge Function
export interface CentroComandoResponse {
  sucesso: boolean
  resposta?: string
  tool_results?: ToolResult[]
  acoes_pendentes?: AcaoPendente[]
  tem_confirmacao_pendente?: boolean
  sessao_id?: string
  tempo_execucao_ms?: number
  erro?: string
}

// Parâmetros para confirmar ação
export interface ConfirmarAcaoParams {
  acao_id: string
  dupla_confirmacao?: boolean
  dados_adicionais?: Record<string, any>
}

// Estado do hook
export interface CentroComandoState {
  mensagens: CentroComandoMensagem[]
  sessaoId: string | null
  carregando: boolean
  erro: string | null
  acoesPendentes: AcaoPendente[]
  passos: PassoThinking[] // Passos do agentic loop em tempo real
}

// Passo do "thinking" - o que a IA está fazendo
export interface PassoThinking {
  id: string
  type: 'thinking' | 'tool_start' | 'tool_end'
  tool?: string
  message: string
  timestamp: Date
  resultado?: any
  concluido?: boolean
}

// Eventos SSE recebidos do streaming
export interface StreamEvent {
  event: 'thinking' | 'step' | 'done' | 'error'
  data: {
    type?: 'tool_start' | 'tool_end'
    tool?: string
    message?: string
    args?: any
    resultado?: any
    // Para evento 'done'
    sucesso?: boolean
    resposta?: string
    tool_results?: ToolResult[]
    acoes_pendentes?: AcaoPendente[]
    tem_confirmacao_pendente?: boolean
    sessao_id?: string
    tempo_execucao_ms?: number
    // Para evento 'error'
    erro?: string
  }
}

// Sugestões de comandos
export interface ComandoSugestao {
  texto: string
  descricao: string
  modulo: 'processos' | 'agenda' | 'financeiro' | 'crm' | 'geral'
}

// Categoria do menu de sugestões
export interface CategoriaMenu {
  id: string
  nome: string
  icone: string
  comandos: ComandoSugestao[]
}

// Menu de sugestões organizado por módulos
export const MENU_SUGESTOES: CategoriaMenu[] = [
  {
    id: 'processos',
    nome: 'Processos',
    icone: 'scale',
    comandos: [
      { texto: 'Mostre meus processos ativos', descricao: 'Lista processos em andamento', modulo: 'processos' },
      { texto: 'Processos com prazos essa semana', descricao: 'Prazos próximos de vencer', modulo: 'processos' },
      { texto: 'Movimentações recentes', descricao: 'Últimas atualizações', modulo: 'processos' },
    ],
  },
  {
    id: 'agenda',
    nome: 'Agenda',
    icone: 'calendar',
    comandos: [
      { texto: 'Quais tarefas tenho para hoje?', descricao: 'Tarefas do dia', modulo: 'agenda' },
      { texto: 'Meus compromissos da semana', descricao: 'Agenda dos próximos 7 dias', modulo: 'agenda' },
      { texto: 'Audiências marcadas', descricao: 'Próximas audiências', modulo: 'agenda' },
    ],
  },
  {
    id: 'financeiro',
    nome: 'Financeiro',
    icone: 'dollar-sign',
    comandos: [
      { texto: 'Quantas horas trabalhei esse mês?', descricao: 'Total de horas registradas', modulo: 'financeiro' },
      { texto: 'Honorários pendentes de pagamento', descricao: 'Valores a receber', modulo: 'financeiro' },
      { texto: 'Faturamento do mês', descricao: 'Resumo financeiro', modulo: 'financeiro' },
    ],
  },
  {
    id: 'crm',
    nome: 'Clientes',
    icone: 'users',
    comandos: [
      { texto: 'Meus clientes ativos', descricao: 'Lista de clientes', modulo: 'crm' },
      { texto: 'Clientes sem interação há 30 dias', descricao: 'Precisam de atenção', modulo: 'crm' },
      { texto: 'Oportunidades abertas', descricao: 'Pipeline de vendas', modulo: 'crm' },
    ],
  },
  {
    id: 'acoes',
    nome: 'Ações',
    icone: 'zap',
    comandos: [
      { texto: 'Criar tarefa para amanhã', descricao: 'Nova tarefa', modulo: 'geral' },
      { texto: 'Registrar horas trabalhadas', descricao: 'Novo timesheet', modulo: 'geral' },
      { texto: 'Criar novo processo', descricao: 'Novo cadastro', modulo: 'geral' },
    ],
  },
]

// Comandos sugeridos padrão (compatibilidade)
export const COMANDOS_SUGERIDOS: ComandoSugestao[] = MENU_SUGESTOES.flatMap(cat => cat.comandos)
