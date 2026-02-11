import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateForDB } from '@/lib/timezone'

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
  regra_apenas_uteis: boolean
  ativo: boolean
  data_inicio: string
  data_fim: string | null
  max_ocorrencias: number | null
  proxima_execucao: string | null
  ultima_execucao: string | null
  total_criados: number
  exclusoes: string[] // datas YYYY-MM-DD excluídas
  criado_por: string | null
  created_at: string
  updated_at: string
}

export function useRecorrencias(escritorioId?: string) {
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([])
  const [loading, setLoading] = useState(false)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

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
      if (updates.apenasUteis !== undefined) updateData.regra_apenas_uteis = updates.apenasUteis

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

  /**
   * Materializa uma instância virtual de recorrência no banco de dados.
   * Cria uma linha real em agenda_tarefas ou agenda_eventos.
   * Retorna o ID da instância real criada.
   */
  const materializarInstancia = async (
    recorrenciaId: string,
    dataOcorrencia: string // "YYYY-MM-DD"
  ): Promise<{ id: string; tabela: string }> => {
    // 1. Buscar a regra de recorrência
    const regra = await getRecorrencia(recorrenciaId)
    if (!regra) {
      throw new Error('Recorrência não encontrada')
    }

    // 2. Extrair template_dados
    const tpl = regra.template_dados || {}

    // 3. Validar FKs — templates podem referenciar entidades deletadas
    let processoIdValido: string | undefined = tpl.processo_id || undefined
    let consultivoIdValido: string | undefined = tpl.consultivo_id || undefined

    if (processoIdValido) {
      const { count } = await supabase
        .from('processos_processos')
        .select('id', { count: 'exact', head: true })
        .eq('id', processoIdValido)
      if (!count) processoIdValido = undefined
    }

    if (consultivoIdValido) {
      const { count } = await supabase
        .from('consultivo_consultas')
        .select('id', { count: 'exact', head: true })
        .eq('id', consultivoIdValido)
      if (!count) consultivoIdValido = undefined
    }

    // 4. Determinar tabela alvo e montar dados com APENAS colunas válidas
    const tabela = regra.entidade_tipo === 'tarefa' ? 'agenda_tarefas' : 'agenda_eventos'

    let dados: any

    if (regra.entidade_tipo === 'tarefa') {
      // Colunas válidas em agenda_tarefas
      dados = {
        escritorio_id: regra.escritorio_id,
        recorrencia_id: regra.id,
        status: 'pendente',
        titulo: tpl.titulo || regra.template_nome,
        descricao: tpl.descricao || regra.template_descricao || undefined,
        tipo: tpl.tipo || 'outro',
        prioridade: tpl.prioridade || 'media',
        data_inicio: dataOcorrencia, // tipo date
        responsavel_id: tpl.responsavel_id || tpl.responsaveis_ids?.[0] || undefined,
        responsaveis_ids: tpl.responsaveis_ids || [],
        cor: tpl.cor || undefined,
        processo_id: processoIdValido,
        consultivo_id: consultivoIdValido,
        prazo_data_limite: tpl.prazo_data_limite || undefined,
        prazo_dias_uteis: tpl.prazo_dias_uteis ?? undefined,
      }
    } else {
      // Colunas válidas em agenda_eventos
      const hora = regra.regra_hora || '09:00'
      dados = {
        escritorio_id: regra.escritorio_id,
        recorrencia_id: regra.id,
        status: 'pendente',
        titulo: tpl.titulo || regra.template_nome,
        descricao: tpl.descricao || regra.template_descricao || undefined,
        tipo: tpl.tipo || undefined,
        data_inicio: `${dataOcorrencia}T${hora}:00`, // tipo timestamptz
        data_fim: tpl.data_fim || undefined,
        dia_inteiro: tpl.dia_inteiro ?? false,
        local: tpl.local || undefined,
        responsavel_id: tpl.responsavel_id || tpl.responsaveis_ids?.[0] || undefined,
        responsaveis_ids: tpl.responsaveis_ids || [],
        cor: tpl.cor || undefined,
        processo_id: processoIdValido,
        consultivo_id: consultivoIdValido,
      }
    }

    // 5. Inserir no banco
    const { data: instancia, error } = await supabase
      .from(tabela)
      .insert(dados)
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao materializar instância:', error?.message || JSON.stringify(error))
      throw error
    }

    // 6. Incrementar total_criados na regra
    await supabase
      .from('agenda_recorrencias')
      .update({ total_criados: regra.total_criados + 1 })
      .eq('id', regra.id)

    return { id: instancia.id, tabela }
  }

  /**
   * Exclui uma ocorrência específica de uma recorrência (adiciona data ao array exclusoes).
   * A instância virtual dessa data não será mais exibida.
   */
  const excluirOcorrencia = async (recorrenciaId: string, dataOcorrencia: string): Promise<void> => {
    try {
      const regra = await getRecorrencia(recorrenciaId)
      if (!regra) throw new Error('Recorrência não encontrada')

      const exclusoesAtuais = regra.exclusoes || []
      if (exclusoesAtuais.includes(dataOcorrencia)) return // Já excluída

      const { error } = await supabase
        .from('agenda_recorrencias')
        .update({ exclusoes: [...exclusoesAtuais, dataOcorrencia] })
        .eq('id', recorrenciaId)

      if (error) throw error

      await fetchRecorrencias()
    } catch (error) {
      console.error('Erro ao excluir ocorrência:', error)
      throw error
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
    materializarInstancia,
    excluirOcorrencia,
    refreshRecorrencias: fetchRecorrencias,
  }
}
