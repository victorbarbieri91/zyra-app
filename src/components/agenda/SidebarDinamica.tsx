'use client'

import { useState, useMemo } from 'react'
import { X, Calendar, Search, ChevronLeft, ChevronRight, ChevronDown, Scale, Users, CheckSquare } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { format, addDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { parseDBDate } from '@/lib/timezone'
import DiaPainelCard from './DiaPainelCard'
import { AgendaItem } from '@/hooks/useAgendaConsolidada'

interface SidebarDinamicaProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date
  eventos: AgendaItem[]
  onEventClick: (evento: AgendaItem) => void
  onCompleteTask?: (taskId: string) => void
  onReopenTask?: (taskId: string) => void
  onCompleteAudiencia?: (audienciaId: string) => void
  onReopenAudiencia?: (audienciaId: string) => void
  onCompleteEvento?: (eventoId: string) => void
  onReopenEvento?: (eventoId: string) => void
  onLancarHoras?: (taskId: string) => void
  onRescheduleTask?: (taskId: string, newDate: Date) => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
  onNavigateDay?: (newDate: Date) => void
  className?: string
}

type FiltroTipo = 'todos' | 'tarefa' | 'audiencia' | 'evento'
const COMPLETED = ['concluida', 'realizada', 'realizado', 'concluido']
const PRI_ORD: Record<string, number> = { alta: 0, media: 1, baixa: 2 }

