import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Tarefa {
  id: string
  escritorio_id: string
  titulo: string
  descricao?: string
  tipo: 'prazo_processual' | 'acompanhamento' | 'follow_up' | 'administrativo' | 'outro'
  prioridade: 'alta' | 'media' | 'baixa'
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  data_inicio: string
  data_fim?: string
  data_conclusao?: string
  progresso_percentual: number
  parent_id?: string
  responsavel_id?: string
  criado_por?: string

  // Prazo Processual
  prazo_data_intimacao?: string
  prazo_quantidade_dias?: number
  prazo_dias_uteis?: boolean
  prazo_data_limite?: string
  prazo_tipo?: 'recurso' | 'manifestacao' | 'cumprimento' | 'juntada' | 'pagamento' | 'outro'
  prazo_cumprido?: boolean
  prazo_perdido?: boolean

  // Metadata
  observacoes?: string
  cor?: string
  tags?: string[]

  // Relations (populated)
  responsavel_nome?: string
  criado_por_nome?: string

  created_at: string
  updated_at: string
}

export interface TarefaChecklistItem {
  id: string
  tarefa_id: string
  item: string
  concluido: boolean
  ordem: number
  concluido_em?: string
  concluido_por?: string
  created_at: string
}

export interface TarefaFormData extends Partial<Tarefa> {
  checklist?: Array<{ item: string; ordem: number }>
}

