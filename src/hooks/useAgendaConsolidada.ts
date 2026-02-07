import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  subtipo: string // Tipo específico (prazo_processual, inicial, compromisso, etc)
  responsavel_id?: string
  responsavel_nome?: string
  todos_responsaveis?: string  // Todos os responsáveis agregados (separados por vírgula)
  responsaveis_ids?: string[]  // Array de IDs dos responsáveis
  prazo_data_limite?: string

  // Planejamento de Horário (usado apenas para tarefas na visualização dia)
  horario_planejado_dia?: string | null
  duracao_planejada_minutos?: number | null

  local?: string
  // Vinculações
  processo_id?: string
  processo_numero?: string
  consultivo_id?: string
  consultivo_titulo?: string
  // Recorrência
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
  const supabase = createClient()

  const loadItems = async () => {
    // SEGURANCA: Sem escritorioId, nao carrega nada
    if (!escritorioId) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Buscar da view consolidada COM filtro de escritorio
      let query = supabase
        .from('v_agenda_consolidada')
        .select('*')
        .eq('escritorio_id', escritorioId) // SEGURANCA: Filtrar por escritorio
        .order('data_inicio', { ascending: true })

      // Aplicar filtros
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
        // Incluir items do usuário OU items sem responsável (retrocompatibilidade com dados antigos)
        query = query.or(`responsaveis_ids.cs.{${filters.responsavel_id}},responsaveis_ids.eq.{}`)
      }

      if (filters?.data_inicio) {
        query = query.gte('data_inicio', filters.data_inicio)
      }

      if (filters?.data_fim) {
        query = query.lte('data_inicio', filters.data_fim)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        console.error('Erro na query de agenda consolidada:', {
          message: queryError.message,
          details: queryError.details,
          hint: queryError.hint,
          code: queryError.code
        })
        throw queryError
      }

      setItems(data || [])
    } catch (err: any) {
      setError(err as Error)
      console.error('Erro ao carregar agenda consolidada:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        error: err
      })
    } finally {
      setLoading(false)
    }
  }

  // Carregar items de um dia específico
  const loadItemsDoDia = async (data: Date): Promise<AgendaItem[]> => {
    // SEGURANCA: Sem escritorioId, retorna vazio
    if (!escritorioId) return []

    try {
      const dataStr = data.toISOString().split('T')[0]

      const { data: items, error: queryError } = await supabase
        .from('v_agenda_consolidada')
        .select('*')
        .eq('escritorio_id', escritorioId) // SEGURANCA: Filtrar por escritorio
        .gte('data_inicio', `${dataStr}T00:00:00`)
        .lte('data_inicio', `${dataStr}T23:59:59`)
        .order('data_inicio', { ascending: true })

      if (queryError) throw queryError

      return items || []
    } catch (err) {
      console.error('Erro ao carregar items do dia:', err)
      throw err
    }
  }

  // Carregar items de um intervalo (semana, mês)
  const loadItemsIntervalo = async (dataInicio: Date, dataFim: Date): Promise<AgendaItem[]> => {
    // SEGURANCA: Sem escritorioId, retorna vazio
    if (!escritorioId) return []

    try {
      const { data: items, error: queryError } = await supabase
        .from('v_agenda_consolidada')
        .select('*')
        .eq('escritorio_id', escritorioId) // SEGURANCA: Filtrar por escritorio
        .gte('data_inicio', dataInicio.toISOString())
        .lte('data_inicio', dataFim.toISOString())
        .order('data_inicio', { ascending: true })

      if (queryError) throw queryError

      return items || []
    } catch (err) {
      console.error('Erro ao carregar items do intervalo:', err)
      throw err
    }
  }

  // Estatísticas rápidas
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

    return {
      total,
      tarefas,
      eventos,
      audiencias,
      pendentes,
      criticos,
    }
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
