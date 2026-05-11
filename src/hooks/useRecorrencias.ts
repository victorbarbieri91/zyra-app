import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RecorrenciaFormData {
  nome: string
  descricao?: string
  tipo: 'tarefa' | 'evento'
  templateDados: any
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual'
  intervalo: number
  diasSemana?: number[]
  diaMes?: number
  mes?: number
  horaPadrao: string
  dataInicio: string
  terminoTipo: 'permanente' | 'data' | 'ocorrencias'
  dataFim?: string
  numeroOcorrencias?: number
  apenasUteis?: boolean
}

export interface Recorrencia {
  id: string
  escritorio_id: string
  template_nome: string
  template_descricao: string | null
  entidade_tipo: 'tarefa' | 'evento' | 'audiencia'
  template_dados: any
  regra_frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual'
  regra_intervalo: number
  regra_dia_mes: number | null
  regra_dias_semana: number[] | null
  regra_mes: number | null
  regra_hora: string
  regra_apenas_uteis: boolean
  ativo: boolean
  data_inicio: string
  data_fim: string | null
  max_ocorrencias: number | null
  proxima_execucao: string | null
  ultima_execucao: string | null
  total_criados: number
  exclusoes: string[]
  criado_por: string | null
  created_at: string
  updated_at: string
}

export function useRecorrencias(escritorioId?: string) {
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([])
  const [loading, setLoading] = useState(false)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchRecorrencias = async () => {
    if (!escritorioId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('agenda_recorrencias')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecorrencias(data || [])
    } catch (error) {
      console.error('Erro ao buscar recorrências:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecorrencias()
  }, [escritorioId])

  // Criar recorrência — trigger SQL materializa as instâncias automaticamente
  const createRecorrencia = async (data: RecorrenciaFormData): Promise<Recorrencia | null> => {
    if (!escritorioId) {
      throw new Error('escritorio_id é obrigatório')
    }

    try {
      const { data: rec, error } = await supabase
        .from('agenda_recorrencias')
        .insert({
          escritorio_id: escritorioId,
          template_nome: data.nome,
          template_descricao: data.descricao || null,
          entidade_tipo: data.tipo,
          template_dados: data.templateDados,
          regra_frequencia: data.frequencia,
          regra_intervalo: data.intervalo,
          regra_dias_semana: data.diasSemana || null,
          regra_dia_mes: data.diaMes || null,
          regra_mes: data.mes || null,
          regra_hora: data.horaPadrao,
          regra_apenas_uteis: data.apenasUteis || false,
          ativo: true,
          data_inicio: data.dataInicio,
          data_fim: data.terminoTipo === 'data' ? data.dataFim : null,
          max_ocorrencias: data.terminoTipo === 'ocorrencias' ? data.numeroOcorrencias : null,
          proxima_execucao: data.dataInicio,
          total_criados: 0,
        })
        .select()
        .single()

      if (error) throw error
      await fetchRecorrencias()
      return rec
    } catch (error) {
      console.error('Erro ao criar recorrência:', error)
      throw error
    }
  }

  // Reativar recorrência
  const activateRecorrencia = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_recorrencias')
        .update({ ativo: true })
        .eq('id', id)

      if (error) throw error
      await fetchRecorrencias()
    } catch (error) {
      console.error('Erro ao reativar recorrência:', error)
      throw error
    }
  }

  // Buscar recorrência por ID
  const getRecorrencia = async (id: string): Promise<Recorrencia | null> => {
    try {
      const { data, error } = await supabase
        .from('agenda_recorrencias')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao buscar recorrência:', error)
      return null
    }
  }

  /**
   * Atualiza a regra e propaga para instâncias pendentes futuras.
   * dataCorte=null → toda a série a partir de hoje
   * dataCorte='YYYY-MM-DD' → desta data em diante
   */
  const atualizarSerie = async (
    regraId: string,
    params: {
      dataCorte?: string | null
      templateDados?: any
      templateNome?: string
      templateDescricao?: string
      regraFrequencia?: string
      regraIntervalo?: number
      regraDiasSemana?: number[]
      regraDiaMes?: number
      regraMes?: number
      regraHora?: string
      dataFim?: string | null
      dataFimExplicito?: boolean
    },
  ): Promise<number> => {
    const { data, error } = await supabase.rpc('atualizar_regra_serie_agenda', {
      p_regra_id: regraId,
      p_data_corte: params.dataCorte ?? null,
      p_template_dados: params.templateDados ?? null,
      p_template_nome: params.templateNome ?? null,
      p_template_descricao: params.templateDescricao ?? null,
      p_regra_frequencia: params.regraFrequencia ?? null,
      p_regra_intervalo: params.regraIntervalo ?? null,
      p_regra_dias_semana: params.regraDiasSemana ?? null,
      p_regra_dia_mes: params.regraDiaMes ?? null,
      p_regra_mes: params.regraMes ?? null,
      p_regra_hora: params.regraHora ?? null,
      p_data_fim: params.dataFim ?? null,
      p_data_fim_explicito: params.dataFimExplicito ?? false,
    })

    if (error) {
      console.error('Erro ao atualizar série:', error)
      throw error
    }

    await fetchRecorrencias()
    return typeof data === 'number' ? data : 0
  }

  /**
   * Desativa a regra (ou recorta com data_corte) e remove instâncias
   * pendentes a partir do corte. Preserva históricas terminadas.
   */
  const excluirSerie = async (
    regraId: string,
    dataCorte?: string | null,
  ): Promise<number> => {
    const { data, error } = await supabase.rpc('excluir_regra_serie_agenda', {
      p_regra_id: regraId,
      p_data_corte: dataCorte ?? null,
    })

    if (error) {
      console.error('Erro ao excluir série:', error)
      throw error
    }

    await fetchRecorrencias()
    return typeof data === 'number' ? data : 0
  }

  /**
   * Remove uma instância específica e adiciona sua data em exclusoes da regra.
   * Garante que o cron não recrie aquela data.
   */
  const excluirOcorrencia = async (
    instanciaId: string,
    tabela: 'agenda_tarefas' | 'agenda_eventos',
  ): Promise<void> => {
    const { error } = await supabase.rpc('excluir_ocorrencia_agenda', {
      p_instancia_id: instanciaId,
      p_tabela: tabela,
    })

    if (error) {
      console.error('Erro ao excluir ocorrência:', error)
      throw error
    }

    await fetchRecorrencias()
  }

  return {
    recorrencias,
    loading,
    createRecorrencia,
    activateRecorrencia,
    getRecorrencia,
    atualizarSerie,
    excluirSerie,
    excluirOcorrencia,
    refreshRecorrencias: fetchRecorrencias,
  }
}
