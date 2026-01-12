'use client'

import { useDroppable } from '@dnd-kit/core'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ListTodo, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tarefa } from '@/hooks/useTarefas'
import KanbanTaskCard from './KanbanTaskCard'

interface DayViewUnscheduledListProps {
  tarefas: Tarefa[]
  onTaskClick: (tarefa: Tarefa) => void
  onTaskComplete?: (tarefaId: string) => void
  className?: string
}

export default function DayViewUnscheduledList({
  tarefas,
  onTaskClick,
  onTaskComplete,
  className,
}: DayViewUnscheduledListProps) {
  // Droppable zone para quando usuário quiser "desagendar" uma tarefa
  const { isOver, setNodeRef } = useDroppable({
    id: 'unscheduled-list',
    data: {
      tipo: 'unscheduled-area',
    },
  })

  // Ordenar por prioridade
  const tarefasOrdenadas = [...tarefas].sort((a, b) => {
    const prioridadeOrdem = { alta: 1, media: 2, baixa: 3 }
    const prioA = prioridadeOrdem[a.prioridade] || 999
    const prioB = prioridadeOrdem[b.prioridade] || 999
    return prioA - prioB
  })

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'h-full',
        isOver && 'ring-2 ring-[#89bcbe] ring-offset-2',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center shadow-sm">
            <ListTodo className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base text-[#34495e]">
              Tarefas do Dia
            </CardTitle>
            <p className="text-xs text-[#6c757d] mt-0.5">
              Arraste para agendar
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {tarefas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm text-[#6c757d] mb-1">
              Nenhuma tarefa sem horário
            </p>
            <p className="text-xs text-slate-400">
              Todas as tarefas estão agendadas
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-2.5 pr-3">
              <p className="text-xs font-medium text-[#46627f] mb-2">
                {tarefas.length} {tarefas.length === 1 ? 'tarefa' : 'tarefas'}
              </p>
              {tarefasOrdenadas.map((tarefa) => (
                <KanbanTaskCard
                  key={tarefa.id}
                  tarefa={tarefa}
                  onClick={() => onTaskClick(tarefa)}
                  onComplete={onTaskComplete ? () => onTaskComplete(tarefa.id) : undefined}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Mensagem de feedback quando está arrastando sobre a área */}
        {isOver && tarefas.length > 0 && (
          <div className="absolute inset-0 bg-[#89bcbe]/5 border-2 border-dashed border-[#89bcbe] rounded-lg flex items-center justify-center pointer-events-none">
            <div className="bg-white px-4 py-2 rounded-md shadow-lg">
              <p className="text-sm font-medium text-[#34495e]">
                Solte para desagendar
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
