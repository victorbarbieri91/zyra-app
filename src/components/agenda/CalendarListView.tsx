'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  CalendarDays,
  Clock,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { useAgendaConsolidada, AgendaItem } from '@/hooks/useAgendaConsolidada'
import { Tarefa, useTarefas } from '@/hooks/useTarefas'
import { Audiencia } from '@/hooks/useAudiencias'
import { Evento } from '@/hooks/useEventos'
import AgendaListCard from './AgendaListCard'
import { startOfDay, endOfDay, addDays, subDays, format, isSameDay, isBefore, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CalendarListViewProps {
  escritorioId?: string
  userId?: string
  onTarefaClick: (tarefa: Tarefa) => void
  onAudienciaClick: (audiencia: Audiencia) => void
  onEventoClick: (evento: Evento) => void
  onTaskComplete?: (tarefaId: string) => void
  className?: string
}

export default function CalendarListView({
  escritorioId,
  userId,
  onTarefaClick,
  onAudienciaClick,
  onEventoClick,
  onTaskComplete,
  className,
}: CalendarListViewProps) {
  const [periodoSelecionado, setPeriodoSelecionado] = useState('proximos-7d')

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

  // Carregar dados COM filtro de escritorio (seguranca)
  const { items, loading } = useAgendaConsolidada(escritorioId)

  // Filtrar items
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

    return filtered
  }, [items, dataInicio, dataFim, userId])

  // Agrupar por dia e ordenar
  const itemsAgrupados = useMemo(() => {
    const grupos: Record<string, AgendaItem[]> = {}

    itemsFiltrados.forEach((item) => {
      const dataKey = format(parseDBDate(item.data_inicio), 'yyyy-MM-dd')
      if (!grupos[dataKey]) {
        grupos[dataKey] = []
      }
      grupos[dataKey].push(item)
    })

    // Helper para verificar urgência do prazo fatal
    // Apenas tarefas têm prazo_data_limite (audiências e eventos não)
    const getUrgenciaPrazoFatal = (item: AgendaItem): number => {
      // Só considerar prazo fatal para tarefas
      if (item.tipo_entidade !== 'tarefa') return 99
      if (!item.prazo_data_limite) return 99

      const prazoDate = parseDBDate(item.prazo_data_limite)
      const hoje = startOfDay(new Date())

      if (isBefore(prazoDate, hoje)) return 0 // Vencido - máxima prioridade
      if (isToday(prazoDate)) return 1 // Hoje - alta prioridade
      return 99 // Futuro - prioridade normal
    }

    // Ordenar cada grupo
    Object.keys(grupos).forEach((dataKey) => {
      grupos[dataKey].sort((a, b) => {
        // 0. Prioridade máxima: prazo fatal urgente (hoje/vencido)
        const urgenciaA = getUrgenciaPrazoFatal(a)
        const urgenciaB = getUrgenciaPrazoFatal(b)
        if (urgenciaA !== urgenciaB) return urgenciaA - urgenciaB

        // 1. Audiências primeiro (mais importante), depois tarefas, depois compromissos
        const tipoOrdem = { audiencia: 1, tarefa: 2, evento: 3 }
        const ordemA = tipoOrdem[a.tipo_entidade] ?? 99
        const ordemB = tipoOrdem[b.tipo_entidade] ?? 99

        if (ordemA !== ordemB) {
          return ordemA - ordemB
        }

        // 2. Dentro de tarefas: ordenar por prioridade
        if (a.tipo_entidade === 'tarefa' && b.tipo_entidade === 'tarefa') {
          const prioOrdem = { alta: 1, media: 2, baixa: 3 }
          const prioA = prioOrdem[a.prioridade || 'media']
          const prioB = prioOrdem[b.prioridade || 'media']

          if (prioA !== prioB) {
            return prioA - prioB
          }
        }

        // 3. Por horário planejado (tarefas)
        if (
          a.tipo_entidade === 'tarefa' &&
          b.tipo_entidade === 'tarefa' &&
          a.horario_planejado_dia &&
          b.horario_planejado_dia
        ) {
          return a.horario_planejado_dia.localeCompare(b.horario_planejado_dia)
        }

        // 4. Por data/hora de início
        return parseDBDate(a.data_inicio).getTime() - parseDBDate(b.data_inicio).getTime()
      })
    })

    // Ordenar as chaves das datas
    const datasOrdenadas = Object.keys(grupos).sort((a, b) => {
      if (isPassado) {
        return b.localeCompare(a) // Ordem decrescente (passado mais recente primeiro)
      } else {
        return a.localeCompare(b) // Ordem crescente (futuro)
      }
    })

    return datasOrdenadas.map((dataKey) => ({
      data: parseDBDate(dataKey),
      items: grupos[dataKey],
    }))
  }, [itemsFiltrados, isPassado])

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = itemsFiltrados.length
    const tarefas = itemsFiltrados.filter((i) => i.tipo_entidade === 'tarefa').length
    const audiencias = itemsFiltrados.filter((i) => i.tipo_entidade === 'audiencia').length
    const compromissos = itemsFiltrados.filter((i) => i.tipo_entidade === 'evento').length
    const pendentes = itemsFiltrados.filter((i) => i.status === 'pendente').length
    const criticos = itemsFiltrados.filter(
      (i) => i.tipo_entidade === 'tarefa' && i.prioridade === 'alta' && i.status !== 'concluida'
    ).length

    return { total, tarefas, audiencias, compromissos, pendentes, criticos }
  }, [itemsFiltrados])

  // Handler de click
  const handleItemClick = (item: AgendaItem) => {
    if (item.tipo_entidade === 'tarefa') {
      // Converter AgendaItem para Tarefa
      onTarefaClick(item as unknown as Tarefa)
    } else if (item.tipo_entidade === 'audiencia') {
      onAudienciaClick(item as unknown as Audiencia)
    } else {
      onEventoClick(item as unknown as Evento)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Compacto */}
      <div className="flex items-center justify-between px-1">
        {/* Dropdown de Período */}
        <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
          <SelectTrigger className="w-[180px] h-8 text-xs border-slate-200">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-[#89bcbe]" />
              <SelectValue placeholder="Período" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#89bcbe]" />
                <span>Hoje</span>
              </div>
            </SelectItem>
            <SelectItem value="proximos-3d">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>Próximos 3 dias</span>
              </div>
            </SelectItem>
            <SelectItem value="proximos-7d">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>Próximos 7 dias</span>
              </div>
            </SelectItem>
            <SelectItem value="proximos-30d">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>Próximos 30 dias</span>
              </div>
            </SelectItem>
            <SelectItem value="ultimos-3d">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Últimos 3 dias</span>
              </div>
            </SelectItem>
            <SelectItem value="ultimos-7d">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Últimos 7 dias</span>
              </div>
            </SelectItem>
            <SelectItem value="ultimos-30d">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Últimos 30 dias</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[#6c757d]">
            {estatisticas.total} {estatisticas.total === 1 ? 'item' : 'itens'}
          </span>
        </div>
      </div>

      {/* Lista de Items Agrupados por Dia */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-8 pb-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Clock className="w-5 h-5 animate-spin mr-2" />
              <span>Carregando...</span>
            </div>
          )}

          {!loading && itemsAgrupados.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum item encontrado</p>
                <p className="text-sm">Tente ajustar os filtros ou período selecionado</p>
              </CardContent>
            </Card>
          )}

          {!loading &&
            itemsAgrupados.map((grupo) => {
              const ehHoje = isSameDay(grupo.data, new Date())
              return (
                <div key={grupo.data.toISOString()} className="space-y-3">
                  {/* Cabeçalho do Dia */}
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm',
                        ehHoje
                          ? 'bg-gradient-to-br from-[#89bcbe] to-[#aacfd0]'
                          : 'bg-gradient-to-br from-[#34495e] to-[#46627f]'
                      )}
                    >
                      <span className="text-sm">{format(grupo.data, 'd', { locale: ptBR })}</span>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-[#34495e]">
                        {ehHoje ? 'Hoje' : format(grupo.data, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </h3>
                      <p className="text-[11px] text-[#6c757d]">
                        {grupo.items.length} {grupo.items.length === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                  </div>

                  {/* Lista de Items do Dia */}
                  <div className="space-y-3">
                    {grupo.items.map((item) => (
                      <AgendaListCard
                        key={item.id}
                        item={item}
                        onClick={() => handleItemClick(item)}
                        onComplete={item.tipo_entidade === 'tarefa' && onTaskComplete
                          ? () => onTaskComplete(item.id)
                          : undefined}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      </ScrollArea>
    </div>
  )
}
