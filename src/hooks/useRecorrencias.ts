import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RecorrenciaFormData {
  nome: string
  descricao?: string
  tipo: 'tarefa' | 'evento'
  templateDados: any // Dados completos da tarefa/evento modelo
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual'
  intervalo: number
  diasSemana?: number[] // [0,1,2,3,4,5,6] - domingo a sábado
  diaMes?: number // 1-31
  mes?: number // 1-12 (para anual)
  horaPadrao: string // 'HH:MM'
  dataInicio: string // 'YYYY-MM-DD'
  terminoTipo: 'permanente' | 'data' | 'ocorrencias'
  dataFim?: string // 'YYYY-MM-DD'
  numeroOcorrencias?: number
  apenasUteis?: boolean // Para diária
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
  ativo: boolean
  data_inicio: string
  data_fim: string | null
  proxima_execucao: string | null
  ultima_execucao: string | null
  total_criados: number
  criado_por: string | null
  created_at: string
  updated_at: string
}

export function useRecorrencias(escritorioId?: string) {
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Buscar recorrências
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

  // Criar recorrência
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
          ativo: true,
          data_inicio: data.dataInicio,
          data_fim: data.terminoTipo === 'data' ? data.dataFim : null,
          proxima_execucao: data.dataInicio,
          total_criados: 0,
        })
        .select()
        .single()

      if (error) throw error

      // Atualizar lista local
      await fetchRecorrencias()

      return rec
    } catch (error) {
      console.error('Erro ao criar recorrência:', error)
      throw error
    }
  }

  // Atualizar recorrência
  const updateRecorrencia = async (id: string, updates: Partial<RecorrenciaFormData>): Promise<void> => {
    try {
      const updateData: any = {}

      if (updates.nome) updateData.template_nome = updates.nome
      if (updates.descricao !== undefined) updateData.template_descricao = updates.descricao
      if (updates.templateDados) updateData.template_dados = updates.templateDados
      if (updates.frequencia) updateData.regra_frequencia = updates.frequencia
      if (updates.intervalo) updateData.regra_intervalo = updates.intervalo
      if (updates.diasSemana) updateData.regra_dias_semana = updates.diasSemana
      if (updates.diaMes) updateData.regra_dia_mes = updates.diaMes
      if (updates.mes) updateData.regra_mes = updates.mes
      if (updates.horaPadrao) updateData.regra_hora = updates.horaPadrao
      if (updates.dataInicio) updateData.data_inicio = updates.dataInicio
      if (updates.dataFim !== undefined) updateData.data_fim = updates.dataFim

      const { error } = await supabase
        .from('agenda_recorrencias')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      await fetchRecorrencias()
    } catch (error) {
      console.error('Erro ao atualizar recorrência:', error)
      throw error
    }
  }

  // Desativar recorrência (não deletar para manter histórico)
  const deactivateRecorrencia = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_recorrencias')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error

      await fetchRecorrencias()
    } catch (error) {
      console.error('Erro ao desativar recorrência:', error)
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

  // Deletar recorrência permanentemente
  const deleteRecorrencia = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agenda_recorrencias')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchRecorrencias()
    } catch (error) {
      console.error('Erro ao deletar recorrência:', error)
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

  return {
    recorrencias,
    loading,
    createRecorrencia,
    updateRecorrencia,
    deactivateRecorrencia,
    activateRecorrencia,
    deleteRecorrencia,
    getRecorrencia,
    refreshRecorrencias: fetchRecorrencias,
  }
}
