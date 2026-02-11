'use client'

import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'
import { startOfDayInBrazil, endOfDayInBrazil, formatBrazilTime, parseDBDate } from '@/lib/timezone'

export interface AgendaItemDashboard {
  id: string
  tipo: 'audiencia' | 'evento' | 'tarefa' | 'prazo'
  time: string // Formato HH:mm
  title: string
  subtitle: string
  color: string
  urgente?: boolean
  processo_numero?: string
  descricao?: string
  local?: string
  prioridade?: string
  status?: string
  data_inicio?: string
  dia_inteiro?: boolean
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
  escritorioAtivo: string
): Promise<AgendaItemDashboard[]> {
  // Buscar usuário logado para filtrar apenas seus itens
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const inicioHoje = startOfDayInBrazil(new Date())
  const fimHoje = endOfDayInBrazil(new Date())

  // Buscar apenas itens onde o usuário está no array de responsáveis
  // Isso garante que cada pessoa veja apenas sua própria agenda no dashboard
  const { data, error: queryError } = await supabase
    .from('v_agenda_consolidada')
    .select('*')
    .eq('escritorio_id', escritorioAtivo)
    .contains('responsaveis_ids', [user.id])
    .gte('data_inicio', inicioHoje.toISOString())
    .lte('data_inicio', fimHoje.toISOString())
    .neq('status', 'concluida') // Mostrar apenas itens pendentes
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
        tipo = 'prazo'
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
      (item.prazo_data_limite && new Date(item.prazo_data_limite).toDateString() === new Date().toDateString())

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
      processo_numero: item.processo_numero,
      descricao: item.descricao || undefined,
      local: item.local || undefined,
      prioridade: item.prioridade || undefined,
      status: item.status || undefined,
      data_inicio: item.data_inicio || undefined,
      dia_inteiro: item.dia_inteiro || false,
    }
  })

  return agendaItems
}

export function useDashboardAgenda() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  const { data: items = [], isLoading: loading, error } = useQuery({
    queryKey: ['dashboard', 'agenda', escritorioAtivo],
    queryFn: () => fetchDashboardAgenda(supabaseRef.current, escritorioAtivo!),
    enabled: !!escritorioAtivo,
    staleTime: 2 * 60 * 1000, // 2 minutes - agenda changes more frequently
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'agenda', escritorioAtivo] })
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
