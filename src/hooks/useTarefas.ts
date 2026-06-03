import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateForDB, formatDateTimeForDB, getNowInBrazil } from '@/lib/timezone'
import { format } from 'date-fns'
import type { TipoTarefa } from '@/lib/constants/tarefa-tipos'

export interface Tarefa {
  id: string
  escritorio_id: string
  titulo: string
  descricao?: string
  tipo: TipoTarefa
  prioridade: 'alta' | 'media' | 'baixa'
  status: 'pendente' | 'em_andamento' | 'em_pausa' | 'concluida' | 'cancelada'
  data_inicio: string
  data_fim?: string
  data_conclusao?: string
  fixa_status_data?: string // DATE: date when fixa status was last changed (view resets to 'pendente' if != today)

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

  // Privacidade: quando true, só criador/responsáveis veem (via RLS)
  pessoal?: boolean

  // Recorrência (instância materializada — sempre UUID real, sem virtuais)
  recorrencia_id?: string | null

  created_at: string
  updated_at: string
}

export interface TarefaFormData extends Partial<Tarefa> {}

/**
 * Filtros opcionais de leitura. Quando omitidos, o hook mantém o comportamento
 * antigo (busca todas as tarefas não-canceladas do escritório). Usados pelo
 * Kanban para pedir só a janela visível + o responsável, evitando o teto de
 * 1.000 linhas do PostgREST em escritórios com muitas tarefas.
 */
export interface UseTarefasOptions {
  /** Filtra por responsável (minhas OU públicas), igual à visão mensal. */
  responsavelId?: string
  /** Início da janela visível (YYYY-MM-DD). */
  dataInicio?: string
  /** Fim da janela visível (YYYY-MM-DD). */
  dataFim?: string
  /** Mantém as tarefas fixas sempre incluídas (fora do filtro de data). */
  incluirFixas?: boolean
}

export function useTarefas(escritorioId?: string, options?: UseTarefasOptions) {
  const { responsavelId, dataInicio, dataFim, incluirFixas } = options || {}
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
        .neq('status', 'cancelada')
        .order('data_inicio', { ascending: true })

      if (escritorioId) {
        query = query.eq('escritorio_id', escritorioId)
      }

      // Filtro por responsável (minhas OU públicas) — mesma regra da visão mensal
      if (responsavelId) {
        query = query.or(`responsaveis_ids.cs.{${responsavelId}},responsaveis_ids.eq.{}`)
      }

      // Janela de datas. As fixas têm data_inicio antiga (data de criação) e
      // aparecem todo dia, então ficam SEMPRE incluídas quando incluirFixas=true.
      if (dataInicio && dataFim) {
        if (incluirFixas) {
          query = query.or(`tipo.eq.fixa,and(data_inicio.gte.${dataInicio},data_inicio.lte.${dataFim})`)
        } else {
          query = query.gte('data_inicio', dataInicio).lte('data_inicio', dataFim)
        }
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Transform data — instâncias recorrentes já vêm materializadas como linhas reais
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
          // Privacidade
          pessoal: data.pessoal ?? false,
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
          // Privacidade
          pessoal: data.pessoal,
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
      const tarefa = tarefas.find(t => t.id === id)
      const updateData: Record<string, unknown> = {
        status: 'concluida',
        data_conclusao: formatDateTimeForDB(getNowInBrazil()),
      }
      // Fixa tasks: set fixa_status_data to today so view preserves today's status
      if (tarefa?.tipo === 'fixa') {
        updateData.fixa_status_data = format(getNowInBrazil(), 'yyyy-MM-dd')
      }

      const { error } = await supabase
        .from('agenda_tarefas')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      await loadTarefas()
    } catch (err) {
      console.error('Erro ao concluir tarefa:', err)
      throw err
    }
  }

  // Cancelar tarefa via RPC (registra motivo + entrada no histórico de auditoria do processo).
  // escopo='instancia' cancela só a tarefa indicada
  // escopo='serie' cancela todas as ocorrências não-concluídas da recorrência + desativa a regra
  const cancelarTarefa = async (
    id: string,
    motivo: string,
    escopo: 'instancia' | 'serie' = 'instancia',
  ): Promise<void> => {
    const motivoLimpo = motivo.trim()
    if (motivoLimpo.length === 0) {
      throw new Error('Motivo do cancelamento é obrigatório.')
    }
    try {
      if (escopo === 'instancia') {
        const { error } = await supabase.rpc('cancelar_agenda_instancia', {
          p_tabela: 'agenda_tarefas',
          p_id: id,
          p_motivo: motivoLimpo,
        })
        if (error) throw error
      } else {
        const tarefa = tarefas.find((t) => t.id === id)
        if (!tarefa?.recorrencia_id) throw new Error('Tarefa não pertence a uma série')
        const { error } = await supabase.rpc('cancelar_agenda_serie', {
          p_tabela: 'agenda_tarefas',
          p_recorrencia_id: tarefa.recorrencia_id,
          p_motivo: motivoLimpo,
        })
        if (error) throw error
      }

      await loadTarefas()
    } catch (err) {
      console.error('Erro ao cancelar tarefa:', err)
      throw err
    }
  }

  // Reabrir tarefa (voltar para pendente)
  const reabrirTarefa = async (id: string): Promise<void> => {
    try {
      const tarefa = tarefas.find(t => t.id === id)
      const updateData: Record<string, unknown> = {
        status: 'pendente',
        data_conclusao: null,
      }
      // Fixa tasks: set fixa_status_data to today so view shows 'pendente' (not auto-reset)
      if (tarefa?.tipo === 'fixa') {
        updateData.fixa_status_data = format(getNowInBrazil(), 'yyyy-MM-dd')
      }

      const { error } = await supabase
        .from('agenda_tarefas')
        .update(updateData)
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
    // Recarrega quando o escritório ou os filtros (responsável/janela) mudam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escritorioId, responsavelId, dataInicio, dataFim, incluirFixas])

  return {
    tarefas,
    loading,
    error,
    createTarefa,
    updateTarefa,
    deleteTarefa,
    cancelarTarefa,
    concluirTarefa,
    reabrirTarefa,
    refreshTarefas: loadTarefas,
  }
}
