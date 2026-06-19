'use client'

import { Calendar, LayoutGrid, List, Users, Scale, Plus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'month' | 'week' | 'day' | 'list'

// Abas de visualização (centro da barra da Agenda) — compartilhadas entre Mês/Kanban/…
const VIEW_TABS: { v: ViewMode; l: string; Icon: LucideIcon; show: string }[] = [
  { v: 'month', l: 'Mês', Icon: Calendar, show: 'hidden md:inline-flex' },
  { v: 'week', l: 'Kanban', Icon: LayoutGrid, show: 'hidden md:inline-flex' },
  { v: 'list', l: 'Lista', Icon: List, show: 'inline-flex' },
]

// Botões de criar (direita da barra) — cores quentes do design
const CREATE_BTNS: { tipo: 'compromisso' | 'audiencia' | 'tarefa'; l: string; Icon: LucideIcon; bg: string }[] = [
  { tipo: 'compromisso', l: 'Compromisso', Icon: Users, bg: 'bg-[#3f7376] hover:bg-[#386668]' },
  { tipo: 'audiencia', l: 'Audiência', Icon: Scale, bg: 'bg-[#a85a3e] hover:bg-[#964f37]' },
  { tipo: 'tarefa', l: 'Nova tarefa', Icon: Plus, bg: 'bg-[#34495e] hover:bg-[#2c3e50]' },
]

export function AgendaViewTabs({
  viewMode,
  onViewModeChange,
  className,
}: {
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 p-[3px] rounded-[11px] bg-[#ece9e2] dark:bg-[#10161f] w-fit', className)}>
      {VIEW_TABS.map((tab) => {
        const on = viewMode === tab.v
        return (
          <button
            key={tab.v}
            onClick={() => onViewModeChange(tab.v)}
            className={cn(
              'items-center gap-2 h-9 px-3.5 rounded-[8px] text-[13px] font-semibold transition-colors',
              tab.show,
              on
                ? 'bg-[#ffffff] dark:bg-teal-300 text-[#34495e] shadow-sm'
                : 'text-[#5a6775] dark:text-[#8a97a8] hover:text-[#34495e] dark:hover:text-slate-300',
            )}
          >
            <tab.Icon className="w-4 h-4" />
            {tab.l}
          </button>
        )
      })}
    </div>
  )
}

export function AgendaCreateButtons({
  onCreate,
  className,
}: {
  onCreate: (tipo: 'compromisso' | 'audiencia' | 'tarefa') => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {CREATE_BTNS.map((c) => (
        <button
          key={c.tipo}
          onClick={() => onCreate(c.tipo)}
          className={cn(
            'h-9 px-3.5 rounded-[10px] text-[13px] font-semibold text-white inline-flex items-center gap-2 shadow-sm whitespace-nowrap transition-[filter] hover:brightness-[1.06]',
            c.bg,
          )}
        >
          <c.Icon className="w-4 h-4" />
          {c.l}
        </button>
      ))}
    </div>
  )
}
