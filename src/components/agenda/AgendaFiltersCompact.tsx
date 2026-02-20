'use client'

import { Filter, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

// Configuração dos tipos com cores correspondentes aos CalendarEventMiniCard
const tipoItems = [
  {
    key: 'tarefa' as const,
    label: 'Tarefas',
    dotClasses: 'bg-gradient-to-r from-[#34495e] to-[#46627f]',
    activeBg: 'bg-slate-50',
  },
  {
    key: 'audiencia' as const,
    label: 'Audiências',
    dotClasses: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    activeBg: 'bg-emerald-50/50',
  },
  {
    key: 'compromisso' as const,
    label: 'Compromissos',
    dotClasses: 'bg-gradient-to-r from-[#89bcbe] to-[#aacfd0]',
    activeBg: 'bg-[#f0f9f9]',
  },
]

// Chips de status com cores mais vibrantes
const statusChips = [
  {
    key: 'pendente' as const,
    label: 'Pendente',
    filterKey: 'agendado' as const,
    activeClasses: 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm',
    inactiveClasses: 'bg-white text-slate-400 border-slate-200 hover:border-amber-200 hover:text-amber-600',
  },
  {
    key: 'concluido' as const,
    label: 'Concluído',
    filterKey: 'realizado' as const,
    activeClasses: 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-sm',
    inactiveClasses: 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-600',
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

  // Contar quantos tipos estão ativos (de 3 possíveis)
  const tiposAtivos = [filters.tipos.tarefa, filters.tipos.audiencia, filters.tipos.compromisso].filter(Boolean).length
  const todosAtivos = tiposAtivos === 3

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Dropdown de Tipo */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 px-3 text-[11px] font-medium border gap-1.5 transition-all duration-200',
              !todosAtivos
                ? 'border-[#89bcbe] bg-[#f0f9f9]/50 text-[#34495e]'
                : 'border-slate-200 text-[#46627f] hover:border-slate-300'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Tipo</span>
            {!todosAtivos && (
              <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#89bcbe] text-white text-[9px] font-bold">
                {tiposAtivos}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 p-1.5">
          {tipoItems.map((item) => {
            const isActive = filters.tipos[item.key]
            return (
              <button
                key={item.key}
                onClick={() => toggleTipo(item.key)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm transition-colors duration-150 cursor-pointer',
                  isActive
                    ? `${item.activeBg} text-[#34495e]`
                    : 'text-slate-400 hover:bg-slate-50'
                )}
              >
                {/* Bolinha colorida */}
                <div className={cn(
                  'w-3 h-3 rounded-full shrink-0',
                  item.dotClasses,
                  !isActive && 'opacity-40'
                )} />
                {/* Label */}
                <span className={cn(
                  'flex-1 text-left text-[12px] font-medium',
                  isActive ? 'text-[#34495e]' : 'text-slate-400'
                )}>
                  {item.label}
                </span>
                {/* Check */}
                {isActive && (
                  <Check className="w-3.5 h-3.5 text-[#89bcbe]" />
                )}
              </button>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Separador */}
      <div className="w-px h-5 bg-slate-200" />

      {/* Chips de Status */}
      <div className="flex items-center gap-1.5">
        {statusChips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => toggleStatus(chip.filterKey)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200 cursor-pointer select-none',
              filters.status[chip.filterKey] ? chip.activeClasses : chip.inactiveClasses
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
