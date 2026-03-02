// ============================================
// TIPOS DO CENTRO DE COMANDO
// ============================================

export type FlowType =
  | 'read_simple'
  | 'read_ambiguous'
  | 'create'
  | 'update'
  | 'delete'
  | 'navigate'
  | 'unsupported'
  | 'unknown'

export type TerminationReason =
  | 'final'
  | 'error'
  | 'input_required'
  | 'action_required'
  | 'stream_timeout'
  | 'stream_closed_without_terminal_event'
  | 'tool_repetition_guard_triggered'
  | 'max_iterations_reached'

// Campo solicitado pela IA
export interface CampoNecessario {
  campo: string
  descricao: string
  obrigatorio: boolean
  tipo: 'texto' | 'data' | 'numero' | 'selecao'
  opcoes?: string[]
  valor_padrao?: string | number | null
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
  depois?: any
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

export interface PendingInputOption {
  id: string
  label: string
  description?: string
  value?: string
}

export interface PendingInput {
  id: string
  tipo: 'collection' | 'disambiguation'
  contexto: string
  schema: {
    fields: CampoNecessario[]
    options?: PendingInputOption[]
  }
  status?: 'pendente' | 'respondido' | 'cancelado' | 'expirado'
  run_id?: string
}

// Acao pendente de confirmacao
export interface AcaoPendente {
  id: string
  operation_name?: string
  tipo: 'insert' | 'update' | 'delete' | 'update_em_massa'
  tabela: string
  target_label?: string
  dados?: any
  registro_id?: string
  antes?: any
  depois?: any
  registro?: any
  explicacao: string
  preview_human?: string
  resolved_entities?: Record<string, any>
  validated_payload?: Record<string, any>
  idempotency_key?: string
  requer_dupla_confirmacao?: boolean
  requires_double_confirmation?: boolean
  expires_at?: string
}

// Mensagem do chat
export interface CentroComandoMensagem {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  tool_results?: ToolResult[]
  acoes_pendentes?: AcaoPendente[]
  pending_input?: PendingInput | null
  run_id?: string
  loading?: boolean
  erro?: string
}

// Sessao do Centro de Comando
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
  pending_input?: PendingInput | null
  flow_type?: FlowType
  termination_reason?: TerminationReason
  run_id?: string
  tem_confirmacao_pendente?: boolean
  sessao_id?: string
  tempo_execucao_ms?: number
  erro?: string
}

// Parametros para confirmar acao
export interface ConfirmarAcaoParams {
  acao_id: string
  dupla_confirmacao?: boolean
  dados_adicionais?: Record<string, any>
}

export interface ResponderInputParams {
  pending_input_id: string
  input_values: Record<string, any>
}

export interface CentroComandoExecutionState {
  runId: string | null
  flowType: FlowType
  terminationReason?: TerminationReason
  startedAt: Date
  lastEventAt: Date
  terminal: boolean
}

// Estado do hook
export interface CentroComandoState {
  mensagens: CentroComandoMensagem[]
  sessaoId: string | null
  carregando: boolean
  erro: string | null
  acoesPendentes: AcaoPendente[]
  pendingInput: PendingInput | null
  execution: CentroComandoExecutionState | null
  passos: PassoThinking[]
}

// Passo do "thinking"
export interface PassoThinking {
  id: string
  type: 'thinking' | 'status' | 'tool_start' | 'tool_end' | 'heartbeat' | 'terminal'
  tool?: string
  message: string
  timestamp: Date
  resultado?: any
  concluido?: boolean
}

// Eventos SSE recebidos do streaming
export interface StreamEvent {
  event: 'status' | 'input_required' | 'action_required' | 'final' | 'error' | 'heartbeat'
  data: {
    type?: 'thinking' | 'tool_start' | 'tool_end' | 'terminal'
    tool?: string
    message?: string
    args?: any
    resultado?: any
    flow_type?: FlowType
    run_id?: string
    sessao_id?: string
    pending_input?: PendingInput | null
    acao?: AcaoPendente
    sucesso?: boolean
    resposta?: string
    tool_results?: ToolResult[]
    acoes_pendentes?: AcaoPendente[]
    tem_confirmacao_pendente?: boolean
    termination_reason?: TerminationReason
    tempo_execucao_ms?: number
    erro?: string
  }
}

// Sugestoes de comandos
export interface ComandoSugestao {
  texto: string
  descricao: string
  modulo: 'processos' | 'agenda' | 'financeiro' | 'crm' | 'geral'
}

// Categoria do menu de sugestoes
export interface CategoriaMenu {
  id: string
  nome: string
  icone: string
  comandos: ComandoSugestao[]
}

// Menu de sugestoes organizado por modulos
export const MENU_SUGESTOES: CategoriaMenu[] = [
  {
    id: 'processos',
    nome: 'Processos',
    icone: 'scale',
    comandos: [
      { texto: 'Mostre meus processos ativos', descricao: 'Lista processos em andamento', modulo: 'processos' },
      { texto: 'Processos com prazos essa semana', descricao: 'Prazos proximos de vencer', modulo: 'processos' },
      { texto: 'Movimentacoes recentes', descricao: 'Ultimas atualizacoes', modulo: 'processos' },
    ],
  },
  {
    id: 'agenda',
    nome: 'Agenda',
    icone: 'calendar',
    comandos: [
      { texto: 'Quais tarefas tenho para hoje?', descricao: 'Tarefas do dia', modulo: 'agenda' },
      { texto: 'Meus compromissos da semana', descricao: 'Agenda dos proximos 7 dias', modulo: 'agenda' },
      { texto: 'Audiencias marcadas', descricao: 'Proximas audiencias', modulo: 'agenda' },
    ],
  },
  {
    id: 'financeiro',
    nome: 'Financeiro',
    icone: 'dollar-sign',
    comandos: [
      { texto: 'Quantas horas trabalhei esse mes?', descricao: 'Total de horas registradas', modulo: 'financeiro' },
      { texto: 'Honorarios pendentes de pagamento', descricao: 'Valores a receber', modulo: 'financeiro' },
      { texto: 'Faturamento do mes', descricao: 'Resumo financeiro', modulo: 'financeiro' },
    ],
  },
  {
    id: 'crm',
    nome: 'Clientes',
    icone: 'users',
    comandos: [
      { texto: 'Meus clientes ativos', descricao: 'Lista de clientes', modulo: 'crm' },
      { texto: 'Clientes sem interacao ha 30 dias', descricao: 'Precisam de atencao', modulo: 'crm' },
      { texto: 'Oportunidades abertas', descricao: 'Pipeline de vendas', modulo: 'crm' },
    ],
  },
  {
    id: 'acoes',
    nome: 'Acoes',
    icone: 'zap',
    comandos: [
      { texto: 'Criar tarefa para amanha', descricao: 'Nova tarefa', modulo: 'geral' },
      { texto: 'Registrar horas trabalhadas', descricao: 'Novo timesheet', modulo: 'geral' },
      { texto: 'Criar novo processo', descricao: 'Novo cadastro', modulo: 'geral' },
    ],
  },
]

// Comandos sugeridos padrao
export const COMANDOS_SUGERIDOS: ComandoSugestao[] = MENU_SUGESTOES.flatMap(cat => cat.comandos)
