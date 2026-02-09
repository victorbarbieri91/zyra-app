'use client'

import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBrazilTime, formatBrazilDateTime, formatBrazilDate } from '@/lib/timezone'
import {
  Calendar,
  AlertCircle,
  Clock,
  User,
  FileText,
  ExternalLink,
  CheckCheck,
  MapPin,
  ClipboardList,
  Zap,
  RotateCcw,
  Repeat,
  Timer,
  CalendarClock,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { addDays, nextMonday } from 'date-fns'

export interface EventDetailCardProps {
  id: string
  titulo: string
  descricao?: string
  tipo: 'compromisso' | 'audiencia' | 'prazo' | 'tarefa'
  subtipo?: string // Tipo específico da tarefa/evento
  data_inicio: Date
  data_fim?: Date
  dia_inteiro?: boolean
  local?: string
  responsavel_nome?: string
  todos_responsaveis?: string  // Todos os responsáveis (separados por vírgula)
  status: string
  prioridade?: 'alta' | 'media' | 'baixa'
  recorrencia_id?: string | null

  // Vinculações
  processo_numero?: string
  processo_id?: string
  caso_titulo?: string
  consultivo_titulo?: string
  consultivo_id?: string

  // Prazo específico
  prazo_data_limite?: string
  prazo_tipo?: string
  prazo_cumprido?: boolean
  prazo_criticidade?: 'vencido' | 'hoje' | 'critico' | 'urgente' | 'atencao' | 'normal'

  // Actions
  onViewDetails?: () => void
  onComplete?: () => void
  onReopen?: () => void
  onLancarHoras?: () => void
  onReschedule?: (newDate: Date) => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
}

const tipoConfig = {
  tarefa: {
    label: 'Tarefa',
    bg: 'bg-gradient-to-br from-[#34495e] to-[#46627f]',
    text: 'text-white',
  },
  audiencia: {
    label: 'Audiência',
    bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    text: 'text-white',
  },
  prazo: {
    label: 'Prazo',
    bg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    text: 'text-white',
  },
  compromisso: {
    label: 'Compromisso',
    bg: 'bg-gradient-to-br from-[#89bcbe] to-[#aacfd0]',
    text: 'text-[#34495e]',
  },
}

const criticidadeColors = {
  vencido: 'bg-red-600 text-white',
  hoje: 'bg-red-500 text-white',
  critico: 'bg-orange-500 text-white',
  urgente: 'bg-amber-500 text-white',
  atencao: 'bg-yellow-500 text-white',
  normal: 'bg-slate-400 text-white',
}

const subtipoTarefaLabels: Record<string, string> = {
  prazo_processual: 'Prazo Processual',
  acompanhamento: 'Acompanhamento',
  follow_up: 'Follow-up',
  administrativo: 'Administrativo',
  outro: 'Outro',
}

const prioridadeConfig = {
  alta: {
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Alta',
  },
  media: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Média',
  },
  baixa: {
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: 'Baixa',
  },
}

