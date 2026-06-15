/**
 * Tipos fechados de andamento do Consultivo (enum `consultivo_andamento_tipo` no banco).
 * Espelha o padrão de `andamento-tipos.ts` (Processos), porém enxuto: consultivo
 * é atuação extrajudicial — não tem audiência nem códigos de tribunal.
 *
 * - CONSULTIVO_ANDAMENTO_TIPOS: rótulo, descrição, cor e ícone de cada tipo.
 * - TIPOS_ANDAMENTO_CONSULTIVO_MANUAL: ordem dos tipos no dropdown do modal.
 */
import {
  FileSearch,
  FileText,
  FileDown,
  Users,
  Phone,
  Search,
  MessagesSquare,
  Handshake,
  Send,
  StickyNote,
  MoreHorizontal,
  FilePlus2,
  CheckCircle2,
  CalendarCheck,
  Paperclip,
  ArrowRightLeft,
  Archive,
  type LucideIcon,
} from 'lucide-react'

// Valores do enum consultivo_andamento_tipo (banco)
export type ConsultivoAndamentoTipo =
  // manuais
  | 'analise'
  | 'parecer'
  | 'documento_recebido'
  | 'reuniao'
  | 'contato_cliente'
  | 'diligencia'
  | 'negociacao'
  | 'acordo'
  | 'notificacao_extrajudicial'
  | 'observacao_interna'
  | 'outro'
  // automáticos (gerados pelo sistema)
  | 'consulta_criada'
  | 'tarefa_concluida'
  | 'compromisso_concluido'
  | 'documento_anexado'
  | 'transformada_processo'
  | 'arquivada'

export interface ConsultivoAndamentoTipoConfig {
  label: string
  descricao?: string
  cor: string
  Icon: LucideIcon
  manual: boolean
}

export const CONSULTIVO_ANDAMENTO_TIPOS: Record<ConsultivoAndamentoTipo, ConsultivoAndamentoTipoConfig> = {
  // ── Manuais ──────────────────────────────────────────────
  analise:                   { label: 'Análise',                   descricao: 'Estudo ou análise técnica do caso',         cor: '#3f7376', Icon: FileSearch,     manual: true },
  parecer:                   { label: 'Parecer',                   descricao: 'Parecer ou minuta entregue',                cor: '#6b9e84', Icon: FileText,       manual: true },
  documento_recebido:        { label: 'Documento recebido',        descricao: 'Documento recebido do cliente ou terceiro', cor: '#8a6438', Icon: FileDown,       manual: true },
  reuniao:                   { label: 'Reunião',                   descricao: 'Reunião com cliente ou interna',            cor: '#6a85a8', Icon: Users,          manual: true },
  contato_cliente:           { label: 'Contato com cliente',       descricao: 'Ligação, e-mail ou mensagem',               cor: '#89bcbe', Icon: Phone,          manual: true },
  diligencia:                { label: 'Diligência',                descricao: 'Diligência ou pesquisa realizada',          cor: '#6a85a8', Icon: Search,         manual: true },
  negociacao:                { label: 'Negociação',                descricao: 'Tratativa ou negociação em andamento',      cor: '#8a6438', Icon: MessagesSquare, manual: true },
  acordo:                    { label: 'Acordo',                    descricao: 'Acordo firmado ou formalizado',             cor: '#6b9e84', Icon: Handshake,      manual: true },
  notificacao_extrajudicial: { label: 'Notificação extrajudicial', descricao: 'Notificação enviada ou recebida',           cor: '#a85a3e', Icon: Send,           manual: true },
  observacao_interna:        { label: 'Observação interna',        descricao: 'Nota interna do escritório',                cor: '#9aa1a8', Icon: StickyNote,     manual: true },
  outro:                     { label: 'Outro',                     descricao: 'Outro andamento',                           cor: '#9aa1a8', Icon: MoreHorizontal, manual: true },
  // ── Automáticos ──────────────────────────────────────────
  consulta_criada:           { label: 'Consulta criada',           cor: '#9aa1a8', Icon: FilePlus2,     manual: false },
  tarefa_concluida:          { label: 'Tarefa concluída',          cor: '#6b9e84', Icon: CheckCircle2,  manual: false },
  compromisso_concluido:     { label: 'Compromisso concluído',     cor: '#6a85a8', Icon: CalendarCheck, manual: false },
  documento_anexado:         { label: 'Documento anexado',         cor: '#8a6438', Icon: Paperclip,     manual: false },
  transformada_processo:     { label: 'Transformada em processo',  cor: '#6a85a8', Icon: ArrowRightLeft, manual: false },
  arquivada:                 { label: 'Arquivada',                 cor: '#9aa1a8', Icon: Archive,       manual: false },
}

// Ordem dos tipos no dropdown do modal (apenas os manuais)
export const TIPOS_ANDAMENTO_CONSULTIVO_MANUAL: ConsultivoAndamentoTipo[] = [
  'analise',
  'parecer',
  'documento_recebido',
  'reuniao',
  'contato_cliente',
  'diligencia',
  'negociacao',
  'acordo',
  'notificacao_extrajudicial',
  'observacao_interna',
  'outro',
]
