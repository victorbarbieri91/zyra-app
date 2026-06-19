'use client'

import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, CalendarDays, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { useAgendaConsolidada, AgendaItem } from '@/hooks/useAgendaConsolidada'
import { Tarefa } from '@/hooks/useTarefas'
import { Audiencia } from '@/hooks/useAudiencias'
import { Evento } from '@/hooks/useEventos'
import AgendaTimelineRow from './AgendaTimelineRow'
import { AgendaViewTabs, AgendaCreateButtons } from './AgendaTopBar'
import { startOfDay, endOfDay, addDays, subDays, format, isSameDay, isBefore, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ViewMode = 'month' | 'week' | 'day' | 'list'
type TipoFiltro = 'todos' | 'tarefa' | 'audiencia' | 'evento'

interface CalendarListViewProps {
  escritorioId?: string
  userId?: string
  // barra V4 (visualizações + criar)
  viewMode?: ViewMode
  onViewModeChange?: (v: ViewMode) => void
  onCreate?: (tipo: 'compromisso' | 'audiencia' | 'tarefa') => void
  // abrir detalhe
  onTarefaClick: (tarefa: Tarefa) => void
  onAudienciaClick: (audiencia: Audiencia) => void
  onEventoClick: (evento: Evento) => void
  // concluir / reabrir
  onTaskComplete?: (tarefaId: string) => void
  onAudienciaComplete?: (audienciaId: string) => void
  onEventoComplete?: (eventoId: string) => void
  onTaskReopen?: (tarefaId: string) => void
  onAudienciaReopen?: (audienciaId: string) => void
  onEventoReopen?: (eventoId: string) => void
  // ações extras (Reagendar · Horas · Concluir em todos os tipos)
  onLancarHoras?: (taskId: string) => void
  onRescheduleTask?: (taskId: string, newDate: Date) => void
  onRescheduleEvento?: (eventoId: string, newDate: Date) => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
  className?: string
}

// rótulo do período (prefixo + ênfase em itálico, fiel ao design)
const PERIODO_META: Record<string, { prefix: string; emph: string | null }> = {
  'hoje': { prefix: 'Hoje', emph: null },
  'proximos-3d': { prefix: 'Próximos', emph: '3 dias' },
  'proximos-7d': { prefix: 'Próximos', emph: '7 dias' },
  'proximos-30d': { prefix: 'Próximos', emph: '30 dias' },
  'ultimos-3d': { prefix: 'Últimos', emph: '3 dias' },
  'ultimos-7d': { prefix: 'Últimos', emph: '7 dias' },
  'ultimos-30d': { prefix: 'Últimos', emph: '30 dias' },
}

const TIPO_PILLS: { v: TipoFiltro; l: string }[] = [
  { v: 'todos', l: 'Todos' },
  { v: 'tarefa', l: 'Tarefas' },
  { v: 'audiencia', l: 'Audiências' },
  { v: 'evento', l: 'Compromissos' },
]

const COMPLETED = ['concluida', 'concluido', 'realizada', 'realizado']

export default function CalendarListView({
  escritorioId,
  userId,
  viewMode,
  onViewModeChange,
  onCreate,
  onTarefaClick,
  onAudienciaClick,
  onEventoClick,
  onTaskComplete,
  onAudienciaComplete,
  onEventoComplete,
  onTaskReopen,
  onAudienciaReopen,
  onEventoReopen,
  onLancarHoras,
  onRescheduleTask,
  onRescheduleEvento,
  onProcessoClick,
  onConsultivoClick,
  className,
}: CalendarListViewProps) {
  const [periodoSelecionado, setPeriodoSelecionado] = useState('proximos-7d')
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos')

  // Calcular intervalo de datas baseado no período
  const { dataInicio, dataFim, isPassado } = useMemo(() => {
    const hoje = startOfDay(new Date())

    const periodos: Record<string, { inicio: Date; fim: Date; passado: boolean }> = {
      'hoje': { inicio: hoje, fim: endOfDay(hoje), passado: false },
      'proximos-3d': { inicio: hoje, fim: endOfDay(addDays(hoje, 3)), passado: false },
      'proximos-7d': { inicio: hoje, fim: endOfDay(addDays(hoje, 7)), passado: false },
      'proximos-30d': { inicio: hoje, fim: endOfDay(addDays(hoje, 30)), passado: false },
      'ultimos-3d': { inicio: startOfDay(subDays(hoje, 3)), fim: endOfDay(hoje), passado: true },
      'ultimos-7d': { inicio: startOfDay(subDays(hoje, 7)), fim: endOfDay(hoje), passado: true },
      'ultimos-30d': { inicio: startOfDay(subDays(hoje, 30)), fim: endOfDay(hoje), passado: true },
    }

    const periodo = periodos[periodoSelecionado] || periodos['proximos-7d']

    return {
      dataInicio: periodo.inicio,
      dataFim: periodo.fim,
      isPassado: periodo.passado,
    }
  }, [periodoSelecionado])

  // Pedir ao banco SÓ o intervalo do período selecionado. Sem isso, o hook puxa
  // todos os itens do escritório e o PostgREST corta nas 1.000 linhas mais antigas
  // (ordem data_inicio asc) — escondendo os próximos dias. (igual Mês/Dia/Kanban)
  const agendaFilters = useMemo(
    () => ({ data_inicio: dataInicio.toISOString(), data_fim: dataFim.toISOString() }),
    [dataInicio, dataFim]
  )

  // Carregar dados COM filtro de escritorio (seguranca) + janela de datas
  const { items, loading } = useAgendaConsolidada(escritorioId, agendaFilters)

  // Filtrar items (período + usuário + tipo + esconder concluídos no futuro)
  const itemsFiltrados = useMemo(() => {
    if (!items) return []

    let filtered = [...items]

    // Filtro por período
    filtered = filtered.filter((item) => {
      const itemDate = parseDBDate(item.data_inicio)
      return itemDate >= dataInicio && itemDate <= dataFim
    })

    // Filtro por usuário (inclui items sem responsável para retrocompatibilidade)
    if (userId) {
      filtered = filtered.filter((item) =>
        !item.responsaveis_ids?.length || item.responsaveis_ids.includes(userId)
      )
    }

    // Filtro por tipo (pills)
    if (tipoFiltro !== 'todos') {
      filtered = filtered.filter((item) => item.tipo_entidade === tipoFiltro)
    }

    // Em períodos de futuro/hoje, esconder itens já concluídos (igual à visão de mês).
    // Nos períodos de passado ("últimos X dias") mantemos os concluídos para revisão.
    if (!isPassado) {
      filtered = filtered.filter((item) => !COMPLETED.includes(item.status || ''))
    }

    return filtered
  }, [items, dataInicio, dataFim, userId, tipoFiltro, isPassado])

  // Agrupar por dia e ordenar
  const itemsAgrupados = useMemo(() => {
    const grupos: Record<string, AgendaItem[]> = {}

    itemsFiltrados.forEach((item) => {
      const dataKey = format(parseDBDate(item.data_inicio), 'yyyy-MM-dd')
      if (!grupos[dataKey]) grupos[dataKey] = []
      grupos[dataKey].push(item)
    })

    // Urgência do prazo fatal (apenas tarefas têm prazo_data_limite)
    const getUrgenciaPrazoFatal = (item: AgendaItem): number => {
      if (item.tipo_entidade !== 'tarefa') return 99
      if (!item.prazo_data_limite) return 99
      const prazoDate = parseDBDate(item.prazo_data_limite)
      const hoje = startOfDay(new Date())
      if (isBefore(prazoDate, hoje)) return 0 // Vencido — máxima prioridade
      if (isToday(prazoDate)) return 1 // Hoje — alta prioridade
      return 99 // Futuro — normal
    }

    // Ordenar cada grupo
    Object.keys(grupos).forEach((dataKey) => {
      grupos[dataKey].sort((a, b) => {
        // 0. Prazo fatal urgente (hoje/vencido) primeiro
        const urgenciaA = getUrgenciaPrazoFatal(a)
        const urgenciaB = getUrgenciaPrazoFatal(b)
        if (urgenciaA !== urgenciaB) return urgenciaA - urgenciaB

        // 1. Audiências > tarefas > compromissos
        const tipoOrdem = { audiencia: 1, tarefa: 2, evento: 3 }
        const ordemA = tipoOrdem[a.tipo_entidade] ?? 99
        const ordemB = tipoOrdem[b.tipo_entidade] ?? 99
        if (ordemA !== ordemB) return ordemA - ordemB

        // 2. Dentro de tarefas: prioridade
        if (a.tipo_entidade === 'tarefa' && b.tipo_entidade === 'tarefa') {
          const prioOrdem = { alta: 1, media: 2, baixa: 3 }
          const prioA = prioOrdem[a.prioridade || 'media']
          const prioB = prioOrdem[b.prioridade || 'media']
          if (prioA !== prioB) return prioA - prioB
        }

        // 3. Por horário planejado (tarefas)
        if (
          a.tipo_entidade === 'tarefa' && b.tipo_entidade === 'tarefa' &&
          a.horario_planejado_dia && b.horario_planejado_dia
        ) {
          return a.horario_planejado_dia.localeCompare(b.horario_planejado_dia)
        }

        // 4. Por data/hora de início
        return parseDBDate(a.data_inicio).getTime() - parseDBDate(b.data_inicio).getTime()
      })
    })

    // Ordenar datas (futuro crescente, passado decrescente)
    const datasOrdenadas = Object.keys(grupos).sort((a, b) =>
      isPassado ? b.localeCompare(a) : a.localeCompare(b)
    )

    return datasOrdenadas.map((dataKey) => ({
      data: parseDBDate(dataKey),
      items: grupos[dataKey],
    }))
  }, [itemsFiltrados, isPassado])

  const totalVisivel = itemsFiltrados.length
  const meta = PERIODO_META[periodoSelecionado] || PERIODO_META['proximos-7d']

  // subtítulo da barra (a partir de / até hoje)
  const subtitulo = isPassado
    ? <>Desde <span className="font-semibold text-[#34495e] dark:text-[#d8e2ef] capitalize">{format(dataInicio, "d 'de' MMMM", { locale: ptBR })}</span> até hoje</>
    : periodoSelecionado === 'hoje'
      ? <>Hoje é <span className="font-semibold text-[#34495e] dark:text-[#d8e2ef] capitalize">{format(dataInicio, "EEEE, d 'de' MMMM", { locale: ptBR })}</span></>
      : <>A partir de <span className="font-semibold text-[#34495e] dark:text-[#d8e2ef] capitalize">{format(dataInicio, "EEEE, d 'de' MMMM", { locale: ptBR })}</span></>

  // ── dispatch de ações por tipo ──
  const handleViewDetails = (item: AgendaItem) => {
    if (item.tipo_entidade === 'tarefa') onTarefaClick(item as unknown as Tarefa)
    else if (item.tipo_entidade === 'audiencia') onAudienciaClick(item as unknown as Audiencia)
    else onEventoClick(item as unknown as Evento)
  }
  const dispatchComplete = (item: AgendaItem) => {
    if (item.tipo_entidade === 'tarefa') onTaskComplete?.(item.id)
    else if (item.tipo_entidade === 'audiencia') onAudienciaComplete?.(item.id)
    else onEventoComplete?.(item.id)
  }
  const dispatchReopen = (item: AgendaItem) => {
    if (item.tipo_entidade === 'tarefa') onTaskReopen?.(item.id)
    else if (item.tipo_entidade === 'audiencia') onAudienciaReopen?.(item.id)
    else onEventoReopen?.(item.id)
  }

  const periodoTriggerCls = 'w-auto h-9 gap-2 rounded-[10px] border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] text-[13px] font-semibold text-[#34495e] dark:text-[#d8e2ef] focus:ring-0 focus:ring-offset-0'

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Barra única (design): período · visualizações · criar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* esquerda: título do período + "a partir de…" */}
        <div className="min-w-0 lg:justify-self-start">
          <h2
            className="text-[28px] font-medium text-[#2c3e50] dark:text-[#edf1f7] tracking-[-0.03em] leading-none"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            {meta.prefix}
            {meta.emph && (
              <span className="text-[#9aa1a8] dark:text-[#5a6675] italic font-normal"> {meta.emph}</span>
            )}
          </h2>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#89bcbe] flex-shrink-0" />
            <span className="text-[12.5px] text-[#5a6775] dark:text-[#8a97a8]">{subtitulo}</span>
          </div>
        </div>

        {/* centro: visualizações */}
        {viewMode && onViewModeChange && (
          <AgendaViewTabs viewMode={viewMode} onViewModeChange={onViewModeChange} className="lg:justify-self-center" />
        )}

        {/* direita: criar */}
        {onCreate && <AgendaCreateButtons onCreate={onCreate} className="lg:justify-self-end" />}
      </div>

      {/* Faixa de contexto: período + filtro de tipo | contador */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-t border-[#e6e3da] dark:border-[#253345] pt-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
            <SelectTrigger className={periodoTriggerCls}>
              <Calendar className="w-3.5 h-3.5 text-[#89bcbe]" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje"><span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-[#89bcbe]" />Hoje</span></SelectItem>
              <SelectItem value="proximos-3d"><span className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-[#3f7376]" />Próximos 3 dias</span></SelectItem>
              <SelectItem value="proximos-7d"><span className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-[#3f7376]" />Próximos 7 dias</span></SelectItem>
              <SelectItem value="proximos-30d"><span className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-[#3f7376]" />Próximos 30 dias</span></SelectItem>
              <SelectItem value="ultimos-3d"><span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-[#8a6438]" />Últimos 3 dias</span></SelectItem>
              <SelectItem value="ultimos-7d"><span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-[#8a6438]" />Últimos 7 dias</span></SelectItem>
              <SelectItem value="ultimos-30d"><span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-[#8a6438]" />Últimos 30 dias</span></SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-5 bg-[#e6e3da] dark:bg-[#253345]" />

          <div className="flex items-center gap-1.5 flex-wrap">
            {TIPO_PILLS.map((p) => {
              const on = tipoFiltro === p.v
              return (
                <button
                  key={p.v}
                  onClick={() => setTipoFiltro(p.v)}
                  className={cn(
                    'h-8 px-3 rounded-lg text-[12px] font-semibold border transition-all',
                    on
                      ? 'bg-gradient-to-br from-[#34495e] to-[#46627f] text-white border-transparent'
                      : 'border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] hover:border-[#89bcbe]',
                  )}
                >
                  {p.l}
                </button>
              )
            })}
          </div>
        </div>

        <span className="text-[11.5px] text-[#9aa1a8] dark:text-[#5a6675]">
          <strong className="font-semibold text-[#5a6775] dark:text-[#8a97a8] font-mono">{totalVisivel}</strong>{' '}
          {totalVisivel === 1 ? 'item no período' : 'itens no período'}
        </span>
      </div>

      {/* Lista por dia (timeline). Scroll com div comum (não ScrollArea/Radix):
          o layout de tabela do Radix quebra o `truncate` do título e estoura a
          largura, empurrando os botões para fora da tela. */}
      <div className="overflow-y-auto overflow-x-hidden h-[calc(100vh-235px)] pr-1">
        <div className="flex flex-col gap-6 pb-6 min-w-0">
          {loading && (
            <div className="flex items-center justify-center py-12 text-[#5a6775] dark:text-[#8a97a8]">
              <Clock className="w-5 h-5 animate-spin mr-2" />
              <span className="text-[13px]">Carregando…</span>
            </div>
          )}

          {!loading && itemsAgrupados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f1ede2] dark:bg-[#1d2a3c] flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-[#9aa1a8] dark:text-[#5a6675]" />
              </div>
              <p className="text-[14px] font-medium text-[#34495e] dark:text-[#d8e2ef]">Nenhum item encontrado</p>
              <p className="text-[12.5px] text-[#5a6775] dark:text-[#8a97a8] mt-0.5">Ajuste o período ou os filtros de tipo.</p>
            </div>
          )}

          {!loading &&
            itemsAgrupados.map((grupo) => {
              const ehHoje = isSameDay(grupo.data, new Date())
              return (
                <div key={grupo.data.toISOString()}>
                  {/* Cabeçalho do dia */}
                  <div className="flex items-center gap-3 pb-3 pl-0.5">
                    <span
                      className={cn(
                        'w-[34px] h-[34px] rounded-[10px] inline-flex items-center justify-center flex-shrink-0 text-[16px] font-medium tracking-[-0.02em]',
                        ehHoje
                          ? 'text-white bg-gradient-to-br from-[#34495e] to-[#46627f] shadow-[0_2px_8px_-2px_rgba(52,73,94,0.5)]'
                          : 'text-[#2c3e50] dark:text-[#edf1f7] bg-[#efece4] dark:bg-[#161f2c]',
                      )}
                      style={{ fontFamily: 'var(--font-fraunces)' }}
                    >
                      {format(grupo.data, 'd', { locale: ptBR })}
                    </span>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-[14px] font-bold text-[#2c3e50] dark:text-[#edf1f7] tracking-[-0.01em] capitalize">
                        {ehHoje ? 'Hoje' : format(grupo.data, 'EEEE', { locale: ptBR })}
                      </span>
                      <span className="text-[12px] text-[#9aa1a8] dark:text-[#5a6675]">
                        {grupo.items.length} {grupo.items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-[#f0ede3] dark:bg-[#253345] ml-1" />
                  </div>

                  {/* Trilha do dia */}
                  <div className="pl-0.5">
                    {grupo.items.map((item, i) => (
                      <AgendaTimelineRow
                        key={item.id}
                        item={item}
                        first={i === 0}
                        last={i === grupo.items.length - 1}
                        onViewDetails={() => handleViewDetails(item)}
                        onComplete={() => dispatchComplete(item)}
                        onReopen={() => dispatchReopen(item)}
                        onLancarHoras={onLancarHoras ? () => onLancarHoras(item.id) : undefined}
                        onReschedule={
                          item.tipo_entidade === 'tarefa'
                            ? (onRescheduleTask ? (d) => onRescheduleTask(item.id, d) : undefined)
                            : (onRescheduleEvento ? (d) => onRescheduleEvento(item.id, d) : undefined)
                        }
                        onProcessoClick={onProcessoClick}
                        onConsultivoClick={onConsultivoClick}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
