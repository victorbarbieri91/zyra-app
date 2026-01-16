'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'
import { startOfDayInBrazil, endOfDayInBrazil, formatBrazilTime } from '@/lib/timezone'

export interface AgendaItemDashboard {
  id: string
  tipo: 'audiencia' | 'evento' | 'tarefa' | 'prazo'
  time: string // Formato HH:mm
  title: string
  subtitle: string
  color: string
  urgente?: boolean
  processo_numero?: string
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

export function useDashboardAgenda() {
  const [items, setItems] = useState<AgendaItemDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const loadAgendaHoje = useCallback(async () => {
    if (!escritorioAtivo) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const inicioHoje = startOfDayInBrazil(new Date())
      const fimHoje = endOfDayInBrazil(new Date())

      const { data, error: queryError } = await supabase
        .from('v_agenda_consolidada')
        .select('*')
        .eq('escritorio_id', escritorioAtivo)
        .gte('data_inicio', inicioHoje.toISOString())
        .lte('data_inicio', fimHoje.toISOString())
        .neq('status', 'concluida') // Mostrar apenas itens pendentes
        .order('data_inicio', { ascending: true })
        .limit(8)

      if (queryError) throw queryError

      // Transformar para formato do dashboard
      const agendaItems: AgendaItemDashboard[] = (data || []).map(item => {
        const dataInicio = new Date(item.data_inicio)
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
        }
      })

      setItems(agendaItems)
    } catch (err) {
      console.error('Erro ao carregar agenda do dashboard:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, supabase])

  useEffect(() => {
    loadAgendaHoje()
  }, [loadAgendaHoje])

  return {
    items,
    loading,
    error,
    refresh: loadAgendaHoje,
    isEmpty: !loading && items.length === 0,
    totalHoje: items.length,
    audienciasHoje: items.filter(i => i.tipo === 'audiencia').length,
    prazosHoje: items.filter(i => i.tipo === 'prazo').length,
    urgentesHoje: items.filter(i => i.urgente).length,
  }
}
