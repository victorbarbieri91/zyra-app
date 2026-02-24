'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Briefcase,
  Users,
  FileText,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Loader2,
  Search,
  MessageSquare,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Bell,
  FileBarChart,
  Plus,
  CheckSquare,
  Scale,
  List,
  BarChart3,
  Gavel,
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  ArrowRight,
  Timer,
  CircleDollarSign,
  Activity,
} from 'lucide-react'
import { formatCurrency, formatHoras } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Custom components
import InsightCard from '@/components/dashboard/InsightCard'
import EmptyState from '@/components/dashboard/EmptyState'
import AlertasCard from '@/components/dashboard/AlertasCard'

// Modais de ações rápidas
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import { ConsultaWizardModal } from '@/components/consultivo/ConsultaWizardModal'
import ProcessoWizard from '@/components/processos/ProcessoWizard'
import TimesheetModal from '@/components/financeiro/TimesheetModal'
import AudienciaDetailModal from '@/components/agenda/AudienciaDetailModal'
import TarefaDetailModal from '@/components/agenda/TarefaDetailModal'
import EventoDetailModal from '@/components/agenda/EventoDetailModal'
import { AudienciaProxima } from '@/hooks/useDashboardAlertas'
import { Tarefa, TarefaFormData, useTarefas } from '@/hooks/useTarefas'
import { createClient } from '@/lib/supabase/client'

// Hooks de dados reais
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useDashboardAgenda, AgendaItemDashboard } from '@/hooks/useDashboardAgenda'
import { useDashboardPerformance } from '@/hooks/useDashboardPerformance'
import { useDashboardPublicacoes } from '@/hooks/useDashboardPublicacoes'
import { useDashboardResumoIA } from '@/hooks/useDashboardResumoIA'
import { useDashboardInsightsIA } from '@/hooks/useDashboardInsightsIA'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { getEscritoriosDoGrupo, EscritorioComRole } from '@/lib/supabase/escritorio-helpers'
import { cn } from '@/lib/utils'
import { getNowInBrazil } from '@/lib/timezone'

