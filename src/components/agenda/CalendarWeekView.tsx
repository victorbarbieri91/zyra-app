'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  set,
  isSameHour,
  getHours,
  getMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventCardProps } from './EventCard'
import AllDayEventsSection from './AllDayEventsSection'

interface CalendarWeekViewProps {
  eventos: EventCardProps[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onEventClick: (evento: EventCardProps) => void
  onCreateEvent: (date: Date) => void
  className?: string
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6h às 22h

// Componente para linha da hora atual
function CurrentTimeLine() {
  const [position, setPosition] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const calcPosition = () => {
      const now = new Date()
      const hour = getHours(now)
      const minute = getMinutes(now)

      // Só mostra se estiver entre 6h e 22h
      if (hour < 6 || hour >= 22) {
        setVisible(false)
        return
      }

      const top = (hour - 6) * 60 + minute // 60px por hora
      setPosition(top)
      setVisible(true)
    }

    calcPosition()
    // Atualiza a cada minuto
    const interval = setInterval(calcPosition, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Linha vermelha horizontal */}
      <div
        className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
        style={{ top: `${position}px` }}
      >
        {/* Bolinha na esquerda */}
        <div className="absolute left-0 w-2 h-2 rounded-full bg-red-500 -ml-1 -mt-0.5" />
      </div>
    </>
  )
}

export default function CalendarWeekView({
  eventos,
  selectedDate,
  onDateSelect,
  onEventClick,
  onCreateEvent,
  className,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { locale: ptBR })
  const weekEnd = endOfWeek(selectedDate, { locale: ptBR })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Ref para scroll inteligente
  const gridContainerRef = useRef<HTMLDivElement>(null)

  // Estado de collapse da seção all-day
  const [isAllDayCollapsed, setIsAllDayCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('agenda-allday-collapsed') === 'true'
  })

  const toggleCollapse = () => {
    const newState = !isAllDayCollapsed
    setIsAllDayCollapsed(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('agenda-allday-collapsed', String(newState))
    }
  }

  // Scroll inteligente para hora atual ao montar
  useEffect(() => {
    if (!gridContainerRef.current) return

    const now = new Date()
    const hour = getHours(now)

    // Centraliza em ~2h antes da hora atual (ou 8h se for muito cedo)
    const targetHour = Math.max(8, hour - 2)
    const scrollTop = Math.max(0, (targetHour - 6) * 60)

    setTimeout(() => {
      gridContainerRef.current?.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
    }, 100) // Pequeno delay para garantir que o layout foi montado
  }, [])

  const previousWeek = () => onDateSelect(subWeeks(selectedDate, 1))
  const nextWeek = () => onDateSelect(addWeeks(selectedDate, 1))
  const goToToday = () => onDateSelect(new Date())

  // Função helper para verificar se evento tem hora definida
  const temHoraDefinida = (evento: EventCardProps) => {
    const hora = getHours(parseDBDate(evento.data_inicio))
    const minutos = getMinutes(parseDBDate(evento.data_inicio))
    // Considera que tem hora se não for 00:00 OU se tiver data_fim
    return (hora !== 0 || minutos !== 0) || evento.data_fim !== undefined
  }

  // Categorizar eventos em: sem hora, dia inteiro, com hora
  const eventosCategorized = useMemo(() => {
    const semHora: EventCardProps[] = []
    const comHora: EventCardProps[] = []

    eventos.forEach((evento) => {
      // Eventos de dia inteiro ou sem hora específica vão para a seção all-day
      if (evento.dia_inteiro || !temHoraDefinida(evento)) {
        semHora.push(evento)
      } else {
        comHora.push(evento)
      }
    })

    return { semHora, comHora }
  }, [eventos])

  const getEventosForDay = (day: Date) => {
    return eventosCategorized.comHora.filter((evento) =>
      isSameDay(parseDBDate(evento.data_inicio), day)
    )
  }

