/**
 * Tipos fechados de andamento (enum `andamento_tipo` no banco) + classificação
 * dos andamentos do tribunal pelo código CNJ.
 *
 * - ANDAMENTO_TIPOS: rótulo, descrição, cor e ícone de cada tipo do escritório
 *   (manuais + automáticos). É a "fonte da verdade" de apresentação.
 * - TIPOS_ANDAMENTO_MANUAL: ordem dos tipos que aparecem no dropdown do modal.
 * - classificarTribunal(): mapeia o código CNJ (TPU) / descrição para uma
 *   categoria visual do tribunal.
 */
import {
  FileText,
  Phone,
  RefreshCw,
  Scale,
  Gavel,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Handshake,
  Calculator,
  MapPin,
  Users,
  StickyNote,
  Archive,
  MoreHorizontal,
  CheckCircle2,
  Paperclip,
  Bell,
  ArrowRightLeft,
  Landmark,
  CornerUpLeft,
  type LucideIcon,
} from 'lucide-react'

// Valores do enum andamento_tipo (banco)
export type AndamentoTipo =
  // manuais
  | 'relatorio_cliente'
  | 'contato_cliente'
  | 'acompanhamento_processual'
  | 'analise_publicacao'
  | 'peticao_protocolo'
  | 'recurso'
  | 'audiencia'
  | 'acordo'
  | 'calculo'
  | 'diligencia'
  | 'reuniao_interna'
  | 'observacao_interna'
  | 'encerramento'
  | 'outro'
  // automáticos (gerados pelo sistema)
  | 'tarefa_concluida'
  | 'audiencia_realizada'
  | 'compromisso_concluido'
  | 'prazo_cumprido'
  | 'documento_anexado'
  | 'processo_encerrado'

export interface AndamentoTipoConfig {
  label: string
  descricao?: string
  cor: string
  Icon: LucideIcon
  manual: boolean
}

export const ANDAMENTO_TIPOS: Record<AndamentoTipo, AndamentoTipoConfig> = {
  // ── Manuais ──────────────────────────────────────────────
  relatorio_cliente:         { label: 'Relatório para cliente',     descricao: 'Relatório enviado ao cliente',          cor: '#89bcbe', Icon: FileText,        manual: true },
  contato_cliente:           { label: 'Contato com cliente',        descricao: 'Ligação, e-mail ou mensagem',           cor: '#89bcbe', Icon: Phone,           manual: true },
  acompanhamento_processual: { label: 'Acompanhamento processual',  descricao: 'Acompanhamento geral do processo',      cor: '#89bcbe', Icon: RefreshCw,       manual: true },
  analise_publicacao:        { label: 'Análise de publicação/decisão', descricao: 'Análise de intimação ou decisão',    cor: '#6a85a8', Icon: Scale,           manual: true },
  peticao_protocolo:         { label: 'Petição / protocolo',        descricao: 'Peça protocolada nos autos',            cor: '#6b9e84', Icon: FileText,        manual: true },
  recurso:                   { label: 'Recurso',                    descricao: 'Recurso interposto',                    cor: '#a85a3e', Icon: CornerUpLeft,    manual: true },
  audiencia:                 { label: 'Audiência',                  descricao: 'Preparação ou realização',              cor: '#3f7376', Icon: Calendar,        manual: true },
  acordo:                    { label: 'Acordo / negociação',        descricao: 'Proposta ou acordo firmado',            cor: '#6b9e84', Icon: Handshake,       manual: true },
  calculo:                   { label: 'Cálculo / liquidação',       descricao: 'Cálculo ou liquidação de valores',      cor: '#8a6438', Icon: Calculator,      manual: true },
  diligencia:                { label: 'Diligência / correspondente', descricao: 'Diligência externa ou correspondente', cor: '#8a6438', Icon: MapPin,          manual: true },
  reuniao_interna:           { label: 'Reunião interna',            descricao: 'Reunião da equipe',                     cor: '#6a85a8', Icon: Users,           manual: true },
  observacao_interna:        { label: 'Observação interna',         descricao: 'Anotação interna do escritório',        cor: '#9aa1a8', Icon: StickyNote,      manual: true },
  encerramento:              { label: 'Encerramento da pasta',      descricao: 'Encerramento do processo',              cor: '#6b9e84', Icon: Archive,         manual: true },
  outro:                     { label: 'Outro',                      descricao: 'Movimentação diversa',                  cor: '#9aa1a8', Icon: MoreHorizontal,  manual: true },
  // ── Automáticos ──────────────────────────────────────────
  tarefa_concluida:          { label: 'Tarefa concluída',           cor: '#6b9e84', Icon: CheckCircle2,  manual: false },
  audiencia_realizada:       { label: 'Audiência realizada',        cor: '#3f7376', Icon: CalendarCheck, manual: false },
  compromisso_concluido:     { label: 'Compromisso concluído',      cor: '#6a85a8', Icon: CalendarCheck, manual: false },
  prazo_cumprido:            { label: 'Prazo cumprido',             cor: '#6b9e84', Icon: CalendarClock, manual: false },
  documento_anexado:         { label: 'Documento anexado',          cor: '#8a6438', Icon: Paperclip,     manual: false },
  processo_encerrado:        { label: 'Processo encerrado',         cor: '#6b9e84', Icon: Archive,       manual: false },
}

