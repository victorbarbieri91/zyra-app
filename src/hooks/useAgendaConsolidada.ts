import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { captureOperationError } from '@/lib/logger'
import { parseDBDate } from '@/lib/timezone'

export interface AgendaItem {
  id: string
  tipo_entidade: 'tarefa' | 'evento' | 'audiencia'
  titulo: string
  descricao?: string
  data_inicio: string
  data_fim?: string
  dia_inteiro: boolean
  cor?: string
  status: string
  prioridade: 'alta' | 'media' | 'baixa'
  subtipo: string
  pessoal?: boolean
  responsavel_id?: string
  responsavel_nome?: string
  todos_responsaveis?: string
  responsaveis_ids?: string[]
  prazo_data_limite?: string
  prazo_tipo?: string
  prazo_cumprido?: boolean
  horario_planejado_dia?: string | null
  duracao_planejada_minutos?: number | null
  local?: string
  processo_id?: string
  processo_numero?: string
  caso_titulo?: string
  consultivo_id?: string
  consultivo_titulo?: string
  recorrencia_id?: string | null
  escritorio_id: string
  created_at: string
  updated_at: string
}

export interface AgendaFilters {
  tipo_entidade?: ('tarefa' | 'evento' | 'audiencia')[]
  status?: string[]
  prioridade?: ('alta' | 'media' | 'baixa')[]
  responsavel_id?: string
  data_inicio?: string
  data_fim?: string
}

export function useAgendaConsolidada(escritorioId: string | undefined, filters?: AgendaFilters) {
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const buildQuery = (start?: string, end?: string) => {
    let query = supabase
      .from('v_agenda_consolidada')
      .select('*')
      .eq('escritorio_id', escritorioId!)
      .order('data_inicio', { ascending: true })

    if (filters?.tipo_entidade && filters.tipo_entidade.length > 0) {
      query = query.in('tipo_entidade', filters.tipo_entidade)
    }
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }
    if (filters?.prioridade && filters.prioridade.length > 0) {
      query = query.in('prioridade', filters.prioridade)
    }
    if (filters?.responsavel_id) {
      query = query.or(`responsaveis_ids.cs.{${filters.responsavel_id}},responsaveis_ids.eq.{}`)
    }
    if (start) query = query.gte('data_inicio', start)
    if (end) query = query.lte('data_inicio', end)

    return query
  }

  const loadItems = async () => {
    if (!escritorioId) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await buildQuery(filters?.data_inicio, filters?.data_fim)

      if (error) {
        captureOperationError(error, { module: 'Agenda', operation: 'buscar', table: 'v_agenda_consolidada' })
        throw error
      }

      setItems((data || []) as AgendaItem[])
    } catch (err: any) {
      setError(err as Error)
      captureOperationError(err, { module: 'Agenda', operation: 'buscar', table: 'v_agenda_consolidada' })
    } finally {
      setLoading(false)
    }
  }

  const loadItemsDoDia = async (data: Date): Promise<AgendaItem[]> => {
    if (!escritorioId) return []

    try {
      const dataStr = data.toISOString().split('T')[0]
      const { data: result, error } = await supabase
        .from('v_agenda_consolidada')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .gte('data_inicio', `${dataStr}T00:00:00`)
        .lte('data_inicio', `${dataStr}T23:59:59`)
        .order('data_inicio', { ascending: true })

      if (error) throw error
      return (result || []) as AgendaItem[]
    } catch (err) {
      captureOperationError(err, { module: 'Agenda', operation: 'buscar', table: 'v_agenda_consolidada', details: { context: 'loadItemsDoDia' } })
      throw err
    }
  }

  const loadItemsIntervalo = async (dataInicio: Date, dataFim: Date): Promise<AgendaItem[]> => {
    if (!escritorioId) return []

    try {
      const { data, error } = await supabase
        .from('v_agenda_consolidada')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .gte('data_inicio', dataInicio.toISOString())
        .lte('data_inicio', dataFim.toISOString())
        .order('data_inicio', { ascending: true })

      if (error) throw error
      return (data || []) as AgendaItem[]
    } catch (err) {
      captureOperationError(err, { module: 'Agenda', operation: 'buscar', table: 'v_agenda_consolidada', details: { context: 'loadItemsIntervalo' } })
      throw err
    }
  }

  const getEstatisticas = () => {
    const total = items.length
    const tarefas = items.filter(i => i.tipo_entidade === 'tarefa').length
    const eventos = items.filter(i => i.tipo_entidade === 'evento').length
    const audiencias = items.filter(i => i.tipo_entidade === 'audiencia').length

    const pendentes = items.filter(i =>
      i.status === 'pendente' || i.status === 'agendado' || i.status === 'agendada'
    ).length

    const criticos = items.filter(i =>
      i.prioridade === 'alta' ||
      (i.prazo_data_limite && parseDBDate(i.prazo_data_limite) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))
    ).length

    return { total, tarefas, eventos, audiencias, pendentes, criticos }
  }

  useEffect(() => {
    loadItems()
  }, [escritorioId, filters])

  return {
    items,
    loading,
    error,
    refreshItems: loadItems,
    loadItemsDoDia,
    loadItemsIntervalo,
    getEstatisticas,
  }
}
