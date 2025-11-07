'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Briefcase,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Target,
  Sparkles,
  Plus,
  Search,
  FileBarChart,
  FolderOpen,
  MessageSquareCode,
  CheckCircle2,
  AlertCircle,
  Bell
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Custom components
import MetricCard from '@/components/dashboard/MetricCard'
import InsightCard from '@/components/dashboard/InsightCard'
import TimelineItem from '@/components/dashboard/TimelineItem'
import QuickActionButton from '@/components/dashboard/QuickActionButton'
import GoalProgress from '@/components/dashboard/GoalProgress'

interface Metrics {
  processos_ativos: number
  processos_novos: number
  clientes_ativos: number
  clientes_novos: number
  consultas_abertas: number
  recebido_hoje: number
  a_receber: number
  horas_faturadas: number
  horas_meta: number
  receita_mes: number
  receita_meta: number
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      // Simulando dados - depois virá do Supabase
      setMetrics({
        processos_ativos: 47,
        processos_novos: 8,
        clientes_ativos: 124,
        clientes_novos: 12,
        consultas_abertas: 18,
        recebido_hoje: 8500,
        a_receber: 45600,
        horas_faturadas: 112,
        horas_meta: 160,
        receita_mes: 32500,
        receita_meta: 40000,
      })
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  const progressoReceita = ((metrics?.receita_mes || 0) / (metrics?.receita_meta || 1)) * 100
  const progressoHoras = ((metrics?.horas_faturadas || 0) / (metrics?.horas_meta || 1)) * 100

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