export default function SidebarDinamica({
  isOpen,
  onClose,
  selectedDate,
  eventos,
  onEventClick,
  onCompleteTask,
  onReopenTask,
  onCompleteAudiencia,
  onReopenAudiencia,
  onCompleteEvento,
  onReopenEvento,
  onLancarHoras,
  onRescheduleTask,
  onProcessoClick,
  onConsultivoClick,
  onNavigateDay,
  className,
}: SidebarDinamicaProps) {
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [showDone, setShowDone] = useState(false)

  const isDone = (e: AgendaItem) => COMPLETED.includes(e.status)

  // filtro (tipo + busca)
  const filtrados = useMemo(() => {
    let r = [...eventos]
    if (filtroTipo !== 'todos') r = r.filter(e => e.tipo_entidade === filtroTipo)
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim()
      r = r.filter(e =>
        e.titulo?.toLowerCase().includes(termo) ||
        e.caso_titulo?.toLowerCase().includes(termo) ||
        e.processo_numero?.toLowerCase().includes(termo) ||
        e.consultivo_titulo?.toLowerCase().includes(termo) ||
        e.todos_responsaveis?.toLowerCase().includes(termo) ||
        e.descricao?.toLowerCase().includes(termo)
      )
    }
    return r
  }, [eventos, filtroTipo, busca])

  // pendentes: horários primeiro (audiência+compromisso por horário) → tarefas (prioridade, prazo)
  const pendentes = useMemo(() => {
    return filtrados.filter(e => !isDone(e)).sort((a, b) => {
      const ga = a.tipo_entidade === 'tarefa' ? 1 : 0
      const gb = b.tipo_entidade === 'tarefa' ? 1 : 0
      if (ga !== gb) return ga - gb
      if (ga === 0) return parseDBDate(a.data_inicio).getTime() - parseDBDate(b.data_inicio).getTime()
      const pa = PRI_ORD[a.prioridade] ?? 9, pb = PRI_ORD[b.prioridade] ?? 9
      if (pa !== pb) return pa - pb
      const za = a.prazo_data_limite ? parseDBDate(a.prazo_data_limite).getTime() : Infinity
      const zb = b.prazo_data_limite ? parseDBDate(b.prazo_data_limite).getTime() : Infinity
      return za - zb
    })
  }, [filtrados])

  const concluidas = useMemo(() => filtrados.filter(isDone), [filtrados])

  const counts = useMemo(() => ({
    tarefa: eventos.filter(e => e.tipo_entidade === 'tarefa').length,
    audiencia: eventos.filter(e => e.tipo_entidade === 'audiencia').length,
    evento: eventos.filter(e => e.tipo_entidade === 'evento').length,
  }), [eventos])

  const chips: { key: FiltroTipo; label: string; Icon: typeof Scale | null; count: number }[] = [
    { key: 'todos', label: 'Todos', Icon: null, count: eventos.length },
    { key: 'audiencia', label: 'Audiências', Icon: Scale, count: counts.audiencia },
    { key: 'evento', label: 'Compromissos', Icon: Users, count: counts.evento },
    { key: 'tarefa', label: 'Tarefas', Icon: CheckSquare, count: counts.tarefa },
  ]

  // early returns após hooks
  if (!isOpen || !selectedDate) return null
  if (typeof document === 'undefined') return null

  const hoje = isSameDay(selectedDate, new Date())

  const dispatchComplete = (e: AgendaItem) => {
    if (e.tipo_entidade === 'tarefa') onCompleteTask?.(e.id)
    else if (e.tipo_entidade === 'audiencia') onCompleteAudiencia?.(e.id)
    else onCompleteEvento?.(e.id)
  }
  const dispatchReopen = (e: AgendaItem) => {
    if (e.tipo_entidade === 'tarefa') onReopenTask?.(e.id)
    else if (e.tipo_entidade === 'audiencia') onReopenAudiencia?.(e.id)
    else onReopenEvento?.(e.id)
  }

  const renderCard = (e: AgendaItem) => (
    <DiaPainelCard
      key={e.id}
      item={e}
      onViewDetails={() => onEventClick(e)}
      onComplete={() => dispatchComplete(e)}
      onReopen={() => dispatchReopen(e)}
      onLancarHoras={() => onLancarHoras?.(e.id)}
      onReschedule={(d) => onRescheduleTask?.(e.id, d)}
      onProcessoClick={onProcessoClick}
      onConsultivoClick={onConsultivoClick}
    />
  )

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={cn('fixed inset-0 bg-black/30 backdrop-blur-[1px] z-[55] transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 h-screen w-[700px] max-w-[92vw] z-[60] flex flex-col',
          'bg-[#fafaf7] dark:bg-[#0b0f14] border-l border-[#e6e3da] dark:border-[#253345] shadow-2xl',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-[#151e2b] border-b border-[#f0ede3] dark:border-[#253345] px-5 pt-3.5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-[20px] font-medium text-[#2c3e50] dark:text-[#edf1f7] tracking-[-0.02em] leading-none" style={{ fontFamily: 'var(--font-fraunces)' }}>
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h2>
              <span className="text-[12px] text-[#5a6775] dark:text-[#8a97a8] capitalize">
                {format(selectedDate, 'EEEE', { locale: ptBR })}
              </span>
              {hoje && (
                <span className="text-[9.5px] font-bold text-white px-1.5 py-0.5 rounded-full tracking-[0.04em] bg-gradient-to-br from-[#34495e] to-[#46627f]">HOJE</span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button title="Dia anterior" onClick={() => onNavigateDay?.(addDays(selectedDate, -1))} className="w-7 h-7 rounded-lg border border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#1a212c] transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button title="Próximo dia" onClick={() => onNavigateDay?.(addDays(selectedDate, 1))} className="w-7 h-7 rounded-lg border border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#1a212c] transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button title="Fechar" onClick={onClose} className="w-7 h-7 rounded-lg border border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#1a212c] transition-colors ml-0.5">
                <X className="w-[15px] h-[15px]" />
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {chips.filter(ch => ch.key === 'todos' || ch.count > 0).map((ch) => {
              const on = filtroTipo === ch.key
              return (
                <button
                  key={ch.key}
                  onClick={() => setFiltroTipo(on && ch.key !== 'todos' ? 'todos' : ch.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] font-semibold border transition-all',
                    on ? 'bg-gradient-to-br from-[#34495e] to-[#46627f] text-white border-transparent'
                       : 'border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] hover:border-[#89bcbe]',
                  )}
                >
                  {ch.Icon && <ch.Icon className="w-3 h-3" />}
                  {ch.label}
                  <span className={cn('text-[10.5px] font-bold font-mono min-w-[16px] h-4 px-1 rounded-lg inline-flex items-center justify-center',
                    on ? 'bg-white/20 text-white' : 'bg-[#f1ede2] dark:bg-[#1d2a3c] text-[#9aa1a8] dark:text-[#5a6675]')}>{ch.count}</span>
                </button>
              )
            })}
          </div>

          {/* Busca */}
          <div className="relative mt-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9aa1a8] dark:text-[#5a6675] pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por título, parte ou processo"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-[34px] pl-9 pr-8 rounded-[9px] text-[12.5px] bg-[#faf8f2] dark:bg-[#10151d] border border-[#e6e3da] dark:border-[#253345] text-[#2c3e50] dark:text-[#d8e2ef] placeholder:text-[#9aa1a8] dark:placeholder:text-[#5a6675] outline-none focus:border-[#89bcbe] transition-colors"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9aa1a8] hover:text-[#5a6775]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 pt-3.5 pb-8">
          {eventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f1ede2] dark:bg-[#1d2a3c] flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-[#9aa1a8] dark:text-[#5a6675]" />
              </div>
              <p className="text-[13px] text-[#5a6775] dark:text-[#8a97a8]">Nenhum agendamento neste dia</p>
            </div>
          ) : pendentes.length === 0 && concluidas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Search className="w-6 h-6 text-[#9aa1a8] dark:text-[#5a6675] opacity-50 mb-3" />
              <p className="text-[13px] text-[#5a6775] dark:text-[#8a97a8]">Nada encontrado para esse filtro.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendentes.map(renderCard)}

              {concluidas.length > 0 && (
                <div className="mt-1">
                  <button
                    onClick={() => setShowDone(v => !v)}
                    className="w-full flex items-center gap-2 py-2.5 border-t border-[#f0ede3] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8]"
                  >
                    <ChevronDown className={cn('w-3.5 h-3.5 text-[#9aa1a8] transition-transform', showDone ? '' : '-rotate-90')} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Concluídas</span>
                    <span className="text-[10.5px] font-bold font-mono text-[#9aa1a8] dark:text-[#5a6675] bg-[#f1ede2] dark:bg-[#1d2a3c] px-1.5 py-px rounded-full">{concluidas.length}</span>
                  </button>
                  {showDone && <div className="flex flex-col gap-2 mt-2">{concluidas.map(renderCard)}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