export function useTarefas(escritorioId?: string) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const loadTarefas = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('agenda_tarefas')
        .select(`
          *,
          responsavel:profiles!responsavel_id(nome_completo),
          criado_por_user:profiles!criado_por(nome_completo)
        `)
        .order('data_inicio', { ascending: true })

      if (escritorioId) {
        query = query.eq('escritorio_id', escritorioId)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Transform data
      const tarefasFormatadas = (data || []).map((t: any) => ({
        ...t,
        responsavel_nome: t.responsavel?.nome_completo,
        criado_por_nome: t.criado_por_user?.nome_completo,
      }))

      setTarefas(tarefasFormatadas)
    } catch (err) {
      setError(err as Error)
      console.error('Erro ao carregar tarefas:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTarefa = async (data: TarefaFormData): Promise<Tarefa> => {
    try {
      // 1. Criar tarefa principal
      const { data: novaTarefa, error: tarefaError } = await supabase
        .from('agenda_tarefas')
        .insert({
          escritorio_id: data.escritorio_id, // CAMPO OBRIGATÓRIO
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo || 'outro',
          prioridade: data.prioridade || 'media',
          status: data.status || 'pendente',
          data_inicio: data.data_inicio,
          data_fim: data.data_fim,
          responsavel_id: data.responsavel_id,
          parent_id: data.parent_id,
          cor: data.cor,
          observacoes: data.observacoes,
          tags: data.tags,
          // Prazo processual
          prazo_data_intimacao: data.prazo_data_intimacao,
          prazo_quantidade_dias: data.prazo_quantidade_dias,
          prazo_dias_uteis: data.prazo_dias_uteis,
          prazo_tipo: data.prazo_tipo,
        })
        .select()
        .single()

      if (tarefaError) {
        console.error('Erro detalhado ao criar tarefa:', JSON.stringify(tarefaError, null, 2))
        throw tarefaError
      }

      // 2. Se tem checklist, criar itens
      if (data.checklist && data.checklist.length > 0 && novaTarefa) {
        const checklistData = data.checklist.map(item => ({
          tarefa_id: novaTarefa.id,
          item: item.item,
          ordem: item.ordem,
        }))

        const { error: checklistError } = await supabase
          .from('agenda_tarefas_checklist')
          .insert(checklistData)

        if (checklistError) throw checklistError
      }

      // 3. Se é prazo processual, calcular data limite
      if (data.tipo === 'prazo_processual' && data.prazo_data_intimacao && data.prazo_quantidade_dias) {
        const { data: dataLimite, error: calcError } = await supabase
          .rpc('calcular_data_limite_prazo', {
            p_data_intimacao: data.prazo_data_intimacao,
            p_quantidade_dias: data.prazo_quantidade_dias,
            p_dias_uteis: data.prazo_dias_uteis ?? true,
          })

        if (!calcError && dataLimite) {
          await supabase
            .from('agenda_tarefas')
            .update({ prazo_data_limite: dataLimite })
            .eq('id', novaTarefa.id)
        }
      }

      // 4. Recarregar lista
      await loadTarefas()

      return novaTarefa
    } catch (err: any) {
      console.error('Erro ao criar tarefa:', err)
      console.error('Detalhes do erro:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      })
      throw err
    }
  }

  const updateTarefa = async (id: string, data: Partial<TarefaFormData>): Promise<void> => {
    try {
      // Atualizar tarefa principal
      const { error: tarefaError } = await supabase
        .from('agenda_tarefas')
        .update({
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo,
          prioridade: data.prioridade,
          status: data.status,
          data_inicio: data.data_inicio,
          data_fim: data.data_fim,
          data_conclusao: data.data_conclusao,
          responsavel_id: data.responsavel_id,
          cor: data.cor,
          observacoes: data.observacoes,
          tags: data.tags,
          // Prazo processual
          prazo_data_intimacao: data.prazo_data_intimacao,
          prazo_quantidade_dias: data.prazo_quantidade_dias,
          prazo_dias_uteis: data.prazo_dias_uteis,
          prazo_tipo: data.prazo_tipo,
          prazo_cumprido: data.prazo_cumprido,
        })
        .eq('id', id)

      if (tarefaError) throw tarefaError

      // Recalcular prazo se mudou
      if (data.tipo === 'prazo_processual' && data.prazo_data_intimacao && data.prazo_quantidade_dias) {
        const { data: dataLimite, error: calcError } = await supabase
          .rpc('calcular_data_limite_prazo', {
            p_data_intimacao: data.prazo_data_intimacao,
            p_quantidade_dias: data.prazo_quantidade_dias,
            p_dias_uteis: data.prazo_dias_uteis ?? true,
          })

        if (!calcError && dataLimite) {
          await supabase
            .from('agenda_tarefas')
            .update({ prazo_data_limite: dataLimite })
            .eq('id', id)
        }
      }

      await loadTarefas()
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err)
      throw err
    }
  }

  const deleteTarefa = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadTarefas()
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err)
      throw err
    }
  }

  // Checklist methods
  const loadChecklist = async (tarefaId: string): Promise<TarefaChecklistItem[]> => {
    try {
      const { data, error } = await supabase
        .from('agenda_tarefas_checklist')
        .select('*')
        .eq('tarefa_id', tarefaId)
        .order('ordem')

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Erro ao carregar checklist:', err)
      throw err
    }
  }

  const addChecklistItem = async (tarefaId: string, item: string, ordem: number): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas_checklist')
        .insert({
          tarefa_id: tarefaId,
          item,
          ordem,
        })

      if (error) throw error

      await loadTarefas()
    } catch (err) {
      console.error('Erro ao adicionar item checklist:', err)
      throw err
    }
  }

  const toggleChecklistItem = async (itemId: string, concluido: boolean): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas_checklist')
        .update({
          concluido,
          concluido_em: concluido ? new Date().toISOString() : null,
        })
        .eq('id', itemId)

      if (error) throw error

      // O trigger vai atualizar o progresso automaticamente
      await loadTarefas()
    } catch (err) {
      console.error('Erro ao atualizar item checklist:', err)
      throw err
    }
  }

  const deleteChecklistItem = async (itemId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas_checklist')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      await loadTarefas()
    } catch (err) {
      console.error('Erro ao deletar item checklist:', err)
      throw err
    }
  }

  // Marcar tarefa como concluída
  const concluirTarefa = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas')
        .update({
          status: 'concluida',
          data_conclusao: new Date().toISOString(),
          progresso_percentual: 100,
        })
        .eq('id', id)

      if (error) throw error

      await loadTarefas()
    } catch (err) {
      console.error('Erro ao concluir tarefa:', err)
      throw err
    }
  }

  useEffect(() => {
    loadTarefas()
  }, [escritorioId])

  return {
    tarefas,
    loading,
    error,
    createTarefa,
    updateTarefa,
    deleteTarefa,
    concluirTarefa,
    // Checklist
    loadChecklist,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    // Utils
    refreshTarefas: loadTarefas,
  }
}
