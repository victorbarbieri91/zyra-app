'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Briefcase,
  Users,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  Target,
  Sparkles,
  Plus,
  FileBarChart,
  Bell,
  RefreshCw,
  Loader2,
  Search,
  MessageSquare,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Custom components
import MetricCard from '@/components/dashboard/MetricCard'
import InsightCard from '@/components/dashboard/InsightCard'
import TimelineItem from '@/components/dashboard/TimelineItem'
import QuickActionButton from '@/components/dashboard/QuickActionButton'
import EmptyState from '@/components/dashboard/EmptyState'

// Hooks de dados reais
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useDashboardAgenda } from '@/hooks/useDashboardAgenda'
import { useDashboardAtividades } from '@/hooks/useDashboardAtividades'
import { useDashboardPerformance } from '@/hooks/useDashboardPerformance'
import { useDashboardPublicacoes } from '@/hooks/useDashboardPublicacoes'
import { useDashboardResumoIA } from '@/hooks/useDashboardResumoIA'
import { useDashboardInsightsIA } from '@/hooks/useDashboardInsightsIA'

export default function DashboardPage() {
  const router = useRouter()

  // Estado do modal de comando IA
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandInput, setCommandInput] = useState('')

  // Hooks de dados
  const { metrics, loading: loadingMetrics, isEmpty: isMetricsEmpty } = useDashboardMetrics()
  const { items: agendaItems, loading: loadingAgenda, isEmpty: isAgendaEmpty, audienciasHoje, prazosHoje } = useDashboardAgenda()
  const { atividades, loading: loadingAtividades, isEmpty: isAtividadesEmpty } = useDashboardAtividades()
  const { equipe, areas, topClientes, totalHorasEquipe, totalAReceber, taxaInadimplencia, loading: loadingPerformance, isEmpty: isPerformanceEmpty } = useDashboardPerformance()
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">

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
        </div>

        {/* Ações Rápidas */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-[#34495e]">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="grid grid-cols-7 gap-2.5">
              <QuickActionButton
                icon={Sparkles}
                label="Comando IA"
                onClick={() => setCommandOpen(true)}
                variant="highlight"
                className="w-full"
              />
              <Link href="/dashboard/processos?novo=true" className="w-full">
                <QuickActionButton icon={Plus} label="Processo" onClick={() => {}} className="w-full" />
              </Link>
              <Link href="/dashboard/crm/pessoas/novo" className="w-full">
                <QuickActionButton icon={Users} label="Cliente" onClick={() => {}} className="w-full" />
              </Link>
              <Link href="/dashboard/consultivo?novo=true" className="w-full">
                <QuickActionButton icon={FileText} label="Consulta" onClick={() => {}} className="w-full" />
              </Link>
              <Link href="/dashboard/financeiro/timesheet" className="w-full">
                <QuickActionButton icon={Clock} label="Registrar Horas" onClick={() => {}} className="w-full" />
              </Link>
              <Link href="/dashboard/financeiro/receitas-despesas?tipo=despesa" className="w-full">
                <QuickActionButton icon={DollarSign} label="Despesa" onClick={() => {}} className="w-full" />
              </Link>
              <Link href="/dashboard/financeiro/relatorios" className="w-full">
                <QuickActionButton icon={FileBarChart} label="Relatórios" onClick={() => {}} className="w-full" />
              </Link>
            </div>
          </CardContent>
        </Card>

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

        {/* Layout 3 Colunas */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* COLUNA ESQUERDA - Agenda + Seus Números + Atividades */}
          <div className="xl:col-span-3 space-y-6">

            {/* Agenda de Hoje */}
            <Card className="border-[#89bcbe] shadow-lg bg-gradient-to-br from-white to-[#f0f9f9]/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-[#34495e]">
                    <div className="w-7 h-7 bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    Agenda de Hoje
                    {!loadingAgenda && agendaItems.length > 0 && (
                      <span className="text-xs font-normal text-[#6c757d]">({agendaItems.length})</span>
                    )}
                  </CardTitle>
                  <Link href="/dashboard/agenda">
                    <Button variant="ghost" size="sm" className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] h-7">
                      Ver →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingAgenda ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
                  </div>
                ) : isAgendaEmpty ? (
                  <EmptyState
                    icon={Calendar}
                    title="Agenda livre"
                    description="Nenhum compromisso para hoje"
                    actionLabel="Agendar"
                    actionHref="/dashboard/agenda"
                    variant="compact"
                  />
                ) : (
                  agendaItems.slice(0, 4).map((event) => (
                    <div key={event.id} className="flex items-start gap-2 p-2.5 hover:bg-[#f0f9f9] rounded-lg transition-colors border border-slate-100">
                      <div className="text-xs font-bold text-[#46627f] tabular-nums min-w-[40px] mt-0.5">
                        {event.time}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#34495e] leading-tight">{event.title}</p>
                        <p className="text-[10px] text-[#6c757d] mt-0.5 leading-tight">{event.subtitle}</p>
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full ${event.color} mt-1.5 flex-shrink-0`} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Seus Números do Mês */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium text-[#34495e] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#89bcbe]" />
                  Seus Números do Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#46627f]">Horas Faturadas</span>
                    <span className="text-xs font-semibold text-[#34495e]">{metrics?.horas_faturadas_mes || 0}h / {metrics?.horas_meta || 160}h</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(progressoHoras, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#adb5bd] mt-1 font-normal">{Math.round(progressoHoras)}% da meta</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#46627f]">Receita Gerada</span>
                    <span className="text-xs font-semibold text-[#34495e]">{formatCurrency(metrics?.receita_mes || 0)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(progressoReceita, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#adb5bd] mt-1 font-normal">Meta: {formatCurrency(metrics?.receita_meta || 40000)}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#46627f]">Horas Não Faturadas</span>
                    <span className="text-xs font-semibold text-emerald-600">{metrics?.horas_nao_faturadas || 0}h</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-300 to-emerald-400 rounded-full"
                      style={{ width: `${Math.min((metrics?.horas_nao_faturadas || 0) / 50 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-1 font-normal">
                    Oportunidade: {formatCurrency(metrics?.valor_horas_nao_faturadas || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Atividade Recente */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium text-[#34495e]">Atividade Recente</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] h-7">
                    Ver →
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAtividades ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
                  </div>
                ) : isAtividadesEmpty ? (
                  <EmptyState
                    icon={Clock}
                    title="Sem atividades"
                    description="Comece cadastrando um cliente"
                    actionLabel="Adicionar cliente"
                    actionHref="/dashboard/crm/novo"
                    variant="compact"
                  />
                ) : (
                  <ScrollArea className="h-[280px] pr-2">
                    <div className="space-y-1">
                      {atividades.map((atividade) => (
                        <TimelineItem
                          key={atividade.id}
                          icon={atividade.icon}
                          title={atividade.title}
                          description={atividade.description}
                          time={atividade.time}
                          colorScheme={atividade.colorScheme}
                          action={atividade.action ? { label: atividade.action.label, onClick: () => {} } : undefined}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

          </div>

          {/* COLUNA CENTRAL - Resumo + Performance Geral + Publicações */}
          <div className="xl:col-span-5 space-y-6">

            {/* Resumo do Dia (IA) */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-medium text-[#34495e]">
                      {loadingResumo ? 'Carregando...' : resumo.saudacao}
                    </CardTitle>
                    <p className="text-xs text-[#adb5bd] mt-0.5 font-normal">
                      {loadingResumo ? 'Gerando resumo...' : `Gerado ${tempoDesdeAtualizacao}`}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingResumo ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 text-[#89bcbe] animate-spin" />
                    <span className="text-sm text-[#6c757d]">Analisando seus dados...</span>
                  </div>
                ) : (
                  <p className="text-sm text-[#6c757d] leading-relaxed font-normal">
                    {resumo.mensagem}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => refreshResumo()}
                    disabled={loadingResumo}
                  >
                    {loadingResumo ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Atualizar
                  </Button>
                  <Link href="/dashboard/agenda">
                    <Button variant="ghost" size="sm" className="text-xs text-[#89bcbe] hover:text-[#6ba9ab]">
                      Ver Agenda →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Performance Geral */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-[#34495e]">Performance Geral</CardTitle>
              </CardHeader>
              <CardContent>
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
                        <p className="text-sm text-[#6c757d] text-center py-4">Nenhum registro de horas este mês</p>
                      ) : (
                        <>
                          {equipe.map((membro) => (
                            <div key={membro.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-[#46627f]">{membro.nome}</span>
                                <span className="text-sm font-semibold text-[#34495e]">{membro.horas}h</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${membro.cor} rounded-full`}
                                  style={{ width: `${Math.min((membro.horas / (equipe[0]?.horas || 1)) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                          <Separator className="my-3" />
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-[#46627f]">Total Consolidado</span>
                            <span className="font-semibold text-[#34495e]">{totalHorasEquipe}h</span>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="area" className="space-y-3 mt-4">
                      {areas.length === 0 ? (
                        <p className="text-sm text-[#6c757d] text-center py-4">Nenhum processo cadastrado</p>
                      ) : (
                        areas.map((area) => (
                          <div key={area.area} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-[#34495e]">{area.area}</span>
                              <span className="text-xs font-medium text-[#6c757d]">{area.qtd} processos</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mr-3">
                                <div className={`h-full ${area.cor} rounded-full`} style={{ width: `${(area.receita / (areas[0]?.receita || 1)) * 100}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-[#34495e] whitespace-nowrap">{formatCurrency(area.receita)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="financeiro" className="space-y-3 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] border border-[#89bcbe]/30 rounded-lg">
                          <p className="text-xs font-medium text-[#46627f] mb-1">Total a Receber</p>
                          <p className="text-xl font-bold text-[#34495e]">{formatCurrency(totalAReceber)}</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] border border-[#89bcbe]/30 rounded-lg">
                          <p className="text-xs font-medium text-[#46627f] mb-1">Taxa Inadimplência</p>
                          <p className="text-xl font-bold text-[#34495e]">{taxaInadimplencia}%</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold text-[#34495e] mb-3">Top 5 Clientes</h4>
                        {topClientes.length === 0 ? (
                          <p className="text-sm text-[#6c757d] text-center py-2">Nenhum pagamento registrado</p>
                        ) : (
                          topClientes.map((cliente) => (
                            <div key={cliente.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                              <span className="text-sm text-[#6c757d]">{cliente.nome}</span>
                              <span className="text-sm font-semibold text-[#34495e]">{formatCurrency(cliente.valor)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>

            {/* Publicações Recentes */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-[#34495e]">
                    <Bell className="w-5 h-5 text-[#89bcbe]" />
                    Publicações Recentes
                    {!loadingPublicacoes && publicacoesUrgentes > 0 && (
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        {publicacoesUrgentes} urgente{publicacoesUrgentes > 1 ? 's' : ''}
                      </span>
                    )}
                  </CardTitle>
                  <Link href="/dashboard/publicacoes">
                    <Button variant="ghost" size="sm" className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] h-7">
                      Ver Todas →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingPublicacoes ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
                  </div>
                ) : isPublicacoesEmpty ? (
                  <EmptyState
                    icon={Bell}
                    title="Nenhuma publicação"
                    description="Configure a integração AASP para receber publicações"
                    actionLabel="Configurar"
                    actionHref="/dashboard/publicacoes/config"
                    variant="compact"
                  />
                ) : (
                  publicacoes.slice(0, 4).map((pub) => (
                    <div key={pub.id} className={`p-2.5 rounded-lg border transition-colors ${pub.urgente ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold leading-tight ${pub.urgente ? 'text-red-900' : 'text-[#34495e]'}`}>
                            Processo {pub.processo}
                          </p>
                          <p className={`text-[10px] font-semibold mt-0.5 ${pub.urgente ? 'text-red-700' : 'text-[#6c757d]'}`}>{pub.tipo}</p>
                        </div>
                        {pub.prazo && (
                          <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${pub.urgente ? 'bg-red-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
                            {pub.prazo}
                          </div>
                        )}
                      </div>
                      <p className={`text-[10px] leading-tight ${pub.urgente ? 'text-red-600' : 'text-[#6c757d]'}`}>
                        {pub.conteudo}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

          </div>

          {/* COLUNA DIREITA - KPIs + Insights de Gestão */}
          <div className="xl:col-span-4 space-y-6">

            {/* KPIs Principais */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                title="Processos Ativos"
                value={metrics?.processos_ativos || 0}
                icon={Briefcase}
                trend={metrics?.processos_novos_semana ? { value: metrics.processos_novos_semana, label: 'esta semana', positive: true } : undefined}
                gradient="kpi1"
              />
              <MetricCard
                title="Clientes Ativos"
                value={metrics?.clientes_ativos || 0}
                icon={Users}
                trend={metrics?.clientes_novos_mes ? { value: metrics.clientes_novos_mes, label: 'este mês', positive: true } : undefined}
                gradient="kpi2"
              />
              <MetricCard
                title="Casos Consultivos"
                value={metrics?.consultas_abertas || 0}
                icon={FileText}
                subtitle="aguardando resposta"
                gradient="kpi3"
              />
              <MetricCard
                title="Publicações"
                value={metrics?.publicacoes_pendentes || 0}
                icon={Bell}
                subtitle={metrics?.publicacoes_urgentes ? `${metrics.publicacoes_urgentes} urgentes` : 'pendentes'}
                gradient="kpi4"
              />
            </div>

            {/* Insights de Gestão - Apenas para donos/sócios */}
            {hasInsightsPermission && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-[#34495e]">
                      <Sparkles className="w-5 h-5 text-[#89bcbe]" />
                      Insights de Gestão
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => refreshInsights()}
                      disabled={loadingInsights}
                    >
                      {loadingInsights ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#89bcbe]" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-[#89bcbe]" />
                      )}
                    </Button>
                  </div>
                  <CardDescription>Análises geradas por IA</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingInsights ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
                    </div>
                  ) : insights.length === 0 ? (
                    <p className="text-sm text-[#6c757d] text-center py-4">Nenhum insight disponível</p>
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

        </div>
      </div>
    </div>
  )
}