// Ordem dos tipos no dropdown do modal (apenas os manuais)
export const TIPOS_ANDAMENTO_MANUAL: AndamentoTipo[] = [
  'relatorio_cliente',
  'contato_cliente',
  'acompanhamento_processual',
  'analise_publicacao',
  'peticao_protocolo',
  'recurso',
  'audiencia',
  'acordo',
  'calculo',
  'diligencia',
  'reuniao_interna',
  'observacao_interna',
  'encerramento',
  'outro',
]

// ── Tribunal: categorias derivadas do código CNJ (TPU) ──────
export type TribunalCategoria =
  | 'decisao'
  | 'despacho'
  | 'audiencia'
  | 'publicacao'
  | 'peticao'
  | 'juntada'
  | 'tramitacao'
  | 'encerramento'
  | 'recurso'
  | 'outro'

export const TRIBUNAL_CATEGORIAS: Record<TribunalCategoria, { label: string; cor: string; Icon: LucideIcon }> = {
  decisao:      { label: 'Decisão / Sentença',     cor: '#6a85a8', Icon: Gavel },
  despacho:     { label: 'Despacho',               cor: '#6a85a8', Icon: FileText },
  audiencia:    { label: 'Audiência',              cor: '#3f7376', Icon: Calendar },
  publicacao:   { label: 'Publicação / Intimação', cor: '#89bcbe', Icon: Bell },
  peticao:      { label: 'Petição / Manifestação', cor: '#6b9e84', Icon: FileText },
  juntada:      { label: 'Juntada / Documento',    cor: '#8a6438', Icon: Paperclip },
  tramitacao:   { label: 'Tramitação',             cor: '#9aa1a8', Icon: ArrowRightLeft },
  encerramento: { label: 'Encerramento',           cor: '#6b9e84', Icon: Archive },
  recurso:      { label: 'Recurso',                cor: '#a85a3e', Icon: CornerUpLeft },
  outro:        { label: 'Tribunal',               cor: '#6a85a8', Icon: Landmark },
}

// Código CNJ (TPU) → categoria. Cobre os movimentos mais comuns.
const CNJ_CODIGO_CATEGORIA: Record<number, TribunalCategoria> = {
  92: 'publicacao', 1061: 'publicacao', 1051: 'publicacao',
  85: 'peticao',
  60: 'juntada', 581: 'juntada', 106: 'juntada', 985: 'juntada', 67: 'juntada',
  26: 'tramitacao', 51: 'tramitacao', 123: 'tramitacao', 132: 'tramitacao', 11385: 'tramitacao',
  11010: 'despacho', 11383: 'despacho',
  12164: 'decisao', 193: 'decisao', 219: 'decisao', 220: 'decisao',
  12749: 'audiencia', 12751: 'audiencia', 970: 'audiencia',
  848: 'encerramento', 22: 'encerramento', 246: 'encerramento',
}

/** Classifica um andamento do tribunal numa categoria (por código CNJ ou texto). */
export function classificarTribunal(codigoCnj: number | null | undefined, tipoDescricao: string | null | undefined): TribunalCategoria {
  if (codigoCnj && CNJ_CODIGO_CATEGORIA[codigoCnj]) return CNJ_CODIGO_CATEGORIA[codigoCnj]

  const t = (tipoDescricao || '').toLowerCase()
  if (!t) return 'outro'
  if (/(audi[êe]nc)/.test(t)) return 'audiencia'
  if (/(recurso|apelaç|agravo|embargo)/.test(t)) return 'recurso'
  if (/(tr[âa]nsito|baixa|arquiva)/.test(t)) return 'encerramento'
  if (/(public|intima|di[áa]rio|decurso)/.test(t)) return 'publicacao'
  if (/(senten|ac[óo]rd[ãa]o|decis|julgamento)/.test(t)) return 'decisao'
  if (/(despacho|mero expediente|ato ordinat)/.test(t)) return 'despacho'
  if (/(petiç|peticao|manifesta)/.test(t)) return 'peticao'
  if (/(juntada|expedi|documento|mandado|certid|of[íi]cio)/.test(t)) return 'juntada'
  if (/(distribu|conclus|remessa|recebi)/.test(t)) return 'tramitacao'
  return 'outro'
}
