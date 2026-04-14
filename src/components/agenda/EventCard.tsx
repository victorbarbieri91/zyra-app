'use client'

import { Clock, MapPin, User, FileText, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface EventCardProps {
  id: string
  titulo: string
  tipo: 'compromisso' | 'audiencia' | 'prazo' | 'tarefa'
  data_inicio: Date
  data_fim?: Date
  dia_inteiro?: boolean
  local?: string
  cliente_nome?: string
  processo_numero?: string
  responsavel_nome?: string
  cor?: string
  status?: 'agendado' | 'realizado' | 'cancelado' | 'remarcado' | 'concluida' | 'em_andamento' | 'em_pausa' | 'pendente' | 'cancelada'
  // Dados específicos de audiência
  tipo_audiencia?: string
  modalidade?: 'presencial' | 'virtual'
  // Dados específicos de prazo
  prazo_cumprido?: boolean
  prazo_perdido?: boolean
  prazo_criticidade?: 'vencido' | 'hoje' | 'critico' | 'urgente' | 'atencao' | 'normal'
  prazo_data_limite?: Date | string  // Para tarefas com prazo fatal
  // Prioridade (para tarefas)
  prioridade?: 'alta' | 'media' | 'baixa'
  // Subtipo (ex: fixa, prazo_processual, etc.)
  subtipo?: string
  // Privacidade
  pessoal?: boolean
  // Recorrência
  recorrencia_id?: string | null
  onClick?: () => void
  compact?: boolean
}

const tipoConfig = {
  compromisso: {
    label: 'Compromisso',
    color: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',
  },
  audiencia: {
    label: 'Audiência',
    color: 'bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20',
  },
  prazo: {
    label: 'Tarefa',
    color: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200',
  },
  tarefa: {
    label: 'Tarefa',
    color: 'bg-[#34495e]/90 text-white border-[#34495e]',
  },
}

const criticidadeConfig = {
  vencido: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200',
    text: 'text-red-900 dark:text-red-400',
    badge: 'bg-red-600 text-white',
  },
  hoje: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-300',
    text: 'text-red-900 dark:text-red-400',
    badge: 'bg-red-500 text-white',
  },
  critico: {
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200',
    text: 'text-orange-900 dark:text-orange-400',
    badge: 'bg-orange-500 text-white',
  },
  urgente: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200',
    text: 'text-amber-900 dark:text-amber-400',
    badge: 'bg-amber-500 text-white',
  },
  atencao: {
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-200',
    text: 'text-yellow-900 dark:text-yellow-400',
    badge: 'bg-yellow-500 text-white',
  },
  normal: {
    bg: 'bg-slate-50 dark:bg-surface-0',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-900 dark:text-slate-100',
    badge: 'bg-slate-400 text-white',
  },
}

