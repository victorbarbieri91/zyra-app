'use client'

import { Filter, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface EventFiltersState {
  tipos: {
    compromisso: boolean
    audiencia: boolean
    prazo: boolean
    tarefa: boolean
  }
  status: {
    agendado: boolean
    realizado: boolean
    cancelado: boolean
  }
  responsaveis: string[]
}

interface AgendaFiltersCompactProps {
  filters: EventFiltersState
  onFiltersChange: (filters: EventFiltersState) => void
  responsaveisDisponiveis?: Array<{ id: string; nome: string }>
  className?: string
}

// Tipos com cor representativa (paleta V4)
const tipoItems = [
  { key: 'tarefa' as const, label: 'Tarefas', dot: '#34557f' },
  { key: 'audiencia' as const, label: 'Audiências', dot: '#a85a3e' },
  { key: 'compromisso' as const, label: 'Compromissos', dot: '#3f7376' },
]

const statusItems = [
  {
    filterKey: 'agendado' as const,
    label: 'Pendentes',
    dot: '#89bcbe',
    onCls: 'border-[#89bcbe] bg-[#eef6f6] dark:bg-[#89bcbe]/[0.14] text-[#34495e] dark:text-[#d8e2ef]',
  },
  {
    filterKey: 'realizado' as const,
    label: 'Concluídas',
    dot: '#6b9e84',
    onCls: 'border-[#6b9e84] bg-[#eef6f1] dark:bg-[#3f6a54]/[0.20] text-[#3f6a54] dark:text-[#9fcbb3]',
  },
]

export default function AgendaFiltersCompact({
  filters,
  onFiltersChange,
  className,
}: AgendaFiltersCompactProps) {
  const toggleTipo = (tipo: 'tarefa' | 'audiencia' | 'compromisso') => {
    onFiltersChange({
      ...filters,
      tipos: {
        ...filters.tipos,
        [tipo]: !filters.tipos[tipo],
        prazo: true, // Prazos sempre visíveis
      },
    })
  }

  const toggleStatus = (filterKey: 'agendado' | 'realizado') => {
    onFiltersChange({
      ...filters,
      status: {
        ...filters.status,
        [filterKey]: !filters.status[filterKey],
        cancelado: false, // Cancelados sempre ocultos
      },
    })
  }

  const tiposAtivos = [filters.tipos.tarefa, filters.tipos.audiencia, filters.tipos.compromisso].filter(Boolean).length
  const todosAtivos = tiposAtivos === 3

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Tipo (dropdown) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] border text-[12px] font-semibold transition-colors',
              !todosAtivos
                ? 'border-[#89bcbe] text-[#34495e] dark:text-[#d8e2ef] bg-[#eef6f6] dark:bg-[#89bcbe]/[0.12]'
                : 'border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] hover:border-[#89bcbe]',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Tipo
            {!todosAtivos && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#89bcbe] text-white text-[9.5px] font-bold font-mono">
                {tiposAtivos}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 p-1.5 rounded-xl border border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b]"
        >
          {tipoItems.map((item) => {
            const isActive = filters.tipos[item.key]
            return (
              <button
                key={item.key}
                onClick={() => toggleTipo(item.key)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'text-[#34495e] dark:text-[#d8e2ef] bg-[#f4f1e8] dark:bg-[#1d2a3c]'
                    : 'text-[#9aa1a8] dark:text-[#5a6675] hover:bg-[#faf8f2] dark:hover:bg-[#1a212c]',
                )}
              >
                <span className={cn('w-3 h-3 rounded-full shrink-0', !isActive && 'opacity-40')} style={{ background: item.dot }} />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-[#89bcbe]" />}
              </button>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status — dois toggles INDEPENDENTES (ambos podem ficar ativos juntos) */}
      <div className="flex items-center gap-2">
        {statusItems.map((s) => {
          const on = filters.status[s.filterKey]
          return (
            <button
              key={s.filterKey}
              onClick={() => toggleStatus(s.filterKey)}
              title={on ? `Ocultar ${s.label.toLowerCase()}` : `Mostrar ${s.label.toLowerCase()}`}
              className={cn(
                'inline-flex items-center gap-2 h-8 px-3 rounded-[9px] border text-[12px] font-semibold transition-colors',
                on
                  ? s.onCls
                  : 'border-[#e6e3da] dark:border-[#253345] text-[#9aa1a8] dark:text-[#5a6675] hover:border-[#89bcbe] hover:text-[#5a6775]',
              )}
            >
              <span className="w-2 h-2 rounded-full transition-opacity" style={{ background: s.dot, opacity: on ? 1 : 0.35 }} />
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
