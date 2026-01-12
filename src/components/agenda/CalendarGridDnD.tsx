'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isWeekend,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventCardProps } from './EventCard'
import AgendaFiltersCompact, { EventFiltersState } from './AgendaFiltersCompact'
import CalendarEventMiniCard from './CalendarEventMiniCard'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import ConfirmDateChangeModal from './ConfirmDateChangeModal'

interface CalendarGridDnDProps {
  eventos?: EventCardProps[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onEventMove?: (eventId: string, newDate: Date) => Promise<void>
  onEventClick?: (event: EventCardProps) => void
  feriados?: Date[]
  filters?: EventFiltersState
  onFiltersChange?: (filters: EventFiltersState) => void
  className?: string
}

// Draggable Event Component
function DraggableEvent({
  evento,
  onClick
}: {
  evento: EventCardProps
  onClick?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: evento.id,
    data: evento
  })

  const style = transform ? {
    transform: CSS.Transform.toString(transform),
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-0"
      )}
      onClick={(e) => {
        e?.stopPropagation()
        onClick?.()
      }}
    >
      <CalendarEventMiniCard
        id={evento.id}
        titulo={evento.titulo}
        tipo={evento.tipo}
        data_inicio={evento.data_inicio}
        dia_inteiro={evento.dia_inteiro}
        status={evento.status}
        recorrencia_id={evento.recorrencia_id}
      />
    </div>
  )
}

// Droppable Day Component
function DroppableDay({
  day,
  isCurrentMonth,
  isSelected,
  isTodayDate,
  isFeriadoDay,
  isWeekendDay,
  children,
  onDateSelect
}: {
  day: Date
  isCurrentMonth: boolean
  isSelected: boolean
  isTodayDate: boolean
  isFeriadoDay: boolean
  isWeekendDay: boolean
  children: React.ReactNode
  onDateSelect?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(day, 'yyyy-MM-dd'),
    data: { date: day }
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onDateSelect}
      className={cn(
        'min-h-[140px] p-2 rounded-lg border transition-all cursor-pointer group',
        'hover:border-[#89bcbe] hover:shadow-sm',
        !isCurrentMonth && 'bg-slate-50/50',
        isCurrentMonth && 'bg-white',
        isSelected && 'border-[#89bcbe] bg-[#f0f9f9]/30',
        !isSelected && 'border-slate-200',
        isFeriadoDay && 'bg-purple-50/30',
        isWeekendDay && !isFeriadoDay && 'bg-slate-50',
        isOver && 'ring-2 ring-[#89bcbe] ring-offset-1 bg-[#f0f9f9]/50'
      )}
    >
      {children}
    </div>
  )
}

