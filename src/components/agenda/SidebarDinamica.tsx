'use client'

import { X, Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { parseDBDate } from '@/lib/timezone'
import EventDetailCard from './EventDetailCard'
import { AgendaItem } from '@/hooks/useAgendaConsolidada'

interface SidebarDinamicaProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date
  eventos: AgendaItem[]
  onEventClick: (evento: AgendaItem) => void
  onCreateEvent: (date: Date) => void
  onCompleteTask?: (taskId: string) => void
  onReopenTask?: (taskId: string) => void
  onLancarHoras?: (taskId: string) => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
  className?: string
}

export default function SidebarDinamica({
  isOpen,
  onClose,
  selectedDate,
  eventos,
  onEventClick,
  onCreateEvent,
  onCompleteTask,
  onReopenTask,
  onLancarHoras,
  onProcessoClick,
  onConsultivoClick,
  className,
}: SidebarDinamicaProps) {
  if (!isOpen || !selectedDate) return null

  // Ordenar eventos por prioridade
  const eventosOrdenados = [...eventos].sort((a, b) => {
    // 0. Tarefas concluídas vão para o final
    if (a.tipo_entidade === 'tarefa' && a.status === 'concluida' && b.status !== 'concluida') return 1
    if (b.tipo_entidade === 'tarefa' && b.status === 'concluida' && a.status !== 'concluida') return -1

    // 1. Audiências primeiro
    if (a.tipo_entidade === 'audiencia' && b.tipo_entidade !== 'audiencia') return -1
    if (a.tipo_entidade !== 'audiencia' && b.tipo_entidade === 'audiencia') return 1

    // 2. Compromissos (eventos) em segundo
    if (a.tipo_entidade === 'evento' && b.tipo_entidade === 'tarefa') return -1
    if (a.tipo_entidade === 'tarefa' && b.tipo_entidade === 'evento') return 1

    // 3. Para tarefas, ordenar por prioridade
    if (a.tipo_entidade === 'tarefa' && b.tipo_entidade === 'tarefa') {
      const prioridadeOrdem = { alta: 1, media: 2, baixa: 3 }
      const prioA = prioridadeOrdem[a.prioridade] || 999
      const prioB = prioridadeOrdem[b.prioridade] || 999
      return prioA - prioB
    }

    // 4. Manter ordem original para mesmo tipo
    return 0
  })

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 z-40 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-[400px] max-w-[90vw] bg-white shadow-2xl z-50',
          'transform transition-transform duration-300 ease-in-out',
          'border-l border-slate-200',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <div>
            <h3 className="text-base font-semibold text-[#34495e]">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </h3>
            <p className="text-xs text-[#6c757d] mt-0.5">
              {format(selectedDate, 'EEEE', { locale: ptBR })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-slate-100"
          >
            <X className="w-4 h-4 text-[#6c757d]" />
          </Button>
        </div>

        {/* Botão de Criar Evento */}
        <div className="p-4 border-b border-slate-200">
          <Button
            onClick={() => onCreateEvent(selectedDate)}
            className="w-full bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        {/* Lista de Eventos - área scrollável */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {eventos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-[#6c757d] mb-1">Nenhum evento neste dia</p>
                <p className="text-xs text-slate-400">
                  Clique em "Novo Evento" para adicionar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-[#46627f] mb-3">
                  {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'}
                </p>
                {eventosOrdenados.map((evento) => (
                  <EventDetailCard
                    key={evento.id}
                    id={evento.id}
                    titulo={evento.titulo}
                    descricao={evento.descricao}
                    tipo={evento.tipo_entidade === 'tarefa' ? 'tarefa' : evento.tipo_entidade === 'audiencia' ? 'audiencia' : evento.subtipo === 'prazo_processual' ? 'prazo' : 'compromisso'}
                    data_inicio={parseDBDate(evento.data_inicio)}
                    data_fim={evento.data_fim ? parseDBDate(evento.data_fim) : undefined}
                    dia_inteiro={evento.dia_inteiro}
                    local={evento.local}
                    responsavel_nome={evento.responsavel_nome}
                    status={evento.status}
                    prioridade={evento.prioridade}
                    processo_numero={evento.processo_numero}
                    processo_id={evento.processo_id}
                    consultivo_titulo={evento.consultivo_titulo}
                    consultivo_id={evento.consultivo_id}
                    prazo_data_limite={evento.prazo_data_limite}
                    prazo_tipo={evento.prazo_tipo}
                    prazo_cumprido={evento.prazo_cumprido}
                    subtipo={evento.subtipo}
                    // Recorrência
                    recorrencia_id={evento.recorrencia_id}
                    onViewDetails={() => onEventClick(evento)}
                    onComplete={() => onCompleteTask?.(evento.id)}
                    onReopen={() => onReopenTask?.(evento.id)}
                    onLancarHoras={() => onLancarHoras?.(evento.id)}
                    onProcessoClick={onProcessoClick}
                    onConsultivoClick={onConsultivoClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer (estatísticas) - sempre visível no final */}
        {eventos.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs font-semibold text-[#34495e]">
                  {eventos.filter(e => e.tipo_entidade === 'audiencia').length}
                </p>
                <p className="text-[10px] text-[#6c757d]">Audiências</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#34495e]">
                  {eventos.filter(e => e.tipo_entidade === 'tarefa').length}
                </p>
                <p className="text-[10px] text-[#6c757d]">Tarefas</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#34495e]">
                  {eventos.filter(e => e.tipo_entidade === 'evento').length}
                </p>
                <p className="text-[10px] text-[#6c757d]">Eventos</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
