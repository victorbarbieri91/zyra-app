'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
  Sparkles,
  Search,
  MessageSquare,
  Bell,
  FileBarChart,
  Gavel,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

// Custom components
import MeusLancamentos from '@/components/dashboard/MeusLancamentos'
import PainelHoje from '@/components/dashboard/PainelHoje'
import HeroGreetingCard from '@/components/dashboard/HeroGreetingCard'
import MetaPessoalCard from '@/components/dashboard/MetaPessoalCard'
import KpiStrip from '@/components/dashboard/KpiStrip'
import RankingEquipeCard from '@/components/dashboard/RankingEquipeCard'
import type { TimesheetEntryRecente } from '@/hooks/useTimesheetRecentes'

// Modais de ações rápidas
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import { ConsultaWizardModal } from '@/components/consultivo/ConsultaWizardModal'
import ProcessoWizard from '@/components/processos/ProcessoWizard'
import TimesheetModal from '@/components/financeiro/TimesheetModal'
import AudienciaDetailModal from '@/components/agenda/AudienciaDetailModal'
import KpiDetailModal from '@/components/dashboard/KpiDetailModal'
import type { KpiType } from '@/hooks/useKpiDetails'
import TarefaDetailModal from '@/components/agenda/TarefaDetailModal'
import EventoDetailModal from '@/components/agenda/EventoDetailModal'
import { AudienciaProxima } from '@/hooks/useDashboardAlertas'
import { Tarefa, TarefaFormData, useTarefas } from '@/hooks/useTarefas'
import { createClient } from '@/lib/supabase/client'

// Hooks de dados reais
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useDashboardAgenda, AgendaItemDashboard } from '@/hooks/useDashboardAgenda'
import { useDashboardPerformance } from '@/hooks/useDashboardPerformance'
// useDashboardPublicacoes removido - card de publicações removido do dashboard
import { useDashboardResumoIA } from '@/hooks/useDashboardResumoIA'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { cn } from '@/lib/utils'
import { getNowInBrazil, diasUteisRestantesNoMes } from '@/lib/timezone'

