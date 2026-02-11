import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProcessoFechamento {
  id: string
  numero_cnj: string | null
  numero_pasta: string | null
  titulo: string | null
  cliente_nome: string | null
}

export interface LancamentoProntoFaturar {
  lancamento_id: string
  tipo_lancamento: 'honorario' | 'timesheet' | 'despesa' | 'pasta'
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
  // Campos específicos para pasta
  fechamento_id: string | null
  qtd_processos: number | null
  valor_unitario: number | null
  processos_lista: ProcessoFechamento[] | null
  competencia: string | null
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
  // Campos para pasta
  total_pastas: number
  qtd_pastas: number
  qtd_processos_pasta: number
  // Dados detalhados das pastas para o modal
  pastas: Array<{
    fechamento_id: string
    competencia: string
    qtd_processos: number
    valor_unitario: number
    valor_total: number
    processos_lista: ProcessoFechamento[]
  }>
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
  tipo_item: 'honorario' | 'timesheet' | 'despesa' | 'pasta'
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
  caso_titulo?: string | null // "Autor x Réu" ou título da consulta
  // Campos de profissional (para timesheet)
  profissional_nome?: string | null
  cargo_nome?: string | null
  data_trabalho?: string | null
  user_id?: string | null
  // Campos específicos para pasta (fechamento mensal)
  competencia?: string | null
  qtd_processos?: number | null
  processos_lista?: ProcessoFechamento[] | null
}

