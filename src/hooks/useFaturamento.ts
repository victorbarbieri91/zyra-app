import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LancamentoProntoFaturar {
  lancamento_id: string
  tipo_lancamento: 'honorario' | 'timesheet'
  escritorio_id: string
  cliente_id: string
  cliente_nome: string
  descricao: string
  valor: number | null
  horas: number | null
  processo_id: string | null
  consulta_id: string | null
  categoria: string
  created_at: string
  // Campos de detalhes do processo
  processo_numero: string | null // numero_cnj
  processo_pasta: string | null // PROC-0001
  partes_resumo: string | null // "João Silva vs Empresa ABC"
}

export interface ClienteParaFaturar {
  cliente_id: string
  cliente_nome: string
  total_honorarios: number
  total_horas: number
  qtd_honorarios: number
  qtd_horas: number
  soma_horas: number
  total_faturar: number
}

export interface FaturaGerada {
  fatura_id: string
  escritorio_id: string
  numero_fatura: string
  cliente_id: string
  cliente_nome: string
  cliente_email: string | null
  data_emissao: string
  data_vencimento: string
  valor_total: number
  status: 'rascunho' | 'emitida' | 'enviada' | 'paga' | 'atrasada' | 'cancelada'
  parcelado: boolean
  numero_parcelas: number | null
  observacoes: string | null
  pdf_url: string | null
  enviada_em: string | null
  paga_em: string | null
  gerada_automaticamente: boolean
  qtd_honorarios: number
  qtd_horas: number
  total_honorarios: number
  total_horas: number
  soma_horas: number
  created_at: string
  updated_at: string
  categoria_status: string
  dias_ate_vencimento: number | null
}

export interface ItemFatura {
  id: string
  fatura_id: string
  tipo_item: 'honorario' | 'timesheet' | 'despesa'
  descricao: string
  processo_id: string | null
  consulta_id: string | null
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number
  timesheet_ids: string[] | null
  referencia_id: string | null
  created_at: string
  // Campos de detalhes do processo (via JOIN)
  processo_numero?: string | null // numero_cnj
  processo_pasta?: string | null // PROC-0001
  partes_resumo?: string | null // "João Silva vs Empresa ABC"
}

