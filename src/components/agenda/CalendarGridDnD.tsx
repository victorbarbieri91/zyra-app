'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Move, Calendar, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isWeekend,
  isBefore,
  startOfDay,
  isAfter,
  differenceInDays,
  addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EventCardProps } from './EventCard'
import AgendaFiltersCompact, { EventFiltersState } from './AgendaFiltersCompact'
import CalendarEventMiniCard, { PRIORIDADE_COR } from './CalendarEventMiniCard'
import { AgendaViewTabs, AgendaCreateButtons } from './AgendaTopBar'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import ConfirmDateChangeModal from './ConfirmDateChangeModal'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CalendarGridDnDProps {
  eventos?: EventCardProps[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onEventMove?: (eventId: string, newDate: Date) => Promise<void>
  onEventMoveWithPrazoFatal?: (eventId: string, newDate: Date, newPrazoFatal: Date) => Promise<void>
  onEventClick?: (event: EventCardProps) => void
  feriados?: Date[]
  filters?: EventFiltersState
  onFiltersChange?: (filters: EventFiltersState) => void
  /** Emite a janela de datas visível (grade do mês) para a página
   *  pedir ao banco só esse intervalo, evitando o teto de 1.000 linhas. */
  onVisibleRangeChange?: (start: Date, end: Date) => void
  /** Controles da barra única do design (view Mês) */
  viewMode?: 'month' | 'week' | 'day' | 'list'
  onViewModeChange?: (v: 'month' | 'week' | 'day' | 'list') => void
  onCreate?: (tipo: 'compromisso' | 'audiencia' | 'tarefa') => void
  className?: string
}

// Cores dos eventos (tarefas usam PRIORIDADE_COR, importado do mini-card)
const EVENTO_COR = { audiencia: '#a85a3e', compromisso: '#3f7376' }
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ── Item arrastável ──
function DraggableEvent({
  evento,
  onClick,
}: {
  evento: EventCardProps
  onClick?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: evento.id,
    data: evento,
  })

  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn('cursor-grab active:cursor-grabbing', isDragging && 'opacity-0')}
      onClick={(e) => {
        e?.stopPropagation()
        onClick?.()
      }}
    >
      <CalendarEventMiniCard
        id={evento.id}
        titulo={evento.titulo}
        tipo={evento.tipo}
        prioridade={evento.prioridade}
        data_inicio={evento.data_inicio}
        dia_inteiro={evento.dia_inteiro}
        status={evento.status}
        recorrencia_id={evento.recorrencia_id}
        prazo_data_limite={evento.prazo_data_limite}
      />
    </div>
  )
}

// ── Célula do dia (zona de drop, sem borda própria — grade contínua) ──
function DroppableDay({
  day,
  className,
  onDateSelect,
  children,
}: {
  day: Date
  className?: string
  onDateSelect?: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(day, 'yyyy-MM-dd'),
    data: { date: day },
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onDateSelect}
      className={cn(
        'relative h-full flex flex-col gap-1 px-[7px] pt-[7px] pb-2 overflow-hidden cursor-pointer transition-[background-color,box-shadow]',
        className,
        isOver && 'ring-2 ring-inset ring-[#89bcbe] z-10',
      )}
    >
      {children}
    </div>
  )
}

