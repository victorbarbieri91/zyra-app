import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateForDB, formatDateTimeForDB, getNowInBrazil } from '@/lib/timezone'

export interface Tarefa {
  id: string
  escritorio_id: string
  titulo: string
  descricao?: string
  tipo: 'prazo_processual' | 'acompanhamento' | 'follow_up' | 'administrativo' | 'outro' | 'fixa'
  prioridade: 'alta' | 'media' | 'baixa'
  status: 'pendente' | 'em_andamento' | 'em_pausa' | 'concluida' | 'cancelada'
  data_inicio: string
  data_fim?: string
  data_conclusao?: string

  // Planejamento de Horário (usado apenas na visualização dia)
  horario_planejado_dia?: string | null  // time format: '14:30:00'
  duracao_planejada_minutos?: number | null  // duração em minutos para a grade horária

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

  // Vinculações (FK diretas)
  processo_id?: string | null
  consultivo_id?: string | null

  // Metadata
  observacoes?: string
  cor?: string
  tags?: string[]

  // Relations (populated)
  responsavel_nome?: string
  criado_por_nome?: string
  caso_titulo?: string | null

  // Múltiplos responsáveis (array direto na coluna)
  responsaveis_ids: string[]

  created_at: string
  updated_at: string
}

export interface TarefaFormData extends Partial<Tarefa> {}

export function useTarefas(escritorioId?: string) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const loadTarefas = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('agenda_tarefas')
        .select(`
          *,
          responsavel:profiles!responsavel_id(nome_completo),
          criado_por_user:profiles!criado_por(nome_completo),
          processo:processos_processos!processo_id(autor, reu),
          consultivo:consultivo_consultas!consultivo_id(titulo)
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
        caso_titulo: t.processo
          ? `${t.processo.autor} x ${t.processo.reu}`
          : t.consultivo?.titulo || null,
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
          data_inicio: data.data_inicio ? formatDateForDB(data.data_inicio) : undefined,
          data_fim: data.data_fim ? formatDateForDB(data.data_fim) : undefined,
          // Responsáveis: usa array direto, mantém responsavel_id para compatibilidade
          responsaveis_ids: data.responsaveis_ids || [],
          responsavel_id: data.responsaveis_ids?.[0] || data.responsavel_id,
          cor: data.cor,
          observacoes: data.observacoes,
          tags: data.tags,
          // Vinculações
          processo_id: data.processo_id || null,
          consultivo_id: data.consultivo_id || null,
          // Prazo processual
          prazo_data_intimacao: data.prazo_data_intimacao,
          prazo_quantidade_dias: data.prazo_quantidade_dias,
          prazo_dias_uteis: data.prazo_dias_uteis,
          prazo_data_limite: data.prazo_data_limite,
          prazo_tipo: data.prazo_tipo,
        })
        .select()
        .single()

      if (tarefaError) {
        console.error('Erro detalhado ao criar tarefa:', JSON.stringify(tarefaError, null, 2))
        throw tarefaError
      }

      // 2. Se é prazo processual, calcular data limite
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
          data_inicio: data.data_inicio ? formatDateForDB(data.data_inicio) : undefined,
          data_fim: data.data_fim ? formatDateForDB(data.data_fim) : undefined,
          data_conclusao: data.data_conclusao ? formatDateTimeForDB(new Date(data.data_conclusao)) : undefined,
          // Responsáveis: usa array direto, mantém responsavel_id para compatibilidade
          responsaveis_ids: data.responsaveis_ids,
          responsavel_id: data.responsaveis_ids?.[0] || data.responsavel_id,
          cor: data.cor,
          observacoes: data.observacoes,
          tags: data.tags,
          // Vinculações
          processo_id: data.processo_id !== undefined ? data.processo_id : undefined,
          consultivo_id: data.consultivo_id !== undefined ? data.consultivo_id : undefined,
          // Prazo processual
          prazo_data_intimacao: data.prazo_data_intimacao,
          prazo_quantidade_dias: data.prazo_quantidade_dias,
          prazo_dias_uteis: data.prazo_dias_uteis,
          prazo_data_limite: data.prazo_data_limite,
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

  // Marcar tarefa como concluída
  const concluirTarefa = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas')
        .update({
          status: 'concluida',
          data_conclusao: formatDateTimeForDB(getNowInBrazil()),
        })
        .eq('id', id)

      if (error) throw error

      await loadTarefas()
    } catch (err) {
      console.error('Erro ao concluir tarefa:', err)
      throw err
    }
  }

  // Reabrir tarefa (voltar para pendente)
  const reabrirTarefa = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas')
        .update({
          status: 'pendente',
          data_conclusao: null,
        })
        .eq('id', id)

      if (error) throw error

      await loadTarefas()
    } catch (err) {
      console.error('Erro ao reabrir tarefa:', err)
      throw err
    }
  }

  useEffect(() => {
    // Só carrega se tiver escritorioId definido
    if (escritorioId) {
      loadTarefas()
    } else {
      setLoading(false)
      setTarefas([])
    }
  }, [escritorioId])

  return {
    tarefas,
    loading,
    error,
    createTarefa,
    updateTarefa,
    deleteTarefa,
    concluirTarefa,
    reabrirTarefa,
    refreshTarefas: loadTarefas,
  }
}
