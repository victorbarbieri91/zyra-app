'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import {
  format,
  isToday,
  isTomorrow,
  isWithinInterval,
  addDays,
  startOfDay,
  endOfDay,
  compareAsc,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import EventCard, { EventCardProps } from './EventCard'

interface ListViewProps {
  eventos: EventCardProps[]
  onEventClick: (evento: EventCardProps) => void
  onCreateEvent: () => void
  className?: string
}

export default function ListView({
  eventos,
  onEventClick,
  onCreateEvent,
  className,
}: ListViewProps) {
  // Agrupar eventos por período
  const groupedEventos = useMemo(() => {
    const now = new Date()
    const tomorrow = addDays(now, 1)
    const weekEnd = addDays(now, 7)

    const groups = {
      hoje: [] as EventCardProps[],
      amanha: [] as EventCardProps[],
      proximos7dias: [] as EventCardProps[],
      depois: [] as EventCardProps[],
    }

    eventos
      .sort((a, b) => compareAsc(parseDBDate(a.data_inicio), parseDBDate(b.data_inicio)))
      .forEach((evento) => {
        const eventoDate = parseDBDate(evento.data_inicio)

        if (isToday(eventoDate)) {
          groups.hoje.push(evento)
        } else if (isTomorrow(eventoDate)) {
          groups.amanha.push(evento)
        } else if (
          isWithinInterval(eventoDate, {
            start: startOfDay(addDays(now, 2)),
            end: endOfDay(weekEnd),
          })
        ) {
          groups.proximos7dias.push(evento)
        } else if (eventoDate > weekEnd) {
          groups.depois.push(evento)
        }
      })

    return groups
  }, [eventos])

  const renderGroup = (
    title: string,
    eventos: EventCardProps[],
    icon?: React.ReactNode,
    emptyMessage?: string
  ) => {
    if (eventos.length === 0 && !emptyMessage) return null

    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
              {icon}
              {title}
              <span className="text-xs font-normal text-[#6c757d] ml-1">
                ({eventos.length})
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          {eventos.length === 0 ? (
            <p className="text-xs text-[#6c757d] text-center py-4">{emptyMessage}</p>
          ) : (
            <div className="space-y-3">
              {eventos.map((evento) => (
                <EventCard
                  key={evento.id}
                  {...evento}
                  onClick={() => onEventClick(evento)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Agrupar eventos dos próximos 7 dias por data
  const eventosPorData = useMemo(() => {
    const map = new Map<string, EventCardProps[]>()

    groupedEventos.proximos7dias.forEach((evento) => {
      const dateKey = format(parseDBDate(evento.data_inicio), 'yyyy-MM-dd')
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(evento)
    })

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [groupedEventos.proximos7dias])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[#34495e]">Lista de Eventos</h2>
        <Button
          size="sm"
          onClick={onCreateEvent}
          className="bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white text-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Evento
        </Button>
      </div>

      {/* Grupos de Eventos */}
      <div className="space-y-4">
        {/* Hoje */}
        {renderGroup(
          'Hoje',
          groupedEventos.hoje,
          <div className="w-6 h-6 bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] rounded-full flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-white" />
          </div>,
          'Nenhum evento agendado para hoje'
        )}

        {/* Amanhã */}
        {renderGroup(
          'Amanhã',
          groupedEventos.amanha,
          <Calendar className="w-4 h-4 text-[#89bcbe]" />,
          'Nenhum evento agendado para amanhã'
        )}

        {/* Próximos 7 Dias */}
        {groupedEventos.proximos7dias.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#89bcbe]" />
                Próximos 7 Dias
                <span className="text-xs font-normal text-[#6c757d] ml-1">
                  ({groupedEventos.proximos7dias.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-4 space-y-4">
              {eventosPorData.map(([dateKey, eventosData]) => {
                const date = new Date(dateKey)
                return (
                  <div key={dateKey}>
                    <div className="mb-2 pb-1 border-b border-slate-100">
                      <p className="text-xs font-semibold text-[#46627f] capitalize">
                        {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {eventosData.map((evento) => (
                        <EventCard
                          key={evento.id}
                          {...evento}
                          onClick={() => onEventClick(evento)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Depois */}
        {groupedEventos.depois.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Eventos Futuros
                <span className="text-xs font-normal text-[#6c757d] ml-1">
                  ({groupedEventos.depois.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-4">
              <div className="space-y-3">
                {groupedEventos.depois.slice(0, 10).map((evento) => (
                  <EventCard
                    key={evento.id}
                    {...evento}
                    onClick={() => onEventClick(evento)}
                  />
                ))}
                {groupedEventos.depois.length > 10 && (
                  <p className="text-xs text-center text-[#6c757d] pt-2">
                    + {groupedEventos.depois.length - 10} eventos adicionais
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensagem vazia */}
        {eventos.length === 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-[#6c757d] mb-1">Nenhum evento agendado</p>
                <p className="text-xs text-slate-400 mb-4">
                  Comece criando seu primeiro evento
                </p>
                <Button
                  size="sm"
                  onClick={onCreateEvent}
                  className="bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white text-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Novo Evento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
