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
  // Honorários
  totalHonorarios: number
  totalHonorariosPagos: number
  totalHonorariosPendentes: number
  countHonorariosPagos: number
  countHonorariosFaturados: number
  countHonorariosAbertos: number

  // Despesas
  totalDespesas: number
  totalDespesasPagas: number
  totalDespesasReembolsaveis: number
  countDespesasPagas: number
  countDespesasPendentes: number
  countDespesasReembolsaveis: number

  // Timesheet
  totalTimesheet: number
  horasTrabalhadas: number
  horasAprovadas: number
  horasFaturadas: number
  horasPendentes: number
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
    // Honorários
    totalHonorarios: 0,
    totalHonorariosPagos: 0,
    totalHonorariosPendentes: 0,
    countHonorariosPagos: 0,
    countHonorariosFaturados: 0,
    countHonorariosAbertos: 0,
    // Despesas
    totalDespesas: 0,
    totalDespesasPagas: 0,
    totalDespesasReembolsaveis: 0,
    countDespesasPagas: 0,
    countDespesasPendentes: 0,
    countDespesasReembolsaveis: 0,
    // Timesheet
    totalTimesheet: 0,
    horasTrabalhadas: 0,
    horasAprovadas: 0,
    horasFaturadas: 0,
    horasPendentes: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar todos os dados financeiros do processo
  const loadDados = useCallback(async () => {
    if (!processoId || !escritorioAtivo) return

    setLoading(true)
    setError(null)

    try {
      // Buscar informações básicas do processo (sem joins complexos)
      const { data: processoData, error: processoError } = await supabase
        .from('processos_processos')
        .select('id, contrato_id, modalidade_cobranca, cliente_id')
        .eq('id', processoId)
        .single()

      if (processoError) {
        console.error('Erro ao buscar processo:', processoError)
        throw processoError
      }

      // Buscar nome do cliente separadamente
      let clienteNome: string | undefined
      if (processoData?.cliente_id) {
        const { data: clienteData } = await supabase
          .from('crm_pessoas')
          .select('nome_completo')
          .eq('id', processoData.cliente_id)
          .single()

        clienteNome = clienteData?.nome_completo || undefined
      }

      // Atualizar info do processo
      if (processoData) {
        setProcessoInfo({
          id: processoData.id,
          cliente_id: processoData.cliente_id,
          cliente_nome: clienteNome,
          contrato_id: processoData.contrato_id,
        })
      }

      // Buscar contrato separadamente se existir
      if (processoData?.contrato_id) {
        // Buscar contrato com todos os campos JSONB
        const { data: contrato } = await supabase
          .from('financeiro_contratos_honorarios')
          .select('id, numero_contrato, forma_cobranca, config, formas_pagamento')
          .eq('id', processoData.contrato_id)
          .single()

        if (contrato) {
          // Config vem do campo JSONB
          const config = (contrato.config || {}) as {
            valor_hora?: number
            valor_fixo?: number
            percentual_exito?: number
            valor_por_processo?: number
          }

          // Formas disponíveis vem do campo JSONB formas_pagamento
          const formasPagamento = (contrato.formas_pagamento || []) as Array<{ forma_cobranca: string; ativo?: boolean }>
          const formasDisponiveis = formasPagamento
            .filter((f: any) => f.ativo !== false)
            .map((f: any) => f.forma_cobranca)

          setContratoInfo({
            id: contrato.id,
            numero_contrato: contrato.numero_contrato,
            forma_cobranca: contrato.forma_cobranca,
            modalidade_cobranca: processoData.modalidade_cobranca,
            formas_disponiveis: formasDisponiveis,
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
      } else {
        setContratoInfo(null)
      }

      // Buscar receitas (honorários unificados)
      const { data: receitasData } = await supabase
        .from('financeiro_receitas')
        .select(`
          *,
          profiles:created_by (nome_completo)
        `)
        .eq('processo_id', processoId)
        .in('tipo', ['honorario', 'parcela', 'avulso'])
        .order('created_at', { ascending: false })

      setHonorarios(
        (receitasData || []).map((r: any) => ({
          ...r,
          valor_total: r.valor, // Map valor to valor_total for compatibility
          tipo_honorario: r.categoria,
          responsavel_nome: r.profiles?.nome_completo,
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

      // Calcular resumo de honorários
      const honorariosArr = receitasData || []
      const totalHonorarios = honorariosArr.reduce(
        (sum: number, r: any) => sum + Number(r.valor),
        0
      )
      const honorariosPagos = honorariosArr.filter((r: any) => r.status === 'pago')
      const honorariosFaturados = honorariosArr.filter((r: any) => r.status === 'faturado')
      const honorariosAbertos = honorariosArr.filter((r: any) => r.status === 'pendente' || r.status === 'atrasado' || r.status === 'parcial')

      const totalHonorariosPagos = honorariosPagos.reduce((sum: number, r: any) => sum + Number(r.valor_pago || r.valor), 0)
      const totalHonorariosPendentes = honorariosArr
        .filter((r: any) => r.status !== 'pago' && r.status !== 'cancelado')
        .reduce((sum: number, r: any) => sum + Number(r.valor) - Number(r.valor_pago || 0), 0)

      // Calcular resumo de despesas
      const despesasArr = despesasData || []
      const totalDespesas = despesasArr.reduce(
        (sum: number, d: any) => sum + Number(d.valor),
        0
      )
      const despesasPagas = despesasArr.filter((d: any) => d.status === 'pago')
      const despesasPendentes = despesasArr.filter((d: any) => d.status === 'pendente')
      const despesasReembolsaveis = despesasArr.filter((d: any) => d.reembolsavel && d.reembolso_status === 'pendente')

      const totalDespesasPagas = despesasPagas.reduce((sum: number, d: any) => sum + Number(d.valor), 0)
      const totalDespesasReembolsaveis = despesasReembolsaveis.reduce((sum: number, d: any) => sum + Number(d.valor), 0)

      // Calcular resumo de timesheet
      const timesheetArr = timesheetData || []
      const horasTrabalhadas = timesheetArr.reduce(
        (sum: number, t: any) => sum + Number(t.horas),
        0
      )
      const horasAprovadas = timesheetArr
        .filter((t: any) => t.aprovado && !t.faturado)
        .reduce((sum: number, t: any) => sum + Number(t.horas), 0)
      const horasFaturadas = timesheetArr
        .filter((t: any) => t.faturado)
        .reduce((sum: number, t: any) => sum + Number(t.horas), 0)
      const horasPendentes = timesheetArr
        .filter((t: any) => !t.aprovado && !t.reprovado)
        .reduce((sum: number, t: any) => sum + Number(t.horas), 0)

      // Calcular valor do timesheet baseado no config do contrato
      let totalTimesheet = 0
      // contratoInfo é atualizado antes, podemos usar o valor_hora se disponível
      // Nota: contratoInfo já foi populado acima com o config do contrato

      setResumo({
        // Honorários
        totalHonorarios,
        totalHonorariosPagos,
        totalHonorariosPendentes,
        countHonorariosPagos: honorariosPagos.length,
        countHonorariosFaturados: honorariosFaturados.length,
        countHonorariosAbertos: honorariosAbertos.length,
        // Despesas
        totalDespesas,
        totalDespesasPagas,
        totalDespesasReembolsaveis,
        countDespesasPagas: despesasPagas.length,
        countDespesasPendentes: despesasPendentes.length,
        countDespesasReembolsaveis: despesasReembolsaveis.length,
        // Timesheet
        totalTimesheet,
        horasTrabalhadas,
        horasAprovadas,
        horasFaturadas,
        horasPendentes,
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

      // Validar se processo tem contrato (obrigatório para timesheet)
      if (!processoInfo?.contrato_id) {
        setError('Este processo não tem contrato vinculado. Vincule um contrato antes de lançar horas.')
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
    [processoId, escritorioAtivo, supabase, loadDados, contratoInfo, processoInfo]
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

        // Buscar cliente_id e contrato_id do processo
        const { data: processoData } = await supabase
          .from('processos_processos')
          .select('cliente_id, contrato_id, numero_cnj')
          .eq('id', processoId)
          .single()

        if (!processoData?.cliente_id) {
          throw new Error('Processo não tem cliente vinculado')
        }

        // Validar que processo tem contrato (obrigatório para honorários)
        if (!processoData?.contrato_id) {
          throw new Error(
            `O processo ${processoData?.numero_cnj || ''} não tem contrato vinculado. ` +
            'Vincule um contrato ao processo antes de lançar honorários para garantir rastreabilidade.'
          )
        }

        // Calcular data de vencimento (30 dias a partir de hoje)
        const dataVencimento = new Date()
        dataVencimento.setDate(dataVencimento.getDate() + 30)
        const dataVencimentoStr = dataVencimento.toISOString().split('T')[0]
        const dataCompetencia = dataVencimentoStr.substring(0, 7) + '-01'

        const { error: insertError } = await supabase
          .from('financeiro_receitas')
          .insert({
            escritorio_id: escritorioAtivo,
            tipo: 'honorario',
            cliente_id: processoData.cliente_id,
            processo_id: processoId,
            contrato_id: processoData.contrato_id,
            categoria: data.tipo_honorario,
            valor: data.valor_total,
            descricao: data.descricao,
            data_competencia: dataCompetencia,
            data_vencimento: dataVencimentoStr,
            parcelado: data.parcelado ?? false,
            numero_parcelas: data.numero_parcelas || 1,
            status: 'pendente',
            created_by: user.id,
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

  // Validações baseadas na forma de cobrança do contrato
  // Usa forma_cobranca do contrato (prioritário) ou modalidade_cobranca do processo (fallback)
  const formaCobranca = contratoInfo?.forma_cobranca || contratoInfo?.modalidade_cobranca || ''

  // Horas podem ser lançadas em TODOS os tipos de contrato para monitoramento interno
  // A diferença é se são cobráveis ou não (definido automaticamente pelo trigger trg_timesheet_set_faturavel):
  // - por_hora, por_cargo = cobrável (faturavel = true)
  // - fixo, por_pasta, por_ato, por_etapa = não cobrável (faturavel = false)
  // - misto = configurável via campo horas_faturaveis do contrato
  const podelancarHoras = !!contratoInfo // Permite lançar horas se tiver contrato vinculado

  const podeLancarEtapa = contratoInfo
    ? ['por_etapa', 'misto'].includes(formaCobranca)
    : false

  const podeLancarAto = contratoInfo
    ? ['por_ato', 'misto'].includes(formaCobranca)
    : false

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
