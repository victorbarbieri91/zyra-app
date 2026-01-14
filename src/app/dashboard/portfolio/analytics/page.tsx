'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  Target,
  Users,
  Briefcase,
  Calculator,
  Building2,
  Scale,
  Star,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { usePortfolioMetricas } from '@/hooks/usePortfolioMetricas'
import { formatCurrency } from '@/lib/utils'
import type { AreaJuridica } from '@/types/portfolio'
import { AREA_JURIDICA_LABELS } from '@/types/portfolio'

// Ícones por área
const AREA_ICONS: Record<AreaJuridica, typeof Calculator> = {
  tributario: Calculator,
  societario: Building2,
  trabalhista: Users,
  civel: Scale,
  outro: Briefcase,
}

const AREA_COLORS: Record<AreaJuridica, string> = {
  tributario: 'bg-amber-500',
  societario: 'bg-blue-500',
  trabalhista: 'bg-emerald-500',
  civel: 'bg-purple-500',
  outro: 'bg-slate-500',
}

export default function PortfolioAnalyticsPage() {
  const supabase = createClient()
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState<any[]>([])
  const [receitaPorMes, setReceitaPorMes] = useState<any[]>([])
  const [taxaSucessoArea, setTaxaSucessoArea] = useState<any[]>([])
  const [duracaoMedia, setDuracaoMedia] = useState<any[]>([])

  // Carregar escritório do usuário logado
  useEffect(() => {
    const loadEscritorioId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()
        if (profile?.escritorio_id) {
          setEscritorioId(profile.escritorio_id)
        }
      }
    }
    loadEscritorioId()
  }, [])

  const {
    dashboardMetricas,
    metricasPorArea,
    loading: loadingMetricas,
    getProdutosMaisVendidos,
    getReceitaPorMes,
    getTaxaSucessoPorArea,
    getDuracaoMediaPorProduto,
  } = usePortfolioMetricas(escritorioId || '')

  const loading = !escritorioId || loadingMetricas

  // Carregar dados adicionais
  useEffect(() => {
    async function loadData() {
      if (!escritorioId) return
      const [produtos, receita, taxaSucesso, duracao] = await Promise.all([
        getProdutosMaisVendidos(5),
        getReceitaPorMes(new Date().getFullYear()),
        getTaxaSucessoPorArea(),
        getDuracaoMediaPorProduto(),
      ])

      setProdutosMaisVendidos(produtos)
      setReceitaPorMes(receita)
      setTaxaSucessoArea(taxaSucesso)
      setDuracaoMedia(duracao)
    }
    loadData()
  }, [escritorioId])

  // Calcular variação de receita
  const receitaAtual = dashboardMetricas?.receita_mes_atual || 0
  const receitaAnterior = dashboardMetricas?.receita_mes_anterior || 0
  const variacaoReceita =
    receitaAnterior > 0 ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100 : 0

  // Meses para exibição
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34495e]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#34495e]">Analytics do Portfólio</h1>
        <p className="text-sm text-slate-500">
          Métricas e indicadores de desempenho dos produtos e projetos
        </p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-gradient-to-br from-[#34495e] to-[#46627f] text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Produtos Ativos</p>
                <p className="text-3xl font-bold">{dashboardMetricas?.total_produtos_ativos || 0}</p>
              </div>
              <Briefcase className="w-8 h-8 text-white/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-gradient-to-br from-[#46627f] to-[#6c757d] text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Projetos Ativos</p>
                <p className="text-3xl font-bold">{dashboardMetricas?.total_projetos_ativos || 0}</p>
              </div>
              <Target className="w-8 h-8 text-white/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">Taxa de Sucesso</p>
                <p className="text-3xl font-bold">
                  {dashboardMetricas?.taxa_sucesso_geral?.toFixed(0) || 0}%
                </p>
              </div>
              <Star className="w-8 h-8 text-white/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Atrasados</p>
                <p className="text-3xl font-bold text-red-600">
                  {dashboardMetricas?.projetos_atrasados || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receita do Mês */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#34495e]">
              Receita do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-[#1E3A8A]">
                  {formatCurrency(receitaAtual)}
                </p>
                <p className="text-sm text-slate-500">
                  Mês anterior: {formatCurrency(receitaAnterior)}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  variacaoReceita >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {variacaoReceita >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(variacaoReceita).toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Receita por Mês */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#34495e]">
              Receita Mensal ({new Date().getFullYear()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-end gap-2">
              {receitaPorMes.map((mes, index) => {
                const maxReceita = Math.max(...receitaPorMes.map((m) => m.receita), 1)
                const altura = (mes.receita / maxReceita) * 100

                return (
                  <div key={mes.mes} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-gradient-to-t from-[#34495e] to-[#89bcbe] rounded-t"
                      style={{ height: `${Math.max(altura, 2)}%` }}
                      title={`${mesesNomes[mes.mes - 1]}: ${formatCurrency(mes.receita)}`}
                    />
                    <span className="text-[10px] text-slate-500">{mesesNomes[mes.mes - 1]}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas por Área e Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desempenho por Área */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#34495e]">
              Desempenho por Área Jurídica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metricasPorArea.map((area) => {
                const AreaIcon = AREA_ICONS[area.area_juridica]
                const taxaSucesso =
                  area.projetos_concluidos > 0
                    ? (area.projetos_concluidos / (area.total_projetos || 1)) * 100
                    : 0

                return (
                  <div key={area.area_juridica} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg ${AREA_COLORS[area.area_juridica]} bg-opacity-20 flex items-center justify-center`}
                        >
                          <AreaIcon className="w-4 h-4 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-[#34495e]">
                          {AREA_JURIDICA_LABELS[area.area_juridica]}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-[#34495e]">
                          {area.total_projetos} projetos
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          ({area.produtos_ativos} produtos)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={taxaSucesso} className="h-2 flex-1" />
                      <span className="text-xs text-slate-500 w-12 text-right">
                        {taxaSucesso.toFixed(0)}%
                      </span>
                    </div>
                    {area.receita_total && (
                      <p className="text-xs text-slate-500 text-right">
                        Receita: {formatCurrency(area.receita_total)}
                      </p>
                    )}
                  </div>
                )
              })}

              {metricasPorArea.length === 0 && (
                <p className="text-center text-slate-500 py-4">
                  Nenhum dado disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#34495e]">
              Produtos Mais Executados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {produtosMaisVendidos.map((produto, index) => {
                const AreaIcon = AREA_ICONS[produto.area_juridica]

                return (
                  <div
                    key={produto.produto_id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#34495e] text-white flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#34495e] truncate">
                        {produto.produto_nome}
                      </p>
                      <p className="text-xs text-slate-500">{produto.produto_codigo}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#34495e]">{produto.total_execucoes}</p>
                      <p className="text-xs text-slate-500">execuções</p>
                    </div>
                  </div>
                )
              })}

              {produtosMaisVendidos.length === 0 && (
                <p className="text-center text-slate-500 py-4">
                  Nenhum produto executado ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Sucesso e Duração */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taxa de Sucesso por Área */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#34495e]">
              Taxa de Sucesso por Área
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {taxaSucessoArea.map((area) => {
                const AreaIcon = AREA_ICONS[area.area_juridica]

                return (
                  <div key={area.area_juridica} className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg ${AREA_COLORS[area.area_juridica]} bg-opacity-20 flex items-center justify-center`}
                    >
                      <AreaIcon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#34495e]">
                          {AREA_JURIDICA_LABELS[area.area_juridica]}
                        </span>
                        <span className="text-sm font-semibold text-[#34495e]">
                          {area.taxa_sucesso.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={area.taxa_sucesso} className="h-2" />
                      <p className="text-xs text-slate-500 mt-1">
                        {area.total_sucesso} de {area.total_concluidos} concluídos com sucesso
                      </p>
                    </div>
                  </div>
                )
              })}

              {taxaSucessoArea.length === 0 && (
                <p className="text-center text-slate-500 py-4">
                  Nenhum projeto concluído ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Análise de Duração */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#34495e]">
              Análise de Duração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {duracaoMedia.slice(0, 5).map((produto) => {
                const isOnTime = produto.diferenca_dias <= 0
                const isSlightlyLate = produto.diferenca_dias > 0 && produto.diferenca_dias <= 7
                const isLate = produto.diferenca_dias > 7

                return (
                  <div
                    key={produto.produto_id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200"
                  >
                    <Clock
                      className={`w-5 h-5 ${
                        isOnTime
                          ? 'text-emerald-500'
                          : isSlightlyLate
                          ? 'text-amber-500'
                          : 'text-red-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#34495e] truncate">
                        {produto.produto_nome}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Estimado: {produto.duracao_estimada_dias}d</span>
                        <span>|</span>
                        <span>Real: {produto.duracao_media_dias?.toFixed(0)}d</span>
                      </div>
                    </div>
                    <div
                      className={`text-right text-sm font-semibold ${
                        isOnTime
                          ? 'text-emerald-600'
                          : isSlightlyLate
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {produto.diferenca_dias > 0 ? '+' : ''}
                      {produto.diferenca_dias.toFixed(0)}d
                    </div>
                  </div>
                )
              })}

              {duracaoMedia.length === 0 && (
                <p className="text-center text-slate-500 py-4">
                  Nenhum dado de duração disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
