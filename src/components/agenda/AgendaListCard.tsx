'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MapPin, User, FileText, Repeat, AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgendaItem } from '@/hooks/useAgendaConsolidada'
import { formatTimeDisplay, formatBrazilTime } from '@/lib/timezone'

interface AgendaListCardProps {
  item: AgendaItem
  onClick: () => void
  onComplete?: () => void
  className?: string
}

const prioridadeConfig = {
  alta: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    label: 'Alta',
  },
  media: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    label: 'Média',
  },
  baixa: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    label: 'Baixa',
  },
}

const statusConfig = {
  concluida: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Concluída',
  },
  realizada: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Realizada',
  },
  realizado: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Cumprido',
  },
  concluido: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Cumprido',
  },
  em_andamento: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Em andamento',
  },
  pendente: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    label: 'Pendente',
  },
  cancelada: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Cancelada',
  },
  confirmada: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Confirmada',
  },
  reagendada: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'Reagendada',
  },
}

// Helper: verifica se um status indica conclusão (para qualquer tipo de agendamento)
const isCompletedStatus = (status: string | undefined | null) =>
  ['concluida', 'realizada', 'realizado', 'concluido'].includes(status || '')

export default function AgendaListCard({ item, onClick, onComplete, className }: AgendaListCardProps) {
  const [statusOtimista, setStatusOtimista] = useState<string | null>(null)

  // Reset estado otimista quando status real muda
  useEffect(() => { setStatusOtimista(null) }, [item.status])

  const statusEfetivo = statusOtimista || item.status
  const isFixa = item.tipo_entidade === 'tarefa' && item.subtipo === 'fixa'
  const prioridadeInfo = item.prioridade ? prioridadeConfig[item.prioridade] : null
  const statusInfo = statusConfig[statusEfetivo as keyof typeof statusConfig] || statusConfig.pendente

  // Determinar horário de exibição
  let horarioDisplay = ''
  if (item.tipo_entidade === 'tarefa' && item.horario_planejado_dia) {
    // Tarefa com horário planejado
    horarioDisplay = formatTimeDisplay(item.horario_planejado_dia)
    if (item.duracao_planejada_minutos) {
      const duracaoH = item.duracao_planejada_minutos / 60
      horarioDisplay += ` • ${duracaoH >= 1 ? `${duracaoH.toFixed(duracaoH % 1 === 0 ? 0 : 1)}h` : `${item.duracao_planejada_minutos}m`}`
    }
  } else if (item.data_inicio) {
    // Evento/Audiência com horário
    horarioDisplay = formatBrazilTime(item.data_inicio)
    if (item.data_fim && !item.dia_inteiro) {
      horarioDisplay += ` - ${formatBrazilTime(item.data_fim)}`
    }
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        'border border-slate-200 hover:border-[#89bcbe] transition-all cursor-pointer',
        'bg-white shadow-md hover:shadow-lg',
        isCompletedStatus(statusEfetivo) && 'opacity-60',
        'group', // Para hover effects
        className
      )}
    >
      <CardContent className="p-2.5">
        {/* Header com checkbox e título */}
        <div className="flex items-start gap-2 mb-2">
          {/* Checkbox de Concluir - ESQUERDA */}
          {onComplete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setStatusOtimista(isCompletedStatus(statusEfetivo) ? 'pendente' : 'concluida')
                onComplete()
              }}
              className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                'transition-all duration-150 mt-0.5',
                'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50',
                'focus:outline-none focus:ring-1 focus:ring-emerald-500',
                isCompletedStatus(statusEfetivo) && 'bg-emerald-500 border-emerald-500'
              )}
              title={isCompletedStatus(statusEfetivo) ? 'Reabrir' : 'Marcar como concluído'}
            >
              {isCompletedStatus(statusEfetivo) && (
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              )}
            </button>
          )}

          {/* Conteúdo Central - Título e Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  'text-xs font-bold text-[#34495e] leading-tight line-clamp-2',
                  isCompletedStatus(statusEfetivo) && 'line-through opacity-60'
                )}
              >
                {item.titulo}
              </h4>
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0 h-4 font-medium flex-shrink-0', statusInfo.bg, statusInfo.text)}
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className={cn('space-y-1.5', onComplete ? 'pl-6' : '')}>
          {/* Horário */}
          {horarioDisplay && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600 font-medium">{horarioDisplay}</span>
            </div>
          )}

          {/* Dia Inteiro Badge */}
          {item.dia_inteiro && (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
                Dia inteiro
              </Badge>
            </div>
          )}

          {/* Prioridade (apenas tarefas) */}
          {item.tipo_entidade === 'tarefa' && prioridadeInfo && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className={cn('w-3 h-3 flex-shrink-0', prioridadeInfo.text)} />
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0 h-4 font-medium',
                  prioridadeInfo.bg,
                  prioridadeInfo.text,
                  prioridadeInfo.border
                )}
              >
                Prioridade {prioridadeInfo.label}
              </Badge>
            </div>
          )}

          {/* Local */}
          {item.local && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">{item.local}</span>
            </div>
          )}

          {/* Processo Vinculado */}
          {item.processo_numero && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-[#1E3A8A] font-medium truncate">
                Processo {item.processo_numero}
              </span>
            </div>
          )}

          {/* Consultivo Vinculado */}
          {item.consultivo_titulo && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-[#1E3A8A] font-medium truncate">
                {item.consultivo_titulo}
              </span>
            </div>
          )}

          {/* Responsável */}
          {item.responsavel_nome && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">{item.responsavel_nome}</span>
            </div>
          )}

          {/* Indicador de Tarefa Fixa */}
          {isFixa && (
            <div className="flex items-center gap-1.5 mt-1">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 font-medium bg-teal-50 text-teal-700 border-teal-200"
              >
                Fixa — todo dia
              </Badge>
            </div>
          )}

          {/* Indicador de Recorrência */}
          {item.recorrencia_id && (
            <div className="flex items-center gap-1.5 mt-1">
              <Repeat className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 font-medium bg-blue-50 text-blue-700 border-blue-200"
              >
                Evento recorrente
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
