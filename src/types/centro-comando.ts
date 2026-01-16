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
  categoria: 'consulta' | 'criacao' | 'alteracao' | 'navegacao'
  icone?: string
}

// Comandos sugeridos padrão
export const COMANDOS_SUGERIDOS: ComandoSugestao[] = [
  {
    texto: 'Mostre meus processos ativos',
    descricao: 'Lista todos os processos em andamento',
    categoria: 'consulta',
    icone: 'scale',
  },
  {
    texto: 'Quais tarefas tenho para hoje?',
    descricao: 'Tarefas pendentes para o dia',
    categoria: 'consulta',
    icone: 'check-square',
  },
  {
    texto: 'Quantas horas trabalhei esse mês?',
    descricao: 'Total de horas registradas',
    categoria: 'consulta',
    icone: 'clock',
  },
  {
    texto: 'Criar tarefa para amanhã',
    descricao: 'Adiciona uma nova tarefa',
    categoria: 'criacao',
    icone: 'plus',
  },
  {
    texto: 'Processos com prazos essa semana',
    descricao: 'Prazos vencendo nos próximos 7 dias',
    categoria: 'consulta',
    icone: 'alert-triangle',
  },
  {
    texto: 'Clientes sem interação há 30 dias',
    descricao: 'Clientes que precisam de atenção',
    categoria: 'consulta',
    icone: 'users',
  },
]
