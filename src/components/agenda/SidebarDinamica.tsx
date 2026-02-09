'use client'

import { useState, useMemo } from 'react'
import { X, Calendar, Search, Gavel, CheckSquare, CalendarDays } from 'lucide-react'
import { createPortal } from 'react-dom'
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
  onCompleteTask?: (taskId: string) => void
  onReopenTask?: (taskId: string) => void
  onLancarHoras?: (taskId: string) => void
  onRescheduleTask?: (taskId: string, newDate: Date) => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
  className?: string
}

type FiltroTipo = 'todos' | 'tarefa' | 'audiencia' | 'evento'

export default function SidebarDinamica({
  isOpen,
  onClose,
  selectedDate,
  eventos,
  onEventClick,
  onCompleteTask,
  onReopenTask,
  onLancarHoras,
  onRescheduleTask,
  onProcessoClick,
  onConsultivoClick,
  className,
}: SidebarDinamicaProps) {
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')

  // Filtrar e ordenar eventos (hook deve vir antes de qualquer return condicional)
  const eventosFiltrados = useMemo(() => {
    let resultado = [...eventos]

    // Filtro por tipo
    if (filtroTipo !== 'todos') {
      resultado = resultado.filter(e => e.tipo_entidade === filtroTipo)
    }

    // Filtro por busca (título, caso_titulo, processo_numero, consultivo_titulo, todos_responsaveis)
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim()
      resultado = resultado.filter(e =>
        e.titulo?.toLowerCase().includes(termo) ||
        e.caso_titulo?.toLowerCase().includes(termo) ||
        e.processo_numero?.toLowerCase().includes(termo) ||
        e.consultivo_titulo?.toLowerCase().includes(termo) ||
        e.todos_responsaveis?.toLowerCase().includes(termo) ||
        e.descricao?.toLowerCase().includes(termo)
      )
    }

    // Ordenar
    resultado.sort((a, b) => {
      if (a.tipo_entidade === 'tarefa' && a.status === 'concluida' && b.status !== 'concluida') return 1
      if (b.tipo_entidade === 'tarefa' && b.status === 'concluida' && a.status !== 'concluida') return -1
      if (a.tipo_entidade === 'audiencia' && b.tipo_entidade !== 'audiencia') return -1
      if (a.tipo_entidade !== 'audiencia' && b.tipo_entidade === 'audiencia') return 1
      if (a.tipo_entidade === 'evento' && b.tipo_entidade === 'tarefa') return -1
      if (a.tipo_entidade === 'tarefa' && b.tipo_entidade === 'evento') return 1
      if (a.tipo_entidade === 'tarefa' && b.tipo_entidade === 'tarefa') {
        const prioridadeOrdem: Record<string, number> = { alta: 1, media: 2, baixa: 3 }
        return (prioridadeOrdem[a.prioridade] || 999) - (prioridadeOrdem[b.prioridade] || 999)
      }
      return 0
    })

    return resultado
  }, [eventos, filtroTipo, busca])

  const filtros: { key: FiltroTipo; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'tarefa', label: 'Tarefas', icon: <CheckSquare className="w-3 h-3" />, count: eventos.filter(e => e.tipo_entidade === 'tarefa').length },
    { key: 'audiencia', label: 'Audiências', icon: <Gavel className="w-3 h-3" />, count: eventos.filter(e => e.tipo_entidade === 'audiencia').length },
    { key: 'evento', label: 'Eventos', icon: <CalendarDays className="w-3 h-3" />, count: eventos.filter(e => e.tipo_entidade === 'evento').length },
  ]

  // Early returns após todos os hooks
  if (!isOpen || !selectedDate) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 z-[55] transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 h-screen w-[780px] max-w-[90vw] bg-white shadow-2xl z-[60]',
          'transform transition-transform duration-300 ease-in-out',
          'border-l border-slate-200',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          {/* Título + Fechar */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
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

          {/* Busca + Filtros */}
          <div className="px-4 pb-3 space-y-2">
            {/* Input de busca */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título, parte ou processo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#89bcbe] focus:border-[#89bcbe] transition-colors"
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filtros por tipo */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFiltroTipo('todos')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                  filtroTipo === 'todos'
                    ? 'bg-[#34495e] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                Todos
              </button>
              {filtros.filter(f => f.count > 0).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFiltroTipo(filtroTipo === f.key ? 'todos' : f.key)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                    filtroTipo === f.key
                      ? 'bg-[#34495e] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {f.icon}
                  {f.label}
                  <span className={cn(
                    'ml-0.5 text-[10px]',
                    filtroTipo === f.key ? 'text-white/70' : 'text-slate-400'
                  )}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Eventos - área scrollável */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            {eventos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-[#6c757d] mb-1">Nenhum agendamento neste dia</p>
                <p className="text-xs text-slate-400">
                  Clique em "Novo Evento" para adicionar
                </p>
              </div>
            ) : eventosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="w-6 h-6 text-slate-300 mb-2" />
                <p className="text-xs text-[#6c757d]">Nenhum resultado encontrado</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-[#46627f] mb-2.5">
                  {eventosFiltrados.length} {eventosFiltrados.length === 1 ? 'agendamento' : 'agendamentos'}
                  {(filtroTipo !== 'todos' || busca.trim()) && (
                    <span className="text-slate-400 font-normal"> de {eventos.length}</span>
                  )}
                </p>
                <div className="space-y-2.5">
                  {eventosFiltrados.map((evento) => (
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
                      todos_responsaveis={evento.todos_responsaveis}
                      status={evento.status}
                      prioridade={evento.prioridade}
                      processo_numero={evento.processo_numero}
                      processo_id={evento.processo_id}
                      caso_titulo={evento.caso_titulo}
                      consultivo_titulo={evento.consultivo_titulo}
                      consultivo_id={evento.consultivo_id}
                      prazo_data_limite={evento.prazo_data_limite}
                      prazo_tipo={evento.prazo_tipo}
                      prazo_cumprido={evento.prazo_cumprido}
                      subtipo={evento.subtipo}
                      recorrencia_id={evento.recorrencia_id}
                      onViewDetails={() => onEventClick(evento)}
                      onComplete={() => onCompleteTask?.(evento.id)}
                      onReopen={() => onReopenTask?.(evento.id)}
                      onLancarHoras={() => onLancarHoras?.(evento.id)}
                      onReschedule={(newDate) => onRescheduleTask?.(evento.id, newDate)}
                      onProcessoClick={onProcessoClick}
                      onConsultivoClick={onConsultivoClick}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
