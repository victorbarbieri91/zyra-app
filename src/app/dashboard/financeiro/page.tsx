'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Clock, AlertCircle, FileText, Users, Calendar, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import MetricCard from '@/components/dashboard/MetricCard'
import InsightCard from '@/components/dashboard/InsightCard'
import TimelineItem from '@/components/dashboard/TimelineItem'
import QuickActionButton from '@/components/dashboard/QuickActionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface DashboardMetrics {
  receita_mes: number
  despesas_mes: number
  pendente_receber: number
  atrasado: number
  lucro_mes: number
  variacao_receita: number
  variacao_lucro: number
  taxa_inadimplencia: number
}

interface ContaProxima {
  id: string
  tipo: 'receber' | 'pagar'
  descricao: string
  valor: number
  vencimento: string
  dias_ate_vencimento: number
  status: 'pendente' | 'atrasado' | 'pago'
}

export default function FinanceiroDashboard() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()
  const router = useRouter()

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    receita_mes: 0,
    despesas_mes: 0,
    pendente_receber: 0,
    atrasado: 0,
    lucro_mes: 0,
    variacao_receita: 0,
    variacao_lucro: 0,
    taxa_inadimplencia: 3.2,
  })

  const [contasProximas, setContasProximas] = useState<ContaProxima[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (escritorioAtivo) {
      loadMetrics()
      loadContasProximas()
    }
  }, [escritorioAtivo])

  const loadMetrics = async () => {
    if (!escritorioAtivo) return

    try {
      const { data: cacheData } = await supabase
        .from('financeiro_dashboard_metricas')
        .select('*')
        .eq('escritorio_id', escritorioAtivo)
        .eq('categoria', 'financeiro')
        .eq('metrica', 'dashboard')
        .single()

      if (cacheData?.dados_extras) {
        setMetrics(cacheData.dados_extras as any)
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadContasProximas = async () => {
    if (!escritorioAtivo) return

    try {
      // Mock de dados - em produção viria da view v_contas_receber_pagar
      const mockContas: ContaProxima[] = [
        { id: '1', tipo: 'receber', descricao: 'Honorários - Cliente ABC', valor: 5000, vencimento: '2025-11-10', dias_ate_vencimento: 5, status: 'pendente' },
        { id: '2', tipo: 'receber', descricao: 'Fatura #2024-045', valor: 3200, vencimento: '2025-11-08', dias_ate_vencimento: 3, status: 'pendente' },
        { id: '3', tipo: 'pagar', descricao: 'Aluguel Escritório', valor: 3500, vencimento: '2025-11-08', dias_ate_vencimento: 3, status: 'pendente' },
        { id: '4', tipo: 'pagar', descricao: 'Folha de Pagamento', valor: 12000, vencimento: '2025-11-07', dias_ate_vencimento: 2, status: 'atrasado' },
      ]
      setContasProximas(mockContas)
    } catch (error) {
      console.error('Erro ao carregar contas próximas:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getStatusBadge = (status: 'pendente' | 'atrasado' | 'pago') => {
    const configs = {
      pendente: {
        label: 'Pendente',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      },
      atrasado: {
        label: 'Atrasado',
        className: 'bg-red-100 text-red-700 border-red-200',
      },
      pago: {
        label: 'Pago',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      },
    }
    const config = configs[status]
    return (
      <Badge className={cn('text-[10px] font-medium border', config.className)}>
        {config.label}
      </Badge>
    )
  }

  const margemLucro = metrics.receita_mes > 0
    ? ((metrics.lucro_mes / metrics.receita_mes) * 100)
    : 0

  const contasReceber = contasProximas.filter(c => c.tipo === 'receber')
  const contasPagar = contasProximas.filter(c => c.tipo === 'pagar')

  // Dados do gráfico - últimos 6 meses
  const chartData = [
    { mes: 'Jun', receitas: 45000, despesas: 32000 },
    { mes: 'Jul', receitas: 52000, despesas: 35000 },
    { mes: 'Ago', receitas: 48000, despesas: 33000 },
    { mes: 'Set', receitas: 61000, despesas: 38000 },
    { mes: 'Out', receitas: 55000, despesas: 36000 },
    { mes: 'Nov', receitas: 0, despesas: 0 }, // Mês atual (será preenchido com dados reais)
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-[#34495e]">Dashboard Financeiro</h1>
            <p className="text-sm text-slate-600 mt-1">
              Visão geral consolidada das finanças do escritório
            </p>
          </div>
        </div>

        {/* KPIs Top Row - 4 cards estratégicos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Receita do Mês */}
          <MetricCard
            title="Receita"
            value={formatCurrency(metrics.receita_mes)}
            icon={DollarSign}
            trend={{
              value: metrics.variacao_receita.toFixed(1) + '%',
              label: 'vs mês anterior',
              positive: metrics.variacao_receita >= 0,
            }}
            gradient="kpi1"
          />

          {/* 2. Lucro do Mês - DESTAQUE ESPECIAL */}
          <Card className="border-[#1E3A8A] shadow-lg bg-gradient-to-br from-[#34495e] to-[#46627f]">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-white/80">Lucro do Mês</p>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  {metrics.lucro_mes >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-white" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(metrics.lucro_mes)}
                </span>
                {metrics.variacao_lucro !== 0 && (
                  <div className={cn(
                    'flex items-center gap-0.5 px-1.5 py-0.5 rounded',
                    metrics.variacao_lucro >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  )}>
                    {metrics.variacao_lucro >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-emerald-300" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-300" />
                    )}
                    <span className={cn(
                      'text-[10px] font-semibold',
                      metrics.variacao_lucro >= 0 ? 'text-emerald-300' : 'text-red-300'
                    )}>
                      {Math.abs(metrics.variacao_lucro).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className={cn(
                'inline-flex px-2 py-0.5 rounded text-[10px] font-semibold',
                metrics.lucro_mes >= 0
                  ? 'bg-emerald-500/30 text-emerald-100'
                  : 'bg-red-500/30 text-red-100'
              )}>
                {metrics.lucro_mes >= 0 ? 'Positivo' : 'Negativo'}
              </div>
            </CardContent>
          </Card>

          {/* 3. Margem de Lucro */}
          <MetricCard
            title="Margem de Lucro"
            value={margemLucro.toFixed(1) + '%'}
            icon={Target}
            subtitle="sobre faturamento"
            gradient="kpi3"
          />

          {/* 4. Taxa de Inadimplência */}
          <MetricCard
            title="Inadimplência"
            value={metrics.taxa_inadimplencia.toFixed(1) + '%'}
            icon={AlertCircle}
            trend={{
              value: formatCurrency(metrics.atrasado),
              label: 'em atraso',
            }}
            gradient="kpi4"
          />
        </div>

        {/* Ações Rápidas */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-slate-700">
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2.5">
              <QuickActionButton
                icon={FileText}
                label="Novo Contrato"
                onClick={() => router.push('/dashboard/financeiro/contratos-honorarios')}
                variant="highlight"
              />
              <QuickActionButton
                icon={DollarSign}
                label="Novo Honorário"
                onClick={() => router.push('/dashboard/financeiro/contratos-honorarios')}
              />
              <QuickActionButton
                icon={CreditCard}
                label="Nova Fatura"
                onClick={() => router.push('/dashboard/financeiro/faturamento')}
              />
              <QuickActionButton
                icon={TrendingDown}
                label="Nova Despesa"
                onClick={() => router.push('/dashboard/financeiro/receitas-despesas')}
              />
              <QuickActionButton
                icon={Clock}
                label="Timesheet"
                onClick={() => router.push('/dashboard/financeiro/timesheet')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Grid Principal - 3 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Coluna Esquerda (2 colunas) */}
          <div className="md:col-span-2 space-y-4">
            {/* Gráfico */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium text-slate-700">
                  Receitas vs Despesas (Últimos 6 meses)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#34495e', fontWeight: 600, fontSize: '12px' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      iconType="circle"
                      formatter={(value) => value === 'receitas' ? 'Receitas' : 'Despesas'}
                    />
                    <Bar
                      dataKey="receitas"
                      fill="#89bcbe"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                    <Bar
                      dataKey="despesas"
                      fill="#46627f"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Insights */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium text-slate-700">
                  Insights de Gestão
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 pb-3">
                <div className="space-y-3">
                  <InsightCard
                    type="oportunidade"
                    title="Otimização de Custos"
                    description="Despesas operacionais podem ser reduzidas em 15%"
                    action={{
                      label: 'Ver detalhes',
                      onClick: () => {},
                    }}
                  />

                  <InsightCard
                    type="alerta"
                    title="Cobranças Pendentes"
                    description={`${metrics.atrasado > 0 ? Math.round(metrics.atrasado / 1000) : 0}k em atraso há mais de 30 dias`}
                    action={{
                      label: 'Revisar',
                      onClick: () => {},
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita */}
          <div className="space-y-4">
            {/* Resumo 7 Dias - PRIMEIRO */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium text-slate-700">
                  Próximos 7 Dias
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 pb-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#f0f9f9]/40">
                    <span className="text-xs text-slate-600">A Receber</span>
                    <span className="text-sm font-bold text-[#34495e]">
                      {formatCurrency(contasReceber.reduce((sum, c) => sum + c.valor, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100">
                    <span className="text-xs text-slate-600">A Pagar</span>
                    <span className="text-sm font-bold text-[#34495e]">
                      {formatCurrency(contasPagar.reduce((sum, c) => sum + c.valor, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#89bcbe]/10 border-t border-slate-200 mt-2 pt-2">
                    <span className="text-xs font-semibold text-[#34495e]">Saldo</span>
                    <span className="text-sm font-bold text-[#34495e]">
                      {formatCurrency(
                        contasReceber.reduce((sum, c) => sum + c.valor, 0) -
                        contasPagar.reduce((sum, c) => sum + c.valor, 0)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recebimentos Próximos */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-3 bg-[#f0f9f9]/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] flex items-center justify-center">
                      <TrendingUp className="h-3.5 w-3.5 text-white" />
                    </div>
                    <CardTitle className="text-sm font-medium text-[#34495e]">
                      Recebimentos Próximos
                    </CardTitle>
                  </div>
                  <button className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] hover:underline font-medium">
                    Ver todas
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-3 pb-3">
                <div className="space-y-2">
                  {contasReceber.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      Nenhum recebimento próximo
                    </p>
                  ) : (
                    contasReceber.map((conta) => (
                      <div
                        key={conta.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-[#f0f9f9]/40 border border-[#89bcbe]/20 hover:bg-[#e8f5f5]/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold text-[#34495e] truncate">
                              {conta.descricao}
                            </p>
                            {getStatusBadge(conta.status)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-[#89bcbe] flex-shrink-0" />
                            <p className="text-[10px] text-[#46627f]">
                              Vence em {conta.dias_ate_vencimento} {conta.dias_ate_vencimento === 1 ? 'dia' : 'dias'}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#34495e] ml-2 flex-shrink-0">
                          {formatCurrency(conta.valor)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Despesas Próximas */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#46627f] to-[#6c757d] flex items-center justify-center">
                      <TrendingDown className="h-3.5 w-3.5 text-white" />
                    </div>
                    <CardTitle className="text-sm font-medium text-[#34495e]">
                      Despesas Próximas
                    </CardTitle>
                  </div>
                  <button className="text-xs text-[#46627f] hover:text-[#34495e] hover:underline font-medium">
                    Ver todas
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-3 pb-3">
                <div className="space-y-2">
                  {contasPagar.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      Nenhuma despesa próxima
                    </p>
                  ) : (
                    contasPagar.map((conta) => (
                      <div
                        key={conta.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#34495e] truncate">
                            {conta.descricao}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="h-3 w-3 text-slate-500 flex-shrink-0" />
                            <p className="text-[10px] text-[#46627f]">
                              Vence em {conta.dias_ate_vencimento} {conta.dias_ate_vencimento === 1 ? 'dia' : 'dias'}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#34495e] ml-2 flex-shrink-0">
                          {formatCurrency(conta.valor)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
    </div>
  )
}
