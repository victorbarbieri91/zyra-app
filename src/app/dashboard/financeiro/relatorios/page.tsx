'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format, parseISO, subMonths, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface RelatorioData {
  periodo: string
  mes_referencia: string
  receitas: number
  despesas: number
  saldo: number
  margem_liquida: number
}

interface CategoriaAgregada {
  categoria: string
  valor: number
  percentual: number
}

interface FonteReceita {
  fonte: string
  valor: number
  percentual: number
}

const CATEGORIA_LABELS: Record<string, string> = {
  custas: 'Custas Processuais',
  fornecedor: 'Fornecedores',
  folha: 'Folha de Pagamento',
  impostos: 'Impostos',
  aluguel: 'Aluguel',
  marketing: 'Marketing',
  capacitacao: 'Capacitação',
  material: 'Material de Escritório',
  tecnologia: 'Tecnologia',
  outras: 'Outras Despesas',
}

const FONTE_LABELS: Record<string, string> = {
  fixo: 'Honorários Fixos',
  etapa: 'Honorários por Etapa',
  hora: 'Honorários por Hora',
  exito: 'Honorários de Êxito',
  avulso: 'Honorários Avulsos',
}

export default function RelatoriosFinanceirosPage() {
  const { escritorioAtivo } = useEscritorioAtivo()
  const supabase = createClient()

  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'semestre' | 'ano'>('trimestre')
  const [relatorioData, setRelatorioData] = useState<RelatorioData[]>([])
  const [categoriasDespesas, setCategoriasDespesas] = useState<CategoriaAgregada[]>([])
  const [fontesReceita, setFontesReceita] = useState<FonteReceita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inadimplencia, setInadimplencia] = useState<{ taxa: number; valor: number }>({ taxa: 0, valor: 0 })

  // Calcula quantos meses carregar baseado no período selecionado
  const getMesesPeriodo = useCallback(() => {
    switch (periodo) {
      case 'mes':
        return 1
      case 'trimestre':
        return 3
      case 'semestre':
        return 6
      case 'ano':
        return 12
      default:
        return 3
    }
  }, [periodo])

  // Carregar dados do DRE
  const loadDRE = useCallback(async () => {
    if (!escritorioAtivo) return

    try {
      const meses = getMesesPeriodo()

      const { data, error: dreError } = await supabase
        .from('v_dre')
        .select('mes_referencia, receita_bruta, despesas_totais, resultado_liquido, margem_liquida')
        .eq('escritorio_id', escritorioAtivo)
        .order('mes_referencia', { ascending: false })
        .limit(meses)

      if (dreError) throw dreError

      const formatted: RelatorioData[] = (data || []).map((d: any) => ({
        periodo: d.mes_referencia
          ? format(parseISO(d.mes_referencia), "MMMM 'de' yyyy", { locale: ptBR })
          : '',
        mes_referencia: d.mes_referencia || '',
        receitas: Number(d.receita_bruta) || 0,
        despesas: Number(d.despesas_totais) || 0,
        saldo: Number(d.resultado_liquido) || 0,
        margem_liquida: Number(d.margem_liquida) || 0,
      }))

      setRelatorioData(formatted)
    } catch (err) {
      console.error('Erro ao carregar DRE:', err)
      setError('Erro ao carregar dados do DRE')
    }
  }, [escritorioAtivo, supabase, getMesesPeriodo])

  // Carregar categorias de despesas
  const loadCategoriasDespesas = useCallback(async () => {
    if (!escritorioAtivo) return

    try {
      const meses = getMesesPeriodo()
      const dataInicio = startOfMonth(subMonths(new Date(), meses)).toISOString()

      const { data, error: despesasError } = await supabase
        .from('despesas')
        .select('categoria, valor')
        .eq('escritorio_id', escritorioAtivo)
        .eq('status', 'pago')
        .gte('data_pagamento', dataInicio)

      if (despesasError) throw despesasError

      // Agregar por categoria
      const aggregated: Record<string, number> = (data || []).reduce(
        (acc: Record<string, number>, d: any) => {
          const cat = d.categoria || 'outras'
          if (!acc[cat]) acc[cat] = 0
          acc[cat] += Number(d.valor) || 0
          return acc
        },
        {} as Record<string, number>
      )

      const total = Object.values(aggregated).reduce((a: number, b: number) => a + b, 0)

      const formatted: CategoriaAgregada[] = Object.entries(aggregated)
        .map(([categoria, valor]: [string, number]) => ({
          categoria: CATEGORIA_LABELS[categoria] || categoria,
          valor,
          percentual: total > 0 ? (valor / total) * 100 : 0,
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5) // Top 5

      setCategoriasDespesas(formatted)
    } catch (err) {
      console.error('Erro ao carregar categorias de despesas:', err)
    }
  }, [escritorioAtivo, supabase, getMesesPeriodo])

  // Carregar fontes de receita
  const loadFontesReceita = useCallback(async () => {
    if (!escritorioAtivo) return

    try {
      const meses = getMesesPeriodo()
      const dataInicio = startOfMonth(subMonths(new Date(), meses)).toISOString()

      // Buscar honorários pagos por tipo
      const { data, error: honorariosError } = await supabase
        .from('honorarios')
        .select(
          `
          tipo_lancamento,
          honorarios_parcelas!inner (
            valor_pago,
            data_pagamento,
            status
          )
        `
        )
        .eq('escritorio_id', escritorioAtivo)

      if (honorariosError) throw honorariosError

      // Filtrar parcelas pagas no período e agregar por tipo
      const aggregated: Record<string, number> = (data || []).reduce(
        (acc: Record<string, number>, h: any) => {
          const tipo = h.tipo_lancamento || 'avulso'
          if (!acc[tipo]) acc[tipo] = 0

          if (h.honorarios_parcelas && Array.isArray(h.honorarios_parcelas)) {
            h.honorarios_parcelas.forEach((p: { valor_pago: number | null; data_pagamento: string | null; status: string }) => {
              if (
                p.status === 'pago' &&
                p.data_pagamento &&
                new Date(p.data_pagamento) >= new Date(dataInicio)
              ) {
                acc[tipo] += Number(p.valor_pago) || 0
              }
            })
          }
          return acc
        },
        {} as Record<string, number>
      )

      const total = Object.values(aggregated).reduce((a: number, b: number) => a + b, 0)

      const formatted: FonteReceita[] = Object.entries(aggregated)
        .filter(([_, valor]: [string, number]) => valor > 0)
        .map(([fonte, valor]: [string, number]) => ({
          fonte: FONTE_LABELS[fonte] || fonte,
          valor,
          percentual: total > 0 ? (valor / total) * 100 : 0,
        }))
        .sort((a, b) => b.valor - a.valor)

      setFontesReceita(formatted)
    } catch (err) {
      console.error('Erro ao carregar fontes de receita:', err)
    }
  }, [escritorioAtivo, supabase, getMesesPeriodo])

  // Carregar taxa de inadimplência
  const loadInadimplencia = useCallback(async () => {
    if (!escritorioAtivo) return

    try {
      // Buscar parcelas em aberto e atrasadas
      const { data: parcelas, error: parcelasError } = await supabase
        .from('honorarios_parcelas')
        .select(
          `
          valor,
          status,
          honorarios!inner (
            escritorio_id
          )
        `
        )
        .eq('honorarios.escritorio_id', escritorioAtivo)
        .in('status', ['pendente', 'atrasado'])

      if (parcelasError) throw parcelasError

      const totalPendente = (parcelas || []).reduce((sum: number, p: any) => sum + (Number(p.valor) || 0), 0)
      const totalAtrasado = (parcelas || [])
        .filter((p: any) => p.status === 'atrasado')
        .reduce((sum: number, p: any) => sum + (Number(p.valor) || 0), 0)

      const taxa = totalPendente > 0 ? (totalAtrasado / totalPendente) * 100 : 0

      setInadimplencia({ taxa, valor: totalAtrasado })
    } catch (err) {
      console.error('Erro ao carregar inadimplência:', err)
    }
  }, [escritorioAtivo, supabase])

  // Carregar todos os dados
  useEffect(() => {
    if (escritorioAtivo) {
      setLoading(true)
      setError(null)

      Promise.all([loadDRE(), loadCategoriasDespesas(), loadFontesReceita(), loadInadimplencia()])
        .catch(() => setError('Erro ao carregar dados'))
        .finally(() => setLoading(false))
    }
  }, [escritorioAtivo, periodo, loadDRE, loadCategoriasDespesas, loadFontesReceita, loadInadimplencia])

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

  // Calcular crescimento (comparando primeiro e último período)
  const calcularCrescimento = () => {
    if (relatorioData.length < 2) return 0
    const primeiro = relatorioData[relatorioData.length - 1].receitas
    const ultimo = relatorioData[0].receitas
    if (primeiro === 0) return 0
    return ((ultimo - primeiro) / primeiro) * 100
  }

  const crescimento = calcularCrescimento()

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
            onChange={(e) => setPeriodo(e.target.value as typeof periodo)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
          >
            <option value="mes">Último Mês</option>
            <option value="trimestre">Trimestre</option>
            <option value="semestre">Semestre</option>
            <option value="ano">Último Ano</option>
          </select>
          <Button className="bg-gradient-to-r from-[#1E3A8A] to-[#1e40af] text-white border-0 shadow-sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Totalizadores do Período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700">Receitas Totais</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {loading ? '...' : formatCurrency(totais.receitas)}
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
                  {loading ? '...' : formatCurrency(totais.despesas)}
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
                  {loading ? '...' : formatCurrency(totais.saldo)}
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
                  {loading ? '...' : formatCurrency(totais.mediaMensal)}
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
            Evolução{' '}
            {periodo === 'mes'
              ? 'Mensal'
              : periodo === 'trimestre'
                ? 'Trimestral'
                : periodo === 'semestre'
                  ? 'Semestral'
                  : 'Anual'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-3">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-[#89bcbe]" />
              <p className="text-sm text-slate-500 mt-2">Carregando...</p>
            </div>
          ) : relatorioData.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 mt-2">Nenhum dado disponível para o período</p>
              <p className="text-xs text-slate-400">
                Os dados aparecerão aqui quando houver movimentações financeiras
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {relatorioData.map((rel) => (
                <div
                  key={rel.mes_referencia}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50"
                >
                  {/* Período */}
                  <div className="w-10 h-10 rounded-lg bg-[#89bcbe] flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                    {/* Nome Período */}
                    <div className="col-span-3">
                      <p className="text-sm font-semibold text-slate-700 capitalize">{rel.periodo}</p>
                    </div>

                    {/* Receitas */}
                    <div className="col-span-3">
                      <p className="text-[10px] text-emerald-600">Receitas</p>
                      <p className="text-sm font-semibold text-emerald-700">
                        {formatCurrency(rel.receitas)}
                      </p>
                    </div>

                    {/* Despesas */}
                    <div className="col-span-3">
                      <p className="text-[10px] text-red-600">Despesas</p>
                      <p className="text-sm font-semibold text-red-700">
                        {formatCurrency(rel.despesas)}
                      </p>
                    </div>

                    {/* Saldo */}
                    <div className="col-span-3">
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
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-[#89bcbe]" />
              </div>
            ) : categoriasDespesas.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">Nenhuma despesa no período</p>
              </div>
            ) : (
              <div className="space-y-2">
                {categoriasDespesas.map((cat) => (
                  <div key={cat.categoria} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700">{cat.categoria}</span>
                        <span className="text-xs text-slate-600">{formatCurrency(cat.valor)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-red-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(cat.percentual, 100)}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">
                      {cat.percentual.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
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
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-[#89bcbe]" />
              </div>
            ) : fontesReceita.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">Nenhuma receita no período</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fontesReceita.map((fonte) => (
                  <div key={fonte.fonte} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700">{fonte.fonte}</span>
                        <span className="text-xs text-slate-600">{formatCurrency(fonte.valor)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(fonte.percentual, 100)}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                      {fonte.percentual.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
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
                {loading
                  ? '...'
                  : totais.receitas > 0
                    ? `${((totais.saldo / totais.receitas) * 100).toFixed(1)}%`
                    : '0%'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {totais.saldo >= 0 ? 'Positiva' : 'Negativa'}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-600">Taxa de Inadimplência</p>
              <p className="text-xl font-bold text-amber-700 mt-1">
                {loading ? '...' : `${inadimplencia.taxa.toFixed(1)}%`}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {loading ? '' : formatCurrency(inadimplencia.valor)} em atraso
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-600">Ticket Médio</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">
                {loading
                  ? '...'
                  : relatorioData.length > 0
                    ? formatCurrency(totais.receitas / relatorioData.length)
                    : formatCurrency(0)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Por período</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-600">Crescimento</p>
              <p
                className={cn(
                  'text-xl font-bold mt-1',
                  crescimento >= 0 ? 'text-emerald-700' : 'text-red-700'
                )}
              >
                {loading ? '...' : `${crescimento >= 0 ? '+' : ''}${crescimento.toFixed(1)}%`}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">vs período anterior</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
