// ============================================
// TIPOS DO SISTEMA DE MIGRAÇÃO
// ============================================

export type ModuloMigracao = 'crm' | 'processos' | 'consultivo' | 'agenda' | 'financeiro'

export type StatusJob =
  | 'pendente'
  | 'processando'
  | 'validando'
  | 'aguardando_revisao'
  | 'importando'
  | 'concluido'
  | 'erro'
  | 'cancelado'

export type StepMigracao =
  | 'upload'
  | 'mapeamento'
  | 'validacao'
  | 'revisao'
  | 'confirmacao'
  | 'importando'
  | 'conclusao'

// Job de migração (tabela migracao_jobs)
export interface MigracaoJob {
  id: string
  escritorio_id: string
  modulo: ModuloMigracao
  arquivo_nome: string
  arquivo_storage_path: string
  mapeamento: Record<string, string | null>
  config: Record<string, unknown>
  status: StatusJob
  etapa_atual: string | null
  total_linhas: number
  linhas_processadas: number
  linhas_validas: number
  linhas_com_erro: number
  linhas_duplicadas: number
  linhas_importadas: number
  erros: ErroValidacao[]
  duplicatas: Duplicata[]
  campos_extras: string[]
  resultado_final: ResultadoFinal | null
  correcoes_usuario: Record<string, CorrecaoUsuario>
  iniciado_em: string | null
  concluido_em: string | null
  criado_por: string
  created_at: string
  updated_at: string
}

// Erro de validação em uma linha
export interface ErroValidacao {
  linha: number
  erros: string[]
  dados: Record<string, unknown>
}

// Duplicata encontrada
export interface Duplicata {
  linha: number
  campo: string
  valor: string
  existente: {
    id: string
    nome?: string
    numero?: string
  }
  dados: Record<string, unknown>
}

// Correção feita pelo usuário
export interface CorrecaoUsuario {
  tipo: 'corrigir' | 'remover_campo' | 'pular' | 'atualizar'
  valor?: string
  campo?: string
}

// Resultado final do processamento
export interface ResultadoFinal {
  dados_validados?: DadoValidado[]
  erro?: string
}

export interface DadoValidado {
  linha: number
  dados: Record<string, unknown>
}

// Histórico de migração (tabela migracao_historico)
export interface MigracaoHistorico {
  id: string
  escritorio_id: string
  job_id: string | null
  modulo: ModuloMigracao
  arquivo_nome: string
  total_importados: number
  total_erros: number
  total_duplicatas: number
  detalhes: Record<string, unknown> | null
  executado_por: string
  executado_em: string
}

// Resposta da IA para mapeamento
export interface MapeamentoIA {
  mapeamento: Record<string, string | null>
  confianca: Record<string, number>
  sugestoes: string[]
}

// Schema de campo do módulo
export interface CampoSchema {
  campo: string
  tipo: 'texto' | 'texto_longo' | 'numero' | 'data' | 'data_hora' | 'email' | 'telefone' | 'documento' | 'enum'
  obrigatorio: boolean
  descricao?: string
  valores?: string[]
}

// Estado do wizard de migração
export interface MigracaoState {
  step: StepMigracao
  modulo: ModuloMigracao
  arquivo: File | null
  headers: string[]
  amostra: Record<string, unknown>[]
  totalLinhas: number
  mapeamento: Record<string, string | null>
  confianca: Record<string, number>
  jobId: string | null
  job: MigracaoJob | null
}

// Configuração de módulo para o Hub
export interface ModuloConfig {
  id: ModuloMigracao
  nome: string
  descricao: string
  icone: string
  cor: string
  dependencias: ModuloMigracao[]
}

// Resultado do parse de arquivo
export interface ParseResult {
  headers: string[]
  amostra: Record<string, unknown>[]
  totalLinhas: number
}