export default function CalendarGridDnD({
  eventos = [],
  selectedDate,
  onDateSelect,
  onEventMove,
  onEventClick,
  feriados = [],
  filters,
  onFiltersChange,
  className,
}: CalendarGridDnDProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<{
    eventId: string
    eventData: EventCardProps
    newDate: Date
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDate = startOfWeek(monthStart, { locale: ptBR })
  const endDate = endOfWeek(monthEnd, { locale: ptBR })

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  const getEventosForDay = (day: Date) => {
    return eventos.filter((evento) => isSameDay(new Date(evento.data_inicio), day))
  }

  const isFeriado = (day: Date) => {
    return feriados.some((feriado) => isSameDay(feriado, day))
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id && onEventMove) {
      const eventData = active.data.current as EventCardProps
      const dropData = over.data.current as { date: Date }

      if (dropData?.date) {
        // Armazenar dados do movimento pendente e abrir modal de confirmação
        setPendingMove({
          eventId: active.id as string,
          eventData: eventData,
          newDate: dropData.date,
        })
      }
    }
  }

  const handleConfirmMove = async (newTime?: string) => {
    if (!pendingMove || !onEventMove) return

    try {
      let finalDate = pendingMove.newDate

      // Se foi fornecido novo horário, ajustar a data
      if (newTime) {
        const [hours, minutes] = newTime.split(':').map(Number)
        finalDate = new Date(pendingMove.newDate)
        finalDate.setHours(hours, minutes, 0, 0)
      }

      await onEventMove(pendingMove.eventId, finalDate)
      toast.success(`Evento movido para ${format(pendingMove.newDate, 'd \'de\' MMMM', { locale: ptBR })}`)
      setPendingMove(null)
    } catch (error) {
      toast.error('Erro ao mover evento')
      console.error('Erro ao mover evento:', error)
      setPendingMove(null)
    }
  }

  const activeEvento = eventos.find(e => e.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('space-y-4', className)}>
        {/* Header do Calendário */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-[#34495e] capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={previousMonth}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtros */}
            {filters && onFiltersChange && (
              <AgendaFiltersCompact
                filters={filters}
                onFiltersChange={onFiltersChange}
                responsaveisDisponiveis={[]}
              />
            )}

            {/* Botão Hoje */}
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

        {/* Grid do Calendário */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-4">
            {/* Cabeçalho - Dias da Semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-[#46627f] py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid de Dias */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isTodayDate = isToday(day)
                const eventosDay = getEventosForDay(day)
                const hasEventos = eventosDay.length > 0
                const isFeriadoDay = isFeriado(day)
                const isWeekendDay = isWeekend(day)

                return (
                  <DroppableDay
                    key={i}
                    day={day}
                    isCurrentMonth={isCurrentMonth}
                    isSelected={!!isSelected}
                    isTodayDate={isTodayDate}
                    isFeriadoDay={isFeriadoDay}
                    isWeekendDay={isWeekendDay}
                    onDateSelect={() => onDateSelect?.(day)}
                  >
                    {/* Cabeçalho do Dia */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          !isCurrentMonth && 'text-slate-400',
                          isCurrentMonth && !isTodayDate && 'text-[#34495e]',
                          isTodayDate && 'text-white',
                          isFeriadoDay && isCurrentMonth && !isTodayDate && 'text-purple-600'
                        )}
                      >
                        {isTodayDate && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] text-white text-xs font-bold">
                            {format(day, 'd')}
                          </span>
                        )}
                        {!isTodayDate && format(day, 'd')}
                      </span>

                      {/* Indicador de quantidade de eventos */}
                      {hasEventos && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#89bcbe] text-white text-[10px] font-bold">
                          {eventosDay.length}
                        </span>
                      )}
                    </div>

                    {/* Lista de eventos do dia com drag and drop */}
                    <div className="space-y-1">
                      {eventosDay.slice(0, 3).map((evento) => (
                        <DraggableEvent
                          key={evento.id}
                          evento={evento}
                          onClick={() => onEventClick?.(evento)}
                        />
                      ))}
                      {eventosDay.length > 3 && (
                        <div className="text-center py-0.5">
                          <span
                            className="text-[10px] font-medium text-[#89bcbe] hover:text-[#6ba9ab] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDateSelect?.(day)
                            }}
                          >
                            +{eventosDay.length - 3} mais
                          </span>
                        </div>
                      )}
                    </div>
                  </DroppableDay>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Legenda */}
        <div className="flex items-center gap-4 text-xs text-[#6c757d]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab]" />
            <span>Hoje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-50 border border-purple-200" />
            <span>Feriado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />
            <span>Fim de semana</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Move className="w-3 h-3 text-slate-400" />
            <span>Arraste eventos para outras datas</span>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeEvento ? (
          <div className="rotate-3 scale-105 shadow-2xl" style={{ cursor: 'grabbing' }}>
            <CalendarEventMiniCard
              id={activeEvento.id}
              titulo={activeEvento.titulo}
              tipo={activeEvento.tipo}
              data_inicio={activeEvento.data_inicio}
              dia_inteiro={activeEvento.dia_inteiro}
              status={activeEvento.status}
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* Modal de Confirmação */}
      {pendingMove && (
        <ConfirmDateChangeModal
          open={!!pendingMove}
          onOpenChange={(open) => {
            if (!open) setPendingMove(null)
          }}
          onConfirm={handleConfirmMove}
          eventTitle={pendingMove.eventData.titulo}
          eventType={pendingMove.eventData.tipo}
          oldDate={pendingMove.eventData.data_inicio}
          newDate={pendingMove.newDate}
        />
      )}
    </DndContext>
  )
}