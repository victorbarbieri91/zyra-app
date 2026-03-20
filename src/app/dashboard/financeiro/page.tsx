'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react'
import { format, addMonths, subMonths, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ReceitasDespesasChart = dynamic(
  () => import('@/components/financeiro/ReceitasDespesasChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
const FluxoCaixaChart = dynamic(
  () => import('@/components/financeiro/FluxoCaixaChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { useFinanceiroDashboard } from '@/hooks/useFinanceiroDashboard'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { cn, formatHoras } from '@/lib/utils'

// ---------- Helpers ----------

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value)

function ChartSkeleton() {
  return <div className="w-full h-[260px] bg-slate-100 dark:bg-surface-2 animate-pulse rounded-lg" />
}

// ---------- KPI Card Component (inline, sem ícones) ----------

interface KpiCardProps {
  label: string
  value: string
  trend?: string
  gradientLight: string  // from-[...] to-[...]
  gradientDark: string   // dark:from-[...] dark:to-[...]
  className?: string
}

function KpiCard({ label, value, trend, gradientLight, gradientDark, className }: KpiCardProps) {
  return (
    <div className={cn(
      'rounded-xl p-3 md:p-4 bg-gradient-to-br shadow-sm hover:shadow-md transition-all duration-200',
      gradientLight,
      gradientDark,
      className,
    )}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
        {label}
      </p>
      <p className="text-lg md:text-xl font-bold text-white mt-1 tabular-nums leading-tight">
        {value}
      </p>
      {trend && (
        <p className="text-[10px] text-white/60 mt-0.5">{trend}</p>
      )}
    </div>
  )
}

// ---------- Component ----------

export default function FinanceiroDashboard() {
  // Mês
  const [mesSelecionado, setMesSelecionado] = useState<Date>(new Date())
  const irMesAnterior = () => setMesSelecionado(prev => subMonths(prev, 1))
  const irProximoMes = () => setMesSelecionado(prev => addMonths(prev, 1))
  const irMesAtual = () => setMesSelecionado(new Date())
  const mesNomeRaw = format(mesSelecionado, "MMMM 'de' yyyy", { locale: ptBR })
  const mesNome = mesNomeRaw.charAt(0).toUpperCase() + mesNomeRaw.slice(1)
  const isMesAtual = isSameMonth(mesSelecionado, new Date())

  // Multi-escritório
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  useEffect(() => {
    const loadGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
        if (escritorios.length > 0) setEscritoriosSelecionados(escritorios.map(e => e.id))
      } catch (error) {
        console.error('Erro ao carregar escritórios do grupo:', error)
      }
    }
    loadGrupo()
  }, [])

  const toggleEscritorio = (id: string) => {
    setEscritoriosSelecionados(prev => {
      if (prev.includes(id)) return prev.length === 1 ? prev : prev.filter(x => x !== id)
      return [...prev, id]
    })
  }
  const selecionarTodos = () => setEscritoriosSelecionados(escritoriosGrupo.map(e => e.id))
  const selecionarApenas = (id: string) => setEscritoriosSelecionados([id])
  const getSeletorLabel = () => {
    if (escritoriosSelecionados.length === escritoriosGrupo.length) return 'Todos os escritórios'
    if (escritoriosSelecionados.length === 1) return escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])?.nome || 'Escritório'
    return `${escritoriosSelecionados.length} escritórios`
  }

  // Dados
  const data = useFinanceiroDashboard({ escritorioIds: escritoriosSelecionados, mes: mesSelecionado })

  // Trend helpers
  const receitaTrend = data.variacaoReceita !== 0
    ? `${data.variacaoReceita >= 0 ? '+' : ''}${data.variacaoReceita.toFixed(1)}% vs mês anterior`
    : undefined

  const lucroTrend = data.variacaoLucro !== 0
    ? `${data.variacaoLucro >= 0 ? '+' : ''}${data.variacaoLucro.toFixed(1)}% • ${data.lucroMes >= 0 ? 'Positivo' : 'Negativo'}`
    : data.lucroMes >= 0 ? 'Positivo' : 'Negativo'

  const mesResumo = format(mesSelecionado, 'MMMM', { locale: ptBR })

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#34495e] dark:text-slate-200">
            Dashboard Financeiro
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {escritoriosSelecionados.length === escritoriosGrupo.length && escritoriosGrupo.length > 1
              ? 'Visão consolidada de todos os escritórios do grupo'
              : 'Visão geral das finanças do escritório'}
          </p>
        </div>

        {escritoriosGrupo.length > 1 && (
          <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-1 hover:bg-slate-50 dark:hover:bg-surface-2">
                <Building2 className="h-4 w-4 mr-2 text-[#34495e] dark:text-slate-200" />
                <span className="text-sm">{getSeletorLabel()}</span>
                <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
              <div className="space-y-1">
                <button
                  onClick={selecionarTodos}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                    escritoriosSelecionados.length === escritoriosGrupo.length
                      ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] dark:text-blue-400'
                      : 'hover:bg-slate-100 dark:hover:bg-surface-3 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <span className="font-medium">Todos os escritórios</span>
                  {escritoriosSelecionados.length === escritoriosGrupo.length && <Check className="h-4 w-4" />}
                </button>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                {escritoriosGrupo.map(esc => (
                  <div key={esc.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-surface-2">
                    <Checkbox id={`esc-${esc.id}`} checked={escritoriosSelecionados.includes(esc.id)} onCheckedChange={() => toggleEscritorio(esc.id)} />
                    <label htmlFor={`esc-${esc.id}`} className="flex-1 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">{esc.nome}</label>
                    <button onClick={() => selecionarApenas(esc.id)} className="text-[10px] text-[#1E3A8A] hover:underline">apenas</button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* ═══ NAVEGADOR DE MÊS ═══ */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="sm" onClick={irMesAnterior} className="h-8 w-8 p-0 text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-3">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={irMesAtual}
          className={cn(
            'text-sm font-medium px-3 py-1 rounded-md transition-colors',
            isMesAtual ? 'text-[#34495e] dark:text-slate-200' : 'text-[#1E3A8A] dark:text-blue-400 hover:bg-[#1E3A8A]/5 cursor-pointer'
          )}
          title={!isMesAtual ? 'Clique para voltar ao mês atual' : undefined}
        >
          {mesNome}
        </button>
        <Button variant="ghost" size="sm" onClick={irProximoMes} className="h-8 w-8 p-0 text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-3">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ═══ ROW 1: 4 KPIs FINANCEIROS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Receita"
          value={formatCurrency(data.receitaMes)}
          trend={receitaTrend}
          gradientLight="from-[#364c5e] to-[#49667e]"
          gradientDark="dark:from-[#26323b] dark:to-[#303f4b]"
        />
        <KpiCard
          label="Lucro do Mês"
          value={formatCurrency(data.lucroMes)}
          trend={lucroTrend}
          gradientLight="from-[#34654e] to-[#458768]"
          gradientDark="dark:from-[#254134] dark:to-[#2f5141]"
        />
        <KpiCard
          label="Margem de Lucro"
          value={data.margemLucro.toFixed(1) + '%'}
          trend="sobre faturamento"
          gradientLight="from-[#507486] to-[#668fa3]"
          gradientDark="dark:from-[#415762] dark:to-[#4b6571]"
        />
        <KpiCard
          label="Faturas em Atraso"
          value={formatCurrency(data.totalAtrasado)}
          trend={data.totalAtrasado > 0 ? 'vencidas e não pagas' : 'nenhuma fatura atrasada'}
          gradientLight="from-[#7c5c46] to-[#9d7558]"
          gradientDark="dark:from-[#584537] dark:to-[#685141]"
        />
      </div>

      {/* ═══ ROW 2: 4 KPIs OPERACIONAIS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Horas Trabalhadas"
          value={formatHoras(data.horasTrabalhadasMes, 'curto')}
          trend="no período"
          gradientLight="from-[#5a898c] to-[#73a3a5]"
          gradientDark="dark:from-[#4a6768] dark:to-[#557677]"
        />
        <KpiCard
          label="Horas Faturáveis"
          value={formatHoras(data.horasFaturaveisMes, 'curto')}
          trend={`${formatCurrency(data.valorHorasFaturaveis)} em valor`}
          gradientLight="from-[#407377] to-[#529398]"
          gradientDark="dark:from-[#325053] dark:to-[#3b6063]"
        />
        <KpiCard
          label={`Saldo Previsto`}
          value={formatCurrency(data.saldoMes)}
          trend={`de ${mesResumo}`}
          gradientLight={data.saldoMes >= 0 ? 'from-[#4a5e80] to-[#5d74a0]' : 'from-[#7e4444] to-[#9f5656]'}
          gradientDark={data.saldoMes >= 0 ? 'dark:from-[#2e3a52] dark:to-[#3a4a68]' : 'dark:from-[#593636] dark:to-[#693f3f]'}
        />
        <KpiCard
          label="Faturamento Pendente"
          value={formatCurrency(data.valorProntoFaturar)}
          trend={`${data.itensProntosFaturar} itens prontos`}
          gradientLight="from-[#5c5277] to-[#746a94]"
          gradientDark="dark:from-[#3d3650] dark:to-[#4a4262]"
        />
      </div>

      {/* ═══ ROW 3: GRÁFICOS LADO A LADO ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Receitas vs Despesas
            </CardTitle>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Últimos 6 meses — valores pagos</p>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            {data.loadingChart ? <ChartSkeleton /> : <ReceitasDespesasChart data={data.chartData} />}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Fluxo de Caixa
            </CardTitle>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Projeção 6 meses — inclui recorrências</p>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            {data.loadingFluxo ? <ChartSkeleton /> : <FluxoCaixaChart data={data.fluxoCaixaData} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
