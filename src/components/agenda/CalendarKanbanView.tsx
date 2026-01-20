'use client'

import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, DragEndEvent, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ListTodo, PlayCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Tarefa, useTarefas } from '@/hooks/useTarefas'
import KanbanColumn from './KanbanColumn'
import KanbanTaskCard from './KanbanTaskCard'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface CalendarKanbanViewProps {
  escritorioId?: string
  userId?: string
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onClickTarefa: (tarefa: Tarefa) => void
  onCreateTarefa: (status: 'pendente' | 'em_andamento' | 'concluida') => void
  className?: string
}

export default function CalendarKanbanView({
  escritorioId,
  userId,
  selectedDate,
  onDateSelect,
  onClickTarefa,
  onCreateTarefa,
  className,
}: CalendarKanbanViewProps) {
  const supabase = createClient()
  const { tarefas: todasTarefas, refreshTarefas: refetchTarefas } = useTarefas(escritorioId)
  const [activeTarefa, setActiveTarefa] = useState<Tarefa | null>(null)

  const previousDay = () => onDateSelect(subDays(selectedDate, 1))
  const nextDay = () => onDateSelect(addDays(selectedDate, 1))
  const goToToday = () => onDateSelect(new Date())

  // Ordenar por prioridade
  const ordenarPorPrioridade = (tarefas: Tarefa[]) => {
    const ordem = { alta: 1, media: 2, baixa: 3 }
    return tarefas.sort((a, b) => {
      const prioA = ordem[a.prioridade] || 999
      const prioB = ordem[b.prioridade] || 999
      return prioA - prioB
    })
  }

  // Filtrar tarefas do dia selecionado e agrupar por status
  const { pendente, em_andamento, concluida } = useMemo(() => {
    if (!todasTarefas) {
      return {
        pendente: [],
        em_andamento: [],
        concluida: [],
      }
    }

    // Filtrar tarefas do dia e do usuário logado
    const tarefasDoDia = todasTarefas.filter((tarefa) => {
      const tarefaDate = parseDBDate(tarefa.data_inicio)
      // Filtro 1: dia selecionado
      if (!isSameDay(tarefaDate, selectedDate)) return false
      // Filtro 2: apenas tarefas do usuário logado
      if (userId && tarefa.responsavel_id !== userId) return false
      return true
    })

    // Separar por status
    const pendentes = ordenarPorPrioridade(
      tarefasDoDia.filter((t) => t.status === 'pendente')
    )
    const emAndamento = ordenarPorPrioridade(
      tarefasDoDia.filter((t) => t.status === 'em_andamento')
    )
    const concluidas = ordenarPorPrioridade(
      tarefasDoDia.filter((t) => t.status === 'concluida')
    )

    return {
      pendente: pendentes,
      em_andamento: emAndamento,
      concluida: concluidas,
    }
  }, [todasTarefas, selectedDate, userId])

  // Handlers de Drag-and-Drop
  const handleDragStart = (event: DragStartEvent) => {
    const tarefa = todasTarefas?.find((t) => t.id === event.active.id)
    setActiveTarefa(tarefa || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTarefa(null)

    if (!over || active.id === over.id) return

    const tarefaId = active.id as string
    const novoStatus = over.id as string // 'pendente' | 'em_andamento' | 'concluida'

    // Validar status
    if (!['pendente', 'em_andamento', 'concluida'].includes(novoStatus)) {
      return
    }

    try {
      const updateData: any = { status: novoStatus }

      // Se marcar como concluída, registrar data de conclusão
      if (novoStatus === 'concluida') {
        updateData.data_conclusao = new Date().toISOString()
      } else {
        // Se voltar para pendente ou em_andamento, limpar data_conclusao
        updateData.data_conclusao = null
      }

      const { error } = await supabase
        .from('agenda_tarefas')
        .update(updateData)
        .eq('id', tarefaId)

      if (error) throw error

      // Recarregar tarefas
      await refetchTarefas()

      // Feedback visual
      const statusLabels = {
        pendente: 'Pendente',
        em_andamento: 'Em Andamento',
        concluida: 'Concluída',
      }
      toast.success(`Tarefa movida para ${statusLabels[novoStatus as keyof typeof statusLabels]}`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status da tarefa')
    }
  }

  const totalTarefas = pendente.length + em_andamento.length + concluida.length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header de Navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-[#34495e]">
            {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={previousDay}
              className="h-8 w-8 p-0 border-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextDay}
              className="h-8 w-8 p-0 border-slate-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalTarefas > 0 && (
            <span className="text-sm text-slate-600">
              {totalTarefas} {totalTarefas === 1 ? 'tarefa' : 'tarefas'}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9]"
          >
            Hoje
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
          <KanbanColumn
            titulo="Pendente"
            icone={<ListTodo className="w-4 h-4" />}
            status="pendente"
            tarefas={pendente}
            corHeader="bg-gradient-to-r from-[#34495e] to-[#46627f]"
            onClickTarefa={onClickTarefa}
            onCreateTarefa={() => onCreateTarefa('pendente')}
          />

          <KanbanColumn
            titulo="Em Andamento"
            icone={<PlayCircle className="w-4 h-4" />}
            status="em_andamento"
            tarefas={em_andamento}
            corHeader="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0]"
            onClickTarefa={onClickTarefa}
          />

          <KanbanColumn
            titulo="Concluída"
            icone={<CheckCircle2 className="w-4 h-4" />}
            status="concluida"
            tarefas={concluida}
            corHeader="bg-gradient-to-r from-emerald-500 to-emerald-600"
            onClickTarefa={onClickTarefa}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTarefa && (
            <div className="rotate-3">
              <KanbanTaskCard tarefa={activeTarefa} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