// ── Circular Progress Component ──────────────────────────────────────
function CircularProgress({ value, max, size = 64, strokeWidth = 5, color = '#89bcbe', bgColor = 'rgba(137,188,190,0.15)' }: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min((value / (max || 1)) * 100, 100)
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={bgColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  )
}

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

  // Estados para modal de audiência (vindo do card Atenção Imediata)
  const [audienciaDetailOpen, setAudienciaDetailOpen] = useState(false)
  const [audienciaSelecionada, setAudienciaSelecionada] = useState<AudienciaProxima | null>(null)
  const [audienciasListOpen, setAudienciasListOpen] = useState(false)
  const [audienciasProximas, setAudienciasProximas] = useState<AudienciaProxima[]>([])

  // Estados para multi-escritório
  const [escritoriosGrupo, setEscritoriosGrupo] = useState<EscritorioComRole[]>([])
  const [escritoriosSelecionados, setEscritoriosSelecionados] = useState<string[]>([])
  const [seletorAberto, setSeletorAberto] = useState(false)

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

  // Estado para publicações colapsáveis
  const [pubExpanded, setPubExpanded] = useState(false)

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

  // Carregar escritórios do grupo
  useEffect(() => {
    const loadEscritoriosGrupo = async () => {
      try {
        const escritorios = await getEscritoriosDoGrupo()
        setEscritoriosGrupo(escritorios)
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

  const getSeletorLabel = () => {
    if (escritoriosSelecionados.length === 0) return 'Selecione'
    if (escritoriosSelecionados.length === escritoriosGrupo.length) return 'Todos os escritórios'
    if (escritoriosSelecionados.length === 1) {
      const escritorio = escritoriosGrupo.find(e => e.id === escritoriosSelecionados[0])
      return escritorio?.nome || 'Escritório'
    }
    return `${escritoriosSelecionados.length} escritórios`
  }

  // Hook para updateTarefa (necessário para edição de tarefas via wizard)
  const { updateTarefa } = useTarefas(escritorioAtivo || undefined)

  // Hooks de dados
  const { metrics, loading: loadingMetrics } = useDashboardMetrics()
  const { items: agendaItems, loading: loadingAgenda, isEmpty: isAgendaEmpty, audienciasHoje, prazosHoje, refresh: refreshAgenda } = useDashboardAgenda()
  const { equipe, totalHorasEquipe, currentUserId, loading: loadingPerformance } = useDashboardPerformance()
  const { publicacoes, loading: loadingPublicacoes, isEmpty: isPublicacoesEmpty } = useDashboardPublicacoes()
  const { resumo, loading: loadingResumo, refresh: refreshResumo, tempoDesdeAtualizacao } = useDashboardResumoIA()
  const { insights, loading: loadingInsights, hasPermission: hasInsightsPermission, refresh: refreshInsights } = useDashboardInsightsIA()

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
    } else if (item.tipo === 'tarefa' || item.tipo === 'prazo') {
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
        setTarefaDetailData(null)
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
      setTarefaDetailData(null)
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
      setAgendaAudienciaData(null)
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
      setEventoDetailData(null)
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
      setAgendaAudienciaData(null)
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
      setEventoDetailData(null)
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-[#f0f9f9]/30 to-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center shadow-lg">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <p className="text-sm text-[#46627f] font-medium">Preparando seu dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#f0f9f9]/20 to-slate-50">
      {/* ═══════════════════════════════════════════════════════════════
          HERO BANNER - Light gradient with decorative elements
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#f0f9f9] via-[#e8f5f5]/60 to-slate-50 px-4 md:px-6 pt-3 md:pt-4 pb-8 md:pb-10 relative overflow-hidden border-b border-[#aacfd0]/20">
        {/* Decorative geometric shapes - hidden on mobile */}
        <div className="hidden md:block">
          <div className="absolute top-6 right-[14%] w-28 h-28 rounded-2xl bg-[#34495e]/[0.08] rotate-12" />
          <div className="absolute bottom-3 right-[32%] w-20 h-20 rounded-xl bg-[#89bcbe]/[0.12] -rotate-6" />
          <div className="absolute bottom-6 left-[12%] w-16 h-16 rounded-2xl bg-[#89bcbe]/[0.09] rotate-[35deg]" />
          <div className="absolute top-[35%] left-[32%] w-20 h-20 rounded-full border-2 border-[#89bcbe]/[0.14]" />
          <div className="absolute top-[45%] left-[8%] w-2.5 h-2.5 rounded-full bg-[#89bcbe]/[0.22]" />
          <div className="absolute top-[25%] right-[22%] w-2 h-2 rounded-full bg-[#34495e]/[0.18]" />
          <div className="absolute bottom-8 left-[22%] w-3 h-3 rounded-full bg-[#46627f]/[0.16]" />
          <div className="absolute top-3 left-[38%] w-1.5 h-1.5 rounded-full bg-[#89bcbe]/[0.25]" />
          <div className="absolute top-[15%] left-[18%] w-2 h-2 rounded-full bg-[#89bcbe]/20" />
          <div className="absolute top-[50%] left-[60%] opacity-[0.10]">
            <div className="w-5 h-[2px] bg-[#34495e] rounded-full" />
            <div className="w-[2px] h-5 bg-[#34495e] rounded-full -mt-3.5 ml-[9px]" />
          </div>
        </div>

        <div className="relative z-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[#89bcbe] text-[10px] font-medium tracking-wide uppercase">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick Action Pills - scrollable on mobile */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { label: 'Tarefa', icon: CheckSquare, action: () => setTarefaModalOpen(true) },
                  { label: 'Processo', icon: Briefcase, action: () => setProcessoModalOpen(true) },
                  { label: 'Consultivo', icon: Scale, action: () => setConsultaModalOpen(true) },
                  { label: 'Horas', icon: Timer, action: () => setTimesheetModalOpen(true) },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#46627f] hover:bg-[#3d5a80] active:bg-[#2d4a60] shadow-sm hover:shadow transition-all text-xs text-white/90 hover:text-white border border-[#46627f]/80 whitespace-nowrap"
                  >
                    <btn.icon className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{btn.label}</span>
                  </button>
                ))}
              </div>

              {/* Seletor de Escritórios */}
              {escritoriosGrupo.length > 1 && (
                <Popover open={seletorAberto} onOpenChange={setSeletorAberto}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-8 px-3 gap-2 text-[#46627f] hover:text-[#34495e] hover:bg-white/70 border border-[#aacfd0]/30 shadow-sm"
                      )}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{getSeletorLabel()}</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="end">
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-xs font-medium text-[#34495e]">Visualizar dados de:</p>
                    </div>
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
                                <p className="text-sm font-medium text-[#34495e] truncate">{escritorio.nome}</p>
                                {isAtivo && (
                                  <span className="text-[9px] font-medium text-[#89bcbe] bg-[#89bcbe]/10 px-1.5 py-0.5 rounded">Atual</span>
                                )}
                              </div>
                              {escritorio.cnpj && <p className="text-[10px] text-slate-400 truncate">{escritorio.cnpj}</p>}
                            </div>
                            {escritoriosSelecionados.length > 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); selecionarApenas(escritorio.id) }}
                                className="text-[10px] text-[#89bcbe] hover:text-[#6ba9ab] hover:underline whitespace-nowrap"
                              >
                                Apenas
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
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
          </div>

          {/* Greeting + AI Summary */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-[#34495e] mb-0.5">
                {saudacao}{nomeUsuario ? `, ${nomeUsuario}!` : '!'}
              </h1>
              {loadingResumo ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-[#89bcbe] animate-spin" />
                  <span className="text-sm text-[#46627f]/60">Analisando seu dia...</span>
                </div>
              ) : (
                <p className="text-sm text-[#46627f]/80 leading-relaxed max-w-2xl line-clamp-2">
                  {resumo.mensagem}
                </p>
              )}

              {/* Quick stat pills */}
              {!loadingResumo && resumo.dados && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {resumo.dados.audiencias > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-[11px] font-medium text-red-600 border border-red-100">
                      <Gavel className="w-3 h-3" />
                      {resumo.dados.audiencias} {resumo.dados.audiencias === 1 ? 'audiência' : 'audiências'}
                    </span>
                  )}
                  {resumo.dados.tarefas > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8f5f5] text-[11px] font-medium text-[#46627f] border border-[#aacfd0]/30">
                      <CheckSquare className="w-3 h-3" />
                      {resumo.dados.tarefas} {resumo.dados.tarefas === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  )}
                  {resumo.dados.eventos > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[11px] font-medium text-blue-600 border border-blue-100">
                      <Calendar className="w-3 h-3" />
                      {resumo.dados.eventos} {resumo.dados.eventos === 1 ? 'evento' : 'eventos'}
                    </span>
                  )}
                  {resumo.dados.prazos_urgentes > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-[11px] font-semibold text-amber-600 border border-amber-100">
                      <Zap className="w-3 h-3" />
                      {resumo.dados.prazos_urgentes} {resumo.dados.prazos_urgentes === 1 ? 'prazo urgente' : 'prazos urgentes'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Refresh */}
            <div className="flex items-center gap-1.5 ml-4 flex-shrink-0">
              <span className="text-[10px] text-[#46627f]/40">{loadingResumo ? '' : tempoDesdeAtualizacao}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-[#46627f]/50 hover:text-[#34495e] hover:bg-white/60"
                onClick={() => refreshResumo()}
                disabled={loadingResumo}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loadingResumo && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          KPI STRIP - Floating cards overlapping the hero
          ═══════════════════════════════════════════════════════════════ */}
      <div className="px-4 md:px-6 -mt-6 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          {[
            {
              label: 'Processos Ativos',
              value: metrics?.processos_ativos || 0,
              trend: metrics?.processos_trend_qtd,
              trendLabel: 'este mês',
              icon: Briefcase,
              gradient: 'from-[#34495e] to-[#4a6fa5]',
              iconBg: 'bg-white/15',
            },
            {
              label: 'Clientes Ativos',
              value: metrics?.clientes_ativos || 0,
              trend: metrics?.clientes_trend_qtd,
              trendLabel: 'este mês',
              icon: Users,
              gradient: 'from-[#46627f] to-[#5a8f9e]',
              iconBg: 'bg-white/15',
            },
            {
              label: 'Casos Consultivos',
              value: metrics?.consultas_abertas || 0,
              trend: metrics?.consultas_trend_qtd,
              trendLabel: 'este mês',
              icon: FileText,
              gradient: 'from-[#5a8f9e] to-[#89bcbe]',
              iconBg: 'bg-white/20',
            },
            {
              label: 'Horas Cobráveis',
              value: formatHoras(metrics?.horas_cobraveis || 0, 'curto'),
              trend: metrics?.horas_cobraveis_trend_percent,
              trendLabel: 'vs mês',
              trendSuffix: '%',
              icon: Activity,
              gradient: 'from-[#89bcbe] to-[#6ba9ab]',
              iconBg: 'bg-white/20',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={cn(
                "rounded-2xl p-3 md:p-4 bg-gradient-to-br shadow-[0_6px_28px_-4px_rgba(52,73,94,0.35)] hover:shadow-[0_12px_40px_-6px_rgba(52,73,94,0.45)] transition-all duration-300 hover:-translate-y-1",
                kpi.gradient
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-white/80">{kpi.label}</span>
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                  <kpi.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-lg md:text-2xl font-bold text-white tracking-tight">{kpi.value}</div>
              {(kpi.trend ?? 0) !== 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  {(kpi.trend ?? 0) > 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-300" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-300" />
                  )}
                  <span className={cn(
                    "text-[10px] font-semibold",
                    (kpi.trend ?? 0) > 0 ? "text-emerald-300" : "text-red-300"
                  )}>
                    {(kpi.trend ?? 0) > 0 ? '+' : ''}{kpi.trend}{kpi.trendSuffix || ''}
                  </span>
                  <span className="text-[10px] text-white/50">{kpi.trendLabel}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════ */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-8 space-y-4 md:space-y-5">
        {/* Row 1: Agenda + Meus Números */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── AGENDA DO DIA (Hero) ── */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(52,73,94,0.18)] hover:shadow-[0_10px_35px_-6px_rgba(52,73,94,0.25)] transition-all duration-300 overflow-hidden">
              {/* Agenda Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-[#34495e]">Agenda do Dia</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {agendaItems.length > 0
                      ? `${agendaItems.length} ${agendaItems.length === 1 ? 'compromisso' : 'compromissos'} hoje`
                      : 'Nenhum compromisso'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {audienciasHoje > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-[10px] font-semibold text-red-600">
                      {audienciasHoje} {audienciasHoje === 1 ? 'audiência' : 'audiências'}
                    </span>
                  )}
                  {prazosHoje > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[10px] font-semibold text-amber-600">
                      {prazosHoje} {prazosHoje === 1 ? 'prazo' : 'prazos'}
                    </span>
                  )}
                  <Link href="/dashboard/agenda" className="text-[11px] font-medium text-[#89bcbe] hover:text-[#6ba9ab] transition-colors">
                    Ver agenda →
                  </Link>
                </div>
              </div>

              {/* Agenda Items */}
              <div className="px-5 pb-4">
                <div className="min-h-[280px] flex flex-col">
                  {loadingAgenda ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
                    </div>
                  ) : isAgendaEmpty ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium text-[#34495e] mb-1">Dia livre!</p>
                      <p className="text-xs text-slate-400">Aproveite para organizar suas tarefas ou registrar horas</p>
                    </div>
                  ) : (
                    <>
                      {/* Items area */}
                      <div className="flex-1">
                        <div className="space-y-0.5">
                          {agendaItems
                            .slice(agendaPage * AGENDA_PER_PAGE, (agendaPage + 1) * AGENDA_PER_PAGE)
                            .map((event, index) => {
                              const dotColor: Record<string, string> = {
                                audiencia: 'bg-red-500',
                                prazo: 'bg-amber-500',
                                tarefa: 'bg-[#89bcbe]',
                                evento: 'bg-[#1E3A8A]',
                              }
                              const badgeConfig: Record<string, { className: string; label: string }> = {
                                audiencia: { className: 'text-red-600', label: 'Audiência' },
                                prazo: { className: 'text-amber-600', label: 'Prazo' },
                                tarefa: { className: 'text-[#46627f]', label: 'Tarefa' },
                                evento: { className: 'text-[#1E3A8A]', label: 'Evento' },
                              }
                              const dot = dotColor[event.tipo] || dotColor.evento
                              const badge = badgeConfig[event.tipo] || badgeConfig.evento
                              const temHorario = event.time && event.time !== 'Dia todo'

                              return (
                                <button
                                  key={`${event.id}-${index}`}
                                  onClick={() => handleAgendaItemClick(event)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left group"
                                >
                                  {/* Dot */}
                                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-sm font-medium text-[#34495e] truncate group-hover:text-[#1E3A8A] transition-colors">{event.title}</p>
                                    </div>
                                    {event.subtitle && (
                                      <p className="text-[11px] text-slate-400 truncate">{event.subtitle}</p>
                                    )}
                                  </div>

                                  {/* Time + Type */}
                                  <div className="flex items-center gap-2.5 flex-shrink-0">
                                    {(event.tipo === 'audiencia' || event.tipo === 'evento') && temHorario && (
                                      <span className="text-xs text-slate-500 tabular-nums">
                                        {event.time}
                                      </span>
                                    )}
                                    <span className={cn("text-[10px] font-medium", badge.className)}>
                                      {badge.label}
                                    </span>
                                  </div>
                                </button>
                              )
                            })}
                        </div>
                      </div>

                      {/* Pagination */}
                      {agendaItems.length > AGENDA_PER_PAGE && (
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400">
                            {agendaPage * AGENDA_PER_PAGE + 1}-{Math.min((agendaPage + 1) * AGENDA_PER_PAGE, agendaItems.length)} de {agendaItems.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setAgendaPage(p => Math.max(0, p - 1))}
                              disabled={agendaPage === 0}
                              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                            <button
                              onClick={() => setAgendaPage(p => Math.min(Math.ceil(agendaItems.length / AGENDA_PER_PAGE) - 1, p + 1))}
                              disabled={agendaPage >= Math.ceil(agendaItems.length / AGENDA_PER_PAGE) - 1}
                              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── MEUS NÚMEROS + ALERTAS ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Meus Números do Mês */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(52,73,94,0.18)] hover:shadow-[0_10px_35px_-6px_rgba(52,73,94,0.25)] transition-all duration-300 p-5">
              <h2 className="text-sm font-bold text-[#34495e] mb-4">Meus Números</h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Horas Cobráveis */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <CircularProgress
                      value={metrics?.horas_cobraveis_usuario || 0}
                      max={metrics?.horas_meta || 160}
                      size={56}
                      strokeWidth={5}
                      color="#89bcbe"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#34495e]">{Math.round(progressoHoras)}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 mb-0.5">Horas Cobráveis</p>
                    <p className="text-sm font-bold text-[#34495e]">{formatHoras(metrics?.horas_cobraveis_usuario || 0, 'curto')}</p>
                    <p className="text-[9px] text-slate-400">de {formatHoras(metrics?.horas_meta || 160, 'curto')}</p>
                    {(metrics?.horas_ja_faturadas_usuario ?? 0) > 0 && (
                      <p className="text-[9px] text-emerald-500">{formatHoras(metrics?.horas_ja_faturadas_usuario || 0, 'curto')} já faturadas</p>
                    )}
                  </div>
                </div>

                {/* Honorários */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <CircularProgress
                      value={metrics?.honorarios_mes || 0}
                      max={metrics?.receita_meta || 40000}
                      size={56}
                      strokeWidth={5}
                      color="#10b981"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#34495e]">{Math.round(progressoReceita)}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 mb-0.5">Honorários</p>
                    <p className="text-sm font-bold text-[#34495e]">{formatCurrency(metrics?.honorarios_mes || 0)}</p>
                    <p className="text-[9px] text-slate-400">Meta: {formatCurrency(metrics?.receita_meta || 40000)}</p>
                  </div>
                </div>
              </div>

              {/* Horas não cobráveis - compact */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-[11px] text-slate-500">Horas não cobráveis</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{formatHoras(metrics?.horas_nao_cobraveis || 0, 'curto')}</span>
                </div>
                {(metrics?.valor_horas_nao_cobraveis ?? 0) > 0 && (
                  <p className="text-[9px] text-slate-400 ml-4 mt-0.5">
                    Oportunidade: {formatCurrency(metrics?.valor_horas_nao_cobraveis || 0)}
                  </p>
                )}
                {(metrics?.horas_trend_valor ?? 0) !== 0 && (
                  <div className="flex items-center gap-1 ml-4 mt-1">
                    {(metrics?.horas_trend_valor ?? 0) > 0 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    <span className={cn(
                      "text-[10px] font-medium",
                      (metrics?.horas_trend_valor ?? 0) > 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {formatHoras(Math.abs(metrics?.horas_trend_valor || 0), 'curto')} vs mês passado
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Atenção Imediata */}
            <AlertasCard onAudienciasClick={handleAudienciasClick} />
          </div>
        </div>

        {/* Row 2: Performance + Publicações/Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── PERFORMANCE DE HORAS ── */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(52,73,94,0.18)] hover:shadow-[0_10px_35px_-6px_rgba(52,73,94,0.25)] transition-all duration-300 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-sm font-bold text-[#34495e]">Performance da Equipe</h2>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setHorasViewMode('list')}
                    className={cn("p-1.5 rounded-md transition-all", horasViewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-slate-200')}
                  >
                    <List className={cn("w-3.5 h-3.5", horasViewMode === 'list' ? 'text-[#1E3A8A]' : 'text-slate-400')} />
                  </button>
                  <button
                    onClick={() => setHorasViewMode('bars')}
                    className={cn("p-1.5 rounded-md transition-all", horasViewMode === 'bars' ? 'bg-white shadow-sm' : 'hover:bg-slate-200')}
                  >
                    <BarChart3 className={cn("w-3.5 h-3.5", horasViewMode === 'bars' ? 'text-[#1E3A8A]' : 'text-slate-400')} />
                  </button>
                </div>
              </div>

              <div className="px-5 pb-5">
                {loadingPerformance ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-[#89bcbe] animate-spin" />
                  </div>
                ) : equipe.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="Sem registro de horas"
                    description="Registre horas no timesheet para ver métricas"
                    variant="default"
                  />
                ) : horasViewMode === 'list' ? (
                  <div className="space-y-3">
                    <ScrollArea className={equipe.length > 5 ? "h-[200px] pr-2" : ""}>
                      <div className="space-y-2">
                        {equipe.map((membro, index) => {
                          const isCurrentUser = membro.id === currentUserId
                          const position = index + 1
                          const cobraveisPercent = membro.horas > 0 ? (membro.horasCobraveis / membro.horas) * 100 : 0
                          const naoCobraveisPercent = membro.horas > 0 ? (membro.horasNaoCobraveis / membro.horas) * 100 : 0

                          return (
                            <div key={membro.id} className={cn(
                              "flex items-center gap-3 p-2 rounded-xl transition-colors",
                              isCurrentUser ? "bg-[#f0f9f9]" : "hover:bg-slate-50"
                            )}>
                              {/* Position */}
                              <span className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                                position <= 3 ? "bg-[#89bcbe]/15 text-[#46627f]" : "bg-slate-50 text-slate-400"
                              )}>
                                {position}
                              </span>

                              {/* Name + Bar */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-xs font-semibold text-[#34495e] truncate">{membro.nome}</span>
                                  {isCurrentUser && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-[#89bcbe]/20 text-[8px] font-bold text-[#46627f]">
                                      Você
                                    </span>
                                  )}
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                  <div
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${cobraveisPercent}%` }}
                                  />
                                  <div
                                    className="h-full bg-[#34495e] transition-all duration-500"
                                    style={{ width: `${naoCobraveisPercent}%` }}
                                  />
                                </div>
                              </div>

                              {/* Hours */}
                              <span className="text-xs font-bold text-[#34495e] tabular-nums flex-shrink-0">
                                {formatHoras(membro.horas, 'curto')}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                    {/* Legend + Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-slate-400">Cobráveis</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-1.5 rounded-full bg-[#34495e]" />
                          <span className="text-[10px] text-slate-400">Não cobráveis</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">Total: <span className="font-semibold text-[#34495e]">{formatHoras(totalHorasEquipe, 'curto')}</span></span>
                    </div>
                  </div>
                ) : (
                  /* Bar chart view */
                  <div className="space-y-3">
                    <div className="flex items-end justify-center gap-3 h-[180px] pt-4">
                      {equipe.slice(0, 6).map((membro) => {
                        const isCurrentUser = membro.id === currentUserId
                        const maxHoras = equipe[0]?.horas || 1
                        const totalHeight = (membro.horas / maxHoras) * 100
                        const cobraveisPercent = membro.horas > 0 ? (membro.horasCobraveis / membro.horas) * 100 : 0
                        const naoCobraveisPercent = membro.horas > 0 ? (membro.horasNaoCobraveis / membro.horas) * 100 : 0

                        return (
                          <div key={membro.id} className="flex flex-col items-center group" style={{ width: `${100 / Math.min(equipe.length, 6)}%`, maxWidth: '80px' }}>
                            <div className="w-full max-w-[36px] flex flex-col justify-end h-[130px] mx-auto">
                              <div className="w-full flex flex-col rounded-t overflow-hidden transition-all duration-500" style={{ height: `${totalHeight}%` }}>
                                {naoCobraveisPercent > 0 && (
                                  <div
                                    className="w-full bg-[#34495e] transition-all duration-500"
                                    style={{ height: `${naoCobraveisPercent}%` }}
                                  />
                                )}
                                {cobraveisPercent > 0 && (
                                  <div
                                    className="w-full bg-emerald-500 transition-all duration-500"
                                    style={{ height: `${cobraveisPercent}%` }}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-center mt-2">
                              <span className={cn(
                                "text-[10px] truncate max-w-[60px] text-center",
                                isCurrentUser ? 'font-semibold text-[#34495e]' : 'text-slate-400'
                              )}>
                                {isCurrentUser ? 'Você' : membro.nome.split(' ')[0]}
                              </span>
                              <span className="text-[10px] font-semibold text-[#34495e]">
                                {formatHoras(membro.horas, 'curto')}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-slate-400">Cobráveis</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-1.5 rounded-full bg-[#34495e]" />
                          <span className="text-[10px] text-slate-400">Não cobráveis</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">Total: <span className="font-semibold text-[#34495e]">{formatHoras(totalHorasEquipe, 'curto')}</span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Publications + Insights ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Publicações (Collapsible) */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(52,73,94,0.18)] hover:shadow-[0_10px_35px_-6px_rgba(52,73,94,0.25)] transition-all duration-300 overflow-hidden">
              <Collapsible open={pubExpanded} onOpenChange={setPubExpanded}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#34495e]">Publicações</span>
                      {!loadingPublicacoes && !isPublicacoesEmpty && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          {publicacoes.length}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-slate-300 transition-transform duration-200",
                      pubExpanded && "rotate-180"
                    )} />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-5 pb-4 space-y-2">
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
                      <>
                        {publicacoes.slice(0, 4).map((pub) => (
                          <Link key={pub.id} href={`/dashboard/publicacoes/${pub.id}`} className="block">
                            <div className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-[#34495e] truncate">{pub.processo}</p>
                                  <p className="text-[11px] text-slate-400 truncate">{pub.conteudo}</p>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                        <Link href="/dashboard/publicacoes" className="block">
                          <p className="text-center py-1.5 text-[11px] text-slate-400 hover:text-[#89bcbe] transition-colors">
                            Ver todas →
                          </p>
                        </Link>
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Insights de Gestão */}
            {hasInsightsPermission && (
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(52,73,94,0.18)] hover:shadow-[0_10px_35px_-6px_rgba(52,73,94,0.25)] transition-all duration-300 overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h2 className="text-sm font-bold text-[#34495e]">Insights IA</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-slate-100 rounded-lg"
                    onClick={() => refreshInsights()}
                    disabled={loadingInsights}
                  >
                    {loadingInsights ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#89bcbe]" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </Button>
                </div>
                <div className="px-5 pb-5 space-y-2">
                  {loadingInsights ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="w-4 h-4 text-[#89bcbe] animate-spin" />
                    </div>
                  ) : insights.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-3">Nenhum insight disponível</p>
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
                </div>
              </div>
            )}
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
                    onClick={() => { shortcut.action(); setCommandOpen(false) }}
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
            if (!open && !tarefaModalOpen) setTarefaDetailData(null)
          }}
          tarefa={tarefaDetailData}
          onUpdate={refreshAgenda}
          onEdit={handleDashEditTarefa}
          onConcluir={() => handleDashCompleteTask(tarefaDetailData.id)}
          onReabrir={() => handleDashReopenTask(tarefaDetailData.id)}
          onLancarHoras={handleDashLancarHoras}
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
              setAgendaAudienciaData(null)
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
              setEventoDetailData(null)
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
            <DialogTitle className="text-[#34495e]">Concluir sem registrar horas?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
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
            <DialogTitle className="flex items-center gap-2 text-[#34495e]">
              <Gavel className="w-4 h-4 text-amber-500" />
              Audiências nos próximos 7 dias
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
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
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#34495e] truncate">{aud.titulo}</span>
                  <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">{aud.tipo_audiencia || 'Audiência'}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500">
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
