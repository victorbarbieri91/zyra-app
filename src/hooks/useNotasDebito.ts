'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'

export interface NotaDebito {
  id: string
  escritorio_id: string
  numero: string
  cliente_id: string
  status: 'rascunho' | 'emitida' | 'enviada' | 'paga' | 'cancelada'
  valor_total: number
  data_emissao: string | null
  data_vencimento: string
  data_pagamento: string | null
  observacoes: string | null
  pdf_url: string | null
  receita_id: string | null
  conta_bancaria_id: string | null
  created_at: string
  // JOINs
  cliente_nome: string | null
  qtd_itens: number
}

export interface NotaDebitoItem {
  id: string
  nota_debito_id: string
  despesa_id: string
  descricao: string
  valor: number
  categoria: string | null
  processo_titulo: string | null
}

export interface DespesaReembolsavel {
  id: string
  descricao: string
  valor: number
  categoria: string
  data_vencimento: string
  processo_id: string | null
  consultivo_id: string | null
  processo_autor: string | null
  processo_reu: string | null
  processo_numero_pasta: string | null
  consulta_titulo: string | null
}

export function useNotasDebito() {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [notas, setNotas] = useState<NotaDebito[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const carregarNotas = useCallback(async () => {
    if (!escritorioAtivo) return

    try {
      setLoading(true)

      let query = supabase
        .from('financeiro_notas_debito')
        .select(`
          *,
          cliente:crm_pessoas!cliente_id(nome_completo),
          itens:financeiro_notas_debito_itens(id)
        `)
        .eq('escritorio_id', escritorioAtivo)
        .order('created_at', { ascending: false })

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }

      const { data, error } = await query

      if (error) throw error

      const mapped: NotaDebito[] = (data || []).map((nd: any) => ({
        id: nd.id,
        escritorio_id: nd.escritorio_id,
        numero: nd.numero,
        cliente_id: nd.cliente_id,
        status: nd.status,
        valor_total: Number(nd.valor_total),
        data_emissao: nd.data_emissao,
        data_vencimento: nd.data_vencimento,
        data_pagamento: nd.data_pagamento,
        observacoes: nd.observacoes,
        pdf_url: nd.pdf_url,
        receita_id: nd.receita_id,
        conta_bancaria_id: nd.conta_bancaria_id,
        created_at: nd.created_at,
        cliente_nome: nd.cliente?.nome_completo || null,
        qtd_itens: nd.itens?.length || 0,
      }))

      setNotas(mapped)
    } catch (error) {
      console.error('Erro ao carregar notas de débito:', error)
      toast.error('Erro ao carregar notas de débito')
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, filtroStatus, supabase])

  useEffect(() => {
    carregarNotas()
  }, [carregarNotas])

  // Buscar despesas reembolsáveis pagas de um cliente (não faturadas)
  const buscarDespesasReembolsaveis = async (clienteId: string): Promise<DespesaReembolsavel[]> => {
    if (!escritorioAtivo) return []

    const { data, error } = await supabase
      .from('financeiro_despesas')
      .select(`
        id, descricao, valor, categoria, data_vencimento, processo_id, consultivo_id,
        processo:processos_processos!processo_id(autor, reu, numero_pasta),
        consulta:consultivo_consultas!consultivo_id(titulo)
      `)
      .eq('escritorio_id', escritorioAtivo)
      .eq('cliente_id', clienteId)
      .eq('reembolsavel', true)
      .eq('fluxo_status', 'pago')
      .eq('reembolsado', false)
      .order('data_vencimento', { ascending: true })

    if (error) {
      console.error('Erro ao buscar despesas reembolsáveis:', error)
      return []
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      descricao: d.descricao,
      valor: Number(d.valor),
      categoria: d.categoria,
      data_vencimento: d.data_vencimento,
      processo_id: d.processo_id,
      consultivo_id: d.consultivo_id,
      processo_autor: d.processo?.autor || null,
      processo_reu: d.processo?.reu || null,
      processo_numero_pasta: d.processo?.numero_pasta || null,
      consulta_titulo: d.consulta?.titulo || null,
    }))
  }

  // Criar nota de débito
  const criarNota = async (
    clienteId: string,
    despesaIds: string[],
    dataVencimento: string,
    observacoes: string
  ) => {
    if (!escritorioAtivo) throw new Error('Escritório não identificado')

    // Gerar número
    const { data: numeroData, error: numError } = await supabase
      .rpc('gerar_numero_nota_debito', { p_escritorio_id: escritorioAtivo })

    if (numError) throw numError
    const numero = numeroData

    // Buscar despesas para calcular total e montar itens
    const { data: despesas, error: despError } = await supabase
      .from('financeiro_despesas')
      .select(`
        id, descricao, valor, categoria,
        processo:processos_processos!processo_id(autor, reu, numero_pasta),
        consulta:consultivo_consultas!consultivo_id(titulo)
      `)
      .in('id', despesaIds)

    if (despError) throw despError

    const valorTotal = (despesas || []).reduce((s: number, d: any) => s + Number(d.valor), 0)

    // Obter user atual
    const { data: { user } } = await supabase.auth.getUser()

    // Inserir nota
    const { data: nota, error: notaError } = await supabase
      .from('financeiro_notas_debito')
      .insert({
        escritorio_id: escritorioAtivo,
        numero,
        cliente_id: clienteId,
        status: 'rascunho',
        valor_total: valorTotal,
        data_vencimento: dataVencimento,
        observacoes: observacoes || null,
        created_by: user?.id || null,
      })
      .select('id')
      .single()

    if (notaError) throw notaError

    // Inserir itens
    const itens = (despesas || []).map((d: any) => {
      let processoTitulo = null
      if (d.processo) {
        const pasta = d.processo.numero_pasta ? `${d.processo.numero_pasta} - ` : ''
        processoTitulo = `${pasta}${d.processo.autor} x ${d.processo.reu}`
      } else if (d.consulta) {
        processoTitulo = d.consulta.titulo
      }

      return {
        nota_debito_id: nota.id,
        despesa_id: d.id,
        descricao: d.descricao,
        valor: Number(d.valor),
        categoria: d.categoria,
        processo_titulo: processoTitulo,
      }
    })

    const { error: itensError } = await supabase
      .from('financeiro_notas_debito_itens')
      .insert(itens)

    if (itensError) throw itensError

    // Marcar despesas como reembolsadas
    const { error: updError } = await supabase
      .from('financeiro_despesas')
      .update({
        reembolsado: true,
        reembolso_status: 'faturado',
        updated_at: new Date().toISOString(),
      })
      .in('id', despesaIds)

    if (updError) throw updError

    toast.success(`Nota de Débito ${numero} criada com sucesso!`)
    await carregarNotas()
    return nota.id
  }

  // Emitir nota → gerar receita
  const emitirNota = async (id: string) => {
    if (!escritorioAtivo) return

    // Buscar dados da nota
    const { data: nota, error: fetchErr } = await supabase
      .from('financeiro_notas_debito')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !nota) throw fetchErr

    // Criar receita vinculada
    const { data: receita, error: recError } = await supabase
      .from('financeiro_receitas')
      .insert({
        escritorio_id: escritorioAtivo,
        tipo: 'reembolso',
        categoria: 'custas_reembolsadas',
        cliente_id: nota.cliente_id,
        descricao: `Nota de Débito ${nota.numero}`,
        valor: nota.valor_total,
        data_competencia: nota.data_vencimento,
        data_vencimento: nota.data_vencimento,
        status: 'pendente',
      })
      .select('id')
      .single()

    if (recError) throw recError

    // Atualizar nota
    const { error: updError } = await supabase
      .from('financeiro_notas_debito')
      .update({
        status: 'emitida',
        data_emissao: new Date().toISOString().split('T')[0],
        receita_id: receita.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updError) throw updError

    toast.success('Nota de Débito emitida!')
    await carregarNotas()
  }

  const marcarEnviada = async (id: string) => {
    const { error } = await supabase
      .from('financeiro_notas_debito')
      .update({
        status: 'enviada',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    toast.success('Nota marcada como enviada')
    await carregarNotas()
  }

  const marcarPaga = async (id: string, contaBancariaId: string) => {
    // Buscar nota para pegar receita_id
    const { data: nota } = await supabase
      .from('financeiro_notas_debito')
      .select('receita_id, valor_total')
      .eq('id', id)
      .single()

    if (!nota) return

    // Atualizar nota
    const { error: notaErr } = await supabase
      .from('financeiro_notas_debito')
      .update({
        status: 'paga',
        data_pagamento: new Date().toISOString().split('T')[0],
        conta_bancaria_id: contaBancariaId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (notaErr) throw notaErr

    // Atualizar receita vinculada
    if (nota.receita_id) {
      await supabase
        .from('financeiro_receitas')
        .update({
          status: 'pago',
          valor_pago: nota.valor_total,
          data_pagamento: new Date().toISOString().split('T')[0],
          conta_bancaria_id: contaBancariaId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', nota.receita_id)

      // Recalcular saldo
      await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaBancariaId })
    }

    // Marcar despesas como reembolso pago
    const { data: itens } = await supabase
      .from('financeiro_notas_debito_itens')
      .select('despesa_id')
      .eq('nota_debito_id', id)

    if (itens && itens.length > 0) {
      await supabase
        .from('financeiro_despesas')
        .update({ reembolso_status: 'pago', updated_at: new Date().toISOString() })
        .in('id', itens.map((i: any) => i.despesa_id))
    }

    toast.success('Nota de Débito marcada como paga!')
    await carregarNotas()
  }

  const cancelarNota = async (id: string) => {
    // Buscar itens para reverter despesas
    const { data: itens } = await supabase
      .from('financeiro_notas_debito_itens')
      .select('despesa_id')
      .eq('nota_debito_id', id)

    // Buscar nota para cancelar receita
    const { data: nota } = await supabase
      .from('financeiro_notas_debito')
      .select('receita_id')
      .eq('id', id)
      .single()

    // Cancelar nota
    const { error } = await supabase
      .from('financeiro_notas_debito')
      .update({
        status: 'cancelada',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    // Reverter despesas
    if (itens && itens.length > 0) {
      await supabase
        .from('financeiro_despesas')
        .update({
          reembolsado: false,
          reembolso_status: 'pendente',
          updated_at: new Date().toISOString(),
        })
        .in('id', itens.map((i: any) => i.despesa_id))
    }

    // Cancelar receita vinculada
    if (nota?.receita_id) {
      await supabase
        .from('financeiro_receitas')
        .update({
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', nota.receita_id)
    }

    toast.success('Nota de Débito cancelada')
    await carregarNotas()
  }

  // Carregar itens de uma nota
  const carregarItens = async (notaDebitoId: string): Promise<NotaDebitoItem[]> => {
    const { data, error } = await supabase
      .from('financeiro_notas_debito_itens')
      .select('*')
      .eq('nota_debito_id', notaDebitoId)
      .order('created_at')

    if (error) {
      console.error('Erro ao carregar itens:', error)
      return []
    }

    return (data || []).map((i: any) => ({
      id: i.id,
      nota_debito_id: i.nota_debito_id,
      despesa_id: i.despesa_id,
      descricao: i.descricao,
      valor: Number(i.valor),
      categoria: i.categoria,
      processo_titulo: i.processo_titulo,
    }))
  }

  return {
    notas,
    loading,
    filtroStatus,
    setFiltroStatus,
    recarregar: carregarNotas,
    buscarDespesasReembolsaveis,
    criarNota,
    emitirNota,
    marcarEnviada,
    marcarPaga,
    cancelarNota,
    carregarItens,
  }
}