export function useFaturamento(escritorioId: string | null) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // LANÇAMENTOS PRONTOS PARA FATURAR
  // ============================================

  const loadLancamentosProntos = useCallback(async (): Promise<LancamentoProntoFaturar[]> => {
    if (!escritorioId) {
      console.log('useFaturamento: escritorioId não definido')
      return []
    }

    try {
      setLoading(true)
      setError(null)

      console.log('useFaturamento: Buscando lançamentos para escritório:', escritorioId)

      const { data, error: queryError } = await supabase
        .from('v_lancamentos_prontos_faturar')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .order('cliente_nome', { ascending: true })
        .order('created_at', { ascending: false })

      if (queryError) {
        console.error('useFaturamento: Erro ao buscar lançamentos:', queryError)
        throw queryError
      }

      console.log('useFaturamento: Lançamentos encontrados:', data?.length || 0, data)

      return (data as LancamentoProntoFaturar[]) || []
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar lançamentos:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioId, supabase])

  const loadClientesParaFaturar = useCallback(async (): Promise<ClienteParaFaturar[]> => {
    if (!escritorioId) return []

    try {
      setLoading(true)
      setError(null)

      const lancamentos = await loadLancamentosProntos()

      // Agrupar por cliente
      const clientesMap = new Map<string, ClienteParaFaturar>()

      lancamentos.forEach((lanc) => {
        if (!clientesMap.has(lanc.cliente_id)) {
          clientesMap.set(lanc.cliente_id, {
            cliente_id: lanc.cliente_id,
            cliente_nome: lanc.cliente_nome,
            total_honorarios: 0,
            total_horas: 0,
            qtd_honorarios: 0,
            qtd_horas: 0,
            soma_horas: 0,
            total_faturar: 0,
          })
        }

        const cliente = clientesMap.get(lanc.cliente_id)!

        if (lanc.tipo_lancamento === 'honorario') {
          cliente.qtd_honorarios += 1
          cliente.total_honorarios += lanc.valor || 0
        } else if (lanc.tipo_lancamento === 'timesheet') {
          cliente.qtd_horas += 1
          cliente.soma_horas += lanc.horas || 0
          // Valor hora: buscar do contrato ou usar padrão
          const valorHora = 400 // TODO: buscar do contrato
          cliente.total_horas += (lanc.horas || 0) * valorHora
        }

        cliente.total_faturar = cliente.total_honorarios + cliente.total_horas
      })

      return Array.from(clientesMap.values()).sort((a, b) =>
        a.cliente_nome.localeCompare(b.cliente_nome)
      )
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar clientes:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioId, loadLancamentosProntos])

  const loadLancamentosPorCliente = useCallback(
    async (clienteId: string): Promise<LancamentoProntoFaturar[]> => {
      if (!escritorioId) return []

      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('v_lancamentos_prontos_faturar')
          .select('*')
          .eq('escritorio_id', escritorioId)
          .eq('cliente_id', clienteId)
          .order('tipo_lancamento', { ascending: true })
          .order('created_at', { ascending: false })

        if (queryError) throw queryError

        return (data as LancamentoProntoFaturar[]) || []
      } catch (err: any) {
        setError(err.message)
        console.error('Erro ao carregar lançamentos do cliente:', err)
        return []
      } finally {
        setLoading(false)
      }
    },
    [escritorioId, supabase]
  )

  // ============================================
  // FATURAS GERADAS
  // ============================================

  const loadFaturasGeradas = useCallback(async (): Promise<FaturaGerada[]> => {
    if (!escritorioId) {
      console.log('useFaturamento: escritorioId não definido para faturas')
      return []
    }

    try {
      setLoading(true)
      setError(null)

      console.log('useFaturamento: Buscando faturas para escritório:', escritorioId)

      const { data, error: queryError } = await supabase
        .from('v_faturas_geradas')
        .select('*')
        .eq('escritorio_id', escritorioId)
        .order('created_at', { ascending: false })

      if (queryError) {
        console.error('useFaturamento: Erro ao buscar faturas:', queryError)
        throw queryError
      }

      console.log('useFaturamento: Faturas encontradas:', data?.length || 0, data)

      return (data as FaturaGerada[]) || []
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar faturas:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioId, supabase])

  const loadItensFatura = useCallback(
    async (faturaId: string): Promise<ItemFatura[]> => {
      try {
        setLoading(true)
        setError(null)

        // Buscar fatura com itens em JSONB
        const { data: fatura, error: queryError } = await supabase
          .from('financeiro_faturamento_faturas')
          .select('itens')
          .eq('id', faturaId)
          .single()

        if (queryError) throw queryError

        const itensJsonb = fatura?.itens || []

        // Buscar dados de processos para os itens que têm processo_id
        const processosIds = itensJsonb
          .filter((item: any) => item.processo_id)
          .map((item: any) => item.processo_id)

        let processosMap: Record<string, any> = {}

        if (processosIds.length > 0) {
          const { data: processos } = await supabase
            .from('processos_processos')
            .select('id, numero_cnj, numero_pasta, autor, reu')
            .in('id', processosIds)

          processos?.forEach((p) => {
            processosMap[p.id] = p
          })
        }

        // Mapear itens JSONB para o formato ItemFatura
        const itens: ItemFatura[] = itensJsonb.map((item: any, index: number) => {
          const processo = item.processo_id ? processosMap[item.processo_id] : null

          return {
            id: `${faturaId}-item-${index}`,
            fatura_id: faturaId,
            tipo_item: item.tipo === 'timesheet' ? 'timesheet' : item.tipo === 'honorario' ? 'honorario' : 'despesa',
            descricao: item.descricao || '',
            processo_id: item.processo_id || null,
            consulta_id: item.consulta_id || null,
            quantidade: item.horas || null,
            valor_unitario: item.valor_hora || null,
            valor_total: Number(item.valor) || 0,
            timesheet_ids: item.timesheet_ids || null,
            referencia_id: item.referencia_id || null,
            created_at: new Date().toISOString(),
            processo_numero: processo?.numero_cnj || null,
            processo_pasta: processo?.numero_pasta || null,
            partes_resumo:
              processo?.autor && processo?.reu
                ? `${processo.autor} vs ${processo.reu}`
                : null,
          }
        })

        return itens
      } catch (err: any) {
        setError(err.message)
        console.error('Erro ao carregar itens da fatura:', err)
        return []
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  // ============================================
  // AÇÕES DE FATURAMENTO
  // ============================================

  const gerarFatura = useCallback(
    async (
      clienteId: string,
      honorariosIds: string[],
      timesheetIds: string[],
      observacoes?: string,
      dataVencimento?: string
    ): Promise<string | null> => {
      if (!escritorioId) {
        setError('Escritório não identificado')
        return null
      }

      try {
        setLoading(true)
        setError(null)

        // Buscar user_id atual
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data, error: rpcError } = await supabase.rpc('gerar_fatura_v2', {
          p_escritorio_id: escritorioId,
          p_cliente_id: clienteId,
          p_honorarios_ids: honorariosIds.length > 0 ? honorariosIds : null,
          p_timesheet_ids: timesheetIds.length > 0 ? timesheetIds : null,
          p_data_emissao: new Date().toISOString().split('T')[0],
          p_data_vencimento: dataVencimento || null,
          p_observacoes: observacoes || null,
          p_user_id: user?.id || null,
        })

        if (rpcError) throw rpcError

        return data as string
      } catch (err: any) {
        setError(err.message)
        console.error('Erro ao gerar fatura:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [escritorioId, supabase]
  )

  const desmontarFatura = useCallback(
    async (faturaId: string): Promise<boolean> => {
      try {
        setLoading(true)
        setError(null)

        // Buscar user_id atual
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data, error: rpcError } = await supabase.rpc('desmanchar_fatura', {
          p_fatura_id: faturaId,
          p_user_id: user?.id || null,
        })

        if (rpcError) throw rpcError

        return data === true
      } catch (err: any) {
        setError(err.message)
        console.error('Erro ao desmontar fatura:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  // ============================================
  // PAGAMENTO DE FATURA
  // ============================================

  const pagarFatura = useCallback(
    async (
      faturaId: string,
      valorPago: number,
      dataPagamento: string,
      formaPagamento: string,
      contaBancariaId?: string,
      comprovanteUrl?: string,
      observacoes?: string
    ): Promise<string | null> => {
      try {
        setLoading(true)
        setError(null)

        // Buscar user_id atual
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data, error: rpcError } = await supabase.rpc('pagar_fatura', {
          p_fatura_id: faturaId,
          p_valor_pago: valorPago,
          p_data_pagamento: dataPagamento,
          p_forma_pagamento: formaPagamento,
          p_conta_bancaria_id: contaBancariaId || null,
          p_user_id: user?.id || null,
          p_comprovante_url: comprovanteUrl || null,
          p_observacoes: observacoes || null,
        })

        if (rpcError) throw rpcError

        return data as string // Retorna pagamento_id
      } catch (err: any) {
        setError(err.message)
        console.error('Erro ao pagar fatura:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  // ============================================
  // CONTAS BANCÁRIAS (para seleção no pagamento)
  // ============================================

  const loadContasBancarias = useCallback(async () => {
    if (!escritorioId) return []

    try {
      const { data, error: queryError } = await supabase
        .from('financeiro_contas_bancarias')
        .select('id, banco, agencia, numero_conta, saldo_atual')
        .eq('escritorio_id', escritorioId)
        .eq('ativa', true)
        .order('banco', { ascending: true })

      if (queryError) throw queryError

      return data || []
    } catch (err: any) {
      console.error('Erro ao carregar contas bancárias:', err)
      return []
    }
  }, [escritorioId, supabase])

  return {
    loading,
    error,
    loadLancamentosProntos,
    loadClientesParaFaturar,
    loadLancamentosPorCliente,
    loadFaturasGeradas,
    loadItensFatura,
    gerarFatura,
    desmontarFatura,
    pagarFatura,
    loadContasBancarias,
  }
}
