'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Briefcase,
  Users,
  FileText,
  Calendar,
  Clock,
  Target,
  Sparkles,
  RefreshCw,
  Loader2,
  Search,
  MessageSquare,
  Building2,
  ChevronDown,
  Check,
  Bell,
  FileBarChart,
  Plus,
  CheckSquare,
  Scale,
} from 'lucide-react'
import { formatCurrency, formatHoras } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Custom components
import MetricCard from '@/components/dashboard/MetricCard'
import InsightCard from '@/components/dashboard/InsightCard'
import EmptyState from '@/components/dashboard/EmptyState'
import AlertasCard from '@/components/dashboard/AlertasCard'

// Modais de ações rápidas
import TarefaWizard from '@/components/agenda/TarefaWizard'
import { ConsultaWizardModal } from '@/components/consultivo/ConsultaWizardModal'
import ProcessoWizard from '@/components/processos/ProcessoWizard'
import TimesheetModal from '@/components/financeiro/TimesheetModal'

// Hooks de dados reais
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useDashboardAgenda } from '@/hooks/useDashboardAgenda'
import { useDashboardPerformance } from '@/hooks/useDashboardPerformance'
import { useDashboardPublicacoes } from '@/hooks/useDashboardPublicacoes'
import { useDashboardResumoIA } from '@/hooks/useDashboardResumoIA'
import { useDashboardInsightsIA } from '@/hooks/useDashboardInsightsIA'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const { escritorioAtivo } = useEscritorioAtivo()

  // Estado do modal de comando IA
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandInput, setCommandInput] = useState('')

  // Estados para modais de ações rápidas
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false)
  const [consultaModalOpen, setConsultaModalOpen] = useState(false)
  const [processoModalOpen, setProcessoModalOpen] = useState(false)
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false)

  // Estados para multi-escritório
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

  // Carregar escritórios do grupo
  useEffect(() => {
    const loadEscritoriosGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
        // Iniciar com todos os escritórios selecionados (visão consolidada)
        if (escritorios.length > 0) {
          setEscritoriosSelecionados(escritorios.map(e => e.id))
        }
      } catch (error) {
        console.error('Erro ao carregar escritórios do grupo:', error)
      }
    }
    loadEscritoriosGrupo()
  }, [])

  // Funções de seleção
  const toggleEscritorio = (id: string) => {
    setEscritoriosSelecionados(prev => {
      if (prev.includes(id)) {
        // Não permitir desmarcar se for o único selecionado
        if (prev.length === 1) return prev
        return prev.filter(e => e !== id)
      }
      return [...prev, id]
    })
  }

  const selecionarTodos = () => {
    setEscritoriosSelecionados(escritoriosGrupo.map(e => e.id))
  }

  const selecionarApenas = (id: string) => {
    setEscritoriosSelecionados([id])
  }

  // Texto do botão do seletor
  const getSeletorLabel = () => {
    if (escritoriosSelecionados.length === 0) return 'Selecione'
    if (escritoriosSelecionados.length === escritoriosGrupo.length) return 'Todos os escritórios'
    if (escritoriosSelecionados.length === 1) {
      const escritorio = escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])
      return escritorio?.nome || 'Escritório'
    }
    return `${escritoriosSelecionados.length} escritórios`
  }

  // Hooks de dados
  const { metrics, loading: loadingMetrics, isEmpty: isMetricsEmpty } = useDashboardMetrics()
  const { items: agendaItems, loading: loadingAgenda, isEmpty: isAgendaEmpty, audienciasHoje, prazosHoje } = useDashboardAgenda()
  const { equipe, areas, topClientes, totalHorasEquipe, totalAReceber, taxaInadimplencia, currentUserId, currentUserPosition, loading: loadingPerformance, isEmpty: isPerformanceEmpty } = useDashboardPerformance()
  const { publicacoes, loading: loadingPublicacoes, isEmpty: isPublicacoesEmpty, urgentes: publicacoesUrgentes } = useDashboardPublicacoes()
  const { resumo, loading: loadingResumo, refresh: refreshResumo, tempoDesdeAtualizacao } = useDashboardResumoIA()
  const { insights, loading: loadingInsights, hasPermission: hasInsightsPermission, refresh: refreshInsights } = useDashboardInsightsIA()

  // Calcular progresso
  const progressoReceita = ((metrics?.receita_mes || 0) / (metrics?.receita_meta || 1)) * 100
  const progressoHoras = ((metrics?.horas_faturadas_mes || 0) / (metrics?.horas_meta || 1)) * 100

  // Loading geral
  const isLoading = loadingMetrics && loadingAgenda && loadingResumo

  // Atalhos do Comando IA
  const commandShortcuts = [
    { label: 'Nova Audiência', icon: Calendar, action: () => router.push('/dashboard/agenda') },
    { label: 'Novo Processo', icon: Briefcase, action: () => router.push('/dashboard/processos?novo=true') },
    { label: 'Novo Cliente', icon: Users, action: () => router.push('/dashboard/crm/pessoas/novo') },
    { label: 'Ver Publicações', icon: Bell, action: () => router.push('/dashboard/publicacoes') },
    { label: 'Registrar Horas', icon: Clock, action: () => router.push('/dashboard/financeiro/timesheet') },
    { label: 'Ver Relatórios', icon: FileBarChart, action: () => router.push('/dashboard/financeiro/relatorios') },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#89bcbe] animate-spin" />
          <p className="text-sm text-[#6c757d]">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#34495e]">
              Dashboard
            </h1>
            <p className="text-sm text-[#6c757d] mt-0.5 font-normal">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Seletor de Escritórios - só aparece se tem mais de 1 no grupo */}
          {escritoriosGrupo.length > 1 && (
            <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 px-3 gap-2 border-slate-200 hover:bg-slate-50",
                    escritoriosSelecionados.length === escritoriosGrupo.length && "border-[#89bcbe] bg-[#f0f9f9]/50"
                  )}
                >
                  <Building2 className="h-4 w-4 text-[#89bcbe]" />
                  <span className="text-sm text-[#34495e] font-medium">
                    {getSeletorLabel()}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <div className="p-3 border-b border-slate-100">
                  <p className="text-xs font-medium text-[#34495e]">Visualizar dados de:</p>
                </div>

                {/* Opção "Todos" */}
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100",
                    escritoriosSelecionados.length === escritoriosGrupo.length && "bg-[#f0f9f9]"
                  )}
                  onClick={selecionarTodos}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    escritoriosSelecionados.length === escritoriosGrupo.length
                      ? "bg-[#89bcbe] border-[#89bcbe]"
                      : "border-slate-300"
                  )}>
                    {escritoriosSelecionados.length === escritoriosGrupo.length && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#34495e]">Todos os escritórios</p>
                    <p className="text-[10px] text-slate-500">Visão consolidada do grupo</p>
                  </div>
                </div>

                {/* Lista de escritórios */}
                <div className="max-h-64 overflow-y-auto">
                  {escritoriosGrupo.map((escritorio) => {
                    const isSelected = escritoriosSelecionados.includes(escritorio.id)
                    const isAtivo = escritorio.id === escritorioAtivo

                    return (
                      <div
                        key={escritorio.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0",
                          isSelected && escritoriosSelecionados.length < escritoriosGrupo.length && "bg-[#f0f9f9]/50"
                        )}
                        onClick={() => toggleEscritorio(escritorio.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEscritorio(escritorio.id)}
                          className="data-[state=checked]:bg-[#89bcbe] data-[state=checked]:border-[#89bcbe]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#34495e] truncate">
                              {escritorio.nome}
                            </p>
                            {isAtivo && (
                              <span className="text-[9px] font-medium text-[#89bcbe] bg-[#89bcbe]/10 px-1.5 py-0.5 rounded">
                                Atual
                              </span>
                            )}
                          </div>
                          {escritorio.cnpj && (
                            <p className="text-[10px] text-slate-400 truncate">
                              {escritorio.cnpj}
                            </p>
                          )}
                        </div>
                        {/* Botão "Apenas este" */}
                        {escritoriosSelecionados.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              selecionarApenas(escritorio.id)
                            }}
                            className="text-[10px] text-[#89bcbe] hover:text-[#6ba9ab] hover:underline whitespace-nowrap"
                          >
                            Apenas
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Rodapé com info */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                  <p className="text-[10px] text-slate-500 text-center">
                    {escritoriosSelecionados.length === 1
                      ? 'Exibindo dados de 1 escritório'
                      : `Exibindo dados consolidados de ${escritoriosSelecionados.length} escritórios`}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Modal Comando IA */}
        <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#89bcbe]" />
                Comando IA
              </DialogTitle>
              <DialogDescription>
                Digite um comando ou escolha uma ação rápida abaixo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c757d]" />
                <Input
                  placeholder="O que você gostaria de fazer?"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-[#6c757d] mb-2 font-medium">Ações rápidas</p>
                <div className="grid grid-cols-2 gap-2">
                  {commandShortcuts.map((shortcut) => (
                    <button
                      key={shortcut.label}
                      onClick={() => {
                        shortcut.action()
                        setCommandOpen(false)
                      }}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-[#f0f9f9] hover:border-[#89bcbe] transition-colors text-left"
                    >
                      <shortcut.icon className="w-4 h-4 text-[#89bcbe]" />
                      <span className="text-sm text-[#34495e]">{shortcut.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 text-xs text-[#adb5bd]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Pressione <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Ctrl+K</kbd> para abrir a qualquer momento</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* LINHA 1: Agenda + Resumo IA + KPIs (alinhados horizontalmente) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch mb-4">
          {/* Agenda de Hoje */}
          <div className="lg:col-span-3">
            <Card className="border-[#89bcbe] shadow-sm bg-gradient-to-br from-white to-[#f0f9f9]/30 h-full">
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#34495e]">
                    <Calendar className="w-4 h-4 text-[#89bcbe]" />
                    Agenda de Hoje
                  </CardTitle>
                  <Link href="/dashboard/agenda">
                    <Button variant="ghost" size="sm" className="text-[10px] text-[#89bcbe] hover:text-[#6ba9ab] h-5 px-1.5">
                      Ver →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-5 px-5">
                {loadingAgenda ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 text-[#89bcbe] animate-spin" />
                  </div>
                ) : isAgendaEmpty ? (
                  <p className="text-[11px] text-[#9ca3af] text-center py-2">Nenhum compromisso</p>
                ) : (
                  <div className="space-y-1">
                    {agendaItems.slice(0, 3).map((event) => {
                      const tipoConfig: Record<string, { label: string; color: string }> = {
                        audiencia: { label: 'Aud', color: 'text-red-600' },
                        prazo: { label: 'Prazo', color: 'text-amber-600' },
                        tarefa: { label: 'Tarefa', color: 'text-slate-500' },
                        evento: { label: 'Comp', color: 'text-blue-600' },
                      }
                      const config = tipoConfig[event.tipo] || tipoConfig.evento
                      const temHorario = event.tipo !== 'tarefa' && event.time && event.time !== 'Dia todo'

                      return (
                        <div key={event.id} className="flex items-center gap-2">
                          <span className={`text-[9px] font-semibold w-[34px] flex-shrink-0 ${config.color}`}>
                            {config.label}
                          </span>
                          <p className="text-[11px] text-[#34495e] flex-1 truncate">
                            {event.title}
                          </p>
                          {temHorario && (
                            <span className="text-[9px] text-[#adb5bd] tabular-nums flex-shrink-0">
                              {event.time}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumo do Dia (IA) */}
          <div className="lg:col-span-5">
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/30 h-full">
              <CardHeader className="pb-2 pt-6 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#34495e]">
                    <Sparkles className="w-4 h-4 text-[#89bcbe]" />
                    {loadingResumo ? 'Carregando...' : resumo.saudacao}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#adb5bd]">
                      {loadingResumo ? '' : tempoDesdeAtualizacao}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => refreshResumo()}
                      disabled={loadingResumo}
                    >
                      <RefreshCw className={cn("w-3 h-3 text-[#89bcbe]", loadingResumo && "animate-spin")} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-6 px-6">
                {loadingResumo ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-[#89bcbe] animate-spin" />
                    <span className="text-xs text-[#6c757d]">Analisando seu dia...</span>
                  </div>
                ) : (
                  <p className="text-sm text-[#6c757d] leading-relaxed line-clamp-2">
                    {resumo.mensagem}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* KPIs - Primeira linha (2 KPIs) */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-2">
            <MetricCard
              title="Processos Ativos"
              value={metrics?.processos_ativos || 0}
              icon={Briefcase}
              trend={metrics?.processos_trend_percent !== 0 ? { value: `${metrics?.processos_trend_percent > 0 ? '+' : ''}${metrics?.processos_trend_percent}%`, label: 'vs mês', positive: metrics?.processos_trend_percent >= 0 } : undefined}
              gradient="kpi1"
            />
            <MetricCard
              title="Clientes Ativos"
              value={metrics?.clientes_ativos || 0}
              icon={Users}
              trend={metrics?.clientes_novos_mes ? { value: `+${metrics.clientes_novos_mes}`, label: 'este mês', positive: true } : undefined}
              gradient="kpi2"
            />
          </div>
        </div>

        {/* LINHA 2: Conteúdo Principal (3 Colunas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-start">

          {/* COLUNA ESQUERDA (3 cols): Alertas + Seus Números */}
          <div className="lg:col-span-3 space-y-4">
            {/* Alertas de Atenção */}
            <AlertasCard />

            {/* Seus Números do Mês */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#89bcbe]" />
                  Seus Números do Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-5 px-5 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[#46627f]">Horas Faturadas</span>
                    <span className="text-[11px] font-semibold text-[#34495e]">{formatHoras(metrics?.horas_faturadas_mes || 0, 'curto')} / {formatHoras(metrics?.horas_meta || 160, 'curto')}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(progressoHoras, 100)}%` }}
                    />
                  </div>
                  {metrics?.horas_trend_valor !== 0 && (
                    <p className={cn(
                      "text-[9px] font-medium mt-0.5",
                      metrics?.horas_trend_valor > 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {metrics?.horas_trend_valor > 0 ? '↑' : '↓'} {formatHoras(Math.abs(metrics?.horas_trend_valor || 0), 'curto')} vs mês passado
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[#46627f]">Receita Gerada</span>
                    <span className="text-[11px] font-semibold text-[#34495e]">{formatCurrency(metrics?.receita_mes || 0)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(progressoReceita, 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-[#adb5bd] mt-0.5 font-normal">Meta: {formatCurrency(metrics?.receita_meta || 40000)}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[#46627f]">Horas Não Faturadas</span>
                    <span className="text-[11px] font-semibold text-emerald-600">{formatHoras(metrics?.horas_nao_faturadas || 0, 'curto')}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-300 to-emerald-400 rounded-full"
                      style={{ width: `${Math.min((metrics?.horas_nao_faturadas || 0) / 50 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-emerald-600 mt-0.5 font-normal">
                    Oportunidade: {formatCurrency(metrics?.valor_horas_nao_faturadas || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Insights de Gestão - Apenas para donos/sócios */}
            {hasInsightsPermission && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2 pt-5 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2 text-[#34495e]">
                      <Sparkles className="w-4 h-4 text-[#89bcbe]" />
                      Insights de Gestão
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => refreshInsights()}
                      disabled={loadingInsights}
                    >
                      {loadingInsights ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#89bcbe]" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 text-[#89bcbe]" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-1 pb-5 px-5 space-y-2">
                  {loadingInsights ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="w-4 h-4 text-[#89bcbe] animate-spin" />
                    </div>
                  ) : insights.length === 0 ? (
                    <p className="text-[11px] text-[#6c757d] text-center py-3">Nenhum insight disponível</p>
                  ) : (
                    insights.map((insight, index) => (
                      <InsightCard
                        key={index}
                        type={insight.tipo}
                        title={insight.titulo}
                        description={insight.descricao}
                        action={insight.acao ? { label: insight.acao.label, onClick: () => window.location.href = insight.acao!.href } : undefined}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* COLUNA CENTRAL (5 cols): Ações Rápidas + Performance Geral */}
          <div className="lg:col-span-5 space-y-4">
            {/* Ações Rápidas */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#89bcbe]" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-4 px-5">
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setTarefaModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-[10px] font-medium text-[#46627f]">Nova Tarefa</span>
                  </button>
                  <button
                    onClick={() => setProcessoModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-medium text-[#46627f]">Novo Processo</span>
                  </button>
                  <button
                    onClick={() => setConsultaModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Scale className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-[10px] font-medium text-[#46627f]">Novo Consultivo</span>
                  </button>
                  <button
                    onClick={() => setTimesheetModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-medium text-[#46627f]">Lançar Horas</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Performance Geral */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-6 px-6">
                <CardTitle className="text-sm font-medium text-[#34495e]">Performance Geral</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 px-6 pb-6">
                {loadingPerformance ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-[#89bcbe] animate-spin" />
                  </div>
                ) : isPerformanceEmpty ? (
                  <EmptyState
                    icon={Target}
                    title="Sem dados de performance"
                    description="Registre horas e cadastre processos para ver métricas"
                    variant="default"
                  />
                ) : (
                  <Tabs defaultValue="equipe" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                      <TabsTrigger value="equipe">Equipe</TabsTrigger>
                      <TabsTrigger value="area">Por Área</TabsTrigger>
                      <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                    </TabsList>

                    <TabsContent value="equipe" className="space-y-3 mt-4">
                      {equipe.length === 0 ? (
                        <p className="text-xs text-[#6c757d] text-center py-3">Nenhum registro de horas este mês</p>
                      ) : (
                        <>
                          <ScrollArea className={equipe.length > 5 ? "h-[200px] pr-2" : ""}>
                            <div className="space-y-1.5">
                              {equipe.map((membro, index) => {
                                const isCurrentUser = membro.id === currentUserId
                                const position = index + 1

                                return (
                                  <div
                                    key={membro.id}
                                    className={cn(
                                      "space-y-1 p-1.5 rounded-md -mx-1.5 transition-colors",
                                      isCurrentUser && "bg-[#f0f9f9] border border-[#89bcbe]/30"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-medium text-slate-400 w-4">
                                          {position}.
                                        </span>
                                        <span className={cn(
                                          "text-xs font-medium",
                                          isCurrentUser ? "text-[#34495e]" : "text-[#46627f]"
                                        )}>
                                          {membro.nome}
                                          {isCurrentUser && (
                                            <span className="ml-1 text-[8px] font-medium text-[#89bcbe] bg-[#89bcbe]/10 px-1 py-0.5 rounded">
                                              Você
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                      <span className={cn(
                                        "text-xs font-semibold",
                                        isCurrentUser ? "text-[#89bcbe]" : "text-[#34495e]"
                                      )}>
                                        {formatHoras(membro.horas, 'curto')}
                                      </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden ml-5">
                                      <div
                                        className={cn(
                                          "h-full rounded-full",
                                          isCurrentUser ? "bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab]" : membro.cor
                                        )}
                                        style={{ width: `${Math.min((membro.horas / (equipe[0]?.horas || 1)) * 100, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </ScrollArea>
                          <Separator className="my-2" />
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[#46627f]">Total da Equipe</span>
                            <span className="font-semibold text-[#34495e]">{formatHoras(totalHorasEquipe, 'curto')}</span>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="area" className="space-y-3 mt-4">
                      {areas.length === 0 ? (
                        <p className="text-xs text-[#6c757d] text-center py-3">Nenhum processo cadastrado</p>
                      ) : (
                        areas.map((area) => (
                          <div key={area.area} className="p-2 bg-slate-50 rounded-md border border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-[#34495e]">{area.area}</span>
                              <span className="text-[10px] font-medium text-[#6c757d]">{area.qtd} processos</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mr-2">
                                <div className={`h-full ${area.cor} rounded-full`} style={{ width: `${(area.receita / (areas[0]?.receita || 1)) * 100}%` }} />
                              </div>
                              <span className="text-[10px] font-semibold text-[#34495e] whitespace-nowrap">{formatCurrency(area.receita)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="financeiro" className="space-y-3 mt-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] border border-[#89bcbe]/30 rounded-md">
                          <p className="text-[10px] font-medium text-[#46627f] mb-0.5">Total a Receber</p>
                          <p className="text-base font-bold text-[#34495e]">{formatCurrency(totalAReceber)}</p>
                        </div>
                        <div className="p-2.5 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] border border-[#89bcbe]/30 rounded-md">
                          <p className="text-[10px] font-medium text-[#46627f] mb-0.5">Taxa Inadimplência</p>
                          <p className="text-base font-bold text-[#34495e]">{taxaInadimplencia}%</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="text-xs font-semibold text-[#34495e] mb-2">Top 5 Clientes</h4>
                        {topClientes.length === 0 ? (
                          <p className="text-xs text-[#6c757d] text-center py-2">Nenhum pagamento registrado</p>
                        ) : (
                          topClientes.map((cliente) => (
                            <div key={cliente.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                              <span className="text-xs text-[#6c757d]">{cliente.nome}</span>
                              <span className="text-xs font-semibold text-[#34495e]">{formatCurrency(cliente.valor)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>

          </div>

          {/* COLUNA DIREITA (4 cols): KPIs secundários + Publicações Recentes */}
          <div className="lg:col-span-4 space-y-4">
            {/* KPIs secundários (Casos Consultivos + Horas Prontas) */}
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                title="Casos Consultivos"
                value={metrics?.consultas_abertas || 0}
                subtitle="em andamento"
                icon={FileText}
                gradient="kpi3"
              />
              <MetricCard
                title="Horas Faturáveis"
                value={formatHoras(metrics?.horas_prontas_faturar || 0, 'curto')}
                icon={Clock}
                trend={metrics?.horas_faturaveis_trend !== 0 ? {
                  value: `${metrics?.horas_faturaveis_trend > 0 ? '+' : ''}${formatHoras(Math.abs(metrics?.horas_faturaveis_trend || 0), 'curto')}`,
                  label: 'vs mês',
                  positive: metrics?.horas_faturaveis_trend >= 0
                } : undefined}
                subtitle={metrics?.horas_faturaveis_trend === 0 ? 'prontas p/ faturar' : undefined}
                gradient="kpi4"
              />
            </div>

            {/* Publicações Recentes */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-6 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#34495e]">
                    <Bell className="w-4 h-4 text-[#89bcbe]" />
                    Publicações Recentes
                  </CardTitle>
                  <Link href="/dashboard/publicacoes">
                    <Button variant="ghost" size="sm" className="text-[10px] text-[#89bcbe] hover:text-[#6ba9ab] h-5 px-1.5">
                      Ver →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-6 px-6 space-y-2.5">
                {loadingPublicacoes ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="w-4 h-4 text-[#89bcbe] animate-spin" />
                  </div>
                ) : isPublicacoesEmpty ? (
                  <EmptyState
                    icon={Bell}
                    title="Nenhuma publicação"
                    description="Configure a integração AASP"
                    actionLabel="Configurar"
                    actionHref="/dashboard/publicacoes/config"
                    variant="compact"
                  />
                ) : (
                  publicacoes.slice(0, 4).map((pub) => (
                    <Link key={pub.id} href={`/dashboard/publicacoes/${pub.id}`} className="block">
                      <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#34495e] leading-tight truncate">
                              {pub.processo}
                            </p>
                            <p className="text-[11px] text-[#6c757d] mt-1 truncate">{pub.conteudo}</p>
                          </div>
                          {pub.urgente && (
                            <span className="text-[9px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">
                              Urg
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Modais de Ações Rápidas */}
        {tarefaModalOpen && escritorioAtivo && (
          <TarefaWizard
            escritorioId={escritorioAtivo}
            onClose={() => setTarefaModalOpen(false)}
          />
        )}

        <ConsultaWizardModal
          open={consultaModalOpen}
          onOpenChange={setConsultaModalOpen}
          escritorioId={escritorioAtivo || undefined}
        />

        <ProcessoWizard
          open={processoModalOpen}
          onOpenChange={setProcessoModalOpen}
          onSuccess={() => {
            setProcessoModalOpen(false)
          }}
        />

        <TimesheetModal
          open={timesheetModalOpen}
          onOpenChange={setTimesheetModalOpen}
          onSuccess={() => {
            setTimesheetModalOpen(false)
          }}
        />
    </div>
  )
}
