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
  status: 'pendente' | 'em_andamento' | 'concluida'
  tarefas: Tarefa[]
  agendaItems?: AgendaCardItem[]
  corHeader: string
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
  corHeader,
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
      {/* Header */}
      <div className={cn('p-3', corHeader)}>
        <div className="flex items-center gap-2 text-white">
          {icone}
          <span className="font-semibold text-sm">{titulo}</span>
          <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
            {totalItems}
          </span>
        </div>
      </div>

      {/* Lista de Cards - Droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-3 bg-slate-50 overflow-y-auto space-y-3 min-h-[200px]',
          isOver && 'bg-blue-50 border-2 border-dashed border-blue-400 rounded-md'
        )}
      >
        {/* Agenda items (compromissos/audiências) - não-draggable, aparecem primeiro */}
        {agendaItems.map((item) => (
          <KanbanAgendaCard
            key={item.id}
            item={item}
            onClick={() => onClickAgendaItem?.(item)}
          />
        ))}

        {/* Tarefas - draggable */}
        {tarefas.map((tarefa) => (
          <KanbanTaskCard key={tarefa.id} tarefa={tarefa} onClick={() => onClickTarefa(tarefa)} />
        ))}

        {totalItems === 0 && !isOver && (
          <div className="flex items-center justify-center h-32 text-center text-slate-400 text-sm">
            <div>
              <div className="mb-2 text-slate-300">
                {icone}
              </div>
              Nenhum item {titulo.toLowerCase()}
            </div>
          </div>
        )}

        {isOver && totalItems === 0 && (
          <div className="flex items-center justify-center h-32 text-center text-blue-500 text-sm font-medium">
            Solte aqui para mover
          </div>
        )}
      </div>

      {/* Footer - Botão Nova Tarefa (só em Pendente) */}
      {status === 'pendente' && onCreateTarefa && (
        <button
          onClick={onCreateTarefa}
          className="p-3 border-t border-slate-200 text-sm text-[#89bcbe] hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">Nova Tarefa</span>
        </button>
      )}
    </div>
  )
}
