'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'

export interface DashboardMetrics {
  // KPIs
  processos_ativos: number
  processos_novos_semana: number
  clientes_ativos: number
  clientes_novos_mes: number
  consultas_abertas: number

  // Financeiro
  faturamento_mes: number
  a_receber: number
  horas_faturadas_mes: number
  horas_nao_faturadas: number
  valor_horas_nao_faturadas: number
  horas_meta: number
  receita_mes: number
  receita_meta: number

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
  publicacoes_pendentes: 0,
  publicacoes_urgentes: 0,
}

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const loadMetrics = useCallback(async () => {
    if (!escritorioAtivo) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(hoje.getDate() - 7)

      // Executar queries em paralelo para melhor performance
      const [
        processosResult,
        processosNovosResult,
        clientesResult,
        clientesNovosResult,
        consultasResult,
        publicacoesResult,
        timesheetFaturadoResult,
        horasNaoFaturadasResult,
        metasResult,
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

        // Consultas abertas
        supabase
          .from('consultivo_consultas')
          .select('id', { count: 'exact', head: true })
          .eq('escritorio_id', escritorioAtivo)
          .in('status', ['pendente', 'em_analise', 'em_revisao']),

        // Publicações - usar a view
        supabase
          .from('v_publicacoes_dashboard')
          .select('*')
          .eq('escritorio_id', escritorioAtivo)
          .single(),

        // Horas faturadas no mês
        supabase
          .from('financeiro_timesheet')
          .select('horas')
          .eq('escritorio_id', escritorioAtivo)
          .eq('faturavel', true)
          .eq('faturado', true)
          .gte('data_trabalho', inicioMes.toISOString().split('T')[0]),

        // Horas não faturadas (prontas para faturar)
        supabase
          .from('v_lancamentos_prontos_faturar')
          .select('horas, valor')
          .eq('escritorio_id', escritorioAtivo),

        // Metas do escritório
        supabase
          .from('financeiro_metas')
          .select('tipo_meta, valor_meta, valor_realizado')
          .eq('escritorio_id', escritorioAtivo)
          .eq('ativa', true)
          .gte('data_fim', hoje.toISOString().split('T')[0])
          .lte('data_inicio', hoje.toISOString().split('T')[0]),
      ])

      // Processar resultados
      const horasFaturadas = timesheetFaturadoResult.data?.reduce(
        (acc, item) => acc + (Number(item.horas) || 0),
        0
      ) || 0

      const horasNaoFaturadas = horasNaoFaturadasResult.data?.reduce(
        (acc, item) => acc + (Number(item.horas) || 0),
        0
      ) || 0

      const valorNaoFaturado = horasNaoFaturadasResult.data?.reduce(
        (acc, item) => acc + (Number(item.valor) || 0),
        0
      ) || 0

      // Buscar metas específicas
      let horasMeta = 160
      let receitaMeta = 40000
      if (metasResult.data) {
        const metaHoras = metasResult.data.find(m => m.tipo_meta === 'horas')
        const metaReceita = metasResult.data.find(m => m.tipo_meta === 'receita')
        if (metaHoras) horasMeta = Number(metaHoras.valor_meta)
        if (metaReceita) receitaMeta = Number(metaReceita.valor_meta)
      }

      setMetrics({
        processos_ativos: processosResult.count || 0,
        processos_novos_semana: processosNovosResult.count || 0,
        clientes_ativos: clientesResult.count || 0,
        clientes_novos_mes: clientesNovosResult.count || 0,
        consultas_abertas: consultasResult.count || 0,
        faturamento_mes: 0, // TODO: calcular de financeiro_honorarios_parcelas
        a_receber: valorNaoFaturado,
        horas_faturadas_mes: horasFaturadas,
        horas_nao_faturadas: horasNaoFaturadas,
        valor_horas_nao_faturadas: valorNaoFaturado,
        horas_meta: horasMeta,
        receita_mes: 0, // TODO: calcular de pagamentos recebidos
        receita_meta: receitaMeta,
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