export default function DashboardPage() {
  const router = useRouter()
  const { escritorioAtivo, escritorioAtivoData } = useEscritorioAtivo()
  const percentualMeta = escritorioAtivoData?.config?.metas?.percentual_crescimento ?? 20

  // Estado do modal de comando IA
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandInput, setCommandInput] = useState('')

  // Estados para modais de ações rápidas
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false)
  const [consultaModalOpen, setConsultaModalOpen] = useState(false)
  const [processoModalOpen, setProcessoModalOpen] = useState(false)
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false)

  // Estados para modal de audiência (vindo do card Atenção Imediata)
  const [audienciaDetailOpen, setAudienciaDetailOpen] = useState(false)
  const [audienciaSelecionada, setAudienciaSelecionada] = useState<AudienciaProxima | null>(null)
  const [audienciasListOpen, setAudienciasListOpen] = useState(false)
  const [audienciasProximas, setAudienciasProximas] = useState<AudienciaProxima[]>([])

  // Estado para modal de detalhamento KPI
  const [kpiDetailOpen, setKpiDetailOpen] = useState<KpiType | null>(null)

  // Estado para visualização de horas (lista ou barras)
  const [horasViewMode, setHorasViewMode] = useState<'list' | 'bars'>('list')

  // Estado para paginação da agenda
  const [agendaPage, setAgendaPage] = useState(0)
  const AGENDA_PER_PAGE = 5

  // Estados para modais de detalhe dos itens da agenda
  const [tarefaDetailData, setTarefaDetailData] = useState<Tarefa | null>(null)
  const [tarefaDetailOpen, setTarefaDetailOpen] = useState(false)
  const [eventoDetailData, setEventoDetailData] = useState<Record<string, unknown> | null>(null)
  const [eventoDetailOpen, setEventoDetailOpen] = useState(false)
  const [agendaAudienciaData, setAgendaAudienciaData] = useState<Record<string, unknown> | null>(null)
  const [agendaAudienciaOpen, setAgendaAudienciaOpen] = useState(false)

  // Estados para wizards de edição do dashboard
  const [dashEventoEditOpen, setDashEventoEditOpen] = useState(false)
  const [dashAudienciaEditOpen, setDashAudienciaEditOpen] = useState(false)

  // Estados para conclusão de tarefas com modal de horas (dashboard)
  const [dashTimesheetOpen, setDashTimesheetOpen] = useState(false)
  const [dashTarefaParaConcluir, setDashTarefaParaConcluir] = useState<Tarefa | null>(null)
  const [dashModoAvulso, setDashModoAvulso] = useState(false)
  const [dashConfirmSemHoras, setDashConfirmSemHoras] = useState(false)
  const dashHorasRegistradasRef = useRef(false)

  // Estado para nome do usuário (saudação local)
  const [nomeUsuario, setNomeUsuario] = useState<string>('')

  // Estado para edição de timesheet via modal padrão
  const [editTimesheetEntry, setEditTimesheetEntry] = useState<TimesheetEntryRecente | null>(null)
  const [editTimesheetModalOpen, setEditTimesheetModalOpen] = useState(false)

  // Saudação baseada no horário de Brasília (sempre atualizada, sem depender da IA)
  const saudacao = useMemo(() => {
    const hora = getNowInBrazil().getHours()
    if (hora >= 5 && hora < 12) return 'Bom dia'
    if (hora >= 12 && hora < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  // Carregar nome do usuário para saudação
  useEffect(() => {
    const loadNomeUsuario = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome_completo')
            .eq('id', user.id)
            .single()
          if (profile?.nome_completo) {
            setNomeUsuario(profile.nome_completo.split(' ')[0])
          }
        }
      } catch (err) {
        console.error('Erro ao carregar nome do usuário:', err)
      }
    }
    loadNomeUsuario()
  }, [])

  // Hook para updateTarefa (necessário para edição de tarefas via wizard)
  const { updateTarefa } = useTarefas(escritorioAtivo || undefined)

  // Hooks de dados
  const { metrics, loading: loadingMetrics } = useDashboardMetrics()
  const { items: agendaItems, loading: loadingAgenda, isEmpty: isAgendaEmpty, audienciasHoje, prazosHoje, refresh: refreshAgenda } = useDashboardAgenda()
  const { equipe, totalHorasEquipe, currentUserId, loading: loadingPerformance, refresh: refreshPerformance } = useDashboardPerformance()
  // publicações removido do dashboard
  const { resumo, loading: loadingResumo, refresh: refreshResumo, tempoDesdeAtualizacao } = useDashboardResumoIA({
    horas_atual: metrics?.horas_cobraveis_usuario,
    horas_meta: metrics?.horas_meta,
    honorarios_atual: metrics?.honorarios_mes,
    honorarios_meta: metrics?.receita_meta,
    dias_uteis_restantes: diasUteisRestantesNoMes(),
  })

  // Handler para clique nos itens da agenda do dashboard
  const handleAgendaItemClick = async (item: AgendaItemDashboard) => {
    const supabase = createClient()

    if (item.tipo === 'audiencia') {
      const { data } = await supabase
        .from('agenda_audiencias')
        .select('*, processos_processos(numero_processo)')
        .eq('id', item.id)
        .single()
      if (data) {
        setAgendaAudienciaData(data)
        setAgendaAudienciaOpen(true)
      }
    } else if (item.tipo === 'tarefa') {
      const { data } = await supabase
        .from('agenda_tarefas')
        .select('*, profiles:responsavel_id(nome_completo)')
        .eq('id', item.id)
        .single()
      if (data) {
        setTarefaDetailData({
          ...data,
          responsavel_nome: data.profiles?.nome_completo || undefined,
          responsaveis_ids: data.responsaveis_ids || [],
        } as Tarefa)
        setTarefaDetailOpen(true)
      }
    } else {
      const { data } = await supabase
        .from('agenda_eventos')
        .select('*')
        .eq('id', item.id)
        .single()
      if (data) {
        setEventoDetailData(data)
        setEventoDetailOpen(true)
      }
    }
  }

  // Handler para editar lançamento de timesheet via modal padrão
  const handleEditTimesheetEntry = (entry: TimesheetEntryRecente) => {
    setEditTimesheetEntry(entry)
    setEditTimesheetModalOpen(true)
  }

  // Handler para clique nas audiências do card Atenção Imediata
  const handleAudienciasClick = (audiencias: AudienciaProxima[]) => {
    if (audiencias.length === 1) {
      setAudienciaSelecionada(audiencias[0])
      setAudienciaDetailOpen(true)
    } else if (audiencias.length > 1) {
      setAudienciasProximas(audiencias)
      setAudienciasListOpen(true)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS DE EDIÇÃO DOS AGENDAMENTOS (Dashboard)
  // ═══════════════════════════════════════════════════════════════

  const handleDashEditTarefa = () => {
    setTarefaDetailOpen(false)
    setTarefaModalOpen(true) // Reutiliza o TarefaWizard existente
  }

  const handleDashEditEvento = () => {
    setEventoDetailOpen(false)
    setDashEventoEditOpen(true)
  }

  const handleDashEditAudiencia = () => {
    setAgendaAudienciaOpen(false)
    setDashAudienciaEditOpen(true)
  }

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS DE CONCLUSÃO DOS AGENDAMENTOS (Dashboard)
  // ═══════════════════════════════════════════════════════════════

  // Concluir tarefa (com lógica de modal de horas)
  const handleDashCompleteTask = async (taskId: string) => {
    try {
      const supabase = createClient()
      const { data: tarefa } = await supabase
        .from('agenda_tarefas')
        .select('*')
        .eq('id', taskId)
        .single()

      if (!tarefa) {
        toast.error('Tarefa não encontrada')
        return
      }

      if (tarefa.status === 'concluida') {
        // Reabrir tarefa
        await supabase
          .from('agenda_tarefas')
          .update({ status: 'pendente', data_conclusao: null })
          .eq('id', taskId)
        setAgendaPage(0)
        await refreshAgenda()
        toast.success('Tarefa reaberta!')
      } else if (tarefa.processo_id || tarefa.consultivo_id) {
        // Tem vínculo → abrir modal de horas antes de concluir
        setDashTarefaParaConcluir(tarefa as Tarefa)
        setDashModoAvulso(false)
        dashHorasRegistradasRef.current = false
        setTarefaDetailOpen(false)
        setDashTimesheetOpen(true)
      } else {
        // Sem vínculo → concluir direto
        await supabase
          .from('agenda_tarefas')
          .update({ status: 'concluida', data_conclusao: new Date().toISOString() })
          .eq('id', taskId)
        setTarefaDetailOpen(false)
        setTimeout(() => setTarefaDetailData(null), 300)
        setAgendaPage(0)
        await refreshAgenda()
        toast.success('Tarefa concluída!')
      }
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error)
      toast.error('Erro ao concluir tarefa')
    }
  }

  // Reabrir tarefa
  const handleDashReopenTask = async (taskId: string) => {
    try {
      const supabase = createClient()
      await supabase
        .from('agenda_tarefas')
        .update({ status: 'pendente', data_conclusao: null })
        .eq('id', taskId)
      setTarefaDetailOpen(false)
      setTimeout(() => setTarefaDetailData(null), 300)
      setAgendaPage(0)
      await refreshAgenda()
      toast.success('Tarefa reaberta!')
    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error)
      toast.error('Erro ao reabrir tarefa')
    }
  }

  // Lançar horas avulso (sem concluir)
  const handleDashLancarHoras = () => {
    if (tarefaDetailData) {
      setDashTarefaParaConcluir(tarefaDetailData)
      setDashModoAvulso(true)
      dashHorasRegistradasRef.current = false
      setTarefaDetailOpen(false)
      setDashTimesheetOpen(true)
    }
  }

  // Callback quando horas foram registradas com sucesso
  const handleDashTimesheetSuccess = async () => {
    dashHorasRegistradasRef.current = true

    if (dashModoAvulso) {
      // Modo avulso: reabrir modal de detalhe
      if (dashTarefaParaConcluir) {
        setTarefaDetailData(dashTarefaParaConcluir)
        setTarefaDetailOpen(true)
      }
      setDashTarefaParaConcluir(null)
      setDashModoAvulso(false)
    } else if (dashTarefaParaConcluir) {
      // Modo conclusão: concluir após registrar horas
      try {
        const supabase = createClient()
        await supabase
          .from('agenda_tarefas')
          .update({ status: 'concluida', data_conclusao: new Date().toISOString() })
          .eq('id', dashTarefaParaConcluir.id)
        setTarefaDetailOpen(false)
        setTimeout(() => setTarefaDetailData(null), 300)
        setAgendaPage(0)
        await refreshAgenda()
        toast.success('Tarefa concluída!')
      } catch (error) {
        console.error('Erro ao concluir tarefa após timesheet:', error)
        toast.error('Horas registradas, mas erro ao concluir tarefa')
      }
      setDashTarefaParaConcluir(null)
    }
  }

  // Callback quando modal de horas é fechado
  const handleDashTimesheetClose = (open: boolean) => {
    if (!open) {
      if (dashModoAvulso && !dashHorasRegistradasRef.current) {
        // Cancelou modo avulso: reabrir modal de detalhe
        if (dashTarefaParaConcluir) {
          setTarefaDetailData(dashTarefaParaConcluir)
          setTarefaDetailOpen(true)
        }
        setDashTarefaParaConcluir(null)
        setDashModoAvulso(false)
      } else if (dashModoAvulso && dashHorasRegistradasRef.current) {
        setDashTarefaParaConcluir(null)
        setDashModoAvulso(false)
      } else if (dashTarefaParaConcluir && !dashHorasRegistradasRef.current) {
        // Fechou sem registrar horas → perguntar se quer concluir mesmo assim
        setDashConfirmSemHoras(true)
      } else {
        setDashTarefaParaConcluir(null)
      }
    }
    setDashTimesheetOpen(open)
  }

  // Concluir sem horas
  const handleDashConcluirSemHoras = async () => {
    if (dashTarefaParaConcluir) {
      try {
        const supabase = createClient()
        await supabase
          .from('agenda_tarefas')
          .update({ status: 'concluida', data_conclusao: new Date().toISOString() })
          .eq('id', dashTarefaParaConcluir.id)
        setAgendaPage(0)
        await refreshAgenda()
        toast.success('Tarefa concluída!')
      } catch (error) {
        console.error('Erro ao concluir tarefa:', error)
        toast.error('Erro ao concluir tarefa')
      }
    }
    setDashTarefaParaConcluir(null)
    setDashConfirmSemHoras(false)
  }

  // Marcar audiência como realizada
  const handleDashRealizarAudiencia = async (audienciaId: string) => {
    if (!confirm('Deseja marcar esta audiência como realizada?')) return

    try {
      const supabase = createClient()
      await supabase
        .from('agenda_audiencias')
        .update({ status: 'realizada' })
        .eq('id', audienciaId)

      setAgendaAudienciaOpen(false)
      setTimeout(() => setAgendaAudienciaData(null), 300)
      setAgendaPage(0)
      await refreshAgenda()
      toast.success('Audiência marcada como realizada!')
    } catch (error) {
      console.error('Erro ao marcar audiência como realizada:', error)
      toast.error('Erro ao marcar audiência como realizada')
    }
  }

  // Marcar evento/prazo como cumprido
  const handleDashMarcarCumprido = async (eventoId: string) => {
    if (!confirm('Deseja marcar este evento/prazo como cumprido?')) return

    try {
      const supabase = createClient()
      await supabase
        .from('agenda_eventos')
        .update({ status: 'realizado' })
        .eq('id', eventoId)

      setEventoDetailOpen(false)
      setTimeout(() => setEventoDetailData(null), 300)
      setAgendaPage(0)
      await refreshAgenda()
      toast.success('Evento marcado como cumprido!')
    } catch (error) {
      console.error('Erro ao marcar evento como cumprido:', error)
      toast.error('Erro ao marcar evento como cumprido')
    }
  }

  // Reabrir audiência
  const handleDashReabrirAudiencia = async (audienciaId: string) => {
    try {
      const supabase = createClient()
      await supabase
        .from('agenda_audiencias')
        .update({ status: 'agendada' })
        .eq('id', audienciaId)

      setAgendaAudienciaOpen(false)
      setTimeout(() => setAgendaAudienciaData(null), 300)
      setAgendaPage(0)
      await refreshAgenda()
      toast.success('Audiência reaberta!')
    } catch (error) {
      console.error('Erro ao reabrir audiência:', error)
      toast.error('Erro ao reabrir audiência')
    }
  }

  // Reabrir evento
  const handleDashReabrirEvento = async (eventoId: string) => {
    try {
      const supabase = createClient()
      await supabase
        .from('agenda_eventos')
        .update({ status: 'agendado' })
        .eq('id', eventoId)

      setEventoDetailOpen(false)
      setTimeout(() => setEventoDetailData(null), 300)
      setAgendaPage(0)
      await refreshAgenda()
      toast.success('Evento reaberto!')
    } catch (error) {
      console.error('Erro ao reabrir evento:', error)
      toast.error('Erro ao reabrir evento')
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FIM DOS HANDLERS DE CONCLUSÃO
  // ═══════════════════════════════════════════════════════════════

  // Bug 5: Corrigir paginação quando itens mudam
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(agendaItems.length / AGENDA_PER_PAGE) - 1)
    if (agendaPage > maxPage) {
      setAgendaPage(maxPage)
    }
  }, [agendaItems.length, agendaPage])

  // Calcular progresso
  const progressoReceita = ((metrics?.honorarios_mes || 0) / (metrics?.receita_meta || 1)) * 100
  const progressoHoras = ((metrics?.horas_cobraveis_usuario || 0) / (metrics?.horas_meta || 1)) * 100

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-[#f0f9f9]/30 to-slate-50 dark:from-surface-0 dark:via-surface-0 dark:to-surface-0">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center shadow-lg">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <p className="text-sm text-[#46627f] dark:text-slate-400 font-medium">Preparando seu dashboard...</p>
        </div>
      </div>
    )
  }

  // Mês corrente em português pro Ranking
  const mesNomeAtual = getNowInBrazil().toLocaleDateString('pt-BR', { month: 'long' })
  const anoAtual = getNowInBrazil().getFullYear()

  return (
    <div className="h-full flex bg-page-warm overflow-hidden">
      {/* Painel lateral "Hoje" — data grande + barrinhas semana + agenda */}
      <PainelHoje onItemClick={handleAgendaItemClick} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
        <div className="px-7 pt-7 pb-16 flex flex-col gap-[18px]">
          {/* Hero + Meta */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-[18px] items-stretch">
            <HeroGreetingCard
              nomeUsuario={nomeUsuario}
              saudacao={saudacao}
              mensagemIA={resumo?.mensagem}
              loadingResumo={loadingResumo}
              tempoDesdeAtualizacao={tempoDesdeAtualizacao}
              onRefresh={refreshResumo}
              horasUsuario={metrics?.horas_cobraveis_usuario ?? 0}
              horasTrendValor={metrics?.horas_trend_valor ?? 0}
            />
            <MetaPessoalCard
              horasUsuario={metrics?.horas_cobraveis_usuario ?? 0}
              horasMeta={metrics?.horas_meta ?? 15}
              honorariosAtuais={metrics?.honorarios_mes ?? 0}
              receitaMeta={metrics?.receita_meta ?? 10000}
              percentualMeta={percentualMeta}
              onNovoProcesso={() => setProcessoModalOpen(true)}
              onRegistrarHoras={() => setTimesheetModalOpen(true)}
            />
          </div>

          {/* KPI Strip */}
          <KpiStrip metrics={metrics} onKpiClick={setKpiDetailOpen} />

          {/* Ranking + Meus timesheets */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.05fr] gap-[14px] flex-1 min-h-0">
            <RankingEquipeCard
              equipe={equipe}
              totalHorasEquipe={totalHorasEquipe}
              currentUserId={currentUserId}
              metaIndividual={metrics?.horas_meta ?? 160}
              loading={loadingPerformance}
              mesNome={mesNomeAtual}
              anoAtual={anoAtual}
            />
            <MeusLancamentos onEditEntry={handleEditTimesheetEntry} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAIS (unchanged)
          ═══════════════════════════════════════════════════════════════ */}

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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c757d] dark:text-slate-400" />
              <Input
                placeholder="O que você gostaria de fazer?"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-[#6c757d] dark:text-slate-400 mb-2 font-medium">Ações rápidas</p>
              <div className="grid grid-cols-2 gap-2">
                {commandShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    onClick={() => { shortcut.action(); setCommandOpen(false) }}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-[#f0f9f9] dark:hover:bg-teal-900/20 hover:border-[#89bcbe] transition-colors text-left"
                  >
                    <shortcut.icon className="w-4 h-4 text-[#89bcbe]" />
                    <span className="text-sm text-[#34495e] dark:text-slate-200">{shortcut.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 text-xs text-[#adb5bd] dark:text-slate-500">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Pressione <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-surface-2 rounded text-[10px] font-mono">Ctrl+K</kbd> para abrir a qualquer momento</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {tarefaModalOpen && escritorioAtivo && (
        <TarefaWizard
          escritorioId={escritorioAtivo}
          initialData={tarefaDetailData || undefined}
          onSubmit={tarefaDetailData ? async (data: TarefaFormData) => {
            await updateTarefa(tarefaDetailData.id, data)
            toast.success('Tarefa atualizada com sucesso!')
          } : undefined}
          onClose={() => {
            setTarefaModalOpen(false)
            setTarefaDetailData(null)
            refreshAgenda()
          }}
          onCreated={refreshAgenda}
        />
      )}

      {/* Wizard de edição de eventos (dashboard) */}
      {dashEventoEditOpen && eventoDetailData && escritorioAtivo && (
        <EventoWizard
          escritorioId={escritorioAtivo}
          initialData={eventoDetailData as any}
          onSubmit={async () => { refreshAgenda() }}
          onClose={() => {
            setDashEventoEditOpen(false)
            setEventoDetailData(null)
            refreshAgenda()
          }}
        />
      )}

      {/* Wizard de edição de audiências (dashboard) */}
      {dashAudienciaEditOpen && agendaAudienciaData && escritorioAtivo && (
        <AudienciaWizard
          escritorioId={escritorioAtivo}
          initialData={agendaAudienciaData as any}
          onSubmit={async () => { refreshAgenda() }}
          onClose={() => {
            setDashAudienciaEditOpen(false)
            setAgendaAudienciaData(null)
            refreshAgenda()
          }}
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
        onSuccess={() => { setProcessoModalOpen(false) }}
      />

      <TimesheetModal
        open={timesheetModalOpen}
        onOpenChange={setTimesheetModalOpen}
        onSuccess={() => { setTimesheetModalOpen(false) }}
      />

      {/* Modal de Detalhamento KPI */}
      <KpiDetailModal
        open={!!kpiDetailOpen}
        onOpenChange={(open) => { if (!open) setKpiDetailOpen(null) }}
        kpiType={kpiDetailOpen}
        metrics={metrics}
      />

      {audienciaSelecionada && (
        <AudienciaDetailModal
          open={audienciaDetailOpen}
          onOpenChange={(open) => {
            setAudienciaDetailOpen(open)
            if (!open) setAudienciaSelecionada(null)
          }}
          audiencia={{
            id: audienciaSelecionada.id,
            titulo: audienciaSelecionada.titulo,
            data_inicio: audienciaSelecionada.data_hora,
            tipo_audiencia: audienciaSelecionada.tipo_audiencia,
            modalidade: audienciaSelecionada.modalidade as 'presencial' | 'virtual' | undefined,
            status: audienciaSelecionada.status as 'agendada' | 'realizada' | 'cancelada' | 'remarcada' | undefined,
            local: audienciaSelecionada.local,
            link_virtual: audienciaSelecionada.link_virtual,
            processo_id: audienciaSelecionada.processo_id,
            responsavel_id: audienciaSelecionada.responsavel_id,
            observacoes: audienciaSelecionada.observacoes,
            descricao: audienciaSelecionada.descricao,
            tribunal: audienciaSelecionada.tribunal,
            comarca: audienciaSelecionada.comarca,
            vara: audienciaSelecionada.vara,
            juiz_nome: audienciaSelecionada.juiz,
            promotor_nome: audienciaSelecionada.promotor,
            advogado_contrario: audienciaSelecionada.advogado_contrario,
          }}
          onProcessoClick={(processoId) => router.push(`/dashboard/processos/${processoId}`)}
        />
      )}

      {/* Modais de detalhe dos itens da agenda (reutilizando modais do módulo agenda) */}
      {tarefaDetailData && (
        <TarefaDetailModal
          open={tarefaDetailOpen}
          onOpenChange={(open) => {
            setTarefaDetailOpen(open)
            // Só limpa se NÃO está transitando para edição
            if (!open && !tarefaModalOpen) setTimeout(() => setTarefaDetailData(null), 300)
          }}
          tarefa={tarefaDetailData}
          onUpdate={refreshAgenda}
          onClose={() => {
            setTarefaDetailOpen(false)
            setAgendaPage(0)
            refreshAgenda()
            // Delay data cleanup para permitir animação de fechar do Dialog Portal
            // (evita overlay órfão que trava a UI)
            setTimeout(() => setTarefaDetailData(null), 300)
          }}
          onEdit={handleDashEditTarefa}
          onConcluir={() => handleDashCompleteTask(tarefaDetailData.id)}
          onReabrir={() => handleDashReopenTask(tarefaDetailData.id)}
          onLancarHoras={handleDashLancarHoras}
          onEditTimesheetEntry={handleEditTimesheetEntry}
          onProcessoClick={(processoId) => router.push(`/dashboard/processos/${processoId}`)}
          onConsultivoClick={(consultivoId) => router.push(`/dashboard/consultivo/${consultivoId}`)}
        />
      )}

      {agendaAudienciaData && (
        <AudienciaDetailModal
          open={agendaAudienciaOpen}
          onOpenChange={(open) => {
            setAgendaAudienciaOpen(open)
            // Só limpa se NÃO está transitando para edição
            if (!open && !dashAudienciaEditOpen) {
              setTimeout(() => setAgendaAudienciaData(null), 300)
              refreshAgenda()
            }
          }}
          audiencia={{
            id: agendaAudienciaData.id as string,
            titulo: agendaAudienciaData.titulo as string,
            data_inicio: (agendaAudienciaData.data_hora || agendaAudienciaData.data_inicio) as string,
            tipo_audiencia: agendaAudienciaData.tipo_audiencia as string | undefined,
            modalidade: agendaAudienciaData.modalidade as 'presencial' | 'virtual' | undefined,
            status: agendaAudienciaData.status as 'agendada' | 'realizada' | 'cancelada' | 'remarcada' | undefined,
            local: agendaAudienciaData.local as string | undefined,
            link_virtual: agendaAudienciaData.link_virtual as string | undefined,
            processo_id: agendaAudienciaData.processo_id as string | undefined,
            responsavel_id: agendaAudienciaData.responsavel_id as string | undefined,
            observacoes: agendaAudienciaData.observacoes as string | undefined,
            descricao: agendaAudienciaData.descricao as string | undefined,
            tribunal: agendaAudienciaData.tribunal as string | undefined,
            comarca: agendaAudienciaData.comarca as string | undefined,
            vara: agendaAudienciaData.vara as string | undefined,
            juiz_nome: agendaAudienciaData.juiz_nome as string | undefined,
            promotor_nome: agendaAudienciaData.promotor_nome as string | undefined,
            advogado_contrario: agendaAudienciaData.advogado_contrario as string | undefined,
          }}
          onEdit={handleDashEditAudiencia}
          onRealizar={() => handleDashRealizarAudiencia(agendaAudienciaData.id as string)}
          onReabrir={() => handleDashReabrirAudiencia(agendaAudienciaData.id as string)}
          onProcessoClick={(processoId) => router.push(`/dashboard/processos/${processoId}`)}
        />
      )}

      {eventoDetailData && (
        <EventoDetailModal
          open={eventoDetailOpen}
          onOpenChange={(open) => {
            setEventoDetailOpen(open)
            // Só limpa se NÃO está transitando para edição
            if (!open && !dashEventoEditOpen) {
              setTimeout(() => setEventoDetailData(null), 300)
              refreshAgenda()
            }
          }}
          evento={{
            id: eventoDetailData.id as string,
            titulo: eventoDetailData.titulo as string,
            descricao: eventoDetailData.descricao as string | undefined,
            data_inicio: eventoDetailData.data_inicio as string,
            data_fim: eventoDetailData.data_fim as string | undefined,
            dia_inteiro: eventoDetailData.dia_inteiro as boolean | undefined,
            subtipo: (eventoDetailData.subtipo || 'compromisso') as string,
            status: eventoDetailData.status as string | undefined,
            local: eventoDetailData.local as string | undefined,
            processo_id: eventoDetailData.processo_id as string | undefined,
            consultivo_id: eventoDetailData.consultivo_id as string | undefined,
          }}
          onEdit={handleDashEditEvento}
          onMarcarCumprido={() => handleDashMarcarCumprido(eventoDetailData.id as string)}
          onReabrir={() => handleDashReabrirEvento(eventoDetailData.id as string)}
          onProcessoClick={(processoId) => router.push(`/dashboard/processos/${processoId}`)}
          onConsultivoClick={(consultivoId) => router.push(`/dashboard/consultivo/${consultivoId}`)}
        />
      )}

      {/* TimesheetModal para edição de lançamentos existentes */}
      {editTimesheetEntry && (
        <TimesheetModal
          open={editTimesheetModalOpen}
          onOpenChange={(open) => {
            setEditTimesheetModalOpen(open)
            if (!open) setEditTimesheetEntry(null)
          }}
          editTimesheetId={editTimesheetEntry.id}
          processoId={editTimesheetEntry.processo_id}
          consultaId={editTimesheetEntry.consulta_id}
          defaultModoRegistro="duracao"
          defaultDuracaoHoras={Math.floor(Number(editTimesheetEntry.horas))}
          defaultDuracaoMinutos={Math.round((Number(editTimesheetEntry.horas) % 1) * 60)}
          defaultAtividade={editTimesheetEntry.atividade}
          defaultDataTrabalho={editTimesheetEntry.data_trabalho}
          defaultHoraInicio={editTimesheetEntry.hora_inicio || undefined}
          defaultHoraFim={editTimesheetEntry.hora_fim || undefined}
          defaultFaturavel={editTimesheetEntry.faturavel}
          onSuccess={() => setEditTimesheetEntry(null)}
        />
      )}

      {/* TimesheetModal para conclusão de tarefas do dashboard */}
      <TimesheetModal
        open={dashTimesheetOpen}
        onOpenChange={handleDashTimesheetClose}
        onSuccess={handleDashTimesheetSuccess}
        processoId={dashTarefaParaConcluir?.processo_id || undefined}
        consultaId={dashTarefaParaConcluir?.consultivo_id || undefined}
      />

      {/* Dialog de confirmação: concluir sem horas */}
      <Dialog open={dashConfirmSemHoras} onOpenChange={setDashConfirmSemHoras}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#34495e] dark:text-slate-200">Concluir sem registrar horas?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Você não registrou horas para esta tarefa. Deseja concluí-la mesmo assim?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDashTarefaParaConcluir(null)
                setDashConfirmSemHoras(false)
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDashConcluirSemHoras}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Concluir sem horas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={audienciasListOpen} onOpenChange={setAudienciasListOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
              <Gavel className="w-4 h-4 text-amber-500" />
              Audiências nos próximos 7 dias
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Clique em uma audiência para ver os detalhes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 mt-2">
            {audienciasProximas.map((aud) => (
              <button
                key={aud.id}
                onClick={() => {
                  setAudienciasListOpen(false)
                  setAudienciaSelecionada(aud)
                  setAudienciaDetailOpen(true)
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-surface-2 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#34495e] dark:text-slate-200 truncate">{aud.titulo}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0">{aud.tipo_audiencia || 'Audiência'}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(aud.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
