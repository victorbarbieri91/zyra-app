'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tarefa } from '@/hooks/useTarefas'
import KanbanTaskCard from './KanbanTaskCard'
import KanbanAgendaCard, { AgendaCardItem } from './KanbanAgendaCard'

interface KanbanColumnProps {
  titulo: string
  icone: React.ReactNode
  status: 'pendente' | 'em_andamento' | 'em_pausa' | 'concluida'
  tarefas: Tarefa[]
  agendaItems?: AgendaCardItem[]
  corBarra: string
  corIconeBg: string
  onClickTarefa: (tarefa: Tarefa) => void
  onClickAgendaItem?: (item: AgendaCardItem) => void
  onCreateTarefa?: () => void
}

export default function KanbanColumn({
  titulo,
  icone,
  status,
  tarefas,
  agendaItems = [],
  corBarra,
  corIconeBg,
  onClickTarefa,
  onClickAgendaItem,
  onCreateTarefa,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      tipo: 'coluna',
      status: status,
    },
  })

  const totalItems = tarefas.length + agendaItems.length

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Barra colorida fina no topo */}
      <div className={cn('h-1 rounded-t-lg', corBarra)} />

      {/* Header minimalista */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={cn('w-5 h-5 rounded-md flex items-center justify-center', corIconeBg)}>
            {icone}
          </div>
          <span className="font-semibold text-xs text-[#34495e]">{titulo}</span>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
          {totalItems}
        </span>
      </div>

      {/* Lista de Cards - Droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 bg-slate-50/50 overflow-y-auto space-y-2 min-h-[200px]',
          isOver && 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-md'
        )}
      >
        {/* Agenda items (compromissos/audiências) - draggable, aparecem primeiro */}
        {agendaItems.map((item) => (
          <KanbanAgendaCard
            key={item.id}
            item={item}
            onClick={() => onClickAgendaItem?.(item)}
            draggable
          />
        ))}

        {/* Tarefas - draggable */}
        {tarefas.map((tarefa) => (
          <KanbanTaskCard key={tarefa.id} tarefa={tarefa} onClick={() => onClickTarefa(tarefa)} />
        ))}

        {totalItems === 0 && !isOver && (
          <div className="flex items-center justify-center h-24 text-center text-slate-400 text-xs">
            Nenhum item
          </div>
        )}

        {isOver && totalItems === 0 && (
          <div className="flex items-center justify-center h-24 text-center text-blue-500 text-xs font-medium">
            Solte aqui
          </div>
        )}
      </div>

      {/* Footer - Botão Nova Tarefa (só em Pendente) */}
      {status === 'pendente' && onCreateTarefa && (
        <button
          onClick={onCreateTarefa}
          className="px-3 py-2 border-t border-slate-100 text-xs text-[#89bcbe] hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="font-medium">Nova Tarefa</span>
        </button>
      )}
    </div>
  )
}