export function useFaturamento(escritorioIdOrIds: string | string[] | null) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Normalizar para sempre ter um array de IDs
  const escritorioIds = Array.isArray(escritorioIdOrIds)
    ? escritorioIdOrIds
    : (escritorioIdOrIds ? [escritorioIdOrIds] : [])

  // Manter compatibilidade - pegar primeiro ID para operações de escrita
  const escritorioIdPrincipal = escritorioIds[0] || null

  // ============================================
  // LANÇAMENTOS PRONTOS PARA FATURAR
  // ============================================

  const loadLancamentosProntos = useCallback(async (): Promise<LancamentoProntoFaturar[]> => {
    if (escritorioIds.length === 0) {
      console.log('useFaturamento: escritorioIds não definido')
      return []
    }

    try {
      setLoading(true)
      setError(null)

      console.log('useFaturamento: Buscando lançamentos para escritórios:', escritorioIds)

      const { data, error: queryError } = await supabase
        .from('v_lancamentos_prontos_faturar')
        .select('*')
        .in('escritorio_id', escritorioIds)
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
  }, [escritorioIds, supabase])

  const loadClientesParaFaturar = useCallback(async (): Promise<ClienteParaFaturar[]> => {
    if (escritorioIds.length === 0) return []

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
            cliente_nome: lanc.cliente_nome || 'Cliente não identificado',
            total_honorarios: 0,
            total_horas: 0,
            qtd_honorarios: 0,
            qtd_horas: 0,
            soma_horas: 0,
            total_faturar: 0,
            total_pastas: 0,
            qtd_pastas: 0,
            qtd_processos_pasta: 0,
            pastas: [],
          })
        }

        const cliente = clientesMap.get(lanc.cliente_id)!

        if (lanc.tipo_lancamento === 'honorario' || lanc.tipo_lancamento === 'despesa') {
          cliente.qtd_honorarios += 1
          cliente.total_honorarios += lanc.valor || 0
        } else if (lanc.tipo_lancamento === 'timesheet') {
          cliente.qtd_horas += 1
          cliente.soma_horas += lanc.horas || 0
          // Usar valor já calculado pela view (inclui valor_hora do contrato)
          cliente.total_horas += lanc.valor || 0
        } else if (lanc.tipo_lancamento === 'pasta') {
          cliente.qtd_pastas += 1
          cliente.total_pastas += lanc.valor || 0
          cliente.qtd_processos_pasta += lanc.qtd_processos || 0
          // Adicionar dados detalhados da pasta
          if (lanc.fechamento_id) {
            cliente.pastas.push({
              fechamento_id: lanc.fechamento_id,
              competencia: lanc.competencia || '',
              qtd_processos: lanc.qtd_processos || 0,
              valor_unitario: lanc.valor_unitario || 0,
              valor_total: lanc.valor || 0,
              processos_lista: lanc.processos_lista || [],
            })
          }
        }

        cliente.total_faturar = cliente.total_honorarios + cliente.total_horas + cliente.total_pastas
      })

      return Array.from(clientesMap.values()).sort((a, b) =>
        (a.cliente_nome || '').localeCompare(b.cliente_nome || '')
      )
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar clientes:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [escritorioIds, loadLancamentosProntos])

  const loadLancamentosPorCliente = useCallback(
    async (clienteId: string): Promise<LancamentoProntoFaturar[]> => {
      if (escritorioIds.length === 0) return []

      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('v_lancamentos_prontos_faturar')
          .select('*')
          .in('escritorio_id', escritorioIds)
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
    [escritorioIds, supabase]
  )

  // ============================================
  // FATURAS GERADAS
  // ============================================

  const loadFaturasGeradas = useCallback(async (): Promise<FaturaGerada[]> => {
    if (escritorioIds.length === 0) {
      console.log('useFaturamento: escritorioIds não definido para faturas')
      return []
    }

    try {
      setLoading(true)
      setError(null)

      console.log('useFaturamento: Buscando faturas para escritórios:', escritorioIds)

      const { data, error: queryError } = await supabase
        .from('v_faturas_geradas')
        .select('*')
        .in('escritorio_id', escritorioIds)
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
  }, [escritorioIds, supabase])

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

          processos?.forEach((p: { id: string; numero_cnj: string | null; numero_pasta: string | null; autor: string | null; reu: string | null }) => {
            processosMap[p.id] = p
          })
        }

        // Mapear itens JSONB para o formato ItemFatura
        const itens: ItemFatura[] = itensJsonb.map((item: any, index: number) => {
          const processo = item.processo_id ? processosMap[item.processo_id] : null

          // Determinar tipo do item
          let tipoItem: ItemFatura['tipo_item'] = 'despesa'
          if (item.tipo === 'timesheet') tipoItem = 'timesheet'
          else if (item.tipo === 'honorario') tipoItem = 'honorario'
          else if (item.tipo === 'pasta') tipoItem = 'pasta'

          return {
            id: `${faturaId}-item-${index}`,
            fatura_id: faturaId,
            tipo_item: tipoItem,
            descricao: item.descricao || '',
            processo_id: item.processo_id || null,
            consulta_id: item.consulta_id || null,
            quantidade: tipoItem === 'pasta' ? (item.qtd_processos || null) : (item.horas || null),
            valor_unitario: tipoItem === 'pasta' ? (item.valor_unitario || null) : (item.valor_hora || null),
            valor_total: Number(item.valor) || 0,
            timesheet_ids: item.timesheet_ids || null,
            referencia_id: item.referencia_id || null,
            created_at: new Date().toISOString(),
            processo_numero: processo?.numero_cnj || null,
            processo_pasta: processo?.numero_pasta || null,
            partes_resumo:
              item.partes_resumo || (processo?.autor && processo?.reu
                ? `${processo.autor} vs ${processo.reu}`
                : null),
            caso_titulo: item.caso_titulo || item.partes_resumo || (processo?.autor && processo?.reu
                ? `${processo.autor} x ${processo.reu}`
                : null),
            // Campos de profissional (para timesheet)
            profissional_nome: item.profissional_nome || null,
            cargo_nome: item.cargo_nome || null,
            data_trabalho: item.data_trabalho || null,
            user_id: item.user_id || null,
            // Campos específicos para pasta
            competencia: item.competencia || null,
            qtd_processos: item.qtd_processos || null,
            processos_lista: item.processos || null,
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
      dataVencimento?: string,
      escritorioIdOverride?: string,
      fechamentosIds?: string[],
      despesasIds?: string[],
      dataEmissao?: string
    ): Promise<string | null> => {
      const targetEscritorioId = escritorioIdOverride || escritorioIdPrincipal
      if (!targetEscritorioId) {
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

        // Usar Edge Function para gerar fatura (suporta honorários, timesheet, despesas e fechamentos)
        const { data: response, error: fnError } = await supabase.functions.invoke('gerar-fatura', {
          body: {
            p_escritorio_id: targetEscritorioId,
            p_cliente_id: clienteId,
            p_honorarios_ids: honorariosIds.length > 0 ? honorariosIds : null,
            p_timesheet_ids: timesheetIds.length > 0 ? timesheetIds : null,
            p_despesas_ids: despesasIds && despesasIds.length > 0 ? despesasIds : null,
            p_fechamentos_ids: fechamentosIds && fechamentosIds.length > 0 ? fechamentosIds : null,
            p_data_emissao: dataEmissao || new Date().toISOString().split('T')[0],
            p_data_vencimento: dataVencimento || null,
            p_observacoes: observacoes || null,
            p_user_id: user?.id || null,
          },
        })

        if (fnError) throw fnError
        if (response?.error) throw new Error(response.error)

        console.log('Fatura gerada:', response)
        return response?.fatura_id as string
      } catch (err: any) {
        setError(err.message)
        console.error('Erro ao gerar fatura:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [escritorioIdPrincipal, supabase]
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

        // Usar Edge Function para desmanchar fatura
        const { data: response, error: fnError } = await supabase.functions.invoke('desmanchar-fatura', {
          body: {
            p_fatura_id: faturaId,
            p_user_id: user?.id || null,
          },
        })

        if (fnError) throw fnError
        if (response?.error) throw new Error(response.error)

        console.log('Fatura desmanchada:', response)
        return response?.success === true
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
    if (escritorioIds.length === 0) return []

    try {
      const { data, error: queryError } = await supabase
        .from('financeiro_contas_bancarias')
        .select('id, banco, agencia, numero_conta, saldo_atual')
        .in('escritorio_id', escritorioIds)
        .eq('ativa', true)
        .order('banco', { ascending: true })

      if (queryError) throw queryError

      return data || []
    } catch (err: any) {
      console.error('Erro ao carregar contas bancárias:', err)
      return []
    }
  }, [escritorioIds, supabase])

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
