'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { differenceInCalendarDays } from 'date-fns'
import { Tarefa } from '@/hooks/useTarefas'
import KanbanTaskCard from './KanbanTaskCard'
import KanbanAgendaCard, { AgendaCardItem } from './KanbanAgendaCard'

type Status = 'pendente' | 'em_andamento' | 'em_pausa' | 'concluida'

// Cores por status (variant "c" do design) — classes literais (JIT)
const STATUS_STYLE: Record<Status, { pill: string; band: string; dot: string }> = {
  pendente:     { pill: 'bg-[#46627f]', band: 'bg-[#46627f]/[0.07] dark:bg-[#46627f]/[0.16]', dot: 'bg-[#46627f] dark:bg-[#9eb1cc]' },
  em_andamento: { pill: 'bg-[#3f7376]', band: 'bg-[#3f7376]/[0.07] dark:bg-[#3f7376]/[0.16]', dot: 'bg-[#3f7376] dark:bg-[#7fb8ba]' },
  em_pausa:     { pill: 'bg-[#8a6438]', band: 'bg-[#8a6438]/[0.07] dark:bg-[#8a6438]/[0.16]', dot: 'bg-[#8a6438] dark:bg-[#d6a87a]' },
  concluida:    { pill: 'bg-[#3f6a54]', band: 'bg-[#3f6a54]/[0.07] dark:bg-[#3f6a54]/[0.16]', dot: 'bg-[#3f6a54] dark:bg-[#8db8a0]' },
}

interface KanbanColumnProps {
  label: string
  status: Status
  tarefas: Tarefa[]
  agendaItems?: AgendaCardItem[]
  onClickTarefa: (tarefa: Tarefa) => void
  onClickAgendaItem?: (item: AgendaCardItem) => void
  onCreateTarefa?: () => void
}

export default function KanbanColumn({
  label,
  status,
  tarefas,
  agendaItems = [],
  onClickTarefa,
  onClickAgendaItem,
  onCreateTarefa,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { tipo: 'coluna', status } })

  const s = STATUS_STYLE[status]
  const totalItems = tarefas.length + agendaItems.length
  const prazoCount = tarefas.filter(
    (t) => t.prazo_data_limite && differenceInCalendarDays(parseDBDate(t.prazo_data_limite), new Date()) <= 2,
  ).length

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[280px] flex flex-col min-h-0 rounded-[14px] overflow-hidden border transition-colors',
        isOver
          ? 'border-[#89bcbe] bg-[#eef6f6] dark:bg-[#89bcbe]/[0.06]'
          : 'border-[#e6e3da] dark:border-[#253345] bg-[#f6f4ee] dark:bg-[#0f141c]',
      )}
    >
      {/* header (variant c): pílula sólida sobre faixa tingida */}
      <div className={cn('flex items-center justify-between gap-2 px-3.5 py-3 border-b border-[#e6e3da] dark:border-[#253345] flex-shrink-0', s.band)}>
        <span className={cn('inline-flex items-center gap-2 h-7 px-3 rounded-lg text-white text-[12.5px] font-bold', s.pill)}>
          {label}
          <span className="font-mono text-[11px] font-bold bg-white/[0.22] rounded-[7px] min-w-[18px] h-[18px] px-[5px] inline-flex items-center justify-center">
            {totalItems}
          </span>
        </span>
        {prazoCount > 0 && (
          <span
            title={`${prazoCount} com prazo fatal crítico`}
            className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[10.5px] font-bold text-[#a85a3e] dark:text-[#e0a085] bg-[#f9ebe6] dark:bg-[#a85a3e]/[0.18] whitespace-nowrap"
          >
            <Flag className="w-2.5 h-2.5" />
            {prazoCount}
          </span>
        )}
      </div>

      {/* corpo */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-0">
        {totalItems === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 rounded-[11px] border border-dashed border-[#e6e3da] dark:border-[#253345] text-[#9aa1a8] dark:text-[#5a6675]">
            <span className={cn('w-2 h-2 rounded-full opacity-60', s.dot)} />
            <span className="text-[12px]">Nenhum item</span>
          </div>
        ) : (
          <>
            {agendaItems.map((item) => (
              <KanbanAgendaCard key={item.id} item={item} onClick={() => onClickAgendaItem?.(item)} draggable />
            ))}
            {tarefas.map((tarefa) => (
              <KanbanTaskCard key={tarefa.id} tarefa={tarefa} onClick={() => onClickTarefa(tarefa)} />
            ))}
          </>
        )}

        {status === 'pendente' && onCreateTarefa && (
          <button
            onClick={onCreateTarefa}
            className="mt-0.5 py-2 rounded-[10px] border border-dashed border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] hover:border-[#89bcbe] hover:text-[#3f7376] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors flex-shrink-0"
          >
            <Plus className="w-3 h-3" />
            Nova tarefa
          </button>
        )}
      </div>
    </div>
  )
}
