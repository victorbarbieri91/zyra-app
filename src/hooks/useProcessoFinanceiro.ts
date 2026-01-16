'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'

// Tipos
export interface Honorario {
  id: string
  cliente_id: string
  processo_id: string | null
  tipo_honorario: string
  valor_total: number
  descricao: string
  responsavel_id: string
  numero_interno: string
  parcelado: boolean
  numero_parcelas: number | null
  status: 'pendente' | 'aprovado' | 'faturado' | 'pago' | 'cancelado'
  created_at: string
  responsavel_nome?: string
}

export interface Despesa {
  id: string
  categoria: string
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: 'pendente' | 'pago' | 'cancelado'
  forma_pagamento: string | null
  fornecedor: string | null
  processo_id: string | null
  reembolsavel: boolean
  reembolso_status: 'pendente' | 'faturado' | 'pago' | null
  created_at: string
}

export interface TimesheetEntry {
  id: string
  user_id: string
  processo_id: string | null
  data_trabalho: string
  horas: number
  atividade: string
  faturavel: boolean
  faturado: boolean
  aprovado: boolean
  aprovado_por: string | null
  reprovado: boolean
  user_nome?: string
  created_at: string
}

export interface ResumoFinanceiro {
  totalHonorarios: number
  totalHonorariosPagos: number
  totalHonorariosPendentes: number
  totalDespesas: number
  totalDespesasPagas: number
  totalDespesasReembolsaveis: number
  totalTimesheet: number
  horasTrabalhadas: number
  saldo: number
}

export interface ContratoInfo {
  id: string
  numero_contrato: string
  forma_cobranca: string
  modalidade_cobranca: string | null
  formas_disponiveis: string[]
  config: {
    valor_hora?: number
    valor_fixo?: number
    percentual_exito?: number
    valor_por_processo?: number
  }
}

export interface ProcessoInfo {
  id: string
  cliente_id: string | null
  cliente_nome?: string
  contrato_id: string | null
}

interface TimesheetData {
  data_trabalho: string
  horas: number
  atividade: string
  faturavel?: boolean
}

interface DespesaData {
  categoria: string
  descricao: string
  valor: number
  data_vencimento: string
  fornecedor?: string
  reembolsavel?: boolean
}

interface HonorarioData {
  tipo_honorario: string
  valor_total: number
  descricao: string
  parcelado?: boolean
  numero_parcelas?: number
}