export default function EventCard({
  id,
  titulo,
  tipo,
  data_inicio,
  data_fim,
  dia_inteiro,
  local,
  cliente_nome,
  processo_numero,
  responsavel_nome,
  cor,
  status,
  tipo_audiencia,
  modalidade,
  prazo_cumprido,
  prazo_perdido,
  prazo_criticidade,
  pessoal,
  onClick,
  compact = false,
}: EventCardProps) {
  const config = tipoConfig[tipo]

  // Para prazos, usar configuração de criticidade
  const isPrazo = tipo === 'prazo'
  const critConfig = isPrazo && prazo_criticidade ? criticidadeConfig[prazo_criticidade] : null

  const cardBg = critConfig ? critConfig.bg : 'bg-white dark:bg-surface-1'
  const cardBorder = critConfig ? critConfig.border : 'border-slate-200 dark:border-slate-700'

  return (
    <Card
      onClick={onClick}
      className={cn(
        'transition-all cursor-pointer border-2',
        cardBg,
        cardBorder,
        !compact && 'hover:shadow-md hover:border-[#89bcbe]',
        compact && 'shadow-sm',
        // Melhor destaque para tarefas
        tipo === 'tarefa' && 'bg-gradient-to-br from-slate-50 to-white dark:from-surface-0 dark:to-surface-1 hover:from-slate-100 hover:to-slate-50 dark:hover:from-surface-2 dark:hover:to-surface-1'
      )}
    >
      <CardContent className={cn(compact ? 'p-2.5' : 'p-3')}>
        <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4
                className={cn(
                  'font-semibold leading-tight',
                  compact ? 'text-xs' : 'text-sm',
                  critConfig ? critConfig.text : 'text-[#34495e] dark:text-slate-200',
                  // Destaque maior para título de tarefas
                  tipo === 'tarefa' && 'font-bold'
                )}
              >
                {titulo}
              </h4>
              <div className="flex items-center gap-1">
                {pessoal && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border font-medium bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 flex items-center gap-0.5"
                    title="Tarefa pessoal — só você vê"
                  >
                    <Lock className="w-2.5 h-2.5" />
                    Pessoal
                  </Badge>
                )}
                {!compact && (
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5 py-0 h-4 border font-medium', config.color)}
                  >
                    {config.label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Horário (apenas para eventos e audiências, não para tarefas) */}
            {tipo !== 'tarefa' && (
              <div className="flex items-center gap-1.5 text-xs text-[#6c757d] dark:text-slate-400 mb-1">
                <Clock className="w-3 h-3" />
                {dia_inteiro ? (
                  <span>Dia inteiro</span>
                ) : (
                  <span>
                    {format(data_inicio, 'HH:mm', { locale: ptBR })}
                    {data_fim && ` - ${format(data_fim, 'HH:mm', { locale: ptBR })}`}
                  </span>
                )}
              </div>
            )}

            {/* Status visual para tarefas */}
            {tipo === 'tarefa' && !compact && status && (
              <div className="flex items-center gap-1.5 mb-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0 h-4 font-medium',
                    status === 'concluida' && 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200',
                    status === 'em_andamento' && 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',
                    status === 'em_pausa' && 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200',
                    status === 'pendente' && 'bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  )}
                >
                  {status === 'concluida' && 'Concluída'}
                  {status === 'em_andamento' && 'Em andamento'}
                  {status === 'em_pausa' && 'Em pausa'}
                  {status === 'pendente' && 'Pendente'}
                  {status === 'cancelada' && 'Cancelada'}
                </Badge>
              </div>
            )}

            {/* Detalhes adicionais */}
            {!compact && (
              <div className="space-y-1">
                {local && (
                  <div className="flex items-center gap-1.5 text-xs text-[#6c757d] dark:text-slate-400">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{local}</span>
                  </div>
                )}

                {cliente_nome && (
                  <div className="flex items-center gap-1.5 text-xs text-[#6c757d] dark:text-slate-400">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{cliente_nome}</span>
                  </div>
                )}

                {processo_numero && (
                  <div className="flex items-center gap-1.5 text-xs text-[#6c757d] dark:text-slate-400">
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">Processo {processo_numero}</span>
                  </div>
                )}

                {/* Info específica de audiência */}
                {tipo === 'audiencia' && tipo_audiencia && (
                  <div className="text-[10px] text-[#6c757d] dark:text-slate-400 mt-1.5">
                    {tipo_audiencia.charAt(0).toUpperCase() + tipo_audiencia.slice(1)}
                    {modalidade && ` • ${modalidade === 'virtual' ? 'Virtual' : 'Presencial'}`}
                  </div>
                )}

                {/* Status de prazo */}
                {isPrazo && (prazo_cumprido || prazo_perdido) && (
                  <div className="mt-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0 h-4',
                        prazo_cumprido && 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200',
                        prazo_perdido && 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200'
                      )}
                    >
                      {prazo_cumprido ? 'Cumprido' : 'Perdido'}
                    </Badge>
                  </div>
                )}
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
