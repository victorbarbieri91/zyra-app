'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  format,
  addDays,
  subDays,
  isSameDay,
  isToday,
  set,
  getHours,
  getMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventCardProps } from './EventCard'

interface CalendarDayViewProps {
  eventos: EventCardProps[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onEventClick: (evento: EventCardProps) => void
  onCreateEvent: (date: Date) => void
  className?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0h às 23h
const HALF_HOURS = [0, 30] // Divisões de 30 min

export default function CalendarDayView({
  eventos,
  selectedDate,
  onDateSelect,
  onEventClick,
  onCreateEvent,
  className,
}: CalendarDayViewProps) {
  const previousDay = () => onDateSelect(subDays(selectedDate, 1))
  const nextDay = () => onDateSelect(addDays(selectedDate, 1))
  const goToToday = () => onDateSelect(new Date())

  const eventosDoDia = useMemo(() => {
    return eventos.filter((evento) => isSameDay(new Date(evento.data_inicio), selectedDate))
  }, [eventos, selectedDate])

  const getEventoPosition = (evento: EventCardProps) => {
    const hour = getHours(new Date(evento.data_inicio))
    const minute = getMinutes(new Date(evento.data_inicio))
    const top = (hour * 60 + minute) * (80 / 60) // 80px por hora

    let height = 80 // Padrão 1 hora
    if (evento.data_fim) {
      const endHour = getHours(new Date(evento.data_fim))
      const endMinute = getMinutes(new Date(evento.data_fim))
      const duration = (endHour * 60 + endMinute) - (hour * 60 + minute)
      height = duration * (80 / 60)
    }

    return { top, height: Math.max(height, 40) } // Mínimo 40px
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header de Navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-[#34495e] capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9]"
          >
            Hoje
          </Button>
          <Button
            size="sm"
            onClick={() => onCreateEvent(selectedDate)}
            className="bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Timeline do Dia */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[80px_1fr]">
          {/* Coluna de Horários */}
          <div className="border-r border-slate-200 bg-slate-50">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[80px] p-2 text-xs text-[#6c757d] border-b border-slate-100 text-right font-medium"
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Coluna de Eventos */}
          <div className="relative bg-white">
            {/* Linhas de horário */}
            {HOURS.map((hour) => (
              <div key={hour}>
                <div
                  className="h-[40px] border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group"
                  onClick={() => {
                    const newDate = set(selectedDate, { hours: hour, minutes: 0 })
                    onCreateEvent(newDate)
                  }}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-center gap-2">
                    <Plus className="w-3 h-3 text-[#89bcbe]" />
                    <span className="text-xs text-[#6c757d]">Adicionar evento às {String(hour).padStart(2, '0')}:00</span>
                  </div>
                </div>
                <div
                  className="h-[40px] border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors group"
                  onClick={() => {
                    const newDate = set(selectedDate, { hours: hour, minutes: 30 })
                    onCreateEvent(newDate)
                  }}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-center gap-2">
                    <Plus className="w-3 h-3 text-[#89bcbe]" />
                    <span className="text-xs text-[#6c757d]">Adicionar evento às {String(hour).padStart(2, '0')}:30</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Eventos Dia Inteiro */}
            {eventosDoDia.filter(e => e.dia_inteiro).length > 0 && (
              <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-slate-50 to-transparent">
                <div className="space-y-2">
                  {eventosDoDia.filter(e => e.dia_inteiro).map((evento) => (
                    <div
                      key={evento.id}
                      onClick={() => onEventClick(evento)}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer',
                        'hover:shadow-md transition-all',
                        evento.tipo === 'audiencia' && 'bg-[#1E3A8A]/10 border-[#1E3A8A]/30',
                        evento.tipo === 'prazo' && 'bg-amber-100 border-amber-200',
                        evento.tipo === 'compromisso' && 'bg-blue-100 border-blue-200',
                        evento.tipo === 'tarefa' && 'bg-slate-100 border-slate-200'
                      )}
                    >
                      <div className="text-sm font-semibold text-[#34495e]">{evento.titulo}</div>
                      <div className="text-xs text-[#6c757d] mt-1">Dia inteiro</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Eventos com Horário */}
            {eventosDoDia.filter(e => !e.dia_inteiro).map((evento) => {
              const { top, height } = getEventoPosition(evento)

              return (
                <div
                  key={evento.id}
                  onClick={() => onEventClick(evento)}
                  style={{ top: `${top}px`, height: `${height}px` }}
                  className={cn(
                    'absolute left-3 right-3 z-10',
                    'p-3 rounded-lg border cursor-pointer',
                    'hover:shadow-lg hover:z-20 transition-all overflow-hidden',
                    evento.tipo === 'audiencia' && 'bg-[#1E3A8A]/10 border-[#1E3A8A]/30',
                    evento.tipo === 'prazo' && evento.prazo_criticidade === 'critico' && 'bg-red-100 border-red-200',
                    evento.tipo === 'prazo' && evento.prazo_criticidade !== 'critico' && 'bg-amber-100 border-amber-200',
                    evento.tipo === 'compromisso' && 'bg-blue-100 border-blue-200',
                    evento.tipo === 'tarefa' && 'bg-slate-100 border-slate-200'
                  )}
                >
                  {/* Título e Horário */}
                  <div className="font-semibold text-sm text-[#34495e] truncate">{evento.titulo}</div>
                  <div className="flex items-center gap-1 text-xs text-[#6c757d] mt-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {format(new Date(evento.data_inicio), 'HH:mm')}
                      {evento.data_fim && ` - ${format(new Date(evento.data_fim), 'HH:mm')}`}
                    </span>
                  </div>

                  {/* Detalhes adicionais (apenas se houver espaço) */}
                  {height > 80 && (
                    <div className="mt-2 space-y-1">
                      {evento.local && (
                        <div className="flex items-center gap-1.5 text-xs text-[#6c757d]">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{evento.local}</span>
                        </div>
                      )}
                      {evento.cliente_nome && (
                        <div className="flex items-center gap-1.5 text-xs text-[#6c757d]">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{evento.cliente_nome}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Mensagem vazia */}
            {eventosDoDia.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm text-[#6c757d] mb-1">Nenhum evento neste dia</p>
                  <p className="text-xs text-slate-400">Clique em um horário para adicionar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
