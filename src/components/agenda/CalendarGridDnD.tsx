'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Move, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
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
  addWeeks,
  subWeeks,
  isWeekend,
  isBefore,
  startOfDay,
  isAfter,
  differenceInDays,
  addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventCardProps } from './EventCard'
import AgendaFiltersCompact, { EventFiltersState } from './AgendaFiltersCompact'
import CalendarEventMiniCard from './CalendarEventMiniCard'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CalendarGridDnDProps {
  eventos?: EventCardProps[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onEventMove?: (eventId: string, newDate: Date) => Promise<void>
  onEventMoveWithPrazoFatal?: (eventId: string, newDate: Date, newPrazoFatal: Date) => Promise<void>
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
        prazo_data_limite={evento.prazo_data_limite}
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
  isWeekView,
  children,
  onDateSelect
}: {
  day: Date
  isCurrentMonth: boolean
  isSelected: boolean
  isTodayDate: boolean
  isFeriadoDay: boolean
  isWeekendDay: boolean
  isWeekView?: boolean
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
        'p-2 rounded-lg border transition-all cursor-pointer group overflow-y-auto',
        'hover:border-[#89bcbe] hover:shadow-sm',
        !isWeekView && 'min-h-[110px]',
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
  onEventMoveWithPrazoFatal,
  onEventClick,
  feriados = [],
  filters,
  onFiltersChange,
  className,
}: CalendarGridDnDProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Transição suave entre mês e semana
  const switchView = useCallback((newView: 'month' | 'week') => {
    if (newView === calendarView) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCalendarView(newView)
      setTimeout(() => setIsTransitioning(false), 50)
    }, 200)
  }, [calendarView])
  const [pendingMove, setPendingMove] = useState<{
    eventId: string
    eventData: EventCardProps
    newDate: Date
  } | null>(null)

  // Estado para o modal de aviso de prazo fatal
  const [prazoFatalWarningOpen, setPrazoFatalWarningOpen] = useState(false)
  const [pendingMoveWithPrazo, setPendingMoveWithPrazo] = useState<{
    eventId: string
    eventData: EventCardProps
    newDate: Date
    prazoFatal: Date
    distanciaOriginal: number
  } | null>(null)
  const [novoPrazoFatalSelecionado, setNovoPrazoFatalSelecionado] = useState<Date | null>(null)
  const [prazoFatalCalendarOpen, setPrazoFatalCalendarOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // === Cálculo de dias (mês e semana) ===
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthGridStart = startOfWeek(monthStart, { locale: ptBR })
  const monthGridEnd = endOfWeek(monthEnd, { locale: ptBR })
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd })

  const weekStart = startOfWeek(currentDate, { locale: ptBR })
  const weekEnd = endOfWeek(currentDate, { locale: ptBR })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const days = calendarView === 'month' ? monthDays : weekDays
  const isWeekView = calendarView === 'week'

  // === Navegação ===
  const navigateBack = () => {
    if (calendarView === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const navigateForward = () => {
    if (calendarView === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  // === Título dinâmico ===
  const headerTitle = calendarView === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
    : `${format(weekStart, 'd', { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`

  // Máximo de eventos visíveis por cell
  const maxVisibleEvents = isWeekView ? 15 : 3

  // Prioridade de exibição por tipo: audiência > compromisso > prazo > tarefa
  const tipoPrioridade: Record<string, number> = {
    audiencia: 0,
    compromisso: 1,
    prazo: 2,
    tarefa: 3,
  }

  const prioridadeTarefa: Record<string, number> = {
    alta: 0,
    media: 1,
    baixa: 2,
  }

  // Helper para verificar se item está concluído
  const isItemConcluido = (evento: EventCardProps): boolean =>
    ['concluida', 'concluido', 'realizada', 'realizado'].includes(evento.status || '')

  // Helper para verificar urgência do prazo fatal
  const getUrgenciaPrazoFatal = (evento: EventCardProps): number => {
    if (evento.tipo !== 'tarefa' && evento.tipo !== 'prazo') return 99
    if (!evento.prazo_data_limite) return 99

    const prazoDate = evento.prazo_data_limite instanceof Date
      ? evento.prazo_data_limite
      : new Date(evento.prazo_data_limite.toString().split('T')[0].replace(/-/g, '/'))
    const hoje = startOfDay(new Date())

    if (isBefore(prazoDate, hoje)) return 0
    if (isToday(prazoDate)) return 1
    return 99
  }

  const getEventosForDay = (day: Date) => {
    return eventos
      .filter((evento) => isSameDay(parseDBDate(evento.data_inicio), day))
      .sort((a, b) => {
        // 1. Concluídos vão por último
        const concA = isItemConcluido(a) ? 1 : 0
        const concB = isItemConcluido(b) ? 1 : 0
        if (concA !== concB) return concA - concB

        // 2. Urgência do prazo fatal (vencido/hoje primeiro)
        const urgenciaA = getUrgenciaPrazoFatal(a)
        const urgenciaB = getUrgenciaPrazoFatal(b)
        if (urgenciaA !== urgenciaB) return urgenciaA - urgenciaB

        // 3. Tipo (audiência → compromisso → prazo → tarefa)
        const tipoA = tipoPrioridade[a.tipo] ?? 99
        const tipoB = tipoPrioridade[b.tipo] ?? 99
        if (tipoA !== tipoB) return tipoA - tipoB

        // 4. Prioridade da tarefa (alta → média → baixa)
        const prioA = prioridadeTarefa[a.prioridade || ''] ?? 3
        const prioB = prioridadeTarefa[b.prioridade || ''] ?? 3
        if (prioA !== prioB) return prioA - prioB

        // 5. Horário
        const dataA = parseDBDate(a.data_inicio)
        const dataB = parseDBDate(b.data_inicio)
        return dataA.getTime() - dataB.getTime()
      })
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
        // Tarefas fixas não podem ser movidas
        if (eventData.subtipo === 'fixa') {
          return
        }

        // Verificar se é tarefa com prazo fatal e se ultrapassa
        const isTarefaComPrazoFatal = eventData.tipo === 'tarefa' && eventData.prazo_data_limite

        if (isTarefaComPrazoFatal) {
          const prazoFatal = eventData.prazo_data_limite instanceof Date
            ? eventData.prazo_data_limite
            : new Date(eventData.prazo_data_limite!.toString().split('T')[0].replace(/-/g, '/'))

          const novaDataSemHora = startOfDay(dropData.date)
          const prazoFatalSemHora = startOfDay(prazoFatal)

          if (isAfter(novaDataSemHora, prazoFatalSemHora)) {
            const dataInicioAtual = eventData.data_inicio instanceof Date
              ? eventData.data_inicio
              : new Date(eventData.data_inicio)
            const distancia = differenceInDays(prazoFatalSemHora, startOfDay(dataInicioAtual))

            const novoPrazoSugerido = addDays(dropData.date, Math.max(distancia, 0))
            setPendingMoveWithPrazo({
              eventId: active.id as string,
              eventData: eventData,
              newDate: dropData.date,
              prazoFatal: prazoFatal,
              distanciaOriginal: Math.max(distancia, 0)
            })
            setNovoPrazoFatalSelecionado(novoPrazoSugerido)
            setPrazoFatalWarningOpen(true)
            return
          }
        }

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

  const handleConfirmMoveWithPrazo = async () => {
    if (!pendingMoveWithPrazo || !onEventMoveWithPrazoFatal || !novoPrazoFatalSelecionado) return

    try {
      const originalDate = pendingMoveWithPrazo.eventData.data_inicio instanceof Date
        ? pendingMoveWithPrazo.eventData.data_inicio
        : new Date(pendingMoveWithPrazo.eventData.data_inicio)

      let finalDate = new Date(pendingMoveWithPrazo.newDate)
      finalDate.setHours(originalDate.getHours())
      finalDate.setMinutes(originalDate.getMinutes())
      finalDate.setSeconds(originalDate.getSeconds())

      await onEventMoveWithPrazoFatal(pendingMoveWithPrazo.eventId, finalDate, novoPrazoFatalSelecionado)
      toast.success('Tarefa e prazo fatal reagendados!')

      setPendingMoveWithPrazo(null)
      setNovoPrazoFatalSelecionado(null)
      setPrazoFatalWarningOpen(false)
    } catch (error) {
      toast.error('Erro ao mover tarefa')
      console.error('Erro ao mover tarefa:', error)
      setPendingMoveWithPrazo(null)
      setNovoPrazoFatalSelecionado(null)
      setPrazoFatalWarningOpen(false)
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
              {headerTitle}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={navigateBack}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateForward}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Toggle Mês / Semana */}
            <div className="relative flex items-center bg-slate-100 rounded-full p-0.5 h-8">
              <div
                className={cn(
                  'absolute top-0.5 h-7 rounded-full bg-white shadow-sm transition-all duration-300 ease-in-out',
                  calendarView === 'month'
                    ? 'left-0.5 w-[48px]'
                    : 'left-[50px] w-[64px]'
                )}
              />
              <button
                onClick={() => switchView('month')}
                className={cn(
                  'relative z-10 w-[48px] py-1 text-xs font-medium rounded-full transition-colors duration-200 text-center',
                  calendarView === 'month' ? 'text-[#34495e]' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                Mês
              </button>
              <button
                onClick={() => switchView('week')}
                className={cn(
                  'relative z-10 w-[64px] py-1 text-xs font-medium rounded-full transition-colors duration-200 text-center',
                  calendarView === 'week' ? 'text-[#34495e]' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                Semana
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3">
            {filters && onFiltersChange && (
              <AgendaFiltersCompact
                filters={filters}
                onFiltersChange={onFiltersChange}
              />
            )}
          </div>
        </div>

        {/* Grid do Calendário */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-4">
            {/* Cabeçalho - Dias da Semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {isWeekView
                ? weekDays.map((day) => (
                    <div key={day.toISOString()} className="text-center py-2">
                      <div className="text-[10px] font-medium text-[#46627f] uppercase">
                        {format(day, 'EEE', { locale: ptBR })}
                      </div>
                      <div className={cn(
                        'text-sm font-semibold mt-0.5',
                        isToday(day) ? 'text-[#89bcbe]' : 'text-[#34495e]'
                      )}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))
                : ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-semibold text-[#46627f] py-2"
                    >
                      {day}
                    </div>
                  ))
              }
            </div>

            {/* Grid de Dias */}
            <div className={cn(
              'grid grid-cols-7 gap-2 min-h-[700px]',
              'transition-[opacity,transform] duration-300 ease-in-out',
              isWeekView && 'grid-rows-1',
              isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
            )}>
              {days.map((day, i) => {
                const isCurrentMonth = isWeekView ? true : isSameMonth(day, currentDate)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isTodayDate = isToday(day)
                const eventosDay = getEventosForDay(day)
                const hasEventos = eventosDay.length > 0
                const isFeriadoDay = isFeriado(day)
                const isWeekendDay = isWeekend(day)

                return (
                  <DroppableDay
                    key={format(day, 'yyyy-MM-dd')}
                    day={day}
                    isCurrentMonth={isCurrentMonth}
                    isSelected={!!isSelected}
                    isTodayDate={isTodayDate}
                    isFeriadoDay={isFeriadoDay}
                    isWeekendDay={isWeekendDay}
                    isWeekView={isWeekView}
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
                        {!isTodayDate && !isWeekView && format(day, 'd')}
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
                      {eventosDay.slice(0, maxVisibleEvents).map((evento) => (
                        <DraggableEvent
                          key={evento.id}
                          evento={evento}
                          onClick={() => onEventClick?.(evento)}
                        />
                      ))}
                      {eventosDay.length > maxVisibleEvents && (
                        <div className="text-center py-0.5">
                          <span
                            className="text-[10px] font-medium text-[#89bcbe] hover:text-[#6ba9ab] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDateSelect?.(day)
                            }}
                          >
                            +{eventosDay.length - maxVisibleEvents} mais
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
              prazo_data_limite={activeEvento.prazo_data_limite}
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* Modal de Confirmação Normal */}
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

      {/* Modal de Aviso - Arrasto Ultrapassa Prazo Fatal */}
      <AlertDialog open={prazoFatalWarningOpen} onOpenChange={(open) => {
        setPrazoFatalWarningOpen(open)
        if (!open) {
          setPendingMoveWithPrazo(null)
          setNovoPrazoFatalSelecionado(null)
        }
      }}>
        <AlertDialogContent className="max-w-md p-0 overflow-hidden border-0">
          <div className="bg-white rounded-lg">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f0f9f9] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#46627f]" />
                </div>
                <div>
                  <AlertDialogTitle className="text-base font-semibold text-[#34495e]">
                    Reagendar Prazo Fatal
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-[#46627f] mt-0.5">
                    A nova data de execução ultrapassa o prazo fatal atual
                  </AlertDialogDescription>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Info das datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#f0f9f9] rounded-lg border border-[#89bcbe]/30">
                  <p className="text-[10px] text-[#46627f] mb-1">Nova Data Execução</p>
                  <p className="text-sm font-semibold text-[#34495e]">
                    {pendingMoveWithPrazo?.newDate && format(pendingMoveWithPrazo.newDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 mb-1">Prazo Fatal Atual</p>
                  <p className="text-sm font-semibold text-[#34495e]">
                    {pendingMoveWithPrazo?.prazoFatal && format(pendingMoveWithPrazo.prazoFatal, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#46627f]">
                Escolha a nova data para o prazo fatal:
              </p>

              {/* Seletor de novo prazo fatal */}
              <Popover open={prazoFatalCalendarOpen} onOpenChange={setPrazoFatalCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-10 border-[#89bcbe]/50 hover:border-[#89bcbe] hover:bg-[#f0f9f9]"
                  >
                    <Calendar className="mr-2 h-4 w-4 text-[#89bcbe]" />
                    {novoPrazoFatalSelecionado ? (
                      <span className="text-[#34495e] font-medium">
                        {format(novoPrazoFatalSelecionado, 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-slate-500">Selecionar data...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={novoPrazoFatalSelecionado || undefined}
                    onSelect={(date) => {
                      if (date) {
                        setNovoPrazoFatalSelecionado(date)
                        setPrazoFatalCalendarOpen(false)
                      }
                    }}
                    disabled={(date) => date < (pendingMoveWithPrazo?.newDate || new Date())}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Footer com opções */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleConfirmMoveWithPrazo}
                  className="flex-1 h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!onEventMoveWithPrazoFatal || !novoPrazoFatalSelecionado}
                >
                  Confirmar e Reagendar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrazoFatalWarningOpen(false)
                    setPendingMoveWithPrazo(null)
                    setNovoPrazoFatalSelecionado(null)
                  }}
                  className="flex-1 h-9 text-xs font-medium border-slate-200 hover:bg-white text-[#46627f]"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  )
}
