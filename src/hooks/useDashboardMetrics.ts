'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface DashboardMetrics {
  // KPIs
  processos_ativos: number
  processos_novos_semana: number
  clientes_ativos: number
  clientes_novos_mes: number
  consultas_abertas: number

  // Financeiro - "Seus Números do Mês" (dados do USUÁRIO logado)
  // Horas: filtrado por user_id no timesheet
  // Receitas: filtrado por responsavel_id em financeiro_receitas
  faturamento_mes: number
  a_receber: number
  horas_faturadas_mes: number
  horas_nao_faturadas: number
  valor_horas_nao_faturadas: number
  horas_meta: number
  receita_mes: number
  receita_meta: number

  // Horas faturáveis (do escritório, para KPI)
  horas_prontas_faturar: number
  valor_horas_prontas_faturar: number
  horas_faturaveis_trend: number // Diferença em horas vs mesmo período mês passado

  // Tendências (comparação com mês anterior)
  processos_trend_percent: number
  clientes_trend_percent: number
  horas_trend_valor: number

  // Publicações
  publicacoes_pendentes: number
  publicacoes_urgentes: number
}

const defaultMetrics: DashboardMetrics = {
  processos_ativos: 0,
  processos_novos_semana: 0,
  clientes_ativos: 0,
  clientes_novos_mes: 0,
  consultas_abertas: 0,
  faturamento_mes: 0,
  a_receber: 0,
  horas_faturadas_mes: 0,
  horas_nao_faturadas: 0,
  valor_horas_nao_faturadas: 0,
  horas_meta: 160, // Meta padrão de horas
  receita_mes: 0,
  receita_meta: 40000, // Meta padrão
  horas_prontas_faturar: 0,
  valor_horas_prontas_faturar: 0,
  horas_faturaveis_trend: 0,
  processos_trend_percent: 0,
  clientes_trend_percent: 0,
  horas_trend_valor: 0,
  publicacoes_pendentes: 0,
  publicacoes_urgentes: 0,
}

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const loadMetrics = useCallback(async () => {
    if (!escritorioAtivo) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Obter usuário logado para filtrar "Seus Números do Mês"
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id

      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(hoje.getDate() - 7)

      // Para comparação de horas faturáveis: mesmo dia do mês passado
      const diaAtual = hoje.getDate()
      const mesmoDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, diaAtual)

      // Executar queries em paralelo para melhor performance
      const [
        processosResult,
        processosNovosResult,
        processosMesAnteriorResult,
        clientesResult,
        clientesNovosResult,
        clientesMesAnteriorResult,
        consultasResult,
        publicacoesResult,
        timesheetFaturadoResult,
        timesheetMesAnteriorResult,
        horasNaoFaturadasResult,
        horasProntasFaturarResult,
        horasFaturaveisEsteMesResult,
        horasFaturavelMesPassadoResult,
        metasResult,
        receitasRecebidasResult,
        aReceberResult,
      ] = await Promise.all([
        // Processos ativos
        supabase
          .from('processos_processos')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .in('status', ['ativo', 'em_andamento', 'aguardando']),

        // Processos novos na semana
        supabase
          .from('processos_processos')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .gte('created_at', inicioSemana.toISOString()),

        // Processos criados no mês anterior (para tendência)
        supabase
          .from('processos_processos')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .gte('created_at', inicioMesAnterior.toISOString())
          .lte('created_at', fimMesAnterior.toISOString()),

        // Clientes ativos
        supabase
          .from('crm_pessoas')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .eq('status', 'ativo'),

        // Clientes novos no mês
        supabase
          .from('crm_pessoas')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .gte('created_at', inicioMes.toISOString()),

        // Clientes criados no mês anterior (para tendência)
        supabase
          .from('crm_pessoas')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .gte('created_at', inicioMesAnterior.toISOString())
          .lte('created_at', fimMesAnterior.toISOString()),

        // Consultas abertas (status 'ativo' = em andamento)
        supabase
          .from('consultivo_consultas')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .eq('status', 'ativo'),

        // Publicações - usar a view
        supabase
          .from('v_publicacoes_dashboard')
          .select('*')
          .eq('escritorio_id', escritorioAtivo)
          .single(),

        // Horas faturadas no mês DO USUÁRIO LOGADO
        userId ? supabase
          .from('financeiro_timesheet')
          .select('horas')
          .eq('escritorio_id', escritorioAtivo)
          .eq('user_id', userId)
          .eq('faturavel', true)
          .eq('faturado', true)
          .gte('data_trabalho', inicioMes.toISOString().split('T')[0])
        : Promise.resolve({ data: [] }),

        // Horas do mês anterior DO USUÁRIO LOGADO (para tendência)
        userId ? supabase
          .from('financeiro_timesheet')
          .select('horas')
          .eq('escritorio_id', escritorioAtivo)
          .eq('user_id', userId)
          .eq('faturavel', true)
          .eq('faturado', true)
          .gte('data_trabalho', inicioMesAnterior.toISOString().split('T')[0])
          .lte('data_trabalho', fimMesAnterior.toISOString().split('T')[0])
        : Promise.resolve({ data: [] }),

        // Horas não faturadas DO USUÁRIO LOGADO
        userId ? supabase
          .from('financeiro_timesheet')
          .select('horas')
          .eq('escritorio_id', escritorioAtivo)
          .eq('user_id', userId)
          .eq('faturavel', true)
          .eq('faturado', false)
          .eq('aprovado', true)
        : Promise.resolve({ data: [] }),

        // Horas prontas para faturar DO ESCRITÓRIO (para KPI)
        supabase
          .from('financeiro_timesheet')
          .select('horas')
          .eq('escritorio_id', escritorioAtivo)
          .eq('faturavel', true)
          .eq('faturado', false)
          .eq('aprovado', true),

        // Horas faturáveis criadas este mês (até hoje) - para comparação de tendência
        supabase
          .from('financeiro_timesheet')
          .select('horas')
          .eq('escritorio_id', escritorioAtivo)
          .eq('faturavel', true)
          .eq('aprovado', true)
          .gte('data_trabalho', inicioMes.toISOString().split('T')[0])
          .lte('data_trabalho', hoje.toISOString().split('T')[0]),

        // Horas faturáveis criadas no mesmo período do mês passado - para comparação de tendência
        supabase
          .from('financeiro_timesheet')
          .select('horas')
          .eq('escritorio_id', escritorioAtivo)
          .eq('faturavel', true)
          .eq('aprovado', true)
          .gte('data_trabalho', inicioMesAnterior.toISOString().split('T')[0])
          .lte('data_trabalho', mesmoDiaMesPassado.toISOString().split('T')[0]),

        // Metas do escritório
        supabase
          .from('financeiro_metas')
          .select('tipo_meta, valor_meta, valor_realizado')
          .eq('escritorio_id', escritorioAtivo)
          .eq('ativa', true)
          .gte('data_fim', hoje.toISOString().split('T')[0])
          .lte('data_inicio', hoje.toISOString().split('T')[0]),

        // Receitas recebidas no mês DO USUÁRIO LOGADO (para "Seus Números do Mês")
        userId ? supabase
          .from('financeiro_receitas')
          .select('valor_pago')
          .eq('escritorio_id', escritorioAtivo)
          .eq('responsavel_id', userId)
          .in('status', ['pago', 'parcial'])
          .gte('data_pagamento', inicioMes.toISOString().split('T')[0])
        : Promise.resolve({ data: [] }),

        // A receber DO USUÁRIO LOGADO (receitas pendentes)
        userId ? supabase
          .from('financeiro_receitas')
          .select('valor, valor_pago')
          .eq('escritorio_id', escritorioAtivo)
          .eq('responsavel_id', userId)
          .in('status', ['pendente', 'atrasado', 'parcial'])
        : Promise.resolve({ data: [] }),
      ])

      // Processar resultados - Horas do USUÁRIO LOGADO
      const horasFaturadas = timesheetFaturadoResult.data?.reduce(
        (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
        0
      ) || 0

      const horasMesAnterior = timesheetMesAnteriorResult.data?.reduce(
        (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
        0
      ) || 0

      const horasNaoFaturadas = horasNaoFaturadasResult.data?.reduce(
        (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
        0
      ) || 0

      // Horas prontas para faturar DO ESCRITÓRIO (para KPI)
      const horasProntasFaturar = horasProntasFaturarResult.data?.reduce(
        (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
        0
      ) || 0

      // Valor estimado das horas prontas (usando R$150/h como fallback)
      const valorHorasProntas = horasProntasFaturar * 150

      // Calcular tendência de horas faturáveis (comparação mês atual vs mesmo período mês anterior)
      const horasFaturaveisEsteMes = horasFaturaveisEsteMesResult.data?.reduce(
        (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
        0
      ) || 0

      const horasFaturaveisMesPassado = horasFaturavelMesPassadoResult.data?.reduce(
        (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
        0
      ) || 0

      // Diferença em horas entre o mês atual e o mesmo período do mês passado
      const horasFaturaveisTrend = Math.round((horasFaturaveisEsteMes - horasFaturaveisMesPassado) * 10) / 10

      // Buscar metas específicas
      let horasMeta = 160
      let receitaMeta = 40000
      if (metasResult.data) {
        const metaHoras = metasResult.data.find((m: { tipo_meta: string }) => m.tipo_meta === 'horas')
        const metaReceita = metasResult.data.find((m: { tipo_meta: string }) => m.tipo_meta === 'receita')
        if (metaHoras) horasMeta = Number(metaHoras.valor_meta)
        if (metaReceita) receitaMeta = Number(metaReceita.valor_meta)
      }

      // Calcular faturamento do mês (soma de valor_pago das receitas pagas)
      const faturamentoMes = receitasRecebidasResult.data?.reduce(
        (acc: number, item: { valor_pago: number | null }) => acc + (Number(item.valor_pago) || 0),
        0
      ) || 0

      // Calcular total a receber (valor pendente das receitas)
      const totalAReceber = aReceberResult.data?.reduce(
        (acc: number, item: { valor: number | null; valor_pago: number | null }) => acc + (Number(item.valor) || 0) - (Number(item.valor_pago) || 0),
        0
      ) || 0

      // Calcular tendências
      const processosAtivos = processosResult.count || 0
      const processosMesAnterior = processosMesAnteriorResult.count || 0
      const processosTrend = processosMesAnterior > 0
        ? Math.round(((processosAtivos - processosMesAnterior) / processosMesAnterior) * 100)
        : 0

      const clientesNovos = clientesNovosResult.count || 0
      const clientesMesAnterior = clientesMesAnteriorResult.count || 0
      const clientesTrend = clientesMesAnterior > 0
        ? Math.round(((clientesNovos - clientesMesAnterior) / clientesMesAnterior) * 100)
        : 0

      const horasTrend = Math.round((horasFaturadas - horasMesAnterior) * 10) / 10

      setMetrics({
        processos_ativos: processosAtivos,
        processos_novos_semana: processosNovosResult.count || 0,
        clientes_ativos: clientesResult.count || 0,
        clientes_novos_mes: clientesNovos,
        consultas_abertas: consultasResult.count || 0,
        faturamento_mes: faturamentoMes,
        a_receber: totalAReceber,
        horas_faturadas_mes: horasFaturadas,
        horas_nao_faturadas: horasNaoFaturadas,
        valor_horas_nao_faturadas: horasNaoFaturadas * 150, // Estimativa usando R$150/h
        horas_meta: horasMeta,
        receita_mes: faturamentoMes,
        receita_meta: receitaMeta,
        horas_prontas_faturar: horasProntasFaturar,
        valor_horas_prontas_faturar: valorHorasProntas,
        horas_faturaveis_trend: horasFaturaveisTrend,
        processos_trend_percent: processosTrend,
        clientes_trend_percent: clientesTrend,
        horas_trend_valor: horasTrend,
        publicacoes_pendentes: publicacoesResult.data?.pendentes || 0,
        publicacoes_urgentes: publicacoesResult.data?.urgentes_nao_processadas || 0,
      })
    } catch (err) {
      console.error('Erro ao carregar métricas do dashboard:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, supabase])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  return {
    metrics,
    loading,
    error,
    refresh: loadMetrics,
    isEmpty: !loading && metrics.processos_ativos === 0 &&
             metrics.clientes_ativos === 0 &&
             metrics.publicacoes_pendentes === 0,
  }
}
