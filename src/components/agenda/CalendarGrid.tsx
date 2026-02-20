'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventCardProps } from './EventCard'
import AgendaFiltersCompact, { EventFiltersState } from './AgendaFiltersCompact'
import CalendarEventMiniCard from './CalendarEventMiniCard'

interface CalendarGridProps {
  eventos?: EventCardProps[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  feriados?: Date[]
  filters?: EventFiltersState
  onFiltersChange?: (filters: EventFiltersState) => void
  className?: string
}

export default function CalendarGrid({
  eventos = [],
  selectedDate,
  onDateSelect,
  feriados = [],
  filters,
  onFiltersChange,
  className,
}: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month')
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Transição suave entre mês e semana
  const switchView = useCallback((newView: 'month' | 'week') => {
    if (newView === calendarView) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCalendarView(newView)
      setTimeout(() => setIsTransitioning(false), 50)
    }, 200)
  }, [calendarView])

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

  // Prioridade de exibição por tipo: audiência > prazo > tarefa > compromisso
  const tipoPrioridade: Record<string, number> = {
    audiencia: 0,
    prazo: 1,
    tarefa: 2,
    compromisso: 3,
  }

  // Status que indicam item concluído
  const completedStatuses = ['concluida', 'concluido', 'realizada', 'realizado']

  // Prioridade de tarefas (alta > media > baixa)
  const tarefaPrioridade: Record<string, number> = {
    alta: 0,
    media: 1,
    baixa: 2,
  }

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
        // Prioridade 0: Concluídos SEMPRE por último
        const aCompleted = completedStatuses.includes(a.status || '')
        const bCompleted = completedStatuses.includes(b.status || '')
        if (aCompleted && !bCompleted) return 1
        if (!aCompleted && bCompleted) return -1

        // Prioridade 1: Urgência do prazo fatal (vencido/hoje primeiro)
        const urgenciaA = getUrgenciaPrazoFatal(a)
        const urgenciaB = getUrgenciaPrazoFatal(b)
        if (urgenciaA !== urgenciaB) return urgenciaA - urgenciaB

        // Prioridade 2: Tipo (audiência > prazo > tarefa > compromisso)
        const prioridadeA = tipoPrioridade[a.tipo] ?? 99
        const prioridadeB = tipoPrioridade[b.tipo] ?? 99
        if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB

        // Prioridade 3: Para tarefas, ordenar por prioridade (alta > media > baixa)
        if (a.tipo === 'tarefa' && b.tipo === 'tarefa') {
          const prioTarefaA = tarefaPrioridade[a.prioridade || ''] ?? 99
          const prioTarefaB = tarefaPrioridade[b.prioridade || ''] ?? 99
          if (prioTarefaA !== prioTarefaB) return prioTarefaA - prioTarefaB
        }

        // Prioridade 4: Horário
        const dataA = parseDBDate(a.data_inicio)
        const dataB = parseDBDate(b.data_inicio)
        return dataA.getTime() - dataB.getTime()
      })
  }

  const isFeriado = (day: Date) => {
    return feriados.some((feriado) => isSameDay(feriado, day))
  }

  return (
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
                <div
                  key={i}
                  onClick={() => {
                    if (onDateSelect) onDateSelect(day)
                  }}
                  className={cn(
                    'p-2 rounded-lg border transition-all cursor-pointer group overflow-y-auto',
                    'hover:border-[#89bcbe] hover:shadow-sm',
                    !isWeekView && 'min-h-[110px]',
                    !isCurrentMonth && 'bg-slate-50/50',
                    isCurrentMonth && 'bg-white',
                    isSelected && 'border-[#89bcbe] bg-[#f0f9f9]/30',
                    !isSelected && 'border-slate-200',
                    isFeriadoDay && 'bg-purple-50/30',
                    isWeekendDay && !isFeriadoDay && 'bg-slate-50'
                  )}
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

                  {/* Lista de eventos do dia com mini-cards */}
                  <div className="space-y-1">
                    {eventosDay.slice(0, maxVisibleEvents).map((evento) => (
                      <CalendarEventMiniCard
                        key={evento.id}
                        id={evento.id}
                        titulo={evento.titulo}
                        tipo={evento.tipo}
                        data_inicio={parseDBDate(evento.data_inicio)}
                        dia_inteiro={evento.dia_inteiro}
                        status={evento.status}
                        prazo_data_limite={evento.prazo_data_limite}
                        onClick={() => {
                          if (evento.onClick) evento.onClick()
                        }}
                      />
                    ))}
                    {eventosDay.length > maxVisibleEvents && (
                      <div className="text-center py-0.5">
                        <span className="text-[10px] font-medium text-[#89bcbe] hover:text-[#6ba9ab] cursor-pointer">
                          +{eventosDay.length - maxVisibleEvents} mais
                        </span>
                      </div>
                    )}
                  </div>
                </div>
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
      </div>
    </div>
  )
}
