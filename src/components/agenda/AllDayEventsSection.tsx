'use client'

import { ChevronDown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EventCardProps } from './EventCard'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AllDayEventsSectionProps {
  eventos: EventCardProps[]
  dias: Date[]
  isCollapsed: boolean
  onToggle: () => void
  onEventClick: (evento: EventCardProps) => void
  isDragOver?: boolean
}

export default function AllDayEventsSection({
  eventos,
  dias,
  isCollapsed,
  onToggle,
  onEventClick,
  isDragOver = false,
}: AllDayEventsSectionProps) {

  // Calcular altura dinâmica
  const calcularAltura = () => {
    if (eventos.length === 0 && !isDragOver) return 0
    if (isCollapsed) return 32

    // Encontrar o dia com mais eventos para calcular altura necessária
    const maxEventosPorDia = Math.max(
      ...dias.map(dia =>
        eventos.filter(e => isSameDay(new Date(e.data_inicio), dia)).length
      ),
      1
    )

    // 40px de header + 40px por evento (max 3 visíveis)
    const altura = 40 + Math.min(maxEventosPorDia, 3) * 40
    return Math.min(altura, 160) // Max 160px
  }

  const getEventosForDay = (dia: Date) => {
    return eventos.filter(e => isSameDay(new Date(e.data_inicio), dia))
  }

  const altura = calcularAltura()

  if (altura === 0) return null

  return (
    <div
      className="border-b border-slate-200 bg-white transition-all duration-300 ease-in-out"
      style={{ height: `${altura}px` }}
    >
      {/* Header Colapsável */}
      <div
        className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
            isCollapsed && "rotate-[-90deg]"
          )}
        />
        <span className="text-xs font-medium text-slate-600">
          Tarefas do Dia ({eventos.length})
        </span>
      </div>

      {/* Grid de Colunas */}
      {!isCollapsed && (
        <div className="grid grid-cols-8 h-[calc(100%-40px)]">
          {/* Coluna vazia para alinhamento com grid de horas */}
          <div className="border-r border-slate-200" />

          {/* Colunas de dias */}
          {dias.map(dia => {
            const eventosDia = getEventosForDay(dia)

            return (
              <div
                key={dia.toISOString()}
                className={cn(
                  "border-r border-slate-200 last:border-r-0 p-1 overflow-y-auto",
                  isDragOver && "bg-blue-50/50 border-blue-200 border-dashed"
                )}
              >
                {/* Mini Cards */}
                <div className="space-y-1">
                  {eventosDia.map(evento => (
                    <MiniEventCard
                      key={evento.id}
                      evento={evento}
                      onClick={() => onEventClick(evento)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Mini Card de Evento
interface MiniEventCardProps {
  evento: EventCardProps
  onClick: () => void
}

function MiniEventCard({ evento, onClick }: MiniEventCardProps) {
  const getCorPorTipo = (tipo?: string) => {
    switch (tipo) {
      case 'audiencia':
        return 'border-l-[#1E3A8A] bg-[#1E3A8A]/5'
      case 'prazo':
        return 'border-l-amber-500 bg-amber-50'
      case 'compromisso':
        return 'border-l-blue-500 bg-blue-50'
      case 'tarefa':
        return 'border-l-slate-500 bg-slate-50'
      default:
        return 'border-l-slate-400 bg-slate-50'
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded border border-slate-200 border-l-4 p-2",
        "hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer",
        getCorPorTipo(evento.tipo)
      )}
    >
      <div className="flex items-start justify-between gap-1">
        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-slate-700 truncate leading-tight">
            {evento.titulo}
          </div>

          {/* Vinculação */}
          {(evento.processo_numero || evento.cliente_nome) && (
            <div className="text-[9px] text-slate-500 mt-0.5 truncate">
              {evento.processo_numero && `📎 ${evento.processo_numero}`}
              {evento.cliente_nome && ` • ${evento.cliente_nome}`}
            </div>
          )}
        </div>

        {/* Drag Handle */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-slate-400 flex-shrink-0" />
        </div>
      </div>

      {/* Badge de Dia Inteiro */}
      {evento.dia_inteiro && (
        <div className="mt-1 inline-block">
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
            Dia Inteiro
          </span>
        </div>
      )}
    </div>
  )
}
