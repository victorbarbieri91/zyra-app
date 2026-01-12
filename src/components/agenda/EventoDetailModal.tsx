'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Calendar as CalendarIcon,
  AlertCircle,
  ExternalLink,
  Edit,
  X,
  CheckCircle2,
  User,
  MapPin,
  FileText,
  BookOpen,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatBrazilDateTime,
  formatBrazilDate,
  formatBrazilTime
} from '@/lib/timezone'
import { differenceInMinutes, differenceInDays, parseISO, isBefore, startOfDay } from 'date-fns'

interface EventoDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evento: {
    id: string
    titulo: string
    descricao?: string
    data_inicio: string
    data_fim?: string
    dia_inteiro?: boolean
    subtipo: string // 'prazo_processual', 'prazo_contratual', 'prazo_consultivo', 'inicial', 'compromisso'
    status?: string
    local?: string
    // Vinculações
    processo_id?: string
    processo_numero?: string
    consultivo_id?: string
    consultivo_titulo?: string
    // Detalhes
    cliente_nome?: string
    responsavel_id?: string
    responsavel_nome?: string
    // Prazo específico
    prazo_data_limite?: string
    prazo_criticidade?: 'vencido' | 'hoje' | 'critico' | 'urgente' | 'atencao' | 'normal'
    // Metadata
    created_at?: string
    updated_at?: string
  }
  onEdit?: () => void
  onCancelar?: () => void
  onMarcarCumprido?: () => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
}

