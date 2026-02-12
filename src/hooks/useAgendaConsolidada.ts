import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { captureOperationError } from '@/lib/logger'
import { parseDBDate } from '@/lib/timezone'
import { expandirRecorrencias, type RecorrenciaRegra } from '@/lib/recorrencia-utils'

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
  prazo_tipo?: string
  prazo_cumprido?: boolean

  // Planejamento de Horário (usado apenas para tarefas na visualização dia)
  horario_planejado_dia?: string | null
  duracao_planejada_minutos?: number | null

  local?: string
  // Vinculações
  processo_id?: string
  processo_numero?: string
  caso_titulo?: string  // Título do caso (autor x réu para processos)
  consultivo_id?: string
  consultivo_titulo?: string
  // Recorrência
  recorrencia_id?: string | null
  is_virtual?: boolean // true se for instância virtual expandida de uma recorrência
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

      // Buscar items reais e regras de recorrência em paralelo
      const [itemsResult, regrasResult] = await Promise.all([
        query,
        supabase
          .from('agenda_recorrencias')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .eq('ativo', true)
      ])

      if (itemsResult.error) {
        captureOperationError(itemsResult.error, { module: 'Agenda', operation: 'buscar', table: 'v_agenda_consolidada' })
        throw itemsResult.error
      }

      const itemsReais: AgendaItem[] = itemsResult.data || []
      const regras: RecorrenciaRegra[] = regrasResult.data || []

      // Expandir recorrências se houver regras ativas
      let itemsFinais = itemsReais
      if (regras.length > 0) {
        // Determinar range para expansão
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const rangeInicio = filters?.data_inicio ? new Date(filters.data_inicio) : new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000) // -7 dias
        const rangeFim = filters?.data_fim ? new Date(filters.data_fim) : new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000) // +60 dias

        // Instâncias reais que vieram de recorrência (para deduplicação)
        const instanciasExistentes = itemsReais
          .filter(i => i.recorrencia_id)
          .map(i => ({
            recorrencia_id: i.recorrencia_id!,
            data_inicio: i.data_inicio
          }))

        // Gerar instâncias virtuais
        let virtuais = expandirRecorrencias(regras, rangeInicio, rangeFim, instanciasExistentes)

        // Aplicar filtros do usuário às virtuais também
        if (filters?.tipo_entidade && filters.tipo_entidade.length > 0) {
          virtuais = virtuais.filter(v => filters.tipo_entidade!.includes(v.tipo_entidade))
        }
        if (filters?.responsavel_id) {
          virtuais = virtuais.filter(v =>
            v.responsaveis_ids?.includes(filters.responsavel_id!) ||
            !v.responsaveis_ids || v.responsaveis_ids.length === 0
          )
        }

        // Merge e ordenar
        itemsFinais = [...itemsReais, ...virtuais].sort((a, b) =>
          a.data_inicio.localeCompare(b.data_inicio)
        )
      }

      setItems(itemsFinais)
    } catch (err: any) {
      setError(err as Error)
      captureOperationError(err, { module: 'Agenda', operation: 'buscar', table: 'v_agenda_consolidada' })
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

      const [itemsResult, regrasResult] = await Promise.all([
        supabase
          .from('v_agenda_consolidada')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .gte('data_inicio', `${dataStr}T00:00:00`)
          .lte('data_inicio', `${dataStr}T23:59:59`)
          .order('data_inicio', { ascending: true }),
        supabase
          .from('agenda_recorrencias')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .eq('ativo', true)
      ])

      if (itemsResult.error) throw itemsResult.error

      const itemsReais: AgendaItem[] = itemsResult.data || []
      const regras: RecorrenciaRegra[] = regrasResult.data || []

      if (regras.length === 0) return itemsReais

      const instanciasExistentes = itemsReais
        .filter(i => i.recorrencia_id)
        .map(i => ({ recorrencia_id: i.recorrencia_id!, data_inicio: i.data_inicio }))

      const virtuais = expandirRecorrencias(regras, data, data, instanciasExistentes)

      return [...itemsReais, ...virtuais].sort((a, b) =>
        a.data_inicio.localeCompare(b.data_inicio)
      )
    } catch (err) {
      captureOperationError(err, { module: 'Agenda', operation: 'buscar', table: 'v_agenda_consolidada', details: { context: 'loadItemsDoDia' } })
      throw err
    }
  }

  // Carregar items de um intervalo (semana, mês)
  const loadItemsIntervalo = async (dataInicio: Date, dataFim: Date): Promise<AgendaItem[]> => {
    // SEGURANCA: Sem escritorioId, retorna vazio
    if (!escritorioId) return []

    try {
      const [itemsResult, regrasResult] = await Promise.all([
        supabase
          .from('v_agenda_consolidada')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .gte('data_inicio', dataInicio.toISOString())
          .lte('data_inicio', dataFim.toISOString())
          .order('data_inicio', { ascending: true }),
        supabase
          .from('agenda_recorrencias')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .eq('ativo', true)
      ])

      if (itemsResult.error) throw itemsResult.error

      const itemsReais: AgendaItem[] = itemsResult.data || []
      const regras: RecorrenciaRegra[] = regrasResult.data || []

      if (regras.length === 0) return itemsReais

      const instanciasExistentes = itemsReais
        .filter(i => i.recorrencia_id)
        .map(i => ({ recorrencia_id: i.recorrencia_id!, data_inicio: i.data_inicio }))

      const virtuais = expandirRecorrencias(regras, dataInicio, dataFim, instanciasExistentes)

      return [...itemsReais, ...virtuais].sort((a, b) =>
        a.data_inicio.localeCompare(b.data_inicio)
      )
    } catch (err) {
      captureOperationError(err, { module: 'Agenda', operation: 'buscar', table: 'v_agenda_consolidada', details: { context: 'loadItemsIntervalo' } })
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
