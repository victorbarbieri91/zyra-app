import {
  Briefcase,
  UserCheck,
  Clock,
  FileText,
  ClipboardList,
  Scale,
  FileSignature,
  Search,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react'

// ============================================================
// Tipos de Tarefa — Single Source of Truth
// ============================================================

export type TipoTarefaContencioso = 'prazo_processual' | 'acompanhamento' | 'follow_up' | 'administrativo' | 'outro'
export type TipoTarefaConsultivo = 'cons_parecer' | 'cons_contrato' | 'cons_pesquisa' | 'cons_providencia' | 'cons_outro'
export type TipoTarefaEspecial = 'fixa'
export type TipoTarefa = TipoTarefaContencioso | TipoTarefaConsultivo | TipoTarefaEspecial

export type CategoriaTarefa = 'contencioso' | 'consultivo'

export interface TipoTarefaConfig {
  label: string
  icon: LucideIcon
  color: string // tailwind color name (red, blue, emerald, etc.)
  description: string
  categoria: CategoriaTarefa
}

export interface TipoChipStyle {
  label: string
  bg: string
  text: string
}

// ---- Contencioso (processos) — 5 tipos existentes ----

export const CONTENCIOSO_TIPOS: Record<TipoTarefaContencioso, TipoTarefaConfig> = {
  prazo_processual: {
    label: 'Prazo Processual',
    icon: Briefcase,
    color: 'red',
    description: 'Prazos judiciais',
    categoria: 'contencioso',
  },
  acompanhamento: {
    label: 'Acompanhamento',
    icon: UserCheck,
    color: 'blue',
    description: 'Acompanhamento',
    categoria: 'contencioso',
  },
  follow_up: {
    label: 'Follow-up',
    icon: Clock,
    color: 'emerald',
    description: 'Contato com clientes',
    categoria: 'contencioso',
  },
  administrativo: {
    label: 'Administrativo',
    icon: FileText,
    color: 'purple',
    description: 'Tarefas internas',
    categoria: 'contencioso',
  },
  outro: {
    label: 'Outro',
    icon: ClipboardList,
    color: 'slate',
    description: 'Outras tarefas',
    categoria: 'contencioso',
  },
}

// ---- Consultivo — 5 novos tipos ----

export const CONSULTIVO_TIPOS: Record<TipoTarefaConsultivo, TipoTarefaConfig> = {
  cons_parecer: {
    label: 'Parecer',
    icon: Scale,
    color: 'amber',
    description: 'Elaboração de pareceres',
    categoria: 'consultivo',
  },
  cons_contrato: {
    label: 'Contrato',
    icon: FileSignature,
    color: 'blue',
    description: 'Análise/revisão de contratos',
    categoria: 'consultivo',
  },
  cons_pesquisa: {
    label: 'Pesquisa Jurídica',
    icon: Search,
    color: 'teal',
    description: 'Pesquisa de legislação',
    categoria: 'consultivo',
  },
  cons_providencia: {
    label: 'Providência Interna',
    icon: ClipboardCheck,
    color: 'purple',
    description: 'Providências internas',
    categoria: 'consultivo',
  },
  cons_outro: {
    label: 'Outro',
    icon: ClipboardList,
    color: 'slate',
    description: 'Outras tarefas consultivas',
    categoria: 'consultivo',
  },
}

// ---- Merge de todos os tipos (exceto fixa, que é especial) ----

export const ALL_TIPOS: Record<string, TipoTarefaConfig> = {
  ...CONTENCIOSO_TIPOS,
  ...CONSULTIVO_TIPOS,
}

// ---- Helpers ----

export function getTipoConfig(tipo: string): TipoTarefaConfig | undefined {
  return ALL_TIPOS[tipo]
}

export function getTipoLabel(tipo: string): string {
  if (tipo === 'fixa') return 'Tarefa Fixa'
  if (tipo === 'normal') return 'Tarefa Normal'
  if (tipo === 'recorrente') return 'Tarefa Recorrente'
  return ALL_TIPOS[tipo]?.label || tipo
}

export function getTipoCategoria(tipo: string): CategoriaTarefa | null {
  if (tipo === 'fixa') return null
  return ALL_TIPOS[tipo]?.categoria || null
}

// ---- Chip styles para Kanban, Lista, etc. ----

const COLOR_CHIP_MAP: Record<string, { bg: string; text: string }> = {
  red: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  slate: { bg: 'bg-slate-100 dark:bg-surface-2', text: 'text-slate-500 dark:text-slate-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
}

export function getTipoChipStyle(tipo: string): TipoChipStyle {
  // Fixa tem estilo próprio
  if (tipo === 'fixa') {
    return { label: 'Fixa', bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' }
  }

  const config = ALL_TIPOS[tipo]
  if (!config) {
    return { label: tipo, bg: 'bg-slate-100 dark:bg-surface-2', text: 'text-slate-500 dark:text-slate-400' }
  }

  const chipColors = COLOR_CHIP_MAP[config.color] || COLOR_CHIP_MAP.slate

  // Labels curtos para chips
  const SHORT_LABELS: Record<string, string> = {
    prazo_processual: 'Prazo',
    acompanhamento: 'Acomp.',
    follow_up: 'Follow-up',
    administrativo: 'Admin',
    outro: 'Outro',
    cons_parecer: 'Parecer',
    cons_contrato: 'Contrato',
    cons_pesquisa: 'Pesquisa',
    cons_providencia: 'Provid.',
    cons_outro: 'Outro',
  }

  return {
    label: SHORT_LABELS[tipo] || config.label,
    ...chipColors,
  }
}

// ---- Color classes para seleção no wizard (border, bg, text quando selecionado) ----

const COLOR_SELECTED_MAP: Record<string, string> = {
  red: 'bg-red-50 text-red-600 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/50',
  blue: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/50',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/50',
  purple: 'bg-purple-50 text-purple-600 border-purple-300 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/50',
  slate: 'bg-slate-50 text-slate-600 border-slate-300 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/50',
  amber: 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/50',
  teal: 'bg-teal-50 text-teal-600 border-teal-300 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/50',
}

export function getTipoSelectedClasses(color: string): string {
  return COLOR_SELECTED_MAP[color] || COLOR_SELECTED_MAP.slate
}
