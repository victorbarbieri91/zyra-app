'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'
import { usePermissoes } from './usePermissoes'

export type InsightTipo = 'oportunidade' | 'alerta' | 'destaque' | 'sugestao'

export interface Insight {
  tipo: InsightTipo
  titulo: string
  descricao: string
  acao?: {
    label: string
    href: string
  }
  prioridade: 'alta' | 'media' | 'baixa'
}

export interface InsightsData {
  insights: Insight[]
  gerado_em: string
  metricas_base: {
    horas_nao_faturadas: number
    valor_nao_faturado: number
    contratos_vencendo: number
    processos_parados: number
    taxa_conversao: number
    taxa_inadimplencia: number
    produtividade: number
  }
}

const defaultInsights: InsightsData = {
  insights: [],
  gerado_em: new Date().toISOString(),
  metricas_base: {
    horas_nao_faturadas: 0,
    valor_nao_faturado: 0,
    contratos_vencendo: 0,
    processos_parados: 0,
    taxa_conversao: 0,
    taxa_inadimplencia: 0,
    produtividade: 0,
  },
}

export function useDashboardInsightsIA() {
  const [data, setData] = useState<InsightsData>(defaultInsights)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasPermission, setHasPermission] = useState(false)
  const { escritorioAtivo, isOwner, roleAtual } = useEscritorioAtivo()
  const { podeVisualizar } = usePermissoes()
  const supabase = createClient()

  // Verificar se usuário pode ver insights (dono, sócio ou gerente)
  useEffect(() => {
    const verificarPermissao = async () => {
      // Donos e sócios sempre podem ver
      if (isOwner || roleAtual === 'socio') {
        setHasPermission(true)
        return
      }

      // Verificar permissão de financeiro (gerentes podem ter)
      const temPermissao = await podeVisualizar('financeiro')
      setHasPermission(temPermissao)
    }

    verificarPermissao()
  }, [isOwner, roleAtual, podeVisualizar])

  const loadInsights = useCallback(async (forceRefresh = false) => {
    if (!escritorioAtivo || !hasPermission) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Chamar Edge Function
      const { data: resultado, error: fnError } = await supabase.functions.invoke('dashboard-insights-ia', {
        body: {
          escritorio_id: escritorioAtivo,
          force_refresh: forceRefresh,
        },
      })

      if (fnError) {
        throw fnError
      }

      if (resultado?.sucesso) {
        setData({
          insights: resultado.insights || [],
          gerado_em: resultado.gerado_em,
          metricas_base: resultado.metricas_base || defaultInsights.metricas_base,
        })
      } else {
        throw new Error(resultado?.erro || 'Erro ao gerar insights')
      }
    } catch (err) {
      console.error('Erro ao carregar insights:', err)
      setError(err as Error)

      // Fallback com insights vazios
      setData({
        ...defaultInsights,
        insights: [{
          tipo: 'destaque',
          titulo: 'Insights indisponíveis',
          descricao: 'Não foi possível carregar os insights de gestão no momento.',
          prioridade: 'baixa',
        }],
      })
    } finally {
      setLoading(false)
    }
  }, [escritorioAtivo, hasPermission, supabase])

  // Função para forçar atualização
  const refresh = useCallback(() => {
    return loadInsights(true)
  }, [loadInsights])

  useEffect(() => {
    if (hasPermission) {
      loadInsights()
    } else {
      setLoading(false)
    }
  }, [loadInsights, hasPermission])

  return {
    insights: data.insights,
    metricas: data.metricas_base,
    geradoEm: data.gerado_em,
    loading,
    error,
    refresh,
    hasPermission,
    isEmpty: !loading && data.insights.length === 0,
  }
}
