'use client'

import { useState } from 'react'
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
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDate = startOfWeek(monthStart, { locale: ptBR })
  const endDate = endOfWeek(monthEnd, { locale: ptBR })

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  // Prioridade de exibição por tipo: audiência > prazo > tarefa > compromisso
  const tipoPrioridade: Record<string, number> = {
    audiencia: 0,
    prazo: 1,
    tarefa: 2,
    compromisso: 3,
  }

  // Helper para verificar urgência do prazo fatal
  // Apenas tarefas e prazos têm prazo_data_limite (audiências e compromissos não)
  const getUrgenciaPrazoFatal = (evento: EventCardProps): number => {
    // Só considerar prazo fatal para tarefas e prazos
    if (evento.tipo !== 'tarefa' && evento.tipo !== 'prazo') return 99
    if (!evento.prazo_data_limite) return 99 // Sem prazo fatal = sem urgência

    const prazoDate = evento.prazo_data_limite instanceof Date
      ? evento.prazo_data_limite
      : new Date(evento.prazo_data_limite.toString().split('T')[0].replace(/-/g, '/'))
    const hoje = startOfDay(new Date())

    if (isBefore(prazoDate, hoje)) return 0 // Vencido - máxima prioridade
    if (isToday(prazoDate)) return 1 // Hoje - alta prioridade
    return 99 // Futuro - prioridade normal
  }

  const getEventosForDay = (day: Date) => {
    return eventos
      .filter((evento) => isSameDay(parseDBDate(evento.data_inicio), day))
      .sort((a, b) => {
        // Primeiro: ordenar por urgência do prazo fatal (vencido/hoje primeiro)
        const urgenciaA = getUrgenciaPrazoFatal(a)
        const urgenciaB = getUrgenciaPrazoFatal(b)
        if (urgenciaA !== urgenciaB) return urgenciaA - urgenciaB

        // Segundo: ordenar por tipo (audiência primeiro)
        const prioridadeA = tipoPrioridade[a.tipo] ?? 99
        const prioridadeB = tipoPrioridade[b.tipo] ?? 99
        if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB

        // Terceiro: ordenar por horário
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
                <div
                  key={i}
                  onClick={() => {
                    if (onDateSelect) onDateSelect(day)
                  }}
                  className={cn(
                    'min-h-[140px] p-2 rounded-lg border transition-all cursor-pointer group',
                    'hover:border-[#89bcbe] hover:shadow-sm',
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
                      {!isTodayDate && format(day, 'd')}
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
                    {eventosDay.slice(0, 3).map((evento) => (
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
                    {eventosDay.length > 3 && (
                      <div className="text-center py-0.5">
                        <span className="text-[10px] font-medium text-[#89bcbe] hover:text-[#6ba9ab] cursor-pointer">
                          +{eventosDay.length - 3} mais
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