        {/* Ações Rápidas - Seção com Título */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-[#34495e]">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="grid grid-cols-8 gap-2.5">
              <QuickActionButton
                icon={Sparkles}
                label="Comando IA"
                onClick={() => {}}
                variant="highlight"
              />
              <QuickActionButton icon={Plus} label="Processo" onClick={() => {}} />
              <QuickActionButton icon={Users} label="Cliente" onClick={() => {}} />
              <QuickActionButton icon={FileText} label="Consulta" onClick={() => {}} />
              <QuickActionButton icon={FolderOpen} label="Documento" onClick={() => {}} />
              <QuickActionButton icon={Clock} label="Registrar Horas" onClick={() => {}} />
              <QuickActionButton icon={DollarSign} label="Despesa" onClick={() => {}} />
              <QuickActionButton icon={FileBarChart} label="Relatórios" onClick={() => {}} />
            </div>
          </CardContent>
        </Card>

        {/* Layout 3 Colunas - CORRIGIDO */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* COLUNA ESQUERDA - Agenda + Seus Números + Atividades */}
          <div className="xl:col-span-3 space-y-6">

            {/* Agenda de Hoje - COM DESTAQUE */}
            <Card className="border-[#89bcbe] shadow-lg bg-gradient-to-br from-white to-[#f0f9f9]/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-[#34495e]">
                    <div className="w-7 h-7 bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    Agenda de Hoje
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] h-7">
                    Ver →
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { time: '09:00', title: 'Audiência Trabalhista', cliente: 'Silva vs Empresa X', color: 'bg-red-500' },
                  { time: '11:00', title: 'Reunião com Cliente', cliente: 'João Santos', color: 'bg-[#1E3A8A]' },
                  { time: '14:00', title: 'Prazo Recursal', cliente: 'Processo #1234', color: 'bg-amber-500' },
                  { time: '16:30', title: 'Call Equipe', cliente: 'Alinhamento semanal', color: 'bg-[#89bcbe]' },
                ].map((event, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 hover:bg-[#f0f9f9] rounded-lg transition-colors border border-slate-100">
                    <div className="text-xs font-bold text-[#46627f] tabular-nums min-w-[40px] mt-0.5">
                      {event.time}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#34495e] leading-tight">{event.title}</p>
                      <p className="text-[10px] text-[#6c757d] mt-0.5 leading-tight">{event.cliente}</p>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${event.color} mt-1.5 flex-shrink-0`} />
                  </div>
                ))}
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
                    <span className="text-xs font-semibold text-[#34495e]">{metrics?.horas_faturadas}h / {metrics?.horas_meta}h</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] rounded-full transition-all duration-1000"
                      style={{ width: `${progressoHoras}%` }}
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
                      style={{ width: `${progressoReceita}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#adb5bd] mt-1 font-normal">Meta: {formatCurrency(metrics?.receita_meta || 0)}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#46627f]">Horas Não Cobráveis</span>
                    <span className="text-xs font-semibold text-slate-600">15h</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-slate-300 to-slate-400 rounded-full"
                      style={{ width: '9%' }}
                    />
                  </div>
                  <p className="text-[10px] text-[#adb5bd] mt-1 font-normal">Atividades internas e administrativas</p>
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
                <ScrollArea className="h-[280px] pr-2">
                  <div className="space-y-1">
                    <TimelineItem
                      icon={DollarSign}
                      title="Pagamento recebido"
                      description="Cliente Silva - R$ 5.000"
                      time="há 5 min"
                      colorScheme="emerald"
                    />
                    <TimelineItem
                      icon={Bell}
                      title="Nova publicação"
                      description="Processo #1234 - Intimação recebida"
                      time="há 1h"
                      colorScheme="blue"
                      action={{ label: 'Visualizar', onClick: () => {} }}
                    />
                    <TimelineItem
                      icon={CheckCircle2}
                      title="Consulta aprovada"
                      description="Parecer revisado pelo supervisor"
                      time="há 2h"
                      colorScheme="teal"
                    />
                    <TimelineItem
                      icon={FileText}
                      title="Peça protocolada"
                      description="Contestação - Processo #5678"
                      time="há 3h"
                      colorScheme="purple"
                    />
                    <TimelineItem
                      icon={Users}
                      title="Novo cliente cadastrado"
                      description="João Santos - Área Trabalhista"
                      time="há 4h"
                      colorScheme="blue"
                    />
                  </div>
                </ScrollArea>
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
                  <div>
                    <CardTitle className="text-lg font-medium text-[#34495e]">Bom dia, Advogado!</CardTitle>
                    <p className="text-xs text-[#adb5bd] mt-0.5 font-normal">Gerado há 5 minutos</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[#6c757d] leading-relaxed font-normal">
                  Hoje você tem <span className="font-medium text-[#34495e]">3 audiências agendadas</span> e{' '}
                  <span className="font-medium text-amber-600">2 prazos importantes</span> para acompanhar.
                  Sua agenda está <span className="font-medium text-[#34495e]">65% ocupada</span>, deixando tempo para tarefas não urgentes.
                </p>
                <p className="text-sm text-[#6c757d] leading-relaxed font-normal">
                  Você tem <span className="font-medium text-emerald-600">15h não faturadas</span> (oportunidade de ~R$ 7.500).
                  Continue assim! 💚
                </p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    Atualizar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-[#89bcbe] hover:text-[#6ba9ab]">
                    Ver Detalhes →
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Performance Geral */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-[#34495e]">Performance Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="equipe" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                    <TabsTrigger value="equipe">Equipe</TabsTrigger>
                    <TabsTrigger value="area">Por Área</TabsTrigger>
                    <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  </TabsList>

                  <TabsContent value="equipe" className="space-y-3 mt-4">
                    {[
                      { nome: 'Dr. Silva', horas: 125, cor: 'bg-[#34495e]' },
                      { nome: 'Dra. Santos', horas: 112, cor: 'bg-[#46627f]' },
                      { nome: 'Dr. Oliveira', horas: 98, cor: 'bg-[#89bcbe]' },
                      { nome: 'Dra. Costa', horas: 87, cor: 'bg-[#aacfd0]' },
                    ].map((adv, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#46627f]">{adv.nome}</span>
                          <span className="text-sm font-semibold text-[#34495e]">{adv.horas}h</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${adv.cor} rounded-full`}
                            style={{ width: `${(adv.horas / 125) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[#46627f]">Total Consolidado</span>
                      <span className="font-semibold text-[#34495e]">422h</span>
                    </div>
                  </TabsContent>

                  <TabsContent value="area" className="space-y-3 mt-4">
                    {[
                      { area: 'Trabalhista', qtd: 18, receita: 45000, cor: 'bg-[#34495e]' },
                      { area: 'Cível', qtd: 15, receita: 38000, cor: 'bg-[#46627f]' },
                      { area: 'Tributário', qtd: 9, receita: 52000, cor: 'bg-[#89bcbe]' },
                      { area: 'Empresarial', qtd: 5, receita: 28000, cor: 'bg-[#1E3A8A]' },
                    ].map((area, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[#34495e]">{area.area}</span>
                          <span className="text-xs font-medium text-[#6c757d]">{area.qtd} processos</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mr-3">
                            <div className={`h-full ${area.cor} rounded-full`} style={{ width: `${(area.receita / 52000) * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-[#34495e] whitespace-nowrap">{formatCurrency(area.receita)}</span>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="financeiro" className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] border border-[#89bcbe]/30 rounded-lg">
                        <p className="text-xs font-medium text-[#46627f] mb-1">Total a Receber</p>
                        <p className="text-xl font-bold text-[#34495e]">{formatCurrency(metrics?.a_receber || 0)}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] border border-[#89bcbe]/30 rounded-lg">
                        <p className="text-xs font-medium text-[#46627f] mb-1">Taxa Inadimplência</p>
                        <p className="text-xl font-bold text-[#34495e]">3.2%</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold text-[#34495e] mb-3">Top 5 Clientes</h4>
                      {[
                        { nome: 'Empresa ABC Ltda', valor: 12500 },
                        { nome: 'João Silva', valor: 8900 },
                        { nome: 'Maria Santos', valor: 7200 },
                        { nome: 'Tech Corp', valor: 6800 },
                        { nome: 'Pedro Oliveira', valor: 5400 },
                      ].map((cliente, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                          <span className="text-sm text-[#6c757d]">{cliente.nome}</span>
                          <span className="text-sm font-semibold text-[#34495e]">{formatCurrency(cliente.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Publicações Recentes */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-[#34495e]">
                    <Bell className="w-5 h-5 text-[#89bcbe]" />
                    Publicações Recentes
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] h-7">
                    Ver Todas →
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { processo: '1234-56.2024', tipo: 'Intimação', conteudo: 'Comparecimento para audiência', prazo: '5 dias', urgente: true },
                  { processo: '7890-12.2024', tipo: 'Despacho', conteudo: 'Decisão interlocutória proferida', prazo: '10 dias', urgente: false },
                  { processo: '3456-78.2024', tipo: 'Sentença', conteudo: 'Julgamento de mérito publicado', prazo: '15 dias', urgente: false },
                  { processo: '9012-34.2024', tipo: 'Citação', conteudo: 'Apresentar defesa preliminar', prazo: '3 dias', urgente: true },
                ].map((pub, i) => (
                  <div key={i} className={`p-2.5 rounded-lg border transition-colors ${pub.urgente ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-tight ${pub.urgente ? 'text-red-900' : 'text-[#34495e]'}`}>
                          Processo {pub.processo}
                        </p>
                        <p className={`text-[10px] font-semibold mt-0.5 ${pub.urgente ? 'text-red-700' : 'text-[#6c757d]'}`}>{pub.tipo}</p>
                      </div>
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${pub.urgente ? 'bg-red-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
                        {pub.prazo}
                      </div>
                    </div>
                    <p className={`text-[10px] leading-tight ${pub.urgente ? 'text-red-600' : 'text-[#6c757d]'}`}>
                      {pub.conteudo}
                    </p>
                  </div>
                ))}
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
                trend={{ value: metrics?.processos_novos || 0, label: 'esta semana', positive: true }}
                gradient="kpi1"
              />
              <MetricCard
                title="Clientes Ativos"
                value={metrics?.clientes_ativos || 0}
                icon={Users}
                trend={{ value: metrics?.clientes_novos || 0, label: 'este mês', positive: true }}
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
                title="Faturamento Mês"
                value={formatCurrency(metrics?.recebido_hoje || 0)}
                icon={DollarSign}
                subtitle="pagamentos confirmados"
                gradient="kpi4"
              />
            </div>

            {/* Insights de Gestão */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-[#34495e]">
                  <Sparkles className="w-5 h-5 text-[#89bcbe]" />
                  Insights de Gestão
                </CardTitle>
                <CardDescription>Análises geradas por IA</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <InsightCard
                  type="oportunidade"
                  title="Existem 45h não faturadas"
                  description="Você tem oportunidade de faturar R$ 22.500 em horas registradas mas ainda não cobradas."
                  action={{ label: 'Revisar e faturar', onClick: () => {} }}
                />
                <InsightCard
                  type="destaque"
                  title="Taxa de conversão em 78%"
                  description="Sua taxa de conversão de consultas para processos está excelente! Continue assim."
                />
                <InsightCard
                  type="alerta"
                  title="5 contratos vencem em 30 dias"
                  description="Alguns contratos de honorários estão próximos do vencimento."
                  action={{ label: 'Ver contratos', onClick: () => {} }}
                />
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </div>
  )
}