export default function CalendarGridDnD({
  eventos = [],
  selectedDate,
  onDateSelect,
  onEventMove,
  onEventMoveWithPrazoFatal,
  onEventClick,
  feriados = [],
  filters,
  onFiltersChange,
  onVisibleRangeChange,
  viewMode,
  onViewModeChange,
  onCreate,
  className,
}: CalendarGridDnDProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ocultarFds, setOcultarFds] = useState(false)
  useEffect(() => {
    try { if (localStorage.getItem('zyra-agenda-ocultar-fds') === '1') setOcultarFds(true) } catch {}
  }, [])
  const toggleFds = () =>
    setOcultarFds((v) => {
      const nv = !v
      try { localStorage.setItem('zyra-agenda-ocultar-fds', nv ? '1' : '0') } catch {}
      return nv
    })

  const [pendingMove, setPendingMove] = useState<{
    eventId: string
    eventData: EventCardProps
    newDate: Date
  } | null>(null)

  // Estado para o modal de aviso de prazo fatal
  const [prazoFatalWarningOpen, setPrazoFatalWarningOpen] = useState(false)
  const [pendingMoveWithPrazo, setPendingMoveWithPrazo] = useState<{
    eventId: string
    eventData: EventCardProps
    newDate: Date
    prazoFatal: Date
    distanciaOriginal: number
  } | null>(null)
  const [novoPrazoFatalSelecionado, setNovoPrazoFatalSelecionado] = useState<Date | null>(null)
  const [prazoFatalCalendarOpen, setPrazoFatalCalendarOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  // === Grade do mês (sempre semanas completas) ===
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const gridStart = startOfWeek(monthStart, { locale: ptBR })
  const gridEnd = endOfWeek(monthEnd, { locale: ptBR })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // semanas (blocos de 7)
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  const currentWeekIndex = weeks.findIndex((w) => w.some((d) => isToday(d)))

  // Informa a página a janela visível, para a leitura no banco seguir a navegação.
  const rangeStart = days[0]
  const rangeEnd = days[days.length - 1]
  useEffect(() => {
    if (rangeStart && rangeEnd) onVisibleRangeChange?.(rangeStart, rangeEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart?.getTime(), rangeEnd?.getTime()])

  // === Navegação ===
  const navigateBack = () => setCurrentDate(subMonths(currentDate, 1))
  const navigateForward = () => setCurrentDate(addMonths(currentDate, 1))
  const goToday = () => setCurrentDate(new Date())

  // Prioridade de exibição por tipo: audiência > compromisso > prazo > tarefa
  const tipoPrioridade: Record<string, number> = {
    audiencia: 0,
    compromisso: 1,
    prazo: 2,
    tarefa: 3,
  }
  const prioridadeTarefa: Record<string, number> = { alta: 0, media: 1, baixa: 2 }

  const isItemConcluido = (evento: EventCardProps): boolean =>
    ['concluida', 'concluido', 'realizada', 'realizado'].includes(evento.status || '')

  const getUrgenciaPrazoFatal = (evento: EventCardProps): number => {
    if (evento.tipo !== 'tarefa' && evento.tipo !== 'prazo') return 99
    if (!evento.prazo_data_limite) return 99

    const prazoDate = evento.prazo_data_limite instanceof Date
      ? evento.prazo_data_limite
      : new Date(evento.prazo_data_limite.toString().split('T')[0].replace(/-/g, '/'))
    const hoje = startOfDay(new Date())

    if (isBefore(prazoDate, hoje)) return 0
    if (isToday(prazoDate)) return 1
    return 99
  }

  const getEventosForDay = (day: Date) => {
    return eventos
      .filter((evento) => isSameDay(parseDBDate(evento.data_inicio), day))
      .sort((a, b) => {
        const concA = isItemConcluido(a) ? 1 : 0
        const concB = isItemConcluido(b) ? 1 : 0
        if (concA !== concB) return concA - concB

        const urgenciaA = getUrgenciaPrazoFatal(a)
        const urgenciaB = getUrgenciaPrazoFatal(b)
        if (urgenciaA !== urgenciaB) return urgenciaA - urgenciaB

        const tipoA = tipoPrioridade[a.tipo] ?? 99
        const tipoB = tipoPrioridade[b.tipo] ?? 99
        if (tipoA !== tipoB) return tipoA - tipoB

        const prioA = prioridadeTarefa[a.prioridade || ''] ?? 3
        const prioB = prioridadeTarefa[b.prioridade || ''] ?? 3
        if (prioA !== prioB) return prioA - prioB

        const dataA = parseDBDate(a.data_inicio)
        const dataB = parseDBDate(b.data_inicio)
        return dataA.getTime() - dataB.getTime()
      })
  }

  const isFeriado = (day: Date) => feriados.some((feriado) => isSameDay(feriado, day))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id && onEventMove) {
      const eventData = active.data.current as EventCardProps
      const dropData = over.data.current as { date: Date }

      if (dropData?.date) {
        // Tarefas fixas não podem ser movidas
        if (eventData.subtipo === 'fixa') {
          return
        }

        // Verificar se é tarefa com prazo fatal e se ultrapassa
        const isTarefaComPrazoFatal = eventData.tipo === 'tarefa' && eventData.prazo_data_limite

        if (isTarefaComPrazoFatal) {
          const prazoFatal = eventData.prazo_data_limite instanceof Date
            ? eventData.prazo_data_limite
            : new Date(eventData.prazo_data_limite!.toString().split('T')[0].replace(/-/g, '/'))

          const novaDataSemHora = startOfDay(dropData.date)
          const prazoFatalSemHora = startOfDay(prazoFatal)

          if (isAfter(novaDataSemHora, prazoFatalSemHora)) {
            const dataInicioAtual = eventData.data_inicio instanceof Date
              ? eventData.data_inicio
              : new Date(eventData.data_inicio)
            const distancia = differenceInDays(prazoFatalSemHora, startOfDay(dataInicioAtual))

            const novoPrazoSugerido = addDays(dropData.date, Math.max(distancia, 0))
            setPendingMoveWithPrazo({
              eventId: active.id as string,
              eventData: eventData,
              newDate: dropData.date,
              prazoFatal: prazoFatal,
              distanciaOriginal: Math.max(distancia, 0),
            })
            setNovoPrazoFatalSelecionado(novoPrazoSugerido)
            setPrazoFatalWarningOpen(true)
            return
          }
        }

        setPendingMove({
          eventId: active.id as string,
          eventData: eventData,
          newDate: dropData.date,
        })
      }
    }
  }

  const handleConfirmMove = async (newTime?: string) => {
    if (!pendingMove || !onEventMove) return

    try {
      let finalDate = pendingMove.newDate

      if (newTime) {
        const [hours, minutes] = newTime.split(':').map(Number)
        finalDate = new Date(pendingMove.newDate)
        finalDate.setHours(hours, minutes, 0, 0)
      }

      await onEventMove(pendingMove.eventId, finalDate)
      toast.success(`Evento movido para ${format(pendingMove.newDate, 'd \'de\' MMMM', { locale: ptBR })}`)
      setPendingMove(null)
    } catch (error) {
      toast.error('Erro ao mover evento')
      console.error('Erro ao mover evento:', error)
      setPendingMove(null)
    }
  }

  const handleConfirmMoveWithPrazo = async () => {
    if (!pendingMoveWithPrazo || !onEventMoveWithPrazoFatal || !novoPrazoFatalSelecionado) return

    try {
      const originalDate = pendingMoveWithPrazo.eventData.data_inicio instanceof Date
        ? pendingMoveWithPrazo.eventData.data_inicio
        : new Date(pendingMoveWithPrazo.eventData.data_inicio)

      let finalDate = new Date(pendingMoveWithPrazo.newDate)
      finalDate.setHours(originalDate.getHours())
      finalDate.setMinutes(originalDate.getMinutes())
      finalDate.setSeconds(originalDate.getSeconds())

      await onEventMoveWithPrazoFatal(pendingMoveWithPrazo.eventId, finalDate, novoPrazoFatalSelecionado)
      toast.success('Tarefa e prazo fatal reagendados!')

      setPendingMoveWithPrazo(null)
      setNovoPrazoFatalSelecionado(null)
      setPrazoFatalWarningOpen(false)
    } catch (error) {
      toast.error('Erro ao mover tarefa')
      console.error('Erro ao mover tarefa:', error)
      setPendingMoveWithPrazo(null)
      setNovoPrazoFatalSelecionado(null)
      setPrazoFatalWarningOpen(false)
    }
  }

  const activeEvento = eventos.find((e) => e.id === activeId)

  // contagens — eventos por tipo, tarefas por prioridade
  const counts: Record<string, number> = { audiencia: 0, compromisso: 0, alta: 0, media: 0, baixa: 0 }
  eventos.forEach((e) => {
    if (e.tipo === 'audiencia') counts.audiencia++
    else if (e.tipo === 'compromisso') counts.compromisso++
    else counts[e.prioridade === 'alta' || e.prioridade === 'baixa' ? e.prioridade : 'media']++
  })
  const legendaEventos = [
    { c: EVENTO_COR.audiencia, label: 'Audiências', n: counts.audiencia },
    { c: EVENTO_COR.compromisso, label: 'Compromissos', n: counts.compromisso },
  ]
  const legendaTarefas = [
    { c: PRIORIDADE_COR.alta, label: 'Alta', n: counts.alta },
    { c: PRIORIDADE_COR.media, label: 'Média', n: counts.media },
    { c: PRIORIDADE_COR.baixa, label: 'Baixa', n: counts.baixa },
  ]

  const navBtn =
    'w-[30px] h-[30px] rounded-lg border border-[#e6e3da] dark:border-[#253345] text-[#2c3e50] dark:text-[#d8e2ef] inline-flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#1a212c] transition-colors'

  // Ocultar fim de semana (sáb/dom): 7 → 5 colunas
  const colStyle = { gridTemplateColumns: `repeat(${ocultarFds ? 5 : 7}, minmax(0, 1fr))` }
  const ehFds = (d: Date) => {
    const g = d.getDay()
    return g === 0 || g === 6
  }
  const dowVisiveis = DOW.map((label, i) => ({ label, i })).filter((x) => !ocultarFds || (x.i !== 0 && x.i !== 6))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex flex-col gap-3', className)}>
        {/* Barra única (design): período · visualizações · criar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* esquerda: mês + navegação + "hoje é" */}
          <div className="min-w-0 lg:justify-self-start">
            <div className="flex items-center gap-3">
              <h2
                className="text-[28px] font-medium text-[#2c3e50] dark:text-[#edf1f7] tracking-[-0.03em] leading-none capitalize"
                style={{ fontFamily: 'var(--font-fraunces)' }}
              >
                {format(currentDate, 'MMMM', { locale: ptBR })}{' '}
                <span className="text-[#9aa1a8] dark:text-[#5a6675] italic font-normal">
                  {format(currentDate, 'yyyy')}
                </span>
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={navigateBack} title="Mês anterior" className={navBtn}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={goToday} title="Ir para hoje" className={cn(navBtn, 'w-auto px-3 text-[12px] font-semibold')}>
                  Hoje
                </button>
                <button onClick={navigateForward} title="Próximo mês" className={navBtn}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#89bcbe] flex-shrink-0" />
              <span className="text-[12.5px] text-[#5a6775] dark:text-[#8a97a8]">
                Hoje é{' '}
                <span className="font-semibold text-[#34495e] dark:text-[#d8e2ef]">
                  {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </span>
            </div>
          </div>

          {/* centro: visualizações */}
          {viewMode && onViewModeChange && (
            <AgendaViewTabs viewMode={viewMode} onViewModeChange={onViewModeChange} className="lg:justify-self-center" />
          )}

          {/* direita: criar */}
          {onCreate && (
            <AgendaCreateButtons onCreate={onCreate} className="lg:justify-self-end" />
          )}
        </div>

        {/* Faixa de contexto: legenda + dica | filtros */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-[#e6e3da] dark:border-[#253345] pt-3">
          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap">
            {legendaEventos.map((l) => (
              <span
                key={l.label}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#5a6775] dark:text-[#8a97a8]"
              >
                <span className="w-[11px] h-[11px] rounded-[3.5px]" style={{ background: l.c }} />
                {l.label}
                <span className="font-mono text-[10.5px] font-bold text-[#9aa1a8] dark:text-[#5a6675]">{l.n}</span>
              </span>
            ))}
            <span className="w-px h-3.5 bg-[#e6e3da] dark:bg-[#253345]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa1a8] dark:text-[#5a6675]">Tarefas</span>
            {legendaTarefas.map((l) => (
              <span
                key={l.label}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#5a6775] dark:text-[#8a97a8]"
              >
                <span className="w-[11px] h-[11px] rounded-[3.5px]" style={{ background: l.c }} />
                {l.label}
                <span className="font-mono text-[10.5px] font-bold text-[#9aa1a8] dark:text-[#5a6675]">{l.n}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9aa1a8] dark:text-[#5a6675]">
              <Move className="w-3 h-3" />
              Arraste para reagendar
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFds}
              title={ocultarFds ? 'Mostrar sábado e domingo' : 'Ocultar sábado e domingo'}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] border text-[12px] font-semibold transition-colors',
                ocultarFds
                  ? 'border-[#89bcbe] text-[#34495e] dark:text-[#d8e2ef] bg-[#eef6f6] dark:bg-[#89bcbe]/[0.12]'
                  : 'border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] hover:border-[#89bcbe]',
              )}
            >
              {ocultarFds ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              Sáb/Dom
            </button>
            {filters && onFiltersChange && (
              <AgendaFiltersCompact filters={filters} onFiltersChange={onFiltersChange} />
            )}
          </div>
        </div>

        {/* Grade — quadro contínuo; divisórias via gap (uniformes, sem dobrar/sumir) */}
        <div className="rounded-[14px] overflow-hidden border border-[#e6e3da] dark:border-[#253345] shadow-sm dark:shadow-none flex flex-col gap-px bg-[#e6e3da] dark:bg-[#253345]">
          {/* dias da semana */}
          <div className="grid gap-px bg-[#e6e3da] dark:bg-[#253345]" style={colStyle}>
            {dowVisiveis.map(({ label, i }) => (
              <div
                key={label}
                className={cn(
                  'py-2.5 px-2 text-[10.5px] font-bold uppercase tracking-[0.08em] bg-[#faf8f2] dark:bg-[#0f141c]',
                  i === 0 || i === 6 ? 'text-[#9aa1a8] dark:text-[#5a6675]' : 'text-[#5a6775] dark:text-[#8a97a8]',
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* semanas */}
          {weeks.map((week, wi) => {
            const isCurrentWeek = wi === currentWeekIndex
            const max = isCurrentWeek ? 6 : 3
            const minHeight = isCurrentWeek ? 252 : 124
            const flexGrow = isCurrentWeek ? 1.9 : 1
            return (
              <div
                key={wi}
                className="grid gap-px bg-[#e6e3da] dark:bg-[#253345]"
                style={{ ...colStyle, flexGrow, flexBasis: 0, minHeight }}
              >
                {(ocultarFds ? week.filter((d) => !ehFds(d)) : week).map((day) => {
                  const inMonth = isSameMonth(day, currentDate)
                  const isTodayDate = isToday(day)
                  const isFeriadoDay = isFeriado(day)
                  const isWeekendDay = isWeekend(day)
                  const eventosDay = getEventosForDay(day)

                  const cellBg = !inMonth
                    ? 'bg-[#faf8f3] dark:bg-[#0e141d]'
                    : isTodayDate
                    ? 'bg-[#f3faf9] dark:bg-white/[0.04]'
                    : isFeriadoDay
                    ? 'bg-[#f7f4fa] dark:bg-[#171526]'
                    : isWeekendDay
                    ? 'bg-[#faf9f4] dark:bg-[#10161f]'
                    : 'bg-white dark:bg-[#151e2b]'

                  return (
                    <DroppableDay
                      key={format(day, 'yyyy-MM-dd')}
                      day={day}
                      className={cn('min-w-0', cellBg)}
                      onDateSelect={() => onDateSelect?.(day)}
                    >
                          {isTodayDate && (
                            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#34495e] to-[#46627f]" />
                          )}
                          {/* cabeçalho do dia */}
                          <div className="flex items-center justify-between gap-1">
                            {isTodayDate ? (
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[14px] font-semibold bg-gradient-to-br from-[#34495e] to-[#46627f] shadow-[0_2px_6px_-1px_rgba(52,73,94,0.5)]"
                                style={{ fontFamily: 'var(--font-fraunces)' }}
                              >
                                {format(day, 'd')}
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  'font-mono text-[12px] font-medium tracking-[-0.02em]',
                                  !inMonth || isWeekendDay
                                    ? 'text-[#9aa1a8] dark:text-[#5a6675]'
                                    : 'text-[#5a6775] dark:text-[#8a97a8]',
                                  isFeriadoDay && inMonth && 'text-[#7c5cbf] dark:text-[#a890e0]',
                                )}
                              >
                                {format(day, 'd')}
                              </span>
                            )}
                            {eventosDay.length > 0 && (
                              <span className="font-mono text-[9.5px] font-bold text-[#9aa1a8] dark:text-[#5a6675] bg-[#f1ede2] dark:bg-[#1d2a3c] rounded-[9px] min-w-[16px] h-4 px-[5px] inline-flex items-center justify-center">
                                {eventosDay.length}
                              </span>
                            )}
                          </div>

                          {/* itens do dia (arrastáveis) */}
                          <div className="flex flex-col gap-[3.5px] min-w-0">
                            {eventosDay.slice(0, max).map((evento) => (
                              <DraggableEvent
                                key={evento.id}
                                evento={evento}
                                onClick={() => onEventClick?.(evento)}
                              />
                            ))}
                            {eventosDay.length > max && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDateSelect?.(day)
                                }}
                                className="text-left text-[10.5px] font-bold text-[#89bcbe] pl-[9px] mt-px hover:underline"
                              >
                                +{eventosDay.length - max} mais
                              </button>
                            )}
                          </div>
                    </DroppableDay>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeEvento ? (
          <div className="rotate-2 scale-105 shadow-2xl" style={{ cursor: 'grabbing' }}>
            <CalendarEventMiniCard
              id={activeEvento.id}
              titulo={activeEvento.titulo}
              tipo={activeEvento.tipo}
              prioridade={activeEvento.prioridade}
              data_inicio={activeEvento.data_inicio}
              dia_inteiro={activeEvento.dia_inteiro}
              status={activeEvento.status}
              prazo_data_limite={activeEvento.prazo_data_limite}
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* Modal de Confirmação Normal */}
      {pendingMove && (
        <ConfirmDateChangeModal
          open={!!pendingMove}
          onOpenChange={(open) => {
            if (!open) setPendingMove(null)
          }}
          onConfirm={handleConfirmMove}
          eventTitle={pendingMove.eventData.titulo}
          eventType={pendingMove.eventData.tipo}
          oldDate={pendingMove.eventData.data_inicio}
          newDate={pendingMove.newDate}
        />
      )}

      {/* Modal de Aviso - Arrasto Ultrapassa Prazo Fatal */}
      <AlertDialog
        open={prazoFatalWarningOpen}
        onOpenChange={(open) => {
          setPrazoFatalWarningOpen(open)
          if (!open) {
            setPendingMoveWithPrazo(null)
            setNovoPrazoFatalSelecionado(null)
          }
        }}
      >
        <AlertDialogContent className="max-w-md p-0 overflow-hidden border-0">
          <div className="bg-white dark:bg-surface-1 rounded-lg">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f0f9f9] dark:bg-teal-900/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#46627f] dark:text-slate-400" />
                </div>
                <div>
                  <AlertDialogTitle className="text-base font-semibold text-[#34495e] dark:text-slate-200">
                    Reagendar Prazo Fatal
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-[#46627f] dark:text-slate-400 mt-0.5">
                    A nova data de execução ultrapassa o prazo fatal atual
                  </AlertDialogDescription>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#f0f9f9] dark:bg-teal-900/20 rounded-lg border border-[#89bcbe]/30">
                  <p className="text-[10px] text-[#46627f] dark:text-slate-400 mb-1">Nova Data Execução</p>
                  <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                    {pendingMoveWithPrazo?.newDate && format(pendingMoveWithPrazo.newDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-surface-0 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Prazo Fatal Atual</p>
                  <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                    {pendingMoveWithPrazo?.prazoFatal && format(pendingMoveWithPrazo.prazoFatal, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#46627f] dark:text-slate-400">Escolha a nova data para o prazo fatal:</p>

              <Popover open={prazoFatalCalendarOpen} onOpenChange={setPrazoFatalCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-10 border-[#89bcbe]/50 hover:border-[#89bcbe] hover:bg-[#f0f9f9]"
                  >
                    <Calendar className="mr-2 h-4 w-4 text-[#89bcbe]" />
                    {novoPrazoFatalSelecionado ? (
                      <span className="text-[#34495e] dark:text-slate-200 font-medium">
                        {format(novoPrazoFatalSelecionado, 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">Selecionar data...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={novoPrazoFatalSelecionado || undefined}
                    onSelect={(date) => {
                      if (date) {
                        setNovoPrazoFatalSelecionado(date)
                        setPrazoFatalCalendarOpen(false)
                      }
                    }}
                    disabled={(date) => date < (pendingMoveWithPrazo?.newDate || new Date())}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-0/50">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleConfirmMoveWithPrazo}
                  className="flex-1 h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!onEventMoveWithPrazoFatal || !novoPrazoFatalSelecionado}
                >
                  Confirmar e Reagendar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrazoFatalWarningOpen(false)
                    setPendingMoveWithPrazo(null)
                    setNovoPrazoFatalSelecionado(null)
                  }}
                  className="flex-1 h-9 text-xs font-medium border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-surface-1 text-[#46627f] dark:text-slate-400"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  )
}
