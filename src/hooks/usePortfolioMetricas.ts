import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  ProdutoMetricas,
  PortfolioDashboardMetricas,
  MetricasPorArea,
  AreaJuridica,
} from '@/types/portfolio'

// =====================================================
// HOOK: usePortfolioMetricas
// =====================================================

export function usePortfolioMetricas(escritorioId?: string) {
  const [dashboardMetricas, setDashboardMetricas] = useState<PortfolioDashboardMetricas | null>(null)
  const [metricasPorArea, setMetricasPorArea] = useState<MetricasPorArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  // Carregar métricas do dashboard
  const loadDashboardMetricas = useCallback(async () => {
    if (!escritorioId) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase.rpc('get_portfolio_dashboard_metricas', {
        p_escritorio_id: escritorioId,
      })

      if (queryError) throw queryError

      if (data && data.length > 0) {
        setDashboardMetricas(data[0])
      }
    } catch (err) {
      setError(err as Error)
      console.error('Erro ao carregar métricas do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, escritorioId])

  // Carregar métricas por área
  const loadMetricasPorArea = useCallback(async () => {
    if (!escritorioId) return

    try {
      const { data, error: queryError } = await supabase
        .from('v_portfolio_metricas_area')
        .select('*')
        .eq('escritorio_id', escritorioId)

      if (queryError) throw queryError

      setMetricasPorArea(data || [])
    } catch (err) {
      console.error('Erro ao carregar métricas por área:', err)
    }
  }, [supabase, escritorioId])

  // Carregar métricas de um produto específico
  const loadMetricasProduto = async (produtoId: string): Promise<ProdutoMetricas | null> => {
    try {
      const { data, error } = await supabase
        .from('portfolio_metricas')
        .select('*')
        .eq('produto_id', produtoId)
        .eq('periodo', 'total')
        .single()

      if (error) {
        // Se não encontrar, retornar métricas zeradas
        if (error.code === 'PGRST116') {
          return {
            total_execucoes: 0,
            execucoes_concluidas: 0,
            execucoes_em_andamento: 0,
            execucoes_canceladas: 0,
            taxa_sucesso: null,
            duracao_media_dias: null,
            duracao_minima_dias: null,
            duracao_maxima_dias: null,
            receita_total: 0,
            receita_media: null,
            total_aprendizados: 0,
          }
        }
        throw error
      }

      return data
    } catch (err) {
      console.error('Erro ao carregar métricas do produto:', err)
      return null
    }
  }

  // Recalcular métricas de um produto
  const recalcularMetricasProduto = async (produtoId: string): Promise<void> => {
    try {
      const { error } = await supabase.rpc('calcular_metricas_produto', {
        p_produto_id: produtoId,
      })

      if (error) throw error
    } catch (err) {
      console.error('Erro ao recalcular métricas:', err)
      throw err
    }
  }

  // Obter produtos mais vendidos
  const getProdutosMaisVendidos = useCallback(async (limite: number = 5): Promise<Array<{
    produto_id: string
    produto_nome: string
    produto_codigo: string
    area_juridica: AreaJuridica
    total_execucoes: number
    receita_total: number
  }>> => {
    if (!escritorioId) return []
    try {
      const { data, error } = await supabase
        .from('portfolio_metricas')
        .select(`
          produto_id,
          total_execucoes,
          receita_total,
          produto:portfolio_produtos(nome, codigo, area_juridica)
        `)
        .eq('escritorio_id', escritorioId)
        .eq('periodo', 'total')
        .order('total_execucoes', { ascending: false })
        .limit(limite)

      if (error) throw error

      return (data || []).map((item: any) => ({
        produto_id: item.produto_id,
        produto_nome: item.produto?.nome || '',
        produto_codigo: item.produto?.codigo || '',
        area_juridica: item.produto?.area_juridica || 'outro',
        total_execucoes: item.total_execucoes || 0,
        receita_total: item.receita_total || 0,
      }))
    } catch (err) {
      console.error('Erro ao buscar produtos mais vendidos:', err)
      return []
    }
  }, [supabase, escritorioId])

  // Obter receita por mês
  const getReceitaPorMes = useCallback(async (ano: number): Promise<Array<{
    mes: number
    receita: number
    projetos_concluidos: number
  }>> => {
    if (!escritorioId) return []
    try {
      const { data, error } = await supabase
        .from('portfolio_projetos')
        .select('data_conclusao, valor_negociado')
        .eq('escritorio_id', escritorioId)
        .eq('status', 'concluido')
        .gte('data_conclusao', `${ano}-01-01`)
        .lte('data_conclusao', `${ano}-12-31`)

      if (error) throw error

      // Agrupar por mês
      const receitaPorMes: Record<number, { receita: number; projetos: number }> = {}

      for (let mes = 1; mes <= 12; mes++) {
        receitaPorMes[mes] = { receita: 0, projetos: 0 }
      }

      (data || []).forEach((projeto) => {
        if (projeto.data_conclusao) {
          const mes = new Date(projeto.data_conclusao).getMonth() + 1
          receitaPorMes[mes].receita += projeto.valor_negociado || 0
          receitaPorMes[mes].projetos += 1
        }
      })

      return Object.entries(receitaPorMes).map(([mes, dados]) => ({
        mes: parseInt(mes),
        receita: dados.receita,
        projetos_concluidos: dados.projetos,
      }))
    } catch (err) {
      console.error('Erro ao buscar receita por mês:', err)
      return []
    }
  }, [supabase, escritorioId])

  // Obter taxa de sucesso por área
  const getTaxaSucessoPorArea = useCallback(async (): Promise<Array<{
    area_juridica: AreaJuridica
    total_concluidos: number
    total_sucesso: number
    taxa_sucesso: number
  }>> => {
    if (!escritorioId) return []
    try {
      const { data, error } = await supabase
        .from('portfolio_projetos')
        .select(`
          resultado,
          produto:portfolio_produtos(area_juridica)
        `)
        .eq('escritorio_id', escritorioId)
        .eq('status', 'concluido')

      if (error) throw error

      // Agrupar por área
      const porArea: Record<AreaJuridica, { total: number; sucesso: number }> = {
        tributario: { total: 0, sucesso: 0 },
        societario: { total: 0, sucesso: 0 },
        trabalhista: { total: 0, sucesso: 0 },
        civel: { total: 0, sucesso: 0 },
        outro: { total: 0, sucesso: 0 },
      }

      (data || []).forEach((projeto: any) => {
        const area = projeto.produto?.area_juridica as AreaJuridica
        if (area && porArea[area]) {
          porArea[area].total += 1
          if (projeto.resultado === 'sucesso') {
            porArea[area].sucesso += 1
          }
        }
      })

      return Object.entries(porArea).map(([area, dados]) => ({
        area_juridica: area as AreaJuridica,
        total_concluidos: dados.total,
        total_sucesso: dados.sucesso,
        taxa_sucesso: dados.total > 0 ? (dados.sucesso / dados.total) * 100 : 0,
      }))
    } catch (err) {
      console.error('Erro ao buscar taxa de sucesso por área:', err)
      return []
    }
  }, [supabase, escritorioId])

  // Obter duração média por produto
  const getDuracaoMediaPorProduto = useCallback(async (): Promise<Array<{
    produto_id: string
    produto_nome: string
    duracao_media_dias: number
    duracao_estimada_dias: number
    diferenca_dias: number
  }>> => {
    if (!escritorioId) return []
    try {
      const { data, error } = await supabase
        .from('portfolio_metricas')
        .select(`
          produto_id,
          duracao_media_dias,
          produto:portfolio_produtos(nome, duracao_estimada_dias)
        `)
        .eq('escritorio_id', escritorioId)
        .eq('periodo', 'total')
        .not('duracao_media_dias', 'is', null)

      if (error) throw error

      return (data || []).map((item: any) => ({
        produto_id: item.produto_id,
        produto_nome: item.produto?.nome || '',
        duracao_media_dias: item.duracao_media_dias || 0,
        duracao_estimada_dias: item.produto?.duracao_estimada_dias || 0,
        diferenca_dias: (item.duracao_media_dias || 0) - (item.produto?.duracao_estimada_dias || 0),
      }))
    } catch (err) {
      console.error('Erro ao buscar duração média:', err)
      return []
    }
  }, [supabase, escritorioId])

  // Carregar todas as métricas ao montar
  useEffect(() => {
    if (escritorioId) {
      loadDashboardMetricas()
      loadMetricasPorArea()
    }
  }, [escritorioId, loadDashboardMetricas, loadMetricasPorArea])

  return {
    dashboardMetricas,
    metricasPorArea,
    loading,
    error,
    loadDashboardMetricas,
    loadMetricasPorArea,
    loadMetricasProduto,
    recalcularMetricasProduto,
    getProdutosMaisVendidos,
    getReceitaPorMes,
    getTaxaSucessoPorArea,
    getDuracaoMediaPorProduto,
  }
}
