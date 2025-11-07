'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, Filter, DollarSign, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface RelatorioData {
  periodo: string
  receitas: number
  despesas: number
  saldo: number
  honorarios_recebidos: number
  timesheet_faturado: number
  contas_pagas: number
}

export default function RelatoriosFinanceirosPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'semestre' | 'ano'>('mes')
  const [relatorioData, setRelatorioData] = useState<RelatorioData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (escritorioAtivo) {
      loadRelatorio()
    }
  }, [escritorioAtivo, periodo])

  const loadRelatorio = async () => {
    if (!escritorioAtivo) return

    setLoading(true)
    try {
      // Buscar métricas do cache de dashboard
      const { data: metricas, error } = await supabase
        .from('financeiro_dashboard_metricas')
        .select('*')
        .eq('escritorio_id', escritorioAtivo)
        .order('data_atualizacao', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error

      // Mock de dados históricos (em produção, viria de uma view ou agregação)
      const mockData: RelatorioData[] = [
        {
          periodo: 'Janeiro 2025',
          receitas: Number(metricas.receita_mes || 0),
          despesas: Number(metricas.despesas_mes || 0),
          saldo: Number(metricas.receita_mes || 0) - Number(metricas.despesas_mes || 0),
          honorarios_recebidos: Number(metricas.receita_mes || 0) * 0.7,
          timesheet_faturado: Number(metricas.receita_mes || 0) * 0.3,
          contas_pagas: Number(metricas.despesas_mes || 0),
        },
        {
          periodo: 'Dezembro 2024',
          receitas: Number(metricas.receita_mes || 0) * 0.85,
          despesas: Number(metricas.despesas_mes || 0) * 0.9,
          saldo: (Number(metricas.receita_mes || 0) * 0.85) - (Number(metricas.despesas_mes || 0) * 0.9),
          honorarios_recebidos: Number(metricas.receita_mes || 0) * 0.7 * 0.85,
          timesheet_faturado: Number(metricas.receita_mes || 0) * 0.3 * 0.85,
          contas_pagas: Number(metricas.despesas_mes || 0) * 0.9,
        },
        {
          periodo: 'Novembro 2024',
          receitas: Number(metricas.receita_mes || 0) * 0.95,
          despesas: Number(metricas.despesas_mes || 0) * 1.1,
          saldo: (Number(metricas.receita_mes || 0) * 0.95) - (Number(metricas.despesas_mes || 0) * 1.1),
          honorarios_recebidos: Number(metricas.receita_mes || 0) * 0.7 * 0.95,
          timesheet_faturado: Number(metricas.receita_mes || 0) * 0.3 * 0.95,
          contas_pagas: Number(metricas.despesas_mes || 0) * 1.1,
        },
      ]

      setRelatorioData(mockData)
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotais = () => {
    const receitas = relatorioData.reduce((sum, r) => sum + r.receitas, 0)
    const despesas = relatorioData.reduce((sum, r) => sum + r.despesas, 0)
    const saldo = receitas - despesas
    const mediaMensal = receitas / (relatorioData.length || 1)

    return { receitas, despesas, saldo, mediaMensal }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const totais = getTotais()

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#34495e]">Relatórios Financeiros</h1>
          <p className="text-sm text-slate-600 mt-1">
            Análise consolidada de receitas, despesas e performance
          </p>
        </div>
        <div className="flex gap-2.5">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as any)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
          >
            <option value="mes">Mensal</option>
            <option value="trimestre">Trimestral</option>
            <option value="semestre">Semestral</option>
            <option value="ano">Anual</option>
          </select>
          <Button className="bg-gradient-to-r from-[#1E3A8A] to-[#1e40af] text-white border-0 shadow-sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Totalizadores do Período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700">Receitas Totais</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {formatCurrency(totais.receitas)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-700">Despesas Totais</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {formatCurrency(totais.despesas)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-[#89bcbe] to-[#aacfd0]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#34495e]">Saldo Líquido</p>
                <p className="text-2xl font-bold text-[#34495e] mt-1">
                  {formatCurrency(totais.saldo)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/40 flex items-center justify-center">
                {totais.saldo >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-[#34495e]" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-[#34495e]" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-[#34495e] to-[#46627f]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/80">Média Mensal</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(totais.mediaMensal)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Mensal */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm font-medium text-slate-700">
            Evolução {periodo === 'mes' ? 'Mensal' : periodo === 'trimestre' ? 'Trimestral' : periodo === 'semestre' ? 'Semestral' : 'Anual'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-3">
          {loading ? (
            <div className="py-12 text-center">
              <div className="h-8 w-8 mx-auto border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
              <p className="text-sm text-slate-500 mt-2">Carregando...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {relatorioData.map((rel) => (
                <div
                  key={rel.periodo}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50"
                >
                  {/* Período */}
                  <div className="w-10 h-10 rounded-lg bg-[#89bcbe] flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                    {/* Nome Período */}
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-slate-700">{rel.periodo}</p>
                    </div>

                    {/* Receitas */}
                    <div className="col-span-2">
                      <p className="text-[10px] text-emerald-600">Receitas</p>
                      <p className="text-sm font-semibold text-emerald-700">
                        {formatCurrency(rel.receitas)}
                      </p>
                    </div>

                    {/* Despesas */}
                    <div className="col-span-2">
                      <p className="text-[10px] text-red-600">Despesas</p>
                      <p className="text-sm font-semibold text-red-700">
                        {formatCurrency(rel.despesas)}
                      </p>
                    </div>

                    {/* Saldo */}
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500">Saldo</p>
                      <p
                        className={cn(
                          'text-sm font-bold',
                          rel.saldo >= 0 ? 'text-emerald-700' : 'text-red-700'
                        )}
                      >
                        {formatCurrency(rel.saldo)}
                      </p>
                    </div>

                    {/* Honorários */}
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500">Honorários</p>
                      <p className="text-xs font-semibold text-slate-700">
                        {formatCurrency(rel.honorarios_recebidos)}
                      </p>
                    </div>

                    {/* Timesheet */}
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500">Timesheet</p>
                      <p className="text-xs font-semibold text-slate-700">
                        {formatCurrency(rel.timesheet_faturado)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análises Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Categorias de Despesas */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-slate-700">
              Top Categorias de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            <div className="space-y-2">
              {[
                { categoria: 'Folha de Pagamento', valor: 45000, percentual: 45 },
                { categoria: 'Infraestrutura', valor: 12000, percentual: 12 },
                { categoria: 'Custas Processuais', valor: 8500, percentual: 8.5 },
                { categoria: 'Marketing', valor: 5000, percentual: 5 },
                { categoria: 'Outros', valor: 29500, percentual: 29.5 },
              ].map((cat) => (
                <div key={cat.categoria} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{cat.categoria}</span>
                      <span className="text-xs text-slate-600">{formatCurrency(cat.valor)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-red-600 h-1.5 rounded-full"
                        style={{ width: `${cat.percentual}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">
                    {cat.percentual}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Fontes de Receita */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium text-slate-700">
              Top Fontes de Receita
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            <div className="space-y-2">
              {[
                { fonte: 'Honorários Processuais', valor: 75000, percentual: 60 },
                { fonte: 'Consultorias', valor: 25000, percentual: 20 },
                { fonte: 'Honorários de Êxito', valor: 18750, percentual: 15 },
                { fonte: 'Pareceres', valor: 6250, percentual: 5 },
              ].map((fonte) => (
                <div key={fonte.fonte} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{fonte.fonte}</span>
                      <span className="text-xs text-slate-600">{formatCurrency(fonte.valor)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full"
                        style={{ width: `${fonte.percentual}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                    {fonte.percentual}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores de Performance */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm font-medium text-slate-700">
            Indicadores de Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-600">Margem Líquida</p>
              <p className="text-xl font-bold text-[#34495e] mt-1">
                {((totais.saldo / (totais.receitas || 1)) * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {totais.saldo >= 0 ? 'Positiva' : 'Negativa'}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-600">Taxa de Inadimplência</p>
              <p className="text-xl font-bold text-amber-700 mt-1">8.5%</p>
              <p className="text-[10px] text-slate-500 mt-1">Média do setor: 12%</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-600">Ticket Médio</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">
                {formatCurrency(totais.receitas / 3)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Por período</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-600">Crescimento</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">+12.3%</p>
              <p className="text-[10px] text-slate-500 mt-1">vs período anterior</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
