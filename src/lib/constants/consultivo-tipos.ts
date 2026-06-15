/**
 * Tipos fechados de consulta (enum `tipo_consulta` no banco).
 * Rótulo objetivo + descrição (exibida como texto auxiliar no dropdown).
 */
import {
  HelpCircle,
  FileText,
  FileSearch,
  FilePen,
  ShieldCheck,
  Scale,
  Send,
  Handshake,
  Repeat,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'

// Valores do enum tipo_consulta (banco)
export type TipoConsulta =
  | 'consulta_simples'
  | 'parecer_tecnico'
  | 'analise_contratual'
  | 'elaboracao_contrato'
  | 'due_diligence'
  | 'opiniao_legal'
  | 'notificacao_extrajudicial'
  | 'acordo'
  | 'assessoria_recorrente'
  | 'outro'

export interface TipoConsultaConfig {
  label: string
  descricao: string
  cor: string
  Icon: LucideIcon
}

export const TIPOS_CONSULTA: Record<TipoConsulta, TipoConsultaConfig> = {
  consulta_simples:          { label: 'Consulta simples',          descricao: 'Dúvida pontual, resposta rápida',                cor: '#89bcbe', Icon: HelpCircle },
  parecer_tecnico:           { label: 'Parecer técnico',           descricao: 'Estudo aprofundado com conclusão fundamentada',  cor: '#3f7376', Icon: FileText },
  analise_contratual:        { label: 'Análise contratual',        descricao: 'Revisão de contrato ou minuta existente',        cor: '#6a85a8', Icon: FileSearch },
  elaboracao_contrato:       { label: 'Elaboração de contrato',    descricao: 'Redação de novo contrato ou minuta',             cor: '#6b9e84', Icon: FilePen },
  due_diligence:             { label: 'Due diligence',             descricao: 'Auditoria jurídica preventiva',                  cor: '#8a6438', Icon: ShieldCheck },
  opiniao_legal:             { label: 'Opinião legal',             descricao: 'Posicionamento sobre questão específica',        cor: '#6a85a8', Icon: Scale },
  notificacao_extrajudicial: { label: 'Notificação extrajudicial', descricao: 'Elaboração e envio de notificação',              cor: '#a85a3e', Icon: Send },
  acordo:                    { label: 'Acordo',                    descricao: 'Negociação e formalização de acordo',            cor: '#6b9e84', Icon: Handshake },
  assessoria_recorrente:     { label: 'Assessoria recorrente',     descricao: 'Acompanhamento jurídico contínuo',               cor: '#46627f', Icon: Repeat },
  outro:                     { label: 'Outro',                     descricao: 'Não se enquadra nas demais',                     cor: '#9aa1a8', Icon: MoreHorizontal },
}

// Ordem dos tipos no dropdown
export const TIPOS_CONSULTA_LISTA: TipoConsulta[] = [
  'consulta_simples',
  'parecer_tecnico',
  'analise_contratual',
  'elaboracao_contrato',
  'due_diligence',
  'opiniao_legal',
  'notificacao_extrajudicial',
  'acordo',
  'assessoria_recorrente',
  'outro',
]