export default function EventDetailCard({
  id,
  titulo,
  descricao,
  tipo,
  subtipo,
  data_inicio,
  data_fim,
  dia_inteiro,
  local,
  responsavel_nome,
  todos_responsaveis,
  status,
  prioridade,
  recorrencia_id,
  processo_numero,
  processo_id,
  caso_titulo,
  consultivo_titulo,
  consultivo_id,
  prazo_data_limite,
  prazo_tipo,
  prazo_cumprido,
  prazo_criticidade,
  onViewDetails,
  onComplete,
  onReopen,
  onLancarHoras,
  onReschedule,
  onProcessoClick,
  onConsultivoClick,
}: EventDetailCardProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const config = tipoConfig[tipo]

  const podeSerConcluido = tipo === 'tarefa' && status !== 'concluida'
  const estaConcluida = tipo === 'tarefa' && status === 'concluida'
  const subtipoLabel = subtipo ? subtipoTarefaLabels[subtipo] || subtipo : null

  return (
    <Card
      className={cn(
        'border border-slate-200 hover:border-[#89bcbe] transition-all shadow hover:shadow-md cursor-pointer',
        'bg-white'
      )}
      onClick={onViewDetails}
    >
      <CardContent className="p-3">
        {/* Header com título e tipo */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className={cn(
            'text-xs font-bold text-[#34495e] leading-tight line-clamp-2',
            tipo === 'tarefa' && status === 'concluida' && 'line-through opacity-60'
          )}>
            {titulo}
          </h4>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 h-4 border font-medium flex-shrink-0', config.bg, config.text)}
          >
            {config.label}
          </Badge>
        </div>

        {/* Descrição (se houver) */}
        {descricao && (
          <p className="text-[11px] text-slate-600 mb-1.5 line-clamp-1">
            {descricao}
          </p>
        )}

        {/* Info grid */}
        <div className="space-y-1">
          {/* Tipo de Tarefa (só para tarefas) */}
          {tipo === 'tarefa' && subtipoLabel && (
            <div className="flex items-center gap-1.5">
              <ClipboardList className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600 font-medium">{subtipoLabel}</span>
            </div>
          )}

          {/* Data de Execução (para tarefas) */}
          {tipo === 'tarefa' && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                {formatBrazilDate(data_inicio, 'dd/MM/yyyy')}
              </span>
            </div>
          )}

          {/* Prioridade (para tarefas) */}
          {tipo === 'tarefa' && prioridade && prioridadeConfig[prioridade] && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className={cn('w-3 h-3 flex-shrink-0', prioridadeConfig[prioridade].color)} />
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0 h-4 font-medium',
                  prioridadeConfig[prioridade].bg,
                  prioridadeConfig[prioridade].color,
                  prioridadeConfig[prioridade].border
                )}
              >
                Prioridade {prioridadeConfig[prioridade].label}
              </Badge>
            </div>
          )}

          {/* Data/Hora (para eventos e audiências) */}
          {tipo !== 'tarefa' && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                {dia_inteiro ? (
                  'Dia inteiro'
                ) : (
                  <>
                    {formatBrazilTime(data_inicio)}
                    {data_fim && ` - ${formatBrazilTime(data_fim)}`}
                  </>
                )}
              </span>
            </div>
          )}

          {/* Local */}
          {local && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">{local}</span>
            </div>
          )}

          {/* Processo Vinculado */}
          {processo_numero && (
            <div className="flex items-start gap-1.5">
              <FileText className="w-3 h-3 text-[#89bcbe] flex-shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (processo_id) onProcessoClick?.(processo_id)
                    }}
                    className="text-[11px] text-[#1E3A8A] hover:text-[#89bcbe] font-medium truncate flex items-center gap-1 group"
                  >
                    <span className="truncate">{processo_numero}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(processo_numero)
                      toast.success('Número copiado!')
                    }}
                    className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-[#89bcbe] transition-colors flex-shrink-0"
                    title="Copiar número do processo"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                {caso_titulo && (
                  <span className="text-[10px] text-slate-500 truncate">{caso_titulo}</span>
                )}
              </div>
            </div>
          )}

          {/* Consultivo Vinculado */}
          {consultivo_titulo && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (consultivo_id) onConsultivoClick?.(consultivo_id)
                }}
                className="text-[11px] text-[#1E3A8A] hover:text-[#89bcbe] font-medium truncate flex items-center gap-1 group"
              >
                <span className="truncate">{consultivo_titulo}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          )}

          {/* Responsável(is) */}
          {(todos_responsaveis || responsavel_nome) && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">
                {todos_responsaveis || responsavel_nome}
              </span>
            </div>
          )}

          {/* Badge de Recorrência */}
          {recorrencia_id && (
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

          {/* Prazo Fatal (se for prazo processual) */}
          {prazo_data_limite && (
            <div className="flex items-center gap-1.5 mt-1">
              <Zap className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
              <span className="text-[11px] text-slate-600">Prazo Fatal:</span>
              <span className="text-[11px] font-semibold text-red-600">
                {formatBrazilDate(prazo_data_limite, 'dd/MM/yyyy')}
              </span>
            </div>
          )}

          {prazo_tipo && (
            <div className="text-[10px] text-slate-500">
              Tipo: {prazo_tipo.charAt(0).toUpperCase() + prazo_tipo.slice(1)}
            </div>
          )}
        </div>

        {/* Footer com ações */}
        {(podeSerConcluido || tipo === 'tarefa' || onLancarHoras) && (
          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100">
            {/* Status badge para tarefas */}
            {tipo === 'tarefa' && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0 h-4 font-medium',
                  status === 'concluida' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                  status === 'em_andamento' && 'bg-blue-100 text-blue-700 border-blue-200',
                  status === 'pendente' && 'bg-slate-100 text-slate-700 border-slate-200',
                  status === 'cancelada' && 'bg-red-100 text-red-700 border-red-200'
                )}
              >
                {status === 'concluida' && 'Concluída'}
                {status === 'em_andamento' && 'Em andamento'}
                {status === 'pendente' && 'Pendente'}
                {status === 'cancelada' && 'Cancelada'}
              </Badge>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              {/* Botão Reagendar - só para tarefas */}
              {tipo === 'tarefa' && onReschedule && status !== 'concluida' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <CalendarClock className="w-3 h-3 mr-1" />
                      Reagendar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                    <div className="px-2 py-1.5 text-[10px] font-medium text-slate-500">
                      Reagendar para:
                    </div>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onReschedule(addDays(new Date(), 1))
                      }}
                      className="text-xs"
                    >
                      Amanhã
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onReschedule(nextMonday(new Date()))
                      }}
                      className="text-xs"
                    >
                      Próxima segunda
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onReschedule(addDays(new Date(), 7))
                      }}
                      className="text-xs"
                    >
                      Daqui a 7 dias
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setCalendarOpen(true)
                      }}
                      className="text-xs"
                    >
                      Data personalizada...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Botão Lançar Horas - só aparece se tem vínculo */}
              {onLancarHoras && (processo_id || consultivo_id) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onLancarHoras()
                  }}
                  className="h-6 px-2 text-[10px] border-[#89bcbe] text-[#34495e] hover:bg-[#f0f9f9]"
                >
                  <Timer className="w-3 h-3 mr-1" />
                  Horas
                </Button>
              )}

              {/* Botão concluir para tarefas pendentes */}
              {podeSerConcluido && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onComplete?.()
                  }}
                  className="h-6 px-2 text-[10px] bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Concluir
                </Button>
              )}

              {/* Botão reabrir para tarefas concluídas */}
              {estaConcluida && onReopen && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onReopen()
                  }}
                  className="h-6 px-2 text-[10px] bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reabrir
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Calendar Dialog para Data Personalizada */}
      {onReschedule && (
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogContent className="max-w-fit p-4" onClick={(e) => e.stopPropagation()}>
            <DialogTitle className="text-sm font-medium text-slate-700 mb-2">
              Selecione a nova data
            </DialogTitle>
            <CalendarComponent
              mode="single"
              selected={data_inicio}
              onSelect={(date) => {
                if (date) {
                  onReschedule(date)
                  setCalendarOpen(false)
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
