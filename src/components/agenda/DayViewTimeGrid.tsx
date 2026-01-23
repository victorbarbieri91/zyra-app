'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getHours, getMinutes } from 'date-fns'
import { Tarefa } from '@/hooks/useTarefas'
import { parseTimeToMinutes, formatBrazilTime, parseDBDate } from '@/lib/timezone'
import TimeSlotDropZone from './TimeSlotDropZone'
import ScheduledTaskCard from './ScheduledTaskCard'
import { AgendaItem } from '@/hooks/useAgendaConsolidada'

interface DayViewTimeGridProps {
  eventos: AgendaItem[]  // Compromissos e audiências (fixos)
  tarefasAgendadas: Tarefa[]  // Tarefas com horario_planejado_dia
  selectedDate: Date
  onEventClick: (evento: AgendaItem) => void
  onTaskClick: (tarefa: Tarefa) => void
  onTaskComplete?: (tarefaId: string) => void
  onTaskResize?: (tarefaId: string, novaDuracaoMinutos: number) => void
  className?: string
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6h às 22h
const MINUTES_PER_SLOT = 15
const SLOTS_PER_HOUR = 60 / MINUTES_PER_SLOT // 4 slots de 15min
const ESCALA_GRADE = 1.5 // 1.5px por minuto (90px por hora)

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

      const minutosDesde6h = (hour - 6) * 60 + minute
      const top = minutosDesde6h * ESCALA_GRADE // 1.5px por minuto
      setPosition(top)
      setVisible(true)
    }

    calcPosition()
    const interval = setInterval(calcPosition, 60000) // Atualiza a cada minuto
    return () => clearInterval(interval)
  }, [])

  if (!visible) return null

  return (
    <div
      className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
      style={{ top: `${position}px` }}
    >
      <div className="absolute left-0 w-2 h-2 rounded-full bg-red-500 -ml-1 -mt-0.5" />
    </div>
  )
}

