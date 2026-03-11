'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'

export interface CustaDespesa {
  id: string
  escritorio_id: string
  processo_id: string | null
  consultivo_id: string | null
  cliente_id: string | null
  categoria: string
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  data_pagamento_programada: string | null
  status: string
  fluxo_status: 'pendente' | 'agendado' | 'liberado' | 'pago' | 'rejeitado' | 'cancelado'
  fornecedor: string | null
  documento_fiscal: string | null
  comprovante_url: string | null
  reembolsavel: boolean
  reembolso_status: string | null
  reembolsado: boolean
  conta_bancaria_id: string | null
  forma_pagamento: string | null
  aprovado_por: string | null
  data_aprovacao: string | null
  motivo_rejeicao: string | null
  observacoes_financeiro: string | null
  advogado_id: string | null
  created_at: string
  // JOINs
  processo_autor: string | null
  processo_reu: string | null
  processo_numero_pasta: string | null
  processo_numero_cnj: string | null
  consulta_titulo: string | null
  cliente_nome: string | null
  advogado_nome: string | null
}

export interface FiltrosCustas {
  fluxo_status: string
  periodo: { inicio: string; fim: string } | null
  processo_id: string | null
  cliente_id: string | null
  categoria: string | null
  busca: string
}

export function useCustasDespesas() {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [custas, setCustas] = useState<CustaDespesa[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<FiltrosCustas>({
    fluxo_status: 'todos',
    periodo: null,
    processo_id: null,
    cliente_id: null,
    categoria: null,
    busca: '',
  })

  const carregarCustas = useCallback(async () => {
    if (!escritorioAtivo) return

    try {
      setLoading(true)

      let query = supabase
        .from('financeiro_despesas')
        .select(`
          *,
          processo:processos_processos!processo_id(autor, reu, numero_pasta, numero_cnj),
          consulta:consultivo_consultas!consultivo_id(titulo),
          cliente:crm_pessoas!cliente_id(nome_completo),
          advogado:profiles!advogado_id(nome_completo)
        `)
        .eq('escritorio_id', escritorioAtivo)
        .not('fluxo_status', 'is', null)
        .neq('fluxo_status', 'cancelado')
        .neq('fluxo_status', 'pago')
        .order('created_at', { ascending: false })

      if (filtros.fluxo_status !== 'todos') {
        query = query.eq('fluxo_status', filtros.fluxo_status)
      }

      if (filtros.periodo) {
        query = query.gte('data_vencimento', filtros.periodo.inicio)
        query = query.lte('data_vencimento', filtros.periodo.fim)
      }

      if (filtros.processo_id) {
        query = query.eq('processo_id', filtros.processo_id)
      }

      if (filtros.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id)
      }

      if (filtros.categoria) {
        query = query.eq('categoria', filtros.categoria)
      }

      if (filtros.busca) {
        query = query.ilike('descricao', `%${filtros.busca}%`)
      }

      const { data, error } = await query

      if (error) throw error

      const mapped: CustaDespesa[] = (data || []).map((d: any) => ({
        id: d.id,
        escritorio_id: d.escritorio_id,
        processo_id: d.processo_id,
        consultivo_id: d.consultivo_id,
        cliente_id: d.cliente_id,
        categoria: d.categoria,
        descricao: d.descricao,
        valor: Number(d.valor),
        data_vencimento: d.data_vencimento,
        data_pagamento: d.data_pagamento,
        data_pagamento_programada: d.data_pagamento_programada,
        status: d.status,
        fluxo_status: d.fluxo_status,
        fornecedor: d.fornecedor,
        documento_fiscal: d.documento_fiscal,
        comprovante_url: d.comprovante_url,
        reembolsavel: d.reembolsavel ?? false,
        reembolso_status: d.reembolso_status,
        reembolsado: d.reembolsado ?? false,
        conta_bancaria_id: d.conta_bancaria_id,
        forma_pagamento: d.forma_pagamento,
        aprovado_por: d.aprovado_por,
        data_aprovacao: d.data_aprovacao,
        motivo_rejeicao: d.motivo_rejeicao,
        observacoes_financeiro: d.observacoes_financeiro,
        advogado_id: d.advogado_id,
        created_at: d.created_at,
        // JOINs
        processo_autor: d.processo?.autor || null,
        processo_reu: d.processo?.reu || null,
        processo_numero_pasta: d.processo?.numero_pasta || null,
        processo_numero_cnj: d.processo?.numero_cnj || null,
        consulta_titulo: d.consulta?.titulo || null,
        cliente_nome: d.cliente?.nome_completo || null,
        advogado_nome: d.advogado?.nome_completo || null,
      }))

      setCustas(mapped)
    } catch (error) {
      console.error('Erro ao carregar custas:', error)
      toast.error('Erro ao carregar custas e despesas')
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, filtros, supabase])

  useEffect(() => {
    carregarCustas()
  }, [carregarCustas])

  // === Transições de Status ===

  const agendar = async (
    id: string,
    dataProgramada: string,
    contaBancariaId: string | null,
    obsFinanceiro: string
  ) => {
    const { error } = await supabase
      .from('financeiro_despesas')
      .update({
        fluxo_status: 'agendado',
        data_pagamento_programada: dataProgramada,
        conta_bancaria_id: contaBancariaId,
        observacoes_financeiro: obsFinanceiro || null,
        motivo_rejeicao: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao agendar despesa')
      throw error
    }
    toast.success('Despesa agendada')
    await carregarCustas()
  }

  const liberar = async (id: string, aprovadoPor: string) => {
    const { error } = await supabase
      .from('financeiro_despesas')
      .update({
        fluxo_status: 'liberado',
        aprovado_por: aprovadoPor,
        data_aprovacao: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao liberar despesa')
      throw error
    }
    toast.success('Despesa liberada para pagamento')
    await carregarCustas()
  }

  const rejeitar = async (id: string, motivo: string) => {
    const { error } = await supabase
      .from('financeiro_despesas')
      .update({
        fluxo_status: 'pendente',
        motivo_rejeicao: motivo,
        aprovado_por: null,
        data_aprovacao: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao rejeitar despesa')
      throw error
    }
    toast.success('Despesa rejeitada e devolvida para pendente')
    await carregarCustas()
  }

  const pagar = async (
    id: string,
    contaBancariaId: string,
    formaPagamento: string | null
  ) => {
    const { error } = await supabase
      .from('financeiro_despesas')
      .update({
        fluxo_status: 'pago',
        status: 'pago',
        conta_bancaria_id: contaBancariaId,
        forma_pagamento: formaPagamento,
        data_pagamento: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao registrar pagamento')
      throw error
    }

    // Recalcular saldo da conta
    await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaBancariaId })

    toast.success('Pagamento registrado')
    await carregarCustas()
  }

  const editar = async (id: string, campos: Partial<{
    descricao: string
    valor: number
    data_vencimento: string
    categoria: string
    fornecedor: string
    reembolsavel: boolean
    observacoes_financeiro: string
    conta_bancaria_id: string | null
    data_pagamento_programada: string | null
  }>) => {
    const updateData: Record<string, unknown> = {
      ...campos,
      updated_at: new Date().toISOString(),
    }

    // Ajustar reembolso_status se mudou reembolsavel
    if (campos.reembolsavel !== undefined) {
      updateData.reembolso_status = campos.reembolsavel ? 'pendente' : null
    }

    const { error } = await supabase
      .from('financeiro_despesas')
      .update(updateData)
      .eq('id', id)

    if (error) {
      toast.error('Erro ao editar despesa')
      throw error
    }
    toast.success('Despesa atualizada')
    await carregarCustas()
  }

  const cancelar = async (id: string) => {
    const { error } = await supabase
      .from('financeiro_despesas')
      .update({
        fluxo_status: 'cancelado',
        status: 'cancelado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao cancelar despesa')
      throw error
    }
    toast.success('Despesa cancelada')
    await carregarCustas()
  }

  // === Ações em lote ===

  const agendarLote = async (
    ids: string[],
    dataProgramada: string,
    contaBancariaId: string | null
  ) => {
    const { error } = await supabase
      .from('financeiro_despesas')
      .update({
        fluxo_status: 'agendado',
        data_pagamento_programada: dataProgramada,
        conta_bancaria_id: contaBancariaId,
        motivo_rejeicao: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (error) {
      toast.error('Erro ao agendar despesas em lote')
      throw error
    }
    toast.success(`${ids.length} despesas agendadas`)
    await carregarCustas()
  }

  const liberarLote = async (ids: string[], aprovadoPor: string) => {
    const { error } = await supabase
      .from('financeiro_despesas')
      .update({
        fluxo_status: 'liberado',
        aprovado_por: aprovadoPor,
        data_aprovacao: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (error) {
      toast.error('Erro ao liberar despesas em lote')
      throw error
    }
    toast.success(`${ids.length} despesas liberadas`)
    await carregarCustas()
  }

  // === Totais ===

  const totais = {
    pendente: custas.filter(c => c.fluxo_status === 'pendente').reduce((s, c) => s + c.valor, 0),
    agendado: custas.filter(c => c.fluxo_status === 'agendado').reduce((s, c) => s + c.valor, 0),
    liberado: custas.filter(c => c.fluxo_status === 'liberado').reduce((s, c) => s + c.valor, 0),
    pago: custas.filter(c => c.fluxo_status === 'pago').reduce((s, c) => s + c.valor, 0),
  }

  return {
    custas,
    loading,
    filtros,
    setFiltros,
    totais,
    recarregar: carregarCustas,
    // Transições
    agendar,
    liberar,
    rejeitar,
    pagar,
    editar,
    cancelar,
    // Lote
    agendarLote,
    liberarLote,
  }
}
