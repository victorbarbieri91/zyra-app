'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritoriosDoGrupoUsuario } from './useEscritoriosDoGrupoUsuario'
import { startOfDayInBrazil, endOfDayInBrazil, formatBrazilTime, parseDBDate, isToday } from '@/lib/timezone'

export interface AgendaItemDashboard {
  id: string
  tipo: 'audiencia' | 'evento' | 'tarefa' | 'prazo'
  time: string // Formato HH:mm
  title: string
  subtitle: string
  color: string
  urgente?: boolean
  processo_id?: string
  processo_numero?: string
  consultivo_id?: string
  caso_titulo?: string
  consultivo_titulo?: string
  descricao?: string
  local?: string
  prioridade?: string
  status?: string
  data_inicio?: string
  dia_inteiro?: boolean
  prazo_data_limite?: string
  responsavel_nome?: string
  todos_responsaveis?: string
  created_at?: string
}

// Mapeamento de cores por tipo
const colorMap: Record<string, string> = {
  audiencia: 'bg-red-500',
  prazo_processual: 'bg-amber-500',
  prazo_fatal: 'bg-red-600',
  prazo_administrativo: 'bg-amber-400',
  evento: 'bg-[#1E3A8A]',
  tarefa: 'bg-[#89bcbe]',
  compromisso: 'bg-[#89bcbe]',
}

async function fetchDashboardAgenda(
  supabase: ReturnType<typeof createClient>,
  escritoriosIds: string[],
): Promise<AgendaItemDashboard[]> {
  if (escritoriosIds.length === 0) return []

  // Buscar usuário logado para filtrar apenas seus itens
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const inicioHoje = startOfDayInBrazil(new Date())
  const fimHoje = endOfDayInBrazil(new Date())

  // Buscar apenas itens onde o usuário está no array de responsáveis.
  // O dashboard considera TODOS os escritórios do grupo do usuário.
  const { data, error: queryError } = await supabase
    .from('v_agenda_consolidada')
    .select('*')
    .in('escritorio_id', escritoriosIds)
    .contains('responsaveis_ids', [user.id])
    .gte('data_inicio', inicioHoje.toISOString())
    .lte('data_inicio', fimHoje.toISOString())
    // Esconde itens já encerrados: tarefa concluída, compromisso realizado e
    // audiência realizada (cancelados já saem pela própria view).
    .not('status', 'in', '("concluida","realizado","realizada")')
    .order('data_inicio', { ascending: true })
    .limit(20)

  if (queryError) throw queryError

  // Transformar para formato do dashboard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agendaItems: AgendaItemDashboard[] = (data || []).map((item: any) => {
    const dataInicio = parseDBDate(item.data_inicio)
    const time = item.dia_inteiro ? 'Dia todo' : formatBrazilTime(dataInicio)

    // Determinar o tipo e cor
    let tipo: 'audiencia' | 'evento' | 'tarefa' | 'prazo' = 'evento'
    let color = colorMap.evento

    if (item.tipo_entidade === 'audiencia') {
      tipo = 'audiencia'
      color = colorMap.audiencia
    } else if (item.tipo_entidade === 'tarefa') {
      if (item.subtipo?.includes('prazo')) {
        tipo = 'tarefa'
        color = colorMap[item.subtipo] || colorMap.prazo_processual
      } else {
        tipo = 'tarefa'
        color = colorMap.tarefa
      }
    } else {
      tipo = 'evento'
      color = colorMap[item.subtipo] || colorMap.evento
    }

    // Verificar urgência (prazos vencendo hoje ou prioridade alta)
    const urgente = item.prioridade === 'alta' ||
      (item.prazo_data_limite && isToday(item.prazo_data_limite))

    // Construir subtítulo
    let subtitle = item.descricao || ''
    if (item.processo_numero) {
      subtitle = `Processo ${item.processo_numero}`
    } else if (item.consultivo_titulo) {
      subtitle = item.consultivo_titulo
    } else if (item.local) {
      subtitle = item.local
    }

    return {
      id: item.id,
      tipo,
      time,
      title: item.titulo,
      subtitle: subtitle || tipo.charAt(0).toUpperCase() + tipo.slice(1),
      color,
      urgente,
      processo_id: item.processo_id || undefined,
      processo_numero: item.processo_numero,
      consultivo_id: item.consultivo_id || undefined,
      caso_titulo: item.caso_titulo || undefined,
      consultivo_titulo: item.consultivo_titulo || undefined,
      descricao: item.descricao || undefined,
      local: item.local || undefined,
      prioridade: item.prioridade || undefined,
      status: item.status || undefined,
      data_inicio: item.data_inicio || undefined,
      dia_inteiro: item.dia_inteiro || false,
      prazo_data_limite: item.prazo_data_limite || undefined,
      responsavel_nome: item.responsavel_nome || undefined,
      todos_responsaveis: item.todos_responsaveis || undefined,
      created_at: item.created_at || undefined,
    }
  })

  // Ordenar por prioridade: alta > media > baixa > sem prioridade, depois por horário
  const prioridadeOrdem: Record<string, number> = { alta: 0, media: 1, baixa: 2 }
  agendaItems.sort((a, b) => {
    const prioA = prioridadeOrdem[a.prioridade || ''] ?? 3
    const prioB = prioridadeOrdem[b.prioridade || ''] ?? 3
    if (prioA !== prioB) return prioA - prioB
    // Mesmo nível de prioridade: ordenar por horário
    return (a.data_inicio || '').localeCompare(b.data_inicio || '')
  })

  return agendaItems
}

export function useDashboardAgenda() {
  const { escritoriosIds } = useEscritoriosDoGrupoUsuario()
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  // Chave estável independente da ordem.
  const escritoriosKey = [...escritoriosIds].sort().join(',')

  const { data: items = [], isLoading: loading, error } = useQuery({
    queryKey: ['dashboard', 'agenda', escritoriosKey],
    queryFn: () => fetchDashboardAgenda(supabaseRef.current, escritoriosIds),
    enabled: escritoriosIds.length > 0,
    staleTime: 2 * 60 * 1000,
  })

  // Supabase Realtime: um canal por escritório do grupo.
  useEffect(() => {
    if (escritoriosIds.length === 0) return

    const supabase = supabaseRef.current
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'agenda', escritoriosKey] })

    const channels = escritoriosIds.map((escId) =>
      supabase
        .channel(`dashboard-agenda-${escId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'agenda_tarefas',
          filter: `escritorio_id=eq.${escId}`,
        }, invalidate)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'agenda_eventos',
          filter: `escritorio_id=eq.${escId}`,
        }, invalidate)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'agenda_audiencias',
          filter: `escritorio_id=eq.${escId}`,
        }, invalidate)
        .subscribe(),
    )

    return () => {
      channels.forEach((c) => supabase.removeChannel(c))
    }
  }, [escritoriosKey, escritoriosIds, queryClient])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'agenda'] })
  }

  return {
    items,
    loading,
    error: error as Error | null,
    refresh,
    isEmpty: !loading && items.length === 0,
    totalHoje: items.length,
    audienciasHoje: items.filter(i => i.tipo === 'audiencia').length,
    prazosHoje: items.filter(i => i.tipo === 'prazo').length,
    urgentesHoje: items.filter(i => i.urgente).length,
  }
}