export default function DayViewTimeGrid({
  eventos,
  tarefasAgendadas,
  selectedDate,
  onEventClick,
  onTaskClick,
  onTaskComplete,
  onTaskResize,
  className,
}: DayViewTimeGridProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null)

  // Scroll inteligente para hora atual ao montar
  useEffect(() => {
    if (!gridContainerRef.current) return

    const now = new Date()
    const hour = getHours(now)

    // Centraliza em ~2h antes da hora atual (ou 8h se for muito cedo)
    const targetHour = Math.max(8, hour - 2)
    const scrollTop = Math.max(0, (targetHour - 6) * 90) // 90px por hora

    setTimeout(() => {
      gridContainerRef.current?.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      })
    }, 100)
  }, [])

  // Função para calcular posição de eventos fixos
  const getEventoPosition = (evento: AgendaItem) => {
    const hour = getHours(parseDBDate(evento.data_inicio))
    const minute = getMinutes(parseDBDate(evento.data_inicio))
    const minutosDesde6h = (hour - 6) * 60 + minute
    const top = minutosDesde6h * ESCALA_GRADE

    let duracaoMinutos = 60 // Padrão 1 hora

    if (evento.data_fim) {
      const endHour = getHours(parseDBDate(evento.data_fim))
      const endMinute = getMinutes(parseDBDate(evento.data_fim))
      const endMinutosDesde6h = (endHour - 6) * 60 + endMinute
      duracaoMinutos = endMinutosDesde6h - minutosDesde6h
    }

    const height = duracaoMinutos * ESCALA_GRADE
    return { top, height: Math.max(30, height) } // Altura mínima 30px
  }

  // Função para calcular posição de tarefas agendadas
  const getTarefaPosition = (tarefa: Tarefa) => {
    if (!tarefa.horario_planejado_dia) return { top: 0, height: 90 }

    const minutosDesde6h = parseTimeToMinutes(tarefa.horario_planejado_dia)
    const top = minutosDesde6h * ESCALA_GRADE
    const duracaoMinutos = tarefa.duracao_planejada_minutos || 60
    const height = duracaoMinutos * ESCALA_GRADE

    return { top, height }
  }

  // Detectar sobreposições e calcular offsets horizontais
  const calcularSobreposicoes = useMemo(() => {
    const items = [
      ...eventos.map((e) => ({ tipo: 'evento' as const, item: e, ...getEventoPosition(e) })),
      ...tarefasAgendadas.map((t) => ({ tipo: 'tarefa' as const, item: t, ...getTarefaPosition(t) })),
    ]

    // Função para verificar se dois itens se sobrepõem
    const hasOverlap = (a: typeof items[0], b: typeof items[0]) => {
      return !(a.top + a.height <= b.top || b.top + b.height <= a.top)
    }

    // Agrupar itens que se sobrepõem
    const grupos: typeof items[][] = []

    items.forEach((item) => {
      let grupoEncontrado = false

      for (const grupo of grupos) {
        if (grupo.some((g) => hasOverlap(g, item))) {
          grupo.push(item)
          grupoEncontrado = true
          break
        }
      }

      if (!grupoEncontrado) {
        grupos.push([item])
      }
    })

    // Calcular posições para cada item
    const posicoes = new Map<string, { left: string; width: string; zIndex: number }>()

    grupos.forEach((grupo) => {
      const total = grupo.length
      grupo.forEach((item, index) => {
        const id = item.tipo === 'evento' ? item.item.id : item.item.id
        posicoes.set(id, {
          left: `${(index * 100) / total}%`,
          width: `${100 / total}%`,
          zIndex: index,
        })
      })
    })

    return posicoes
  }, [eventos, tarefasAgendadas])

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] flex items-center justify-center shadow-sm">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base text-[#34495e]">Grade Horária</CardTitle>
            <p className="text-xs text-[#6c757d] mt-0.5">
              Compromissos e tarefas agendadas
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea ref={gridContainerRef} className="h-[calc(100vh-280px)]">
          <div className="grid grid-cols-[60px_1fr]">
            {/* Coluna de horários */}
            <div className="border-r border-slate-200 bg-slate-50/50">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-[90px] p-2 text-xs text-[#6c757d] border-b border-slate-100 text-right font-medium"
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Coluna principal com slots e eventos */}
            <div className="relative bg-white">
              {/* Linha da hora atual */}
              <CurrentTimeLine />

              {/* Slots droppable */}
              {HOURS.map((hour) => (
                <div key={hour} className="relative">
                  {Array.from({ length: SLOTS_PER_HOUR }).map((_, slotIndex) => {
                    const minuto = slotIndex * MINUTES_PER_SLOT
                    return (
                      <TimeSlotDropZone
                        key={`${hour}-${minuto}`}
                        hora={hour}
                        minuto={minuto}
                        isHourStart={minuto === 0}
                      />
                    )
                  })}
                </div>
              ))}

              {/* Eventos Fixos (Compromissos e Audiências) */}
              {eventos.map((evento) => {
                const { top, height } = getEventoPosition(evento)
                const layout = calcularSobreposicoes.get(evento.id) || {
                  left: '0%',
                  width: '100%',
                  zIndex: 0,
                }

                const isAudiencia = evento.tipo_entidade === 'audiencia'
                const bgColor = isAudiencia
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                  : 'bg-gradient-to-br from-[#89bcbe] to-[#aacfd0]'

                return (
                  <div
                    key={evento.id}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: layout.left,
                      width: layout.width,
                      zIndex: layout.zIndex + 10,
                    }}
                    className={cn(
                      'absolute px-2 py-1 rounded-md cursor-pointer transition-all group',
                      'hover:shadow-md border border-white',
                      bgColor,
                      'text-white text-xs overflow-hidden'
                    )}
                    onClick={() => onEventClick(evento)}
                  >
                    <div className="mb-0.5">
                      <span className="font-semibold truncate">{evento.titulo}</span>
                    </div>
                    <div className="text-[10px] opacity-90">
                      {formatBrazilTime(evento.data_inicio)}
                      {evento.data_fim && ` - ${formatBrazilTime(evento.data_fim)}`}
                    </div>
                    {evento.local && (
                      <div className="text-[10px] opacity-80 truncate mt-0.5">{evento.local}</div>
                    )}

                    {/* Botão Expandir - Canto Superior Direito (aparece no hover) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(evento)
                      }}
                      className={cn(
                        'absolute top-1 right-1',
                        'w-4 h-4 rounded flex items-center justify-center',
                        'bg-white/20 hover:bg-white/40 backdrop-blur-sm',
                        'transition-all duration-150',
                        'opacity-0 group-hover:opacity-100',
                        'shadow-sm'
                      )}
                      title="Ver detalhes"
                    >
                      <ChevronRight className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )
              })}

              {/* Tarefas Agendadas */}
              {tarefasAgendadas.map((tarefa) => {
                const { top, height } = getTarefaPosition(tarefa)
                const layout = calcularSobreposicoes.get(tarefa.id) || {
                  left: '0%',
                  width: '100%',
                  zIndex: 0,
                }

                return (
                  <div
                    key={tarefa.id}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: layout.left,
                      width: layout.width,
                      zIndex: layout.zIndex + 20, // Tarefas ficam acima de eventos
                    }}
                    className="absolute"
                  >
                    <ScheduledTaskCard
                      tarefa={tarefa}
                      onClick={() => onTaskClick(tarefa)}
                      onComplete={onTaskComplete ? () => onTaskComplete(tarefa.id) : undefined}
                      onResize={onTaskResize}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
