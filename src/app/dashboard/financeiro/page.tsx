'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight, Target, Building2, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import MetricCard from '@/components/dashboard/MetricCard'
import InsightCard from '@/components/dashboard/InsightCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
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

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    receita_mes: 0,
    despesas_mes: 0,
    pendente_receber: 0,
    atrasado: 0,
    lucro_mes: 0,
    variacao_receita: 0,
    variacao_lucro: 0,
    taxa_inadimplencia: 0,
  })

  const [contasProximas, setContasProximas] = useState<ContaProxima[]>([])
  const [chartData, setChartData] = useState<{ mes: string; receitas: number; despesas: number }[]>([])

  // Estado para navegação de mês
  const [mesSelecionado, setMesSelecionado] = useState<Date>(new Date())

  // Estados para multi-escritório (grupo)
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  // Funções de navegação de mês
  const irMesAnterior = () => setMesSelecionado(prev => subMonths(prev, 1))
  const irProximoMes = () => setMesSelecionado(prev => addMonths(prev, 1))
  const irMesAtual = () => setMesSelecionado(new Date())
  const mesNomeRaw = format(mesSelecionado, "MMMM 'de' yyyy", { locale: ptBR })
  const mesNome = mesNomeRaw.charAt(0).toUpperCase() + mesNomeRaw.slice(1)
  const isMesAtual = isSameMonth(mesSelecionado, new Date())

  // Carregar escritórios do grupo (com todos selecionados por padrão)
  useEffect(() => {
    const loadEscritoriosGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
        // Iniciar com TODOS selecionados (visão consolidada padrão)
        if (escritorios.length > 0) {
          setEscritoriosSelecionados(escritorios.map(e => e.id))
        }
      } catch (error) {
        console.error('Erro ao carregar escritórios do grupo:', error)
      }
    }
    loadEscritoriosGrupo()
  }, [])

  // Funções do seletor de escritórios
  const toggleEscritorio = (escritorioId: string) => {
    setEscritoriosSelecionados(prev => {
      if (prev.includes(escritorioId)) {
        if (prev.length === 1) return prev
        return prev.filter(id => id !== escritorioId)
      } else {
        return [...prev, escritorioId]
      }
    })
  }

  const selecionarTodos = () => {
    setEscritoriosSelecionados(escritoriosGrupo.map(e => e.id))
  }

  const selecionarApenas = (escritorioId: string) => {
    setEscritoriosSelecionados([escritorioId])
  }

  const getSeletorLabel = () => {
    if (escritoriosSelecionados.length === escritoriosGrupo.length) {
      return 'Todos os escritórios'
    } else if (escritoriosSelecionados.length === 1) {
      const escritorio = escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])
      return escritorio?.nome || 'Escritório'
    } else {
      return `${escritoriosSelecionados.length} escritórios`
    }
  }

  // Obter IDs dos escritórios para query
  const getEscritorioIds = useCallback((): string[] => {
    return escritoriosSelecionados.length > 0 ? escritoriosSelecionados : []
  }, [escritoriosSelecionados])

  useEffect(() => {
    if (escritoriosSelecionados.length > 0) {
      loadMetrics()
      loadContasProximas()
      loadChartData()
      loadInadimplencia()
    }
  }, [escritoriosSelecionados, mesSelecionado])

  const loadMetrics = async () => {
    if (!escritorioAtivo) return

    const escritorioIds = getEscritorioIds()
    if (escritorioIds.length === 0) return

    try {
      // Calcular métricas usando o mês selecionado
      const inicioMes = format(startOfMonth(mesSelecionado), 'yyyy-MM-dd')
      const fimMes = format(endOfMonth(mesSelecionado), 'yyyy-MM-dd')

      // Mês anterior para calcular variação
      const mesAnterior = subMonths(mesSelecionado, 1)
      const inicioMesAnterior = format(startOfMonth(mesAnterior), 'yyyy-MM-dd')
      const fimMesAnterior = format(endOfMonth(mesAnterior), 'yyyy-MM-dd')

      // Buscar receitas do mês atual (pagas) - inclui valor para casos onde valor_pago não foi preenchido
      const { data: receitasMes } = await supabase
        .from('financeiro_receitas')
        .select('valor, valor_pago')
        .in('escritorio_id', escritorioIds)
        .eq('status', 'pago')
        .gte('data_pagamento', inicioMes)
        .lte('data_pagamento', fimMes)

      // Buscar despesas do mês atual (pagas)
      const { data: despesasMes } = await supabase
        .from('financeiro_despesas')
        .select('valor')
        .in('escritorio_id', escritorioIds)
        .eq('status', 'pago')
        .gte('data_pagamento', inicioMes)
        .lte('data_pagamento', fimMes)

      // Buscar receitas do mês anterior para variação
      const { data: receitasMesAnterior } = await supabase
        .from('financeiro_receitas')
        .select('valor, valor_pago')
        .in('escritorio_id', escritorioIds)
        .eq('status', 'pago')
        .gte('data_pagamento', inicioMesAnterior)
        .lte('data_pagamento', fimMesAnterior)

      // Garantir que são arrays
      const receitasMesArray = Array.isArray(receitasMes) ? receitasMes : []
      const despesasMesArray = Array.isArray(despesasMes) ? despesasMes : []
      const receitasMesAnteriorArray = Array.isArray(receitasMesAnterior) ? receitasMesAnterior : []

      // Calcular totais (usa valor_pago se preenchido, senão usa valor)
      const getValorReceita = (r: { valor?: number; valor_pago?: number }) => {
        const vp = Number(r.valor_pago) || 0
        return vp > 0 ? vp : Number(r.valor) || 0
      }
      const totalReceitaMes = receitasMesArray.reduce((sum, r) => sum + getValorReceita(r), 0)
      const totalDespesasMes = despesasMesArray.reduce((sum, d) => sum + (Number(d.valor) || 0), 0)
      const totalReceitaMesAnterior = receitasMesAnteriorArray.reduce((sum, r) => sum + getValorReceita(r), 0)

      // Calcular variação
      const variacaoReceita = totalReceitaMesAnterior > 0
        ? ((totalReceitaMes - totalReceitaMesAnterior) / totalReceitaMesAnterior) * 100
        : 0

      const lucroMes = totalReceitaMes - totalDespesasMes
      const lucroMesAnterior = totalReceitaMesAnterior - totalDespesasMes // Simplificado
      const variacaoLucro = lucroMesAnterior !== 0
        ? ((lucroMes - lucroMesAnterior) / Math.abs(lucroMesAnterior)) * 100
        : 0

      setMetrics({
        receita_mes: totalReceitaMes,
        despesas_mes: totalDespesasMes,
        pendente_receber: 0, // Será calculado em loadInadimplencia
        atrasado: 0, // Será calculado em loadInadimplencia
        lucro_mes: lucroMes,
        variacao_receita: variacaoReceita,
        variacao_lucro: variacaoLucro,
        taxa_inadimplencia: 0, // Será calculado em loadInadimplencia
      })
    } catch (error) {
      console.error('Erro ao carregar métricas:', error instanceof Error ? error.message : error)
    }
  }

  const loadContasProximas = async () => {
    if (!escritorioAtivo) return

    const escritorioIds = getEscritorioIds()
    if (escritorioIds.length === 0) return

    try {
      // Se é o mês atual, busca próximos 7 dias. Senão, busca todo o mês selecionado
      const inicioMes = format(startOfMonth(mesSelecionado), 'yyyy-MM-dd')
      const fimMes = format(endOfMonth(mesSelecionado), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('v_contas_receber_pagar')
        .select('id, tipo_conta, descricao, valor, data_vencimento, status, dias_atraso, cliente_fornecedor')
        .in('escritorio_id', escritorioIds)
        .gte('data_vencimento', inicioMes)
        .lte('data_vencimento', fimMes)
        .order('data_vencimento', { ascending: true })
        .limit(10)

      if (error) throw error

      const contas: ContaProxima[] = (data || []).map((c: {
        id: string
        tipo_conta: string
        descricao: string | null
        valor: number | null
        data_vencimento: string | null
        status: string | null
        dias_atraso: number | null
        cliente_fornecedor: string | null
      }) => {
        const vencimento = c.data_vencimento || ''
        const diasAteVencimento = vencimento
          ? differenceInDays(parseISO(vencimento), new Date())
          : 0

        return {
          id: c.id,
          tipo: c.tipo_conta as 'receber' | 'pagar',
          descricao: c.descricao || c.cliente_fornecedor || 'Sem descrição',
          valor: Number(c.valor) || 0,
          vencimento,
          dias_ate_vencimento: diasAteVencimento,
          status: (c.status === 'atrasado' || diasAteVencimento < 0) ? 'atrasado' : 'pendente',
        }
      })

      setContasProximas(contas)
    } catch (error) {
      console.error('Erro ao carregar contas próximas:', error instanceof Error ? error.message : error)
      setContasProximas([])
    }
  }

  // ATUALIZADO: Agora busca direto de receitas/despesas (fonte única de verdade)
  const loadChartData = async () => {
    if (!escritorioAtivo) return

    const escritorioIds = getEscritorioIds()
    if (escritorioIds.length === 0) return

    try {
      // Buscar dados dos 6 meses terminando no mês selecionado
      const dataInicio = subMonths(startOfMonth(mesSelecionado), 5)
      const dataInicioStr = format(dataInicio, 'yyyy-MM-dd')
      const dataFimStr = format(endOfMonth(mesSelecionado), 'yyyy-MM-dd')

      // Buscar receitas pagas (incluindo valor para casos onde valor_pago não foi preenchido)
      const { data: receitas, error: errReceitas } = await supabase
        .from('financeiro_receitas')
        .select('valor, valor_pago, data_pagamento')
        .in('escritorio_id', escritorioIds)
        .eq('status', 'pago')
        .gte('data_pagamento', dataInicioStr)
        .lte('data_pagamento', dataFimStr)

      // Buscar despesas pagas
      const { data: despesas, error: errDespesas } = await supabase
        .from('financeiro_despesas')
        .select('valor, data_pagamento')
        .in('escritorio_id', escritorioIds)
        .eq('status', 'pago')
        .gte('data_pagamento', dataInicioStr)
        .lte('data_pagamento', dataFimStr)

      if (errReceitas) throw errReceitas
      if (errDespesas) throw errDespesas

      // Garantir que os dados são arrays
      const receitasArray = Array.isArray(receitas) ? receitas : []
      const despesasArray = Array.isArray(despesas) ? despesas : []

      // Agrupar por mês
      const porMes: Record<string, { receitas: number; despesas: number }> = {}

      // Inicializar 6 meses terminando no mês selecionado
      for (let i = 5; i >= 0; i--) {
        const mes = subMonths(mesSelecionado, i)
        const chave = format(mes, 'yyyy-MM')
        porMes[chave] = { receitas: 0, despesas: 0 }
      }

      // Somar receitas por mês (usa valor_pago se preenchido, senão usa valor)
      receitasArray.forEach((r) => {
        if (!r.data_pagamento) return
        const chave = r.data_pagamento.substring(0, 7)
        if (porMes[chave]) {
          const valorRecebido = (Number(r.valor_pago) || 0) > 0 ? Number(r.valor_pago) : Number(r.valor) || 0
          porMes[chave].receitas += valorRecebido
        }
      })

      // Somar despesas por mês
      despesasArray.forEach((d) => {
        if (!d.data_pagamento) return
        const chave = d.data_pagamento.substring(0, 7)
        if (porMes[chave]) {
          porMes[chave].despesas += Number(d.valor) || 0
        }
      })

      // Formatar para o gráfico
      const formatted = Object.entries(porMes).map(([chave, valores]) => ({
        mes: format(parseISO(chave + '-01'), 'MMM', { locale: ptBR }),
        receitas: valores.receitas,
        despesas: valores.despesas,
      }))

      setChartData(formatted)
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error instanceof Error ? error.message : error)
      setChartData([])
    }
  }

  const loadInadimplencia = async () => {
    if (!escritorioAtivo) return

    const escritorioIds = getEscritorioIds()
    if (escritorioIds.length === 0) return

    try {
      // Buscar receitas pendentes e atrasadas com vencimento no mês selecionado
      const inicioMes = format(startOfMonth(mesSelecionado), 'yyyy-MM-dd')
      const fimMes = format(endOfMonth(mesSelecionado), 'yyyy-MM-dd')

      const { data: receitas, error } = await supabase
        .from('financeiro_receitas')
        .select('valor, valor_pago, status')
        .in('escritorio_id', escritorioIds)
        .in('status', ['pendente', 'atrasado', 'parcial'])
        .gte('data_vencimento', inicioMes)
        .lte('data_vencimento', fimMes)

      if (error) throw error

      // Garantir que os dados são arrays
      const receitasArray = Array.isArray(receitas) ? receitas : []

      const totalPendente = receitasArray.reduce(
        (sum, r) => sum + (Number(r.valor) || 0) - (Number(r.valor_pago) || 0),
        0
      )
      const totalAtrasado = receitasArray
        .filter((r) => r.status === 'atrasado')
        .reduce((sum, r) => sum + (Number(r.valor) || 0) - (Number(r.valor_pago) || 0), 0)

      const taxa = totalPendente > 0 ? (totalAtrasado / totalPendente) * 100 : 0

      setMetrics((prev) => ({
        ...prev,
        taxa_inadimplencia: taxa,
        atrasado: totalAtrasado,
        pendente_receber: totalPendente,
      }))
    } catch (error) {
      console.error('Erro ao carregar inadimplência:', error instanceof Error ? error.message : error)
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

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#34495e]">Dashboard Financeiro</h1>
            <p className="text-xs md:text-sm text-slate-600 mt-1">
              {escritoriosSelecionados.length === escritoriosGrupo.length && escritoriosGrupo.length > 1
                ? 'Visão consolidada de todos os escritórios do grupo'
                : 'Visão geral das finanças do escritório'}
            </p>
          </div>

          {/* Seletor de Escritórios */}
          {escritoriosGrupo.length > 1 && (
            <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-200 bg-white hover:bg-slate-50"
                >
                  <Building2 className="h-4 w-4 mr-2 text-[#34495e]" />
                  <span className="text-sm">{getSeletorLabel()}</span>
                  <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                <div className="space-y-1">
                  {/* Opção: Todos */}
                  <button
                    onClick={selecionarTodos}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      escritoriosSelecionados.length === escritoriosGrupo.length
                        ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]'
                        : 'hover:bg-slate-100 text-slate-700'
                    )}
                  >
                    <span className="font-medium">Todos os escritórios</span>
                    {escritoriosSelecionados.length === escritoriosGrupo.length && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>

                  <div className="h-px bg-slate-200 my-2" />

                  {/* Lista de escritórios */}
                  {escritoriosGrupo.map((escritorio) => (
                    <div
                      key={escritorio.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      <Checkbox
                        id={`esc-${escritorio.id}`}
                        checked={escritoriosSelecionados.includes(escritorio.id)}
                        onCheckedChange={() => toggleEscritorio(escritorio.id)}
                      />
                      <label
                        htmlFor={`esc-${escritorio.id}`}
                        className="flex-1 text-sm text-slate-700 cursor-pointer"
                      >
                        {escritorio.nome}
                      </label>
                      <button
                        onClick={() => selecionarApenas(escritorio.id)}
                        className="text-[10px] text-[#1E3A8A] hover:underline"
                      >
                        apenas
                      </button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Navegador de Mês - Minimalista */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={irMesAnterior}
            className="h-8 w-8 p-0 text-slate-400 hover:text-[#34495e] hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            onClick={irMesAtual}
            className={cn(
              "text-sm font-medium px-3 py-1 rounded-md transition-colors",
              isMesAtual
                ? "text-[#34495e]"
                : "text-[#1E3A8A] hover:bg-[#1E3A8A]/5 cursor-pointer"
            )}
            title={!isMesAtual ? "Clique para voltar ao mês atual" : undefined}
          >
            {mesNome}
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={irProximoMes}
            className="h-8 w-8 p-0 text-slate-400 hover:text-[#34495e] hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* KPIs Top Row - 4 cards estratégicos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
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
                <span className="text-lg md:text-2xl font-bold text-white">
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

        {/* Grid Principal - 3 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">

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
                      labelStyle={{ color: '#34495e', fontWeight: 600, fontSize: '12px' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const receitas = payload.find(p => p.dataKey === 'receitas')?.value || 0
                          const despesas = payload.find(p => p.dataKey === 'despesas')?.value || 0
                          return (
                            <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                              <p className="text-xs font-semibold text-[#34495e] mb-2">{label}</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#89bcbe]" />
                                  <span className="text-xs text-slate-600">Receitas:</span>
                                  <span className="text-xs font-semibold text-[#34495e]">{formatCurrency(Number(receitas))}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#46627f]" />
                                  <span className="text-xs text-slate-600">Despesas:</span>
                                  <span className="text-xs font-semibold text-[#34495e]">{formatCurrency(Number(despesas))}</span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      iconType="circle"
                      formatter={(value) => value === 'despesas' ? 'Despesas' : 'Receitas'}
                    />
                    <Bar
                      dataKey="despesas"
                      fill="#46627f"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                    <Bar
                      dataKey="receitas"
                      fill="#89bcbe"
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
            {/* Resumo do Mês */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium text-slate-700">
                  Resumo de {format(mesSelecionado, 'MMMM', { locale: ptBR })}
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
                      Recebimentos
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
                              {conta.vencimento ? format(parseISO(conta.vencimento), 'dd/MM/yyyy') : '-'}
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
                      Despesas a Pagar
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
                              {conta.vencimento ? format(parseISO(conta.vencimento), 'dd/MM/yyyy') : '-'}
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
  )
}