export function useProcessoFinanceiro(processoId: string | null) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [honorarios, setHonorarios] = useState<Honorario[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([])
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo | null>(null)
  const [processoInfo, setProcessoInfo] = useState<ProcessoInfo | null>(null)
  const [resumo, setResumo] = useState<ResumoFinanceiro>({
    totalHonorarios: 0,
    totalHonorariosPagos: 0,
    totalHonorariosPendentes: 0,
    totalDespesas: 0,
    totalDespesasPagas: 0,
    totalDespesasReembolsaveis: 0,
    totalTimesheet: 0,
    horasTrabalhadas: 0,
    saldo: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar todos os dados financeiros do processo
  const loadDados = useCallback(async () => {
    if (!processoId || !escritorioAtivo) return

    setLoading(true)
    setError(null)

    try {
      // Buscar informações do processo e contrato
      const { data: processoData } = await supabase
        .from('processos_processos')
        .select(`
          id,
          contrato_id,
          modalidade_cobranca,
          cliente_id,
          crm_pessoas:cliente_id (
            nome_completo
          ),
          financeiro_contratos_honorarios (
            id,
            numero_contrato,
            forma_cobranca,
            financeiro_contratos_honorarios_config (
              tipo_config,
              valor_fixo,
              valor_hora,
              percentual_exito,
              valor_por_processo
            )
          )
        `)
        .eq('id', processoId)
        .single()

      // Atualizar info do processo
      if (processoData) {
        setProcessoInfo({
          id: processoData.id,
          cliente_id: processoData.cliente_id,
          cliente_nome: (processoData.crm_pessoas as any)?.nome_completo || undefined,
          contrato_id: processoData.contrato_id,
        })
      }

      if (processoData?.financeiro_contratos_honorarios) {
        const contrato = processoData.financeiro_contratos_honorarios as any

        // Buscar formas disponíveis no contrato
        const { data: formasData } = await supabase
          .from('financeiro_contratos_formas')
          .select('forma_cobranca')
          .eq('contrato_id', contrato.id)
          .eq('ativo', true)

        const config = contrato.financeiro_contratos_honorarios_config?.[0] || {}

        setContratoInfo({
          id: contrato.id,
          numero_contrato: contrato.numero_contrato,
          forma_cobranca: contrato.forma_cobranca,
          modalidade_cobranca: processoData.modalidade_cobranca,
          formas_disponiveis: formasData?.map((f: any) => f.forma_cobranca) || [],
          config: {
            valor_hora: config.valor_hora,
            valor_fixo: config.valor_fixo,
            percentual_exito: config.percentual_exito,
            valor_por_processo: config.valor_por_processo,
          },
        })
      } else {
        setContratoInfo(null)
      }

      // Buscar honorários
      const { data: honorariosData } = await supabase
        .from('financeiro_honorarios')
        .select(`
          *,
          profiles:responsavel_id (nome_completo)
        `)
        .eq('processo_id', processoId)
        .order('created_at', { ascending: false })

      setHonorarios(
        (honorariosData || []).map((h: any) => ({
          ...h,
          responsavel_nome: h.profiles?.nome_completo,
        }))
      )

      // Buscar despesas
      const { data: despesasData } = await supabase
        .from('financeiro_despesas')
        .select('*')
        .eq('processo_id', processoId)
        .order('data_vencimento', { ascending: false })

      setDespesas(despesasData || [])

      // Buscar timesheet
      const { data: timesheetData } = await supabase
        .from('financeiro_timesheet')
        .select(`
          *,
          profiles:user_id (nome_completo)
        `)
        .eq('processo_id', processoId)
        .order('data_trabalho', { ascending: false })

      setTimesheet(
        (timesheetData || []).map((t: any) => ({
          ...t,
          user_nome: t.profiles?.nome_completo,
        }))
      )

      // Calcular resumo
      const totalHonorarios = (honorariosData || []).reduce(
        (sum: number, h: any) => sum + Number(h.valor_total),
        0
      )
      const totalHonorariosPagos = (honorariosData || [])
        .filter((h: any) => h.status === 'pago')
        .reduce((sum: number, h: any) => sum + Number(h.valor_total), 0)
      const totalHonorariosPendentes = (honorariosData || [])
        .filter((h: any) => h.status !== 'pago' && h.status !== 'cancelado')
        .reduce((sum: number, h: any) => sum + Number(h.valor_total), 0)

      const totalDespesas = (despesasData || []).reduce(
        (sum: number, d: any) => sum + Number(d.valor),
        0
      )
      const totalDespesasPagas = (despesasData || [])
        .filter((d: any) => d.status === 'pago')
        .reduce((sum: number, d: any) => sum + Number(d.valor), 0)
      const totalDespesasReembolsaveis = (despesasData || [])
        .filter((d: any) => d.reembolsavel && d.reembolso_status === 'pendente')
        .reduce((sum: number, d: any) => sum + Number(d.valor), 0)

      const horasTrabalhadas = (timesheetData || []).reduce(
        (sum: number, t: any) => sum + Number(t.horas),
        0
      )

      // Calcular valor do timesheet baseado no contrato
      let totalTimesheet = 0
      if (contratoInfo?.config?.valor_hora) {
        totalTimesheet = horasTrabalhadas * contratoInfo.config.valor_hora
      }

      setResumo({
        totalHonorarios,
        totalHonorariosPagos,
        totalHonorariosPendentes,
        totalDespesas,
        totalDespesasPagas,
        totalDespesasReembolsaveis,
        totalTimesheet,
        horasTrabalhadas,
        saldo: totalHonorariosPagos - totalDespesasPagas,
      })
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err)
      setError('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }, [processoId, escritorioAtivo, supabase])

  // Lançar timesheet
  const lancarTimesheet = useCallback(
    async (data: TimesheetData): Promise<boolean> => {
      if (!processoId || !escritorioAtivo) {
        setError('Processo ou escritório não selecionado')
        return false
      }

      // Validar se modalidade permite timesheet
      if (contratoInfo && !podelancarHoras) {
        setError('Este processo não permite lançamento de horas. Modalidade de cobrança incompatível.')
        return false
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        const { error: insertError } = await supabase
          .from('financeiro_timesheet')
          .insert({
            escritorio_id: escritorioAtivo,
            user_id: user.id,
            processo_id: processoId,
            data_trabalho: data.data_trabalho,
            horas: data.horas,
            atividade: data.atividade,
            faturavel: data.faturavel ?? true,
            faturado: false,
            aprovado: false,
          })

        if (insertError) throw insertError

        await loadDados()
        return true
      } catch (err) {
        console.error('Erro ao lançar timesheet:', err)
        setError('Erro ao lançar timesheet')
        return false
      }
    },
    [processoId, escritorioAtivo, supabase, loadDados, contratoInfo]
  )

  // Lançar despesa
  const lancarDespesa = useCallback(
    async (data: DespesaData): Promise<boolean> => {
      if (!processoId || !escritorioAtivo) {
        setError('Processo ou escritório não selecionado')
        return false
      }

      try {
        const { error: insertError } = await supabase
          .from('financeiro_despesas')
          .insert({
            escritorio_id: escritorioAtivo,
            processo_id: processoId,
            categoria: data.categoria,
            descricao: data.descricao,
            valor: data.valor,
            data_vencimento: data.data_vencimento,
            fornecedor: data.fornecedor || null,
            reembolsavel: data.reembolsavel ?? false,
            status: 'pendente',
          })

        if (insertError) throw insertError

        await loadDados()
        return true
      } catch (err) {
        console.error('Erro ao lançar despesa:', err)
        setError('Erro ao lançar despesa')
        return false
      }
    },
    [processoId, escritorioAtivo, supabase, loadDados]
  )

  // Lançar honorário
  const lancarHonorario = useCallback(
    async (data: HonorarioData): Promise<boolean> => {
      if (!processoId || !escritorioAtivo) {
        setError('Processo ou escritório não selecionado')
        return false
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        // Buscar cliente_id do processo
        const { data: processoData } = await supabase
          .from('processos_processos')
          .select('cliente_id')
          .eq('id', processoId)
          .single()

        if (!processoData?.cliente_id) {
          throw new Error('Processo não tem cliente vinculado')
        }

        // Gerar número interno
        const ano = new Date().getFullYear()
        const { data: lastHon } = await supabase
          .from('financeiro_honorarios')
          .select('numero_interno')
          .eq('escritorio_id', escritorioAtivo)
          .ilike('numero_interno', `HON-${ano}-%`)
          .order('numero_interno', { ascending: false })
          .limit(1)

        let seq = 1
        if (lastHon && lastHon.length > 0) {
          const parts = lastHon[0].numero_interno.split('-')
          seq = parseInt(parts[2] || '0', 10) + 1
        }
        const numeroInterno = `HON-${ano}-${String(seq).padStart(4, '0')}`

        const { error: insertError } = await supabase
          .from('financeiro_honorarios')
          .insert({
            escritorio_id: escritorioAtivo,
            cliente_id: processoData.cliente_id,
            processo_id: processoId,
            tipo_honorario: data.tipo_honorario,
            valor_total: data.valor_total,
            descricao: data.descricao,
            responsavel_id: user.id,
            numero_interno: numeroInterno,
            parcelado: data.parcelado ?? false,
            numero_parcelas: data.numero_parcelas || null,
            status: 'pendente',
          })

        if (insertError) throw insertError

        await loadDados()
        return true
      } catch (err) {
        console.error('Erro ao lançar honorário:', err)
        setError('Erro ao lançar honorário')
        return false
      }
    },
    [processoId, escritorioAtivo, supabase, loadDados]
  )

  // Validações baseadas na modalidade
  const podelancarHoras = contratoInfo
    ? ['por_hora', 'por_cargo', 'misto'].includes(contratoInfo.modalidade_cobranca || '')
    : true // Se não tem contrato, permite

  const podeLancarEtapa = contratoInfo
    ? ['por_etapa', 'misto'].includes(contratoInfo.modalidade_cobranca || '')
    : true

  const podeLancarAto = contratoInfo
    ? ['por_ato', 'misto'].includes(contratoInfo.modalidade_cobranca || '')
    : true

  // Despesas reembolsáveis pendentes
  const despesasReembolsaveisPendentes = despesas.filter(
    (d) => d.reembolsavel && d.reembolso_status === 'pendente'
  )

  return {
    // Dados
    honorarios,
    despesas,
    timesheet,
    contratoInfo,
    processoInfo,
    resumo,
    despesasReembolsaveisPendentes,
    loading,
    error,

    // Ações
    loadDados,
    lancarTimesheet,
    lancarDespesa,
    lancarHonorario,

    // Validações
    podelancarHoras,
    podeLancarEtapa,
    podeLancarAto,
  }
}