  const getEventoPosition = (evento: EventCardProps) => {
    const hour = getHours(parseDBDate(evento.data_inicio))
    const minute = getMinutes(parseDBDate(evento.data_inicio))
    const top = ((hour - 6) * 60 + minute) * (60 / 60) // 60px por hora

    let height = 60 // Padrão 1 hora
    if (evento.data_fim) {
      const endHour = getHours(parseDBDate(evento.data_fim))
      const endMinute = getMinutes(parseDBDate(evento.data_fim))
      const duration = (endHour * 60 + endMinute) - (hour * 60 + minute)
      height = duration * (60 / 60)
    }

    return { top, height: Math.max(height, 30) } // Mínimo 30px
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header de Navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-[#34495e]">
            {format(weekStart, "d 'de' MMMM", { locale: ptBR })} -{' '}
            {format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={previousWeek}
              className="h-8 w-8 p-0 border-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextWeek}
              className="h-8 w-8 p-0 border-slate-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="text-xs border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9]"
        >
          Hoje
        </Button>
      </div>

      {/* Grade Semanal */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Cabeçalho - Dias da Semana */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
              <div className="p-3 text-xs font-medium text-[#6c757d] border-r border-slate-200">
                Horário
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'p-3 text-center border-r border-slate-200 last:border-r-0',
                    isToday(day) && 'bg-[#f0f9f9]'
                  )}
                >
                  <div className="text-xs font-medium text-[#46627f] capitalize">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div
                    className={cn(
                      'text-lg font-semibold mt-1',
                      isToday(day)
                        ? 'w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] text-white flex items-center justify-center'
                        : 'text-[#34495e]'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Seção All-Day/Tarefas */}
            <AllDayEventsSection
              eventos={eventosCategorized.semHora}
              dias={weekDays}
              isCollapsed={isAllDayCollapsed}
              onToggle={toggleCollapse}
              onEventClick={onEventClick}
            />

            {/* Grade de Horários */}
            <div
              ref={gridContainerRef}
              className="overflow-y-auto max-h-[600px]"
            >
              <div className="grid grid-cols-8">
                {/* Coluna de horários */}
                <div className="border-r border-slate-200">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-[60px] p-2 text-xs text-[#6c757d] border-b border-slate-100 text-right"
                    >
                      {String(hour).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Colunas de dias */}
                {weekDays.map((day) => {
                const eventosDay = getEventosForDay(day)

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'relative border-r border-slate-200 last:border-r-0',
                      isToday(day) && 'bg-[#f0f9f9]/20'
                    )}
                  >
                    {/* Linha da hora atual (só aparece na coluna de hoje) */}
                    {isToday(day) && <CurrentTimeLine />}

                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="h-[60px] border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group"
                        onClick={() => {
                          const newDate = set(day, { hours: hour, minutes: 0 })
                          onCreateEvent(newDate)
                        }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                          <Plus className="w-3 h-3 text-[#89bcbe]" />
                        </div>
                      </div>
                    ))}

                    {/* Eventos Posicionados (apenas com hora) */}
                    {eventosDay.map((evento) => {
                      const { top, height } = getEventoPosition(evento)

                      return (
                        <div
                          key={evento.id}
                          onClick={() => onEventClick(evento)}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          className={cn(
                            'absolute left-1 right-1 z-10',
                            'p-1.5 rounded border cursor-pointer text-[10px]',
                            'hover:shadow-md transition-all overflow-hidden',
                            evento.tipo === 'audiencia' && 'bg-[#1E3A8A]/10 border-[#1E3A8A]/30 text-[#1E3A8A]',
                            evento.tipo === 'prazo' && 'bg-amber-100 border-amber-200 text-amber-800',
                            evento.tipo === 'compromisso' && 'bg-blue-100 border-blue-200 text-blue-800',
                            evento.tipo === 'tarefa' && 'bg-slate-100 border-slate-200 text-slate-800'
                          )}
                        >
                          <div className="font-semibold truncate">{evento.titulo}</div>
                          {height > 40 && evento.cliente_nome && (
                            <div className="text-[9px] mt-0.5 truncate opacity-75">
                              {evento.cliente_nome}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
