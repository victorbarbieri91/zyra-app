'use client'

import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, DragEndEvent, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { Tarefa, useTarefas } from '@/hooks/useTarefas'
import { useAgendaConsolidada, AgendaItem } from '@/hooks/useAgendaConsolidada'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import DayViewTimeGrid from './DayViewTimeGrid'
import DayViewUnscheduledList from './DayViewUnscheduledList'
import ScheduledTaskCard from './ScheduledTaskCard'

interface CalendarDayViewProps {
  escritorioId?: string
  userId?: string
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onEventClick: (evento: AgendaItem) => void
  onTaskClick: (tarefa: Tarefa) => void
  onTaskComplete?: (tarefaId: string) => void
  className?: string
}

export default function CalendarDayView({
  escritorioId,
  userId,
  selectedDate,
  onDateSelect,
  onEventClick,
  onTaskClick,
  onTaskComplete,
  className,
}: CalendarDayViewProps) {
  const supabase = createClient()
  const { tarefas: todasTarefas, refreshTarefas } = useTarefas(escritorioId)
  const { items: todosEventos } = useAgendaConsolidada(escritorioId)
  const [activeTarefa, setActiveTarefa] = useState<Tarefa | null>(null)

  const previousDay = () => onDateSelect(subDays(selectedDate, 1))
  const nextDay = () => onDateSelect(addDays(selectedDate, 1))
  const goToToday = () => onDateSelect(new Date())

  // Filtrar e categorizar tarefas do dia do usuário logado
  const { tarefasAgendadas, tarefasSemHorario } = useMemo(() => {
    if (!todasTarefas) {
      return {
        tarefasAgendadas: [],
        tarefasSemHorario: [],
      }
    }

    // Filtrar tarefas do dia e do usuário
    const tarefasDoDia = todasTarefas.filter((tarefa) => {
      const tarefaDate = parseDBDate(tarefa.data_inicio)
      if (!isSameDay(tarefaDate, selectedDate)) return false
      if (userId && !tarefa.responsaveis_ids?.includes(userId)) return false
      if (tarefa.status === 'cancelada') return false
      return true
    })

    // Separar por horário planejado
    const agendadas = tarefasDoDia.filter((t) => t.horario_planejado_dia !== null)
    const semHorario = tarefasDoDia.filter((t) => t.horario_planejado_dia === null)

    return {
      tarefasAgendadas: agendadas,
      tarefasSemHorario: semHorario,
    }
  }, [todasTarefas, selectedDate, userId])

  // Filtrar eventos fixos do dia (compromissos e audiências)
  const eventosFixosDoDia = useMemo(() => {
    if (!todosEventos) return []

    return todosEventos.filter((evento) => {
      if (!isSameDay(parseDBDate(evento.data_inicio), selectedDate)) return false
      if (evento.tipo_entidade === 'tarefa') return false // Excluir tarefas
      if (evento.status === 'cancelada' || evento.status === 'cancelado') return false
      return true
    })
  }, [todosEventos, selectedDate])

  // Handler de Drag Start
  const handleDragStart = (event: DragStartEvent) => {
    const tarefaId = event.active.id as string
    const tarefa = todasTarefas?.find((t) => t.id === tarefaId)
    setActiveTarefa(tarefa || null)
  }

  // Handler de Drag End
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTarefa(null)

    if (!over) return

    const tarefaId = active.id as string
    const overData = over.data.current

    try {
      // Caso 1: Soltar em um time slot (agendar tarefa)
      if (overData?.tipo === 'time-slot') {
        const { hora, minuto } = overData as { hora: number; minuto: number }
        const horario = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`

        // Encontrar a tarefa para preservar a duração existente
        const tarefa = todasTarefas?.find((t) => t.id === tarefaId)
        const duracaoAtual = tarefa?.duracao_planejada_minutos || 60 // Default 1h se não tiver

        await supabase
          .from('agenda_tarefas')
          .update({
            horario_planejado_dia: horario,
            duracao_planejada_minutos: duracaoAtual, // Preserva duração existente ou usa default
          })
          .eq('id', tarefaId)

        await refreshTarefas()
        toast.success(`Tarefa agendada para ${horario.slice(0, 5)}`)
      }

      // Caso 2: Soltar na lista de não agendadas (desagendar tarefa)
      else if (overData?.tipo === 'unscheduled-area') {
        await supabase
          .from('agenda_tarefas')
          .update({
            horario_planejado_dia: null,
            duracao_planejada_minutos: null,
          })
          .eq('id', tarefaId)

        await refreshTarefas()
        toast.success('Tarefa desagendada')
      }
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
      toast.error('Erro ao atualizar tarefa')
    }
  }

  // Handler de Resize
  const handleTaskResize = async (tarefaId: string, novaDuracaoMinutos: number) => {
    try {
      await supabase
        .from('agenda_tarefas')
        .update({ duracao_planejada_minutos: novaDuracaoMinutos })
        .eq('id', tarefaId)

      await refreshTarefas()

      const duracaoEmHoras = novaDuracaoMinutos / 60
      const duracaoTexto =
        duracaoEmHoras >= 1
          ? `${duracaoEmHoras.toFixed(duracaoEmHoras % 1 === 0 ? 0 : 1)}h`
          : `${novaDuracaoMinutos}min`

      toast.success(`Duração ajustada para ${duracaoTexto}`)
    } catch (error) {
      console.error('Erro ao atualizar duração:', error)
      toast.error('Erro ao atualizar duração')
    }
  }

  const totalTarefas = tarefasAgendadas.length + tarefasSemHorario.length

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
          {eventosFixosDoDia.length > 0 && (
            <span className="text-sm text-slate-600">
              • {eventosFixosDoDia.length}{' '}
              {eventosFixosDoDia.length === 1 ? 'compromisso' : 'compromissos'}
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

      {/* Layout 2 Colunas */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-[60%_40%] gap-4 h-[calc(100vh-240px)]">
          {/* Coluna Esquerda: Grade Horária */}
          <DayViewTimeGrid
            eventos={eventosFixosDoDia}
            tarefasAgendadas={tarefasAgendadas}
            selectedDate={selectedDate}
            onEventClick={onEventClick}
            onTaskClick={onTaskClick}
            onTaskComplete={onTaskComplete}
            onTaskResize={handleTaskResize}
          />

          {/* Coluna Direita: Lista de Tarefas Sem Horário */}
          <DayViewUnscheduledList
            tarefas={tarefasSemHorario}
            onTaskClick={onTaskClick}
            onTaskComplete={onTaskComplete}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTarefa && (
            <div className="rotate-3">
              <ScheduledTaskCard
                tarefa={activeTarefa}
                onClick={() => {}}
                isResizable={false}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