export default function EventoDetailModal({
  open,
  onOpenChange,
  evento,
  onEdit,
  onCancelar,
  onMarcarCumprido,
  onProcessoClick,
  onConsultivoClick,
}: EventoDetailModalProps) {
  // Determinar tipo principal (prazo ou compromisso)
  const isPrazo = evento.subtipo.includes('prazo')
  const isCompromisso = evento.subtipo === 'compromisso' || evento.subtipo === 'inicial'

  // Calcular duração
  const duracao = evento.data_fim && evento.data_inicio && !evento.dia_inteiro
    ? differenceInMinutes(parseISO(evento.data_fim), parseISO(evento.data_inicio))
    : null

  // Calcular dias restantes para prazo
  const diasRestantes = evento.prazo_data_limite
    ? differenceInDays(parseISO(evento.prazo_data_limite), startOfDay(new Date()))
    : null

  const prazoVencido = evento.prazo_data_limite
    ? isBefore(parseISO(evento.prazo_data_limite), startOfDay(new Date()))
    : false

  // Subtipo label
  const subtipoLabels: Record<string, string> = {
    prazo_processual: 'Prazo Processual',
    prazo_contratual: 'Prazo Contratual',
    prazo_consultivo: 'Prazo Consultivo',
    inicial: 'Prazo Inicial',
    compromisso: 'Compromisso',
  }

  const subtipoLabel = subtipoLabels[evento.subtipo] || evento.subtipo

  // Status badge color
  const getStatusColor = () => {
    if (evento.status === 'concluido') return 'text-emerald-600'
    if (evento.status === 'cancelado') return 'text-slate-400'
    if (prazoVencido && isPrazo) return 'text-red-600'
    return 'text-blue-600'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-0">
        <DialogTitle className="sr-only">Detalhes do {isPrazo ? 'Prazo' : 'Compromisso'}</DialogTitle>
        <div className="bg-white rounded-lg">

          {/* Header Minimalista */}
          <div className="p-6 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  {evento.titulo}
                </h2>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{subtipoLabel}</span>
                  {evento.status && (
                    <span className={cn("font-medium capitalize", getStatusColor())}>
                      {evento.status.replace('_', ' ')}
                    </span>
                  )}
                  {evento.dia_inteiro && (
                    <span className="font-medium text-purple-600">
                      Dia Inteiro
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Metadata sutil */}
            {evento.created_at && (
              <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
                <Clock className="w-3 h-3" />
                <span>Criado {formatBrazilDate(evento.created_at)}</span>
              </div>
            )}
          </div>

          {/* Conteúdo Principal */}
          <div className="p-6 space-y-4">

            {/* Alerta de Prazo Vencido ou Crítico */}
            {isPrazo && (prazoVencido || evento.prazo_criticidade === 'hoje' || evento.prazo_criticidade === 'critico') && (
              <div className={cn(
                'p-3 rounded-lg border-l-4',
                prazoVencido ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'
              )}>
                <div className="flex items-start gap-2">
                  <AlertCircle className={cn('w-4 h-4 flex-shrink-0 mt-0.5', prazoVencido ? 'text-red-600' : 'text-amber-600')} />
                  <div>
                    <div className={cn('text-xs font-semibold', prazoVencido ? 'text-red-900' : 'text-amber-900')}>
                      {prazoVencido ? 'Prazo Vencido' : evento.prazo_criticidade === 'hoje' ? 'Vence Hoje' : 'Prazo Crítico'}
                    </div>
                    <div className={cn('text-[10px] mt-0.5', prazoVencido ? 'text-red-700' : 'text-amber-700')}>
                      {prazoVencido
                        ? `Este prazo venceu há ${Math.abs(diasRestantes || 0)} dia(s)`
                        : diasRestantes === 0
                        ? 'Este prazo vence hoje'
                        : `Faltam ${diasRestantes} dia(s) para o vencimento`
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DESCRIÇÃO */}
            <div>
              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                Descrição
              </div>
              {evento.descricao ? (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {evento.descricao}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Sem descrição
                </p>
              )}
            </div>

            {/* PROCESSO VINCULADO */}
            {evento.processo_id && evento.processo_numero && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Processo Vinculado
                </div>
                <button
                  onClick={() => onProcessoClick?.(evento.processo_id!)}
                  className="w-full text-left p-3 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-700">
                        Processo {evento.processo_numero}
                      </div>
                      {evento.cliente_nome && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          {evento.cliente_nome}
                        </div>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            )}

            {/* CONSULTIVO VINCULADO */}
            {evento.consultivo_id && evento.consultivo_titulo && (
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Consultivo Vinculado
                </div>
                <button
                  onClick={() => onConsultivoClick?.(evento.consultivo_id!)}
                  className="w-full text-left p-3 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-700">
                        {evento.consultivo_titulo}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Consultivo
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            )}

            {/* INFORMAÇÕES ORGANIZADAS EM LAYOUT FLUIDO */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {/* Data de Início */}
              <div className="min-w-[140px]">
                <div className="text-[10px] text-slate-500 mb-1 h-4">
                  <CalendarIcon className="w-3 h-3 text-slate-400 inline mr-1.5 align-text-bottom" />
                  {isPrazo ? 'Data Início' : 'Data e Hora'}
                </div>
                <div className="h-5 leading-5">
                  <span className="text-xs font-medium text-slate-700">
                    {evento.data_inicio ? (
                      evento.dia_inteiro
                        ? formatBrazilDate(new Date(evento.data_inicio))
                        : formatBrazilDateTime(new Date(evento.data_inicio))
                    ) : '-'}
                  </span>
                </div>
              </div>

              {/* Data Fim / Hora Fim */}
              {evento.data_fim && !evento.dia_inteiro && (
                <div className="min-w-[100px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    Até
                  </div>
                  <div className="h-5 leading-5">
                    <span className="text-xs text-slate-700">
                      {formatBrazilTime(new Date(evento.data_fim))}
                    </span>
                  </div>
                </div>
              )}

              {/* Prazo Fatal - Apenas para prazos */}
              {isPrazo && evento.prazo_data_limite && (
                <div className="min-w-[200px]">
                  <div className="text-[10px] text-red-600 font-medium mb-1 h-4">
                    <AlertCircle className="w-3 h-3 text-red-500 inline mr-1.5 align-text-bottom" />
                    Prazo Fatal
                  </div>
                  <div className="h-5 leading-5">
                    <span className={cn(
                      "text-xs font-medium",
                      prazoVencido ? "text-red-600" :
                      diasRestantes !== null && diasRestantes <= 2 ? "text-amber-600" :
                      "text-slate-700"
                    )}>
                      {formatBrazilDate(new Date(evento.prazo_data_limite))}
                    </span>
                    {diasRestantes !== null && !prazoVencido && (
                      <span className="text-[10px] text-slate-400 ml-1.5">
                        {diasRestantes === 0 ? 'Hoje' : `${diasRestantes}d`}
                      </span>
                    )}
                    {prazoVencido && (
                      <span className="text-[10px] text-red-600 ml-1.5">
                        Vencido
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Duração */}
              {duracao && !isPrazo && (
                <div className="min-w-[100px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    Duração
                  </div>
                  <div className="h-5 leading-5">
                    <span className="text-xs text-slate-700">
                      {duracao} min
                    </span>
                  </div>
                </div>
              )}

              {/* Responsável */}
              {evento.responsavel_nome && (
                <div className="min-w-[120px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    Responsável
                  </div>
                  <div className="h-5 leading-5">
                    <span className="text-xs text-slate-700">
                      {evento.responsavel_nome}
                    </span>
                  </div>
                </div>
              )}

              {/* Local */}
              {evento.local && (
                <div className="min-w-[150px]">
                  <div className="text-[10px] text-slate-500 mb-1 h-4">
                    <MapPin className="w-3 h-3 text-slate-400 inline mr-1.5 align-text-bottom" />
                    Local
                  </div>
                  <div className="h-5 leading-5">
                    <span className="text-xs text-slate-700">
                      {evento.local}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Botões de Ação */}
          <div className="p-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-end gap-2">
              {isPrazo && onMarcarCumprido && evento.status !== 'concluido' && (
                <Button
                  onClick={onMarcarCumprido}
                  size="sm"
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Marcar como Cumprido
                </Button>
              )}

              {onEdit && (
                <Button
                  onClick={onEdit}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Editar
                </Button>
              )}

              {onCancelar && evento.status !== 'cancelado' && (
                <Button
                  onClick={onCancelar}
                  size="sm"
                  variant="outline"
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
