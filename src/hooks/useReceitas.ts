'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// =====================================================
// INTERFACES
// =====================================================

export type TipoReceita = 'honorario' | 'parcela' | 'avulso' | 'saldo'
export type StatusReceita = 'pendente' | 'pago' | 'parcial' | 'atrasado' | 'cancelado' | 'faturado'
export type FormaPagamento = 'dinheiro' | 'pix' | 'ted' | 'boleto' | 'cartao_credito' | 'cartao_debito'
export type FrequenciaRecorrencia = 'mensal' | 'trimestral' | 'semestral' | 'anual'

export interface ConfigRecorrencia {
  frequencia: FrequenciaRecorrencia
  dia_vencimento: number
  data_inicio: string
  data_fim: string | null
  gerar_automatico: boolean
  ultima_geracao?: string
}

export interface Receita {
  id: string
  escritorio_id: string
  tipo: TipoReceita
  cliente_id: string | null
  processo_id: string | null
  consulta_id: string | null
  contrato_id: string | null
  fatura_id: string | null
  receita_pai_id: string | null
  receita_origem_id: string | null
  numero_parcela: number | null
  descricao: string
  categoria: string
  valor: number
  data_competencia: string
  data_vencimento: string
  data_pagamento: string | null
  status: StatusReceita
  valor_pago: number | null
  forma_pagamento: FormaPagamento | null
  conta_bancaria_id: string | null
  recorrente: boolean
  config_recorrencia: ConfigRecorrencia | null
  parcelado: boolean
  numero_parcelas: number
  dias_atraso: number
  juros_aplicados: number
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface ReceitaComRelacoes extends Receita {
  cliente?: {
    id: string
    nome_completo: string
    email?: string
  }
  processo?: {
    id: string
    numero_cnj: string
    numero_pasta?: string
  }
  contrato?: {
    id: string
    numero_contrato: string
  }
  parcelas?: Receita[]
}

export interface ReceitaFormData {
  cliente_id: string | null
  processo_id: string | null
  consulta_id: string | null
  contrato_id: string | null
  descricao: string
  categoria: string
  valor: number
  data_vencimento: string
  parcelado: boolean
  numero_parcelas: number
  recorrente: boolean
  config_recorrencia: ConfigRecorrencia | null
  observacoes: string | null
}

export interface PagamentoParcialData {
  receita_id: string
  valor_pago: number
  nova_data_vencimento: string
  conta_bancaria_id: string
  forma_pagamento: FormaPagamento
}

export interface FiltrosReceitas {
  status?: StatusReceita | 'todos'
  tipo?: TipoReceita | 'todos'
  cliente_id?: string
  processo_id?: string
  contrato_id?: string
  data_inicio?: string
  data_fim?: string
  recorrente?: boolean
}

// =====================================================
// CATEGORIAS DE RECEITA
// =====================================================

export const CATEGORIAS_RECEITA = [
  { value: 'honorario', label: 'Honorários' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'parecer', label: 'Parecer' },
  { value: 'acordo', label: 'Acordo' },
  { value: 'exito', label: 'Êxito' },
  { value: 'avulso', label: 'Receita Avulsa' },
  { value: 'recorrente', label: 'Receita Recorrente' },
]

// =====================================================
// HOOK
// =====================================================

export function useReceitas(escritorioId: string | null) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receitas, setReceitas] = useState<ReceitaComRelacoes[]>([])

  // =====================================================
  // CARREGAR RECEITAS
  // =====================================================

  const loadReceitas = useCallback(async (filtros?: FiltrosReceitas) => {
    if (!escritorioId) return []

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('financeiro_receitas')
        .select(`
          *,
          cliente:crm_pessoas(id, nome_completo, email),
          processo:processos_processos(id, numero_cnj, numero_pasta),
          contrato:financeiro_contratos_honorarios(id, numero_contrato)
        `)
        .eq('escritorio_id', escritorioId)
        .order('data_vencimento', { ascending: false })

      // Aplicar filtros
      if (filtros?.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status)
      }

      if (filtros?.tipo && filtros.tipo !== 'todos') {
        query = query.eq('tipo', filtros.tipo)
      } else {
        // Por padrão, não mostrar honorários parcelados (só as parcelas)
        query = query.or('parcelado.eq.false,tipo.neq.honorario')
      }

      if (filtros?.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id)
      }

      if (filtros?.processo_id) {
        query = query.eq('processo_id', filtros.processo_id)
      }

      if (filtros?.contrato_id) {
        query = query.eq('contrato_id', filtros.contrato_id)
      }

      if (filtros?.data_inicio) {
        query = query.gte('data_vencimento', filtros.data_inicio)
      }

      if (filtros?.data_fim) {
        query = query.lte('data_vencimento', filtros.data_fim)
      }

      if (filtros?.recorrente !== undefined) {
        query = query.eq('recorrente', filtros.recorrente)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setReceitas(data || [])
      return data || []
    } catch (err) {
      console.error('Erro ao carregar receitas:', err)
      setError('Erro ao carregar receitas')
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioId, supabase])

  // =====================================================
  // CARREGAR RECEITA POR ID
  // =====================================================

  const loadReceitaById = useCallback(async (receitaId: string) => {
    if (!escritorioId) return null

    try {
      const { data, error: queryError } = await supabase
        .from('financeiro_receitas')
        .select(`
          *,
          cliente:crm_pessoas(id, nome_completo, email),
          processo:processos_processos(id, numero_cnj, numero_pasta),
          contrato:financeiro_contratos_honorarios(id, numero_contrato),
          parcelas:financeiro_receitas!receita_pai_id(*)
        `)
        .eq('id', receitaId)
        .single()

      if (queryError) throw queryError

      return data as ReceitaComRelacoes
    } catch (err) {
      console.error('Erro ao carregar receita:', err)
      return null
    }
  }, [escritorioId, supabase])

  // =====================================================
  // CRIAR RECEITA
  // =====================================================

  const createReceita = useCallback(async (formData: ReceitaFormData): Promise<string | null> => {
    if (!escritorioId) return null

    setLoading(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('financeiro_receitas')
        .insert({
          escritorio_id: escritorioId,
          tipo: 'honorario',
          cliente_id: formData.cliente_id,
          processo_id: formData.processo_id,
          consulta_id: formData.consulta_id,
          contrato_id: formData.contrato_id,
          descricao: formData.descricao,
          categoria: formData.categoria,
          valor: formData.valor,
          data_competencia: formData.data_vencimento.substring(0, 7) + '-01', // Primeiro dia do mês
          data_vencimento: formData.data_vencimento,
          parcelado: formData.parcelado,
          numero_parcelas: formData.parcelado ? formData.numero_parcelas : 1,
          recorrente: formData.recorrente,
          config_recorrencia: formData.recorrente ? formData.config_recorrencia : null,
          observacoes: formData.observacoes,
          status: 'pendente',
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // Se parcelado, o trigger gerar_parcelas_receita cria as parcelas automaticamente

      return data?.id || null
    } catch (err) {
      console.error('Erro ao criar receita:', err)
      setError('Erro ao criar receita')
      return null
    } finally {
      setLoading(false)
    }
  }, [escritorioId, supabase])

  // =====================================================
  // ATUALIZAR RECEITA
  // =====================================================

  const updateReceita = useCallback(async (
    receitaId: string,
    updates: Partial<ReceitaFormData>
  ): Promise<boolean> => {
    if (!escritorioId) return false

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('financeiro_receitas')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', receitaId)
        .eq('escritorio_id', escritorioId)

      if (updateError) throw updateError

      return true
    } catch (err) {
      console.error('Erro ao atualizar receita:', err)
      setError('Erro ao atualizar receita')
      return false
    } finally {
      setLoading(false)
    }
  }, [escritorioId, supabase])

  // =====================================================
  // CANCELAR RECEITA
  // =====================================================

  const cancelarReceita = useCallback(async (receitaId: string): Promise<boolean> => {
    if (!escritorioId) return false

    try {
      const { error: updateError } = await supabase
        .from('financeiro_receitas')
        .update({
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', receitaId)
        .eq('escritorio_id', escritorioId)

      if (updateError) throw updateError

      return true
    } catch (err) {
      console.error('Erro ao cancelar receita:', err)
      return false
    }
  }, [escritorioId, supabase])

  // =====================================================
  // RECEBER RECEITA (TOTAL)
  // =====================================================

  const receberReceita = useCallback(async (
    receitaId: string,
    contaBancariaId: string,
    formaPagamento: FormaPagamento = 'pix',
    valorPago?: number,
    dataPagamento?: string
  ): Promise<boolean> => {
    if (!escritorioId) return false

    setLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('receber_receita', {
        p_receita_id: receitaId,
        p_conta_bancaria_id: contaBancariaId,
        p_forma_pagamento: formaPagamento,
        p_valor_pago: valorPago || null,
        p_data_pagamento: dataPagamento || null,
      })

      if (rpcError) throw rpcError

      return true
    } catch (err) {
      console.error('Erro ao receber receita:', err)
      setError('Erro ao receber receita')
      return false
    } finally {
      setLoading(false)
    }
  }, [escritorioId, supabase])

  // =====================================================
  // RECEBER RECEITA PARCIAL
  // =====================================================

  const receberReceitaParcial = useCallback(async (
    data: PagamentoParcialData
  ): Promise<string | null> => {
    if (!escritorioId) return null

    setLoading(true)
    setError(null)

    try {
      const { data: saldoReceitaId, error: rpcError } = await supabase.rpc('receber_receita_parcial', {
        p_receita_id: data.receita_id,
        p_valor_pago: data.valor_pago,
        p_nova_data_vencimento: data.nova_data_vencimento,
        p_conta_bancaria_id: data.conta_bancaria_id,
        p_forma_pagamento: data.forma_pagamento,
      })

      if (rpcError) throw rpcError

      // Retorna o ID da receita de saldo criada (se houver)
      return saldoReceitaId
    } catch (err) {
      console.error('Erro ao receber receita parcial:', err)
      setError('Erro ao receber receita parcial')
      return null
    } finally {
      setLoading(false)
    }
  }, [escritorioId, supabase])

  // =====================================================
  // CARREGAR PARCELAS DE UM HONORÁRIO
  // =====================================================

  const loadParcelas = useCallback(async (receitaPaiId: string): Promise<Receita[]> => {
    if (!escritorioId) return []

    try {
      const { data, error: queryError } = await supabase
        .from('financeiro_receitas')
        .select('*')
        .eq('receita_pai_id', receitaPaiId)
        .order('numero_parcela', { ascending: true })

      if (queryError) throw queryError

      return data || []
    } catch (err) {
      console.error('Erro ao carregar parcelas:', err)
      return []
    }
  }, [escritorioId, supabase])

  // =====================================================
  // CARREGAR RECEITAS RECORRENTES
  // =====================================================

  const loadReceitasRecorrentes = useCallback(async (): Promise<ReceitaComRelacoes[]> => {
    if (!escritorioId) return []

    try {
      const { data, error: queryError } = await supabase
        .from('financeiro_receitas')
        .select(`
          *,
          cliente:crm_pessoas(id, nome_completo)
        `)
        .eq('escritorio_id', escritorioId)
        .eq('recorrente', true)
        .is('receita_pai_id', null) // Só templates, não filhos
        .order('descricao')

      if (queryError) throw queryError

      return data || []
    } catch (err) {
      console.error('Erro ao carregar receitas recorrentes:', err)
      return []
    }
  }, [escritorioId, supabase])

  // =====================================================
  // ESTATÍSTICAS
  // =====================================================

  const loadEstatisticas = useCallback(async () => {
    if (!escritorioId) return null

    try {
      const { data, error: queryError } = await supabase
        .from('v_dashboard_financeiro_metricas')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .single()

      if (queryError) throw queryError

      return data
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
      return null
    }
  }, [escritorioId, supabase])

  // =====================================================
  // RETURN
  // =====================================================

  return {
    // Estado
    loading,
    error,
    receitas,

    // Operações CRUD
    loadReceitas,
    loadReceitaById,
    createReceita,
    updateReceita,
    cancelarReceita,

    // Pagamentos
    receberReceita,
    receberReceitaParcial,

    // Parcelas e recorrência
    loadParcelas,
    loadReceitasRecorrentes,

    // Estatísticas
    loadEstatisticas,
  }
}
