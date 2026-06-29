'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Scale,
  Calendar,
  FileText,
  Upload,
  Plus,
  Edit,
  Download,
  Save,
  ListTodo,
  Loader2,
  Copy,
  Check,
  Archive,
  RotateCcw,
  ArrowRight,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  CalendarClock,
  Gavel,
  Clock,
  Activity
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatBrazilDateTime, formatBrazilDate, parseDateInBrazil, parseDBDate } from '@/lib/timezone'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import TarefaDetailModal from '@/components/agenda/TarefaDetailModal'
import EventoDetailModal from '@/components/agenda/EventoDetailModal'
import AudienciaDetailModal from '@/components/agenda/AudienciaDetailModal'
import AgendaCancelarModal, { TipoAgenda } from '@/components/agenda/AgendaCancelarModal'
import TransformarConsultivoWizard from '@/components/consultivo/TransformarConsultivoWizard'
import EditarConsultivoModal from '@/components/consultivo/EditarConsultivoModal'
import RegistrarAndamentoConsultivoModal from '@/components/consultivo/RegistrarAndamentoConsultivoModal'
import ConsultaDocumentos from '@/components/consultivo/ConsultaDocumentos'
import ConsultivoFinanceiroCard from '@/components/consultivo/ConsultivoFinanceiroCard'
// (anexos agora vivem no componente ConsultaDocumentos)
import { CONSULTIVO_ANDAMENTO_TIPOS, type ConsultivoAndamentoTipo } from '@/lib/constants/consultivo-andamento-tipos'
import { TIPOS_CONSULTA, type TipoConsulta } from '@/lib/constants/consultivo-tipos'
import ProcessoCobrancaFixaCard from '@/components/processos/ProcessoCobrancaFixaCard'
import TimesheetModal from '@/components/financeiro/TimesheetModal'
import DespesaModal from '@/components/financeiro/DespesaModal'
import ReceitaModal from '@/components/financeiro/ReceitaModal'
import type { TarefaFormData } from '@/hooks/useTarefas'

interface Consulta {
  id: string
  numero: string | null
  titulo: string
  descricao: string | null
  cliente_id: string
  cliente_nome: string
  tipo: string | null
  area: string
  status: string
  prioridade: string
  prazo: string | null
  responsavel_id: string
  responsavel_nome: string
  responsaveis_ids: string[] | null
  contrato_id: string | null
  anexos: any[]
  andamentos: any[]
  created_at: string
  updated_at: string
}

interface Andamento {
  data: string
  tipo?: string
  descricao: string
  user_id?: string
  referencia_tipo?: string
  referencia_id?: string
}

interface Movimentacao {
  id: string
  data: string
  tipo: string
  tipo_descricao: string | null
  descricao: string
  origem: string
  referencia_tipo: string | null
  referencia_id: string | null
  visivel_cliente: boolean
}

// ── Tokens e helpers do visual V4 (alinhados ao detalhe de Processos) ──
const V4_CARD = 'rounded-xl border border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] overflow-hidden'
const V4_HEADER = 'px-5 py-3 bg-[#f3f0e8] dark:bg-[#0f141c] border-b border-[#e6e3da] dark:border-[#253345] flex items-center gap-2'
const V4_HEADER_TITLE = 'text-[12.5px] font-bold text-[#2c3e50] dark:text-slate-200 tracking-[-0.01em]'

function inic(nome: string): string {
  const p = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '—'
  if (p.length === 1) return p[0].charAt(0).toUpperCase()
  return (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase()
}

function diaSemana(d: Date): string {
  return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()] ?? ''
}

export default function ConsultaDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(false)

  // Andamentos (tabela consultivo_movimentacoes)
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(true)
  const [novoAndamentoModalOpen, setNovoAndamentoModalOpen] = useState(false)

  // Editar andamento (apenas manuais)
  const [editandoAndamento, setEditandoAndamento] = useState<{ id: string; descricao: string } | null>(null)
  const [editAndamentoOpen, setEditAndamentoOpen] = useState(false)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Excluir andamento
  const [excluindoAndamentoId, setExcluindoAndamentoId] = useState<string | null>(null)
  const [deleteAndamentoOpen, setDeleteAndamentoOpen] = useState(false)

  // Detalhe de andamento
  const [selectedAndamento, setSelectedAndamento] = useState<Movimentacao | null>(null)
  const [andamentoTarefaDescricao, setAndamentoTarefaDescricao] = useState<string | null>(null)


  // Carregar descrição da tarefa vinculada quando o modal de andamento abre
  useEffect(() => {
    if (!selectedAndamento?.referencia_id || selectedAndamento?.referencia_tipo !== 'agenda_tarefas') {
      setAndamentoTarefaDescricao(null)
      return
    }
    const loadDescricao = async () => {
      const { data } = await supabase
        .from('agenda_tarefas')
        .select('descricao')
        .eq('id', selectedAndamento.referencia_id!)
        .single()
      setAndamentoTarefaDescricao(data?.descricao || null)
    }
    loadDescricao()
  }, [selectedAndamento?.referencia_id, selectedAndamento?.referencia_tipo])

  // Paginação de andamentos
  const [andamentoPage, setAndamentoPage] = useState(1)
  const andamentosPerPage = 5

  // Estados para Agenda
  const [agendaItems, setAgendaItems] = useState<any[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(true)
  const [agendaPage, setAgendaPage] = useState(1)
  const agendaPerPage = 5
  const [showTarefaWizard, setShowTarefaWizard] = useState(false)
  const [showEventoWizard, setShowEventoWizard] = useState(false)
  const [showAudienciaWizard, setShowAudienciaWizard] = useState(false)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Estados para Modais de Detalhes
  const [selectedTarefa, setSelectedTarefa] = useState<any | null>(null)
  const [selectedEvento, setSelectedEvento] = useState<any | null>(null)
  const [selectedAudiencia, setSelectedAudiencia] = useState<any | null>(null)
  const [tarefaDetailOpen, setTarefaDetailOpen] = useState(false)
  const [eventoDetailOpen, setEventoDetailOpen] = useState(false)
  const [audienciaDetailOpen, setAudienciaDetailOpen] = useState(false)

  // Estados para edição de tarefa/evento/audiência
  const [editingTarefa, setEditingTarefa] = useState(false)
  const [editingEvento, setEditingEvento] = useState(false)
  const [editingAudiencia, setEditingAudiencia] = useState(false)

  // Modal de cancelamento (genérico para tarefa/evento/audiência)
  const [cancelarModalOpen, setCancelarModalOpen] = useState(false)
  const [cancelarTarget, setCancelarTarget] = useState<{
    tipo: TipoAgenda
    registro: {
      id: string
      titulo: string
      data: string
      recorrencia_id?: string | null
    }
  } | null>(null)

  const openCancelarModal = (
    tipo: TipoAgenda,
    registro: { id: string; titulo: string; data: string; recorrencia_id?: string | null },
  ) => {
    setTarefaDetailOpen(false)
    setEventoDetailOpen(false)
    setAudienciaDetailOpen(false)
    setTimeout(() => {
      setCancelarTarget({ tipo, registro })
      setCancelarModalOpen(true)
    }, 150)
  }

  // Estados para Financeiro
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false)
  const [despesaModalOpen, setDespesaModalOpen] = useState(false)
  const [receitaModalOpen, setReceitaModalOpen] = useState(false)
  const [financeiroRefreshTrigger, setFinanceiroRefreshTrigger] = useState(0)
  const [editTimesheetEntry, setEditTimesheetEntry] = useState<import('@/hooks/useConsultivoFinanceiro').TimesheetEntry | null>(null)
  const [editTimesheetModalOpen, setEditTimesheetModalOpen] = useState(false)

  // Estados para conclusão com modal de horas
  const [tarefaParaConcluirId, setTarefaParaConcluirId] = useState<string | null>(null)
  const [confirmSemHoras, setConfirmSemHoras] = useState(false)
  const horasRegistradasRef = useRef(false)

  // Estado para Transformar em Processo
  const [transformarModalOpen, setTransformarModalOpen] = useState(false)

  // Estado para Editar Consultivo
  const [editarModalOpen, setEditarModalOpen] = useState(false)

  // Carregar dados do usuário
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('escritorio_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setEscritorioId(profile.escritorio_id)
        }
      }
    }
    loadUserData()
  }, [])

  // Carregar consulta
  useEffect(() => {
    if (params.id) {
      loadConsulta()
    }
  }, [params.id])

  const loadConsulta = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('consultivo_consultas')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      // Buscar cliente e responsável
      const [clienteRes, responsavelRes] = await Promise.all([
        supabase.from('crm_pessoas').select('nome_completo').eq('id', data.cliente_id).single(),
        supabase.from('profiles').select('nome_completo').eq('id', data.responsavel_id).single()
      ])

      const consultaFormatada: Consulta = {
        ...data,
        cliente_nome: clienteRes.data?.nome_completo || 'N/A',
        responsavel_nome: responsavelRes.data?.nome_completo || 'N/A'
      }

      setConsulta(consultaFormatada)
      setLoading(false)

      // Registrar acesso do usuário (alimenta "Acessadas recentemente"). Silencioso.
      void (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user || !data.escritorio_id) return
          await supabase.from('consultivo_acessos').upsert(
            {
              user_id: user.id,
              consulta_id: data.id,
              escritorio_id: data.escritorio_id,
              acessado_em: new Date().toISOString(),
            },
            { onConflict: 'user_id,consulta_id' }
          )
        } catch {
          /* não-crítico */
        }
      })()
    } catch (error) {
      console.error('Erro ao carregar consulta:', error)
      toast.error('Erro ao carregar consulta')
      setLoading(false)
    }
  }

  // Carregar agenda
  useEffect(() => {
    if (params.id) {
      loadAgenda()
    }
  }, [params.id])

  // Carregar andamentos (tabela)
  useEffect(() => {
    if (params.id) {
      loadMovimentacoes()
    }
  }, [params.id])

  const loadAgenda = async () => {
    try {
      setLoadingAgenda(true)

      // RPC get_agenda_consultivo: já consolida tarefas/eventos/audiências, exclui
      // itens encerrados/cancelados, vem ordenada por data_inicio e — crucial —
      // converte a data da tarefa (tipo date) para o meio-dia de Brasília, evitando
      // o "dia anterior" que acontecia ao ler a data crua com new Date().
      const { data, error } = await supabase
        .rpc('get_agenda_consultivo', { p_consultivo_id: params.id })

      if (error) {
        console.error('Erro ao carregar agenda do consultivo via RPC:', error)
      }

      setAgendaItems(data ?? [])
      setLoadingAgenda(false)
      // Conclusões de tarefa/compromisso geram andamento automático na tabela → recarrega a timeline
      void loadMovimentacoes()
    } catch (error) {
      console.error('Erro ao carregar agenda:', error)
      setLoadingAgenda(false)
    }
  }

  // Carregar andamentos da tabela consultivo_movimentacoes (ordenados do mais recente)
  const loadMovimentacoes = async () => {
    if (!params.id) return
    try {
      setLoadingMovimentacoes(true)
      const { data, error } = await supabase
        .from('consultivo_movimentacoes')
        .select('id, data_movimento, tipo_codigo, tipo_descricao, descricao, origem, referencia_tipo, referencia_id, visivel_cliente')
        .eq('consulta_id', params.id)
        .order('data_movimento', { ascending: false })

      if (error) throw error

      setMovimentacoes((data || []).map((m: any) => ({
        id: m.id,
        data: m.data_movimento,
        tipo: m.tipo_codigo,
        tipo_descricao: m.tipo_descricao,
        descricao: m.descricao,
        origem: m.origem,
        referencia_tipo: m.referencia_tipo,
        referencia_id: m.referencia_id,
        visivel_cliente: m.visivel_cliente,
      })))
    } catch (error) {
      console.error('Erro ao carregar andamentos:', error)
    } finally {
      setLoadingMovimentacoes(false)
    }
  }

  // Editar andamento (apenas manuais)
  const handleEditAndamento = (mov: Movimentacao) => {
    setEditandoAndamento({ id: mov.id, descricao: mov.descricao })
    setEditAndamentoOpen(true)
  }

  const handleSaveEditAndamento = async () => {
    if (!editandoAndamento || !editandoAndamento.descricao.trim()) {
      toast.error('Preencha a descrição')
      return
    }

    setSalvandoEdicao(true)
    try {
      const { error } = await supabase
        .from('consultivo_movimentacoes')
        .update({ descricao: editandoAndamento.descricao.trim() })
        .eq('id', editandoAndamento.id)

      if (error) throw error

      setEditAndamentoOpen(false)
      setEditandoAndamento(null)
      toast.success('Andamento atualizado')
      await loadMovimentacoes()
    } catch (error) {
      console.error('Erro ao editar andamento:', error)
      toast.error('Erro ao editar andamento')
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // Excluir andamento
  const handleDeleteAndamentoClick = (id: string) => {
    setExcluindoAndamentoId(id)
    setDeleteAndamentoOpen(true)
  }

  const handleConfirmDeleteAndamento = async () => {
    if (!excluindoAndamentoId) return

    try {
      const { error } = await supabase
        .from('consultivo_movimentacoes')
        .delete()
        .eq('id', excluindoAndamentoId)

      if (error) throw error

      setDeleteAndamentoOpen(false)
      setExcluindoAndamentoId(null)
      toast.success('Andamento excluído')

      const newTotal = Math.ceil((movimentacoes.length - 1) / andamentosPerPage)
      if (andamentoPage > newTotal && newTotal > 0) setAndamentoPage(newTotal)
      await loadMovimentacoes()
    } catch (error) {
      console.error('Erro ao excluir andamento:', error)
      toast.error('Erro ao excluir andamento')
    }
  }

  const copyId = () => {
    if (consulta?.numero) {
      navigator.clipboard.writeText(consulta.numero)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  const formatTipoAndamento = (tipo: string) => {
    const map: Record<string, string> = {
      'tarefa_concluida': 'Tarefa Concluída',
      'tarefa_criada': 'Tarefa Criada',
      'tarefa_reaberta': 'Tarefa Reaberta',
      'tarefa_cancelada': 'Tarefa Cancelada',
      'evento_criado': 'Evento Criado',
      'evento_cancelado': 'Evento Cancelado',
      'audiencia_realizada': 'Audiência Realizada',
      'audiencia_agendada': 'Audiência Agendada',
      'audiencia_cancelada': 'Audiência Cancelada',
      'andamento': 'Andamento',
      'manual': 'Andamento Manual',
      'reuniao': 'Reunião',
      'analise': 'Análise',
      'parecer': 'Parecer',
      'atualizacao': 'Atualização',
      'contrato_vinculado': 'Contrato Vinculado',
      'status_alterado': 'Status Alterado',
    }
    if (map[tipo]) return map[tipo]
    // Fallback: converter snake_case para texto legível
    return tipo
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatArea = (area: string) => {
    const map: Record<string, string> = {
      'civel': 'Cível', 'trabalhista': 'Trabalhista',
      'tributaria': 'Tributária', 'tributario': 'Tributário', // suporte legado
      'societaria': 'Societária', 'societario': 'Societário', // suporte legado
      'empresarial': 'Empresarial', 'contratual': 'Contratual', 'familia': 'Família',
      'criminal': 'Criminal', 'previdenciaria': 'Previdenciária',
      'consumidor': 'Consumidor', 'ambiental': 'Ambiental', 'imobiliario': 'Imobiliário',
      'propriedade_intelectual': 'Prop. Intelectual', 'compliance': 'Compliance',
      'outra': 'Outra', 'outros': 'Outros' // suporte legado
    }
    return map[area] || area
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ativo: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
      arquivado: 'bg-slate-100 dark:bg-surface-2 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    }
    const labels: Record<string, string> = {
      ativo: 'Ativo', arquivado: 'Arquivado',
    }
    return <Badge className={cn('text-[10px] border', styles[status] || styles.ativo)}>{labels[status] || status}</Badge>
  }

  // Arquivar/Desarquivar
  const handleToggleArchive = async () => {
    if (!consulta) return

    const novoStatus = consulta.status === 'arquivado' ? 'ativo' : 'arquivado'

    try {
      const { error } = await supabase
        .from('consultivo_consultas')
        .update({ status: novoStatus })
        .eq('id', consulta.id)

      if (error) throw error

      setConsulta(prev => prev ? { ...prev, status: novoStatus } : null)
      toast.success(novoStatus === 'arquivado' ? 'Consulta arquivada' : 'Consulta reativada')
    } catch (err) {
      console.error('Erro ao alterar status:', err)
      toast.error('Erro ao alterar status')
    }
  }

  // Handlers para Tarefas
  const handleEditTarefa = () => {
    setTarefaDetailOpen(false)
    setEditingTarefa(true)
    setShowTarefaWizard(true)
  }

  const handleDeleteTarefa = async (tarefaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return
    try {
      const { error } = await supabase.from('agenda_tarefas').delete().eq('id', tarefaId)
      if (error) throw error
      toast.success('Tarefa excluída com sucesso!')
      setTarefaDetailOpen(false)
      setSelectedTarefa(null)
      await loadAgenda()
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error)
      toast.error('Erro ao excluir tarefa')
    }
  }

  const handleConcluirTarefa = async (tarefaId: string) => {
    // Abrir modal de horas antes de concluir (consultivo sempre vinculado neste contexto)
    setTarefaParaConcluirId(tarefaId)
    horasRegistradasRef.current = false
    setTarefaDetailOpen(false)
    setTimesheetModalOpen(true)
  }

  // Executar conclusão direta (após horas ou sem horas)
  const executeConcluirTarefa = async (tarefaId: string) => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas')
        .update({ status: 'concluida', data_conclusao: new Date().toISOString() })
        .eq('id', tarefaId)
      if (error) throw error
      toast.success('Tarefa concluída!')
      setSelectedTarefa(null)
      await loadAgenda()
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error)
      toast.error('Erro ao concluir tarefa')
    }
  }

  const handleReabrirTarefa = async (tarefaId: string) => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas')
        .update({ status: 'pendente', data_conclusao: null })
        .eq('id', tarefaId)
      if (error) throw error
      toast.success('Tarefa reaberta!')
      setTarefaDetailOpen(false)
      setSelectedTarefa(null)
      await loadAgenda()
    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error)
      toast.error('Erro ao reabrir tarefa')
    }
  }

  const handleLancarHorasTarefa = () => {
    setTarefaDetailOpen(false)
    setTimesheetModalOpen(true)
  }

  // Handlers para Eventos
  const handleEditEvento = () => {
    setEventoDetailOpen(false)
    setEditingEvento(true)
    setShowEventoWizard(true)
  }

  const handleDeleteEvento = async (eventoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return
    try {
      const { error } = await supabase.from('agenda_eventos').delete().eq('id', eventoId)
      if (error) throw error
      toast.success('Evento excluído com sucesso!')
      setEventoDetailOpen(false)
      setSelectedEvento(null)
      await loadAgenda()
    } catch (error) {
      console.error('Erro ao excluir evento:', error)
      toast.error('Erro ao excluir evento')
    }
  }

  const handleConcluirEvento = async (eventoId: string) => {
    if (!confirm('Deseja marcar este evento/prazo como cumprido?')) return
    try {
      const { error } = await supabase
        .from('agenda_eventos')
        .update({ status: 'realizado' })
        .eq('id', eventoId)
      if (error) throw error
      toast.success('Evento marcado como cumprido!')
      setEventoDetailOpen(false)
      setSelectedEvento(null)
      await loadAgenda()
    } catch (error) {
      console.error('Erro ao marcar evento como cumprido:', error)
      toast.error('Erro ao marcar evento como cumprido')
    }
  }

  const handleReabrirEvento = async (eventoId: string) => {
    try {
      const { error } = await supabase
        .from('agenda_eventos')
        .update({ status: 'agendado' })
        .eq('id', eventoId)
      if (error) throw error
      toast.success('Evento reaberto!')
      setEventoDetailOpen(false)
      setSelectedEvento(null)
      await loadAgenda()
    } catch (error) {
      console.error('Erro ao reabrir evento:', error)
      toast.error('Erro ao reabrir evento')
    }
  }

  // Handlers para Audiências
  const handleEditAudiencia = () => {
    setAudienciaDetailOpen(false)
    setEditingAudiencia(true)
    setShowAudienciaWizard(true)
  }

  const handleDeleteAudiencia = async (audienciaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta audiência?')) return
    try {
      const { error } = await supabase.from('agenda_audiencias').delete().eq('id', audienciaId)
      if (error) throw error
      toast.success('Audiência excluída com sucesso!')
      setAudienciaDetailOpen(false)
      setSelectedAudiencia(null)
      await loadAgenda()
    } catch (error) {
      console.error('Erro ao excluir audiência:', error)
      toast.error('Erro ao excluir audiência')
    }
  }

  const handleConcluirAudiencia = async (audienciaId: string) => {
    if (!confirm('Deseja marcar esta audiência como realizada?')) return
    try {
      const { error } = await supabase
        .from('agenda_audiencias')
        .update({ status: 'realizada' })
        .eq('id', audienciaId)
      if (error) throw error
      toast.success('Audiência marcada como realizada!')
      setAudienciaDetailOpen(false)
      setSelectedAudiencia(null)
      await loadAgenda()
    } catch (error) {
      console.error('Erro ao concluir audiência:', error)
      toast.error('Erro ao atualizar audiência')
    }
  }

  const handleReabrirAudiencia = async (audienciaId: string) => {
    try {
      const { error } = await supabase
        .from('agenda_audiencias')
        .update({ status: 'agendada' })
        .eq('id', audienciaId)
      if (error) throw error
      toast.success('Audiência reaberta!')
      setAudienciaDetailOpen(false)
      setSelectedAudiencia(null)
      await loadAgenda()
    } catch (error) {
      console.error('Erro ao reabrir audiência:', error)
      toast.error('Erro ao reabrir audiência')
    }
  }

  const getPrioridadeBadge = (prioridade: string) => {
    const styles: Record<string, string> = {
      baixa: 'bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      media: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
      alta: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
      urgente: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
    }
    const labels: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente' }
    return <Badge className={cn('text-[10px] border', styles[prioridade] || styles.media)}>{labels[prioridade] || prioridade}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#89bcbe]" />
      </div>
    )
  }

  if (!consulta) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Scale className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#34495e] dark:text-slate-200 mb-2">Consulta não encontrada</h2>
          <Button onClick={() => router.push('/dashboard/consultivo')}>Voltar para lista</Button>
        </div>
      </div>
    )
  }

  const iniciaisResp = (consulta.responsavel_nome || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-[#fafaf7] dark:bg-[#0c1017] p-6">
      <div className="max-w-[1800px] mx-auto space-y-5">

        {/* Header V4 */}
        <div className="bg-white dark:bg-[#111826] border border-[#e6e3da] dark:border-[#253345] rounded-[14px] px-6 py-5 shadow-sm">
          {/* breadcrumb + ações */}
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-1.5 text-[12.5px] text-[#46627f] dark:text-slate-400 min-w-0">
              <button onClick={() => router.push('/dashboard/consultivo')} className="flex items-center gap-1 font-medium hover:text-[#34495e] dark:hover:text-slate-200 transition-colors flex-shrink-0">
                <ChevronLeft className="w-3.5 h-3.5" />Voltar
              </button>
              <span className="text-[#cfc8ba] flex-shrink-0">·</span>
              <span className="cursor-pointer hover:text-[#34495e] dark:hover:text-slate-200 flex-shrink-0" onClick={() => router.push('/dashboard/consultivo')}>Consultivo</span>
              <ChevronRight className="w-3 h-3 text-[#cfc8ba] flex-shrink-0" />
              <span className="text-[#34495e] dark:text-slate-200 font-medium truncate">{formatArea(consulta.area)}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleToggleArchive} className="h-8 text-xs">
                {consulta.status === 'arquivado' ? <><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Reativar</> : <><Archive className="w-3.5 h-3.5 mr-1.5" />Arquivar</>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditarModalOpen(true)} className="h-8 text-xs">
                <Edit className="w-3.5 h-3.5 mr-1.5" />Editar
              </Button>
            </div>
          </div>

          {/* número da pasta */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[13px] font-bold tracking-[0.1em] text-[#415a7e] dark:text-[#9eb1cc]">{consulta.numero || 'S/N'}</span>
            {consulta.numero && (
              <button onClick={copyId} className="text-[#9aa1a8] hover:text-[#46627f] transition-colors">
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* título + cliente */}
          <h1 className="font-serif text-[24px] font-medium tracking-[-0.02em] text-[#2c3e50] dark:text-slate-100 leading-[1.2]">{consulta.titulo}</h1>
          <p className="text-[12.5px] text-[#46627f] dark:text-slate-400 mt-1">{consulta.cliente_nome}</p>

          {/* meta row */}
          <div className="flex flex-wrap items-start gap-y-3 pt-3.5 mt-3.5 border-t border-[#f0ede3] dark:border-[#1d2a3c]">
            {[
              { label: 'TIPO', node: <span className="text-[12.5px] font-medium text-[#2c3e50] dark:text-slate-200">{consulta.tipo ? (TIPOS_CONSULTA[consulta.tipo as TipoConsulta]?.label ?? '—') : 'Não classificado'}</span> },
              { label: 'ÁREA', node: <span className="text-[12.5px] font-medium text-[#2c3e50] dark:text-slate-200">{formatArea(consulta.area)}</span> },
              { label: 'RESPONSÁVEL', node: (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#46627f] text-white text-[8.5px] font-bold flex items-center justify-center flex-shrink-0">{iniciaisResp}</span>
                  <span className="text-[12.5px] font-medium text-[#2c3e50] dark:text-slate-200">{consulta.responsavel_nome}</span>
                </span>
              ) },
              { label: 'CRIADO EM', node: <span className="font-mono text-[12.5px] font-medium text-[#2c3e50] dark:text-slate-200">{format(new Date(consulta.created_at), 'dd/MM/yyyy')}</span> },
              { label: 'STATUS', node: (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: consulta.status === 'ativo' ? '#3f6a54' : '#6c757d' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: consulta.status === 'ativo' ? '#6b9e84' : '#9aa1a8' }} />
                  {consulta.status === 'ativo' ? 'Ativo' : 'Arquivado'}
                </span>
              ) },
              { label: 'PRAZO', node: consulta.prazo
                ? <span className="font-mono text-[12.5px] font-medium text-[#2c3e50] dark:text-slate-200">{format(new Date(consulta.prazo + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                : <button onClick={() => setEditarModalOpen(true)} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#46627f] border border-dashed border-[#c5bfb0] dark:border-[#2d3a4a] rounded-md px-2 py-0.5 hover:border-[#89bcbe] transition-colors"><Plus className="w-3 h-3" />Definir prazo</button> },
            ].map((m, i, arr) => (
              <div key={i} className={cn('pr-5', i < arr.length - 1 && 'border-r border-[#f0ede3] dark:border-[#1d2a3c] mr-5')}>
                <div className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#9aa1a8] mb-1">{m.label}</div>
                {m.node}
              </div>
            ))}
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_352px] gap-5 items-start">

          {/* Coluna Principal */}
          <div className="space-y-4 min-w-0">

            {/* Card Consulta */}
            <div className={V4_CARD}>
              <div className={V4_HEADER}>
                <FileText className="w-3.5 h-3.5 text-[#89bcbe]" />
                <span className={V4_HEADER_TITLE}>Consulta</span>
                <div className="flex-1" />
                <button onClick={() => setEditarModalOpen(true)} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#3f7376] dark:text-teal-400 hover:underline">
                  <Edit className="w-3 h-3" />Editar
                </button>
              </div>
              <div className="p-5">
                {consulta.descricao ? (
                  <p className="text-[13px] text-[#46627f] dark:text-slate-300 leading-relaxed mb-3">{consulta.descricao}</p>
                ) : (
                  <p className="text-[13px] text-slate-400 dark:text-slate-500 italic mb-3">Sem descrição.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {consulta.tipo && (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#eef5f1] text-[#3f6a54] border border-[#6b9e84]/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
                      {TIPOS_CONSULTA[consulta.tipo as TipoConsulta]?.label}
                    </span>
                  )}
                  <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#edf1f7] text-[#415a7e] border border-[#c8d6e8] dark:bg-[#46627f]/20 dark:text-[#9eb1cc] dark:border-[#46627f]/40">
                    {formatArea(consulta.area)}
                  </span>
                </div>
              </div>
            </div>

            {/* Andamentos */}
            <div className={V4_CARD}>
              <div className={V4_HEADER}>
                <Activity className="w-3.5 h-3.5 text-[#89bcbe]" />
                <span className={V4_HEADER_TITLE}>Andamentos</span>
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setNovoAndamentoModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Adicionar
                </Button>
              </div>
              <div className="p-4">
                {loadingMovimentacoes ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto animate-spin" />
                  </div>
                ) : movimentacoes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum andamento registrado</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {(() => {
                        const startIndex = (andamentoPage - 1) * andamentosPerPage
                        const paginated = movimentacoes.slice(startIndex, startIndex + andamentosPerPage)

                        return paginated.map((andamento) => {
                          const cfg = CONSULTIVO_ANDAMENTO_TIPOS[andamento.tipo as ConsultivoAndamentoTipo]
                          const label = andamento.tipo_descricao || cfg?.label || andamento.tipo
                          const cor = cfg?.cor || '#9aa1a8'
                          const isManual = andamento.origem === 'manual'
                          return (
                            <div
                              key={andamento.id}
                              className="transition-colors duration-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-2 rounded-md p-2 -mx-2 group border-b border-slate-100 dark:border-slate-800 last:border-0"
                              onClick={() => setSelectedAndamento(andamento)}
                            >
                              <div className="flex gap-3">
                                {/* Data */}
                                <div className="flex-shrink-0 w-16">
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                                    {format(new Date(andamento.data), "dd/MM/yy", { locale: ptBR })}
                                  </p>
                                </div>

                                {/* Conteúdo */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold mb-0.5 flex items-center gap-1.5" style={{ color: cor }}>
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cor }} />
                                    {label}
                                  </p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                                    {andamento.descricao}
                                  </p>
                                </div>

                                {/* Botões Editar/Excluir (apenas manuais) */}
                                {isManual && (
                                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleEditAndamento(andamento) }}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteAndamentoClick(andamento.id) }}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>

                    {/* Paginação de Andamentos */}
                    {movimentacoes.length > andamentosPerPage && (
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {Math.min((andamentoPage - 1) * andamentosPerPage + 1, movimentacoes.length)}-{Math.min(andamentoPage * andamentosPerPage, movimentacoes.length)} de {movimentacoes.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAndamentoPage(p => Math.max(1, p - 1))}
                            disabled={andamentoPage === 1}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                          {Array.from({ length: Math.ceil(movimentacoes.length / andamentosPerPage) }, (_, i) => i + 1).map(page => (
                            <Button
                              key={page}
                              variant={andamentoPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setAndamentoPage(page)}
                              className={`h-7 w-7 p-0 text-xs ${andamentoPage === page ? 'bg-[#34495e] hover:bg-[#46627f]' : ''}`}
                            >
                              {page}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAndamentoPage(p => Math.min(Math.ceil(movimentacoes.length / andamentosPerPage), p + 1))}
                            disabled={andamentoPage === Math.ceil(movimentacoes.length / andamentosPerPage)}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Anexos */}
            <ConsultaDocumentos consultaId={consulta.id} onChanged={loadMovimentacoes} />
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-4 min-w-0">

            {/* Agenda — padrão V4 */}
            <div className={V4_CARD}>
              <div className={V4_HEADER}>
                <Calendar className="w-3.5 h-3.5 text-[#89bcbe]" />
                <span className={V4_HEADER_TITLE}>Agenda</span>
                <div className="flex-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-[#9aa1a8] hover:bg-[#89bcbe] hover:text-white transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowTarefaWizard(true)}>
                      <ListTodo className="w-4 h-4 mr-2 text-[#34495e]" />
                      <span className="text-sm">Nova Tarefa</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowEventoWizard(true)}>
                      <Calendar className="w-4 h-4 mr-2 text-[#89bcbe]" />
                      <span className="text-sm">Novo Compromisso</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="py-1.5">
                {loadingAgenda ? (
                  <div className="text-center py-3">
                    <div className="w-5 h-5 mx-auto border-2 border-teal-200 dark:border-teal-700 border-t-teal-500 rounded-full animate-spin"></div>
                  </div>
                ) : agendaItems.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum agendamento vinculado</p>
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const agendaStartIndex = (agendaPage - 1) * agendaPerPage
                      return agendaItems.slice(agendaStartIndex, agendaStartIndex + agendaPerPage)
                    })().map((item) => {
                      const handleClick = async () => {
                        if (item.tipo_entidade === 'tarefa') {
                          const { data: tarefa } = await supabase.from('agenda_tarefas').select('*').eq('id', item.id).single()
                          if (tarefa) { setSelectedTarefa(tarefa); setTarefaDetailOpen(true) }
                        } else if (item.tipo_entidade === 'evento') {
                          const { data: evento } = await supabase.from('agenda_eventos').select('*').eq('id', item.id).single()
                          if (evento) { setSelectedEvento(evento); setEventoDetailOpen(true) }
                        } else if (item.tipo_entidade === 'audiencia') {
                          const { data: audiencia } = await supabase.from('agenda_audiencias').select('*').eq('id', item.id).single()
                          if (audiencia) { setSelectedAudiencia(audiencia); setAudienciaDetailOpen(true) }
                        }
                      }
                      const dataRef = new Date(item.data_inicio)
                      const prazo = item.tipo_entidade === 'tarefa' ? item.prazo_data_limite : null
                      const urgente = !!prazo && (parseDBDate(prazo).getTime() - new Date().setHours(0, 0, 0, 0)) <= 3 * 86400000
                      const barColor = urgente ? '#a85a3e' : item.tipo_entidade === 'audiencia' ? '#3f7376' : item.tipo_entidade === 'evento' ? '#6a85a8' : '#89bcbe'
                      const resps: string[] = item.responsavel_nome ? [item.responsavel_nome] : []
                      return (
                        <div
                          key={item.id}
                          onClick={handleClick}
                          className="grid grid-cols-[54px_3px_1fr] gap-2.5 px-3.5 py-2.5 border-b border-[#f0ede3] dark:border-[#1d2a3c] last:border-0 cursor-pointer hover:bg-[#faf8f2] dark:hover:bg-[#1a212c] transition-colors items-start"
                        >
                          {/* data */}
                          <div className="text-center pt-0.5">
                            <div className="font-serif text-[19px] font-semibold leading-none tracking-[-0.025em]" style={{ color: urgente ? '#a85a3e' : undefined }}>
                              <span className={urgente ? '' : 'text-[#2c3e50] dark:text-slate-200'}>{format(dataRef, 'dd')}</span>
                            </div>
                            <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] mt-0.5" style={{ color: urgente ? '#c98080' : '#9aa1a8' }}>
                              {diaSemana(dataRef)}
                            </div>
                          </div>
                          {/* barra colorida */}
                          <div className="rounded-sm self-stretch min-h-[28px]" style={{ background: barColor }} />
                          {/* conteúdo */}
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-medium text-[#2c3e50] dark:text-slate-200 leading-snug tracking-[-0.005em] line-clamp-2">
                              {item.titulo}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10.5px] text-[#9aa1a8] dark:text-slate-500 font-mono">
                                {item.tipo_entidade === 'tarefa' ? formatBrazilDate(item.data_inicio) : formatBrazilDateTime(item.data_inicio)}
                              </span>
                              {urgente && prazo && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#a85a3e]">
                                  <CalendarClock className="w-3 h-3" />
                                  Fatal {formatBrazilDate(prazo)}
                                </span>
                              )}
                              {resps.length > 0 && (
                                <div className="flex -space-x-1 ml-auto">
                                  {resps.slice(0, 3).map((nome, j) => (
                                    <span
                                      key={j}
                                      title={nome}
                                      className="w-4 h-4 rounded-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] ring-[1.5px] ring-white dark:ring-[#151e2b] flex items-center justify-center text-[7.5px] font-bold text-white"
                                    >
                                      {inic(nome)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Paginação da Agenda */}
                    {agendaItems.length > agendaPerPage && (
                      <div className="flex items-center justify-between px-3.5 pt-3 mt-1 border-t border-[#f0ede3] dark:border-[#1d2a3c]">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {((agendaPage - 1) * agendaPerPage) + 1}-{Math.min(agendaPage * agendaPerPage, agendaItems.length)} de {agendaItems.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => setAgendaPage(p => Math.max(1, p - 1))} disabled={agendaPage === 1} className="h-6 w-6 p-0">
                            <ChevronLeft className="w-3 h-3" />
                          </Button>
                          {Array.from({ length: Math.ceil(agendaItems.length / agendaPerPage) }, (_, i) => i + 1).slice(0, 5).map(page => (
                            <Button key={page} variant={agendaPage === page ? 'default' : 'outline'} size="sm" onClick={() => setAgendaPage(page)} className={`h-6 w-6 p-0 text-[10px] ${agendaPage === page ? 'bg-[#34495e] hover:bg-[#46627f]' : ''}`}>
                              {page}
                            </Button>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => setAgendaPage(p => Math.min(Math.ceil(agendaItems.length / agendaPerPage), p + 1))} disabled={agendaPage === Math.ceil(agendaItems.length / agendaPerPage)} className="h-6 w-6 p-0">
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {agendaItems.length > 0 && (
                <div className="px-4 py-2.5 border-t border-[#f0ede3] dark:border-[#1d2a3c]">
                  <button
                    onClick={() => router.push(`/dashboard/agenda?consultivo_id=${consulta.id}`)}
                    className="w-full flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[#89bcbe] hover:text-[#6ba9ab] transition-colors"
                  >
                    Ver agenda completa <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Virou contencioso? */}
            {consulta.status === 'ativo' && (
              <Card className="border-[#e6e3da] dark:border-[#253345] shadow-sm rounded-[12px]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6b9e84]" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1a8]">Próximo passo</span>
                  </div>
                  <h4 className="text-[13.5px] font-semibold text-[#2c3e50] dark:text-slate-200 mb-1">Virou contencioso?</h4>
                  <p className="text-[12px] text-[#46627f] dark:text-slate-400 leading-relaxed mb-3">
                    Quando esta consulta evoluir para processo judicial, mantenha o histórico vinculado.
                  </p>
                  <Button
                    onClick={() => setTransformarModalOpen(true)}
                    className="w-full h-9 text-xs bg-gradient-to-br from-[#2d3f52] to-[#3d5269] hover:from-[#3d5269] hover:to-[#2d3f52] text-white gap-1.5"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />Transformar em processo
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Financeiro - Card Completo */}
            <ConsultivoFinanceiroCard
              consultivoId={consulta.id}
              clienteId={consulta.cliente_id}
              clienteNome={consulta.cliente_nome}
              onLancarHoras={() => setTimesheetModalOpen(true)}
              onLancarDespesa={() => setDespesaModalOpen(true)}
              onLancarHonorario={() => setReceitaModalOpen(true)}
              onEditTimesheet={(entry) => {
                setEditTimesheetEntry(entry)
                setEditTimesheetModalOpen(true)
              }}
              onContratoVinculado={loadConsulta}
              refreshTrigger={financeiroRefreshTrigger}
            />

            {/* Cobrança Fixa (quando contrato vinculado) */}
            {consulta.contrato_id && (
              <ProcessoCobrancaFixaCard
                consultivoId={consulta.id}
              />
            )}
          </div>
        </div>
      </div>

      {/* Wizards de Agenda */}
      {showTarefaWizard && escritorioId && (
        <TarefaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowTarefaWizard(false)
            setEditingTarefa(false)
            setSelectedTarefa(null)
          }}
          onSubmit={editingTarefa && selectedTarefa ? async (data: TarefaFormData) => {
            const { error } = await supabase
              .from('agenda_tarefas')
              .update(data)
              .eq('id', selectedTarefa.id)
            if (error) throw error
            toast.success('Tarefa atualizada com sucesso!')
          } : undefined}
          onCreated={async () => {
            await loadAgenda()
            if (!editingTarefa) {
              toast.success('Tarefa criada com sucesso!')
            }
          }}
          initialData={editingTarefa && selectedTarefa ? selectedTarefa : { consultivo_id: consulta.id }}
        />
      )}

      {showEventoWizard && escritorioId && (
        <EventoWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowEventoWizard(false)
            setEditingEvento(false)
            setSelectedEvento(null)
          }}
          onSubmit={async () => {
            // O wizard cria/atualiza o evento diretamente via useEventos
            // Este callback é apenas para refresh da lista
            await loadAgenda()
          }}
          initialData={editingEvento && selectedEvento ? selectedEvento : { consultivo_id: consulta.id }}
        />
      )}

      {showAudienciaWizard && escritorioId && (
        <AudienciaWizard
          escritorioId={escritorioId}
          onClose={() => {
            setShowAudienciaWizard(false)
            setEditingAudiencia(false)
            setSelectedAudiencia(null)
          }}
          onSubmit={async () => {
            // O wizard cria/atualiza a audiência diretamente via useAudiencias
            // Este callback é apenas para refresh da lista
            await loadAgenda()
          }}
          initialData={editingAudiencia && selectedAudiencia ? selectedAudiencia : { consultivo_id: consulta.id }}
        />
      )}

      {/* Modais de Detalhes */}
      {selectedTarefa && (
        <TarefaDetailModal
          open={tarefaDetailOpen}
          onOpenChange={(open) => {
            setTarefaDetailOpen(open)
            if (!open && !showTarefaWizard) setSelectedTarefa(null)
          }}
          tarefa={selectedTarefa}
          onEdit={handleEditTarefa}
          onDelete={() => handleDeleteTarefa(selectedTarefa.id)}
          onCancelar={() => openCancelarModal('tarefa', {
            id: selectedTarefa.id,
            titulo: selectedTarefa.titulo,
            data: selectedTarefa.data_inicio,
            recorrencia_id: selectedTarefa.recorrencia_id,
          })}
          onConcluir={() => handleConcluirTarefa(selectedTarefa.id)}
          onReabrir={() => handleReabrirTarefa(selectedTarefa.id)}
          onLancarHoras={handleLancarHorasTarefa}
          onUpdate={loadAgenda}
        />
      )}

      {selectedEvento && (
        <EventoDetailModal
          open={eventoDetailOpen}
          onOpenChange={(open) => {
            setEventoDetailOpen(open)
            if (!open && !showEventoWizard) setSelectedEvento(null)
          }}
          evento={selectedEvento}
          onEdit={handleEditEvento}
          onMarcarCumprido={() => handleConcluirEvento(selectedEvento.id)}
          onReabrir={() => handleReabrirEvento(selectedEvento.id)}
          onCancelar={() => openCancelarModal('evento', {
            id: selectedEvento.id,
            titulo: selectedEvento.titulo,
            data: selectedEvento.data_inicio,
            recorrencia_id: selectedEvento.recorrencia_id,
          })}
        />
      )}

      {selectedAudiencia && (
        <AudienciaDetailModal
          open={audienciaDetailOpen}
          onOpenChange={(open) => {
            setAudienciaDetailOpen(open)
            if (!open && !showAudienciaWizard) setSelectedAudiencia(null)
          }}
          audiencia={selectedAudiencia}
          onEdit={handleEditAudiencia}
          onRealizar={() => handleConcluirAudiencia(selectedAudiencia.id)}
          onReabrir={() => handleReabrirAudiencia(selectedAudiencia.id)}
          onCancelar={() => openCancelarModal('audiencia', {
            id: selectedAudiencia.id,
            titulo: selectedAudiencia.titulo,
            data: selectedAudiencia.data_hora ?? selectedAudiencia.data_inicio,
          })}
        />
      )}

      {/* Modal de Cancelamento (genérico) */}
      <AgendaCancelarModal
        open={cancelarModalOpen}
        onOpenChange={(open) => {
          setCancelarModalOpen(open)
          if (!open) setCancelarTarget(null)
        }}
        tipo={cancelarTarget?.tipo ?? 'tarefa'}
        registro={cancelarTarget?.registro ?? null}
        onSuccess={async () => {
          await loadAgenda()
          setSelectedTarefa(null)
          setSelectedEvento(null)
          setSelectedAudiencia(null)
        }}
      />

      {/* Modal Editar Consultivo */}
      {consulta && (
        <EditarConsultivoModal
          open={editarModalOpen}
          onOpenChange={setEditarModalOpen}
          consulta={{
            id: consulta.id,
            titulo: consulta.titulo,
            descricao: consulta.descricao,
            cliente_id: consulta.cliente_id,
            cliente_nome: consulta.cliente_nome,
            tipo: consulta.tipo,
            area: consulta.area,
            prioridade: consulta.prioridade,
            prazo: consulta.prazo,
            responsavel_id: consulta.responsavel_id,
            responsavel_nome: consulta.responsavel_nome,
            responsaveis_ids: consulta.responsaveis_ids,
          }}
          onSuccess={loadConsulta}
        />
      )}

      {/* Modal Registrar Andamento */}
      {consulta && (
        <RegistrarAndamentoConsultivoModal
          open={novoAndamentoModalOpen}
          onOpenChange={setNovoAndamentoModalOpen}
          consultaId={consulta.id}
          escritorioId={escritorioId}
          clienteNome={consulta.cliente_nome}
          numero={consulta.numero || undefined}
          area={consulta.area}
          onSuccess={loadMovimentacoes}
        />
      )}

      {/* Modal Transformar em Processo */}
      <TransformarConsultivoWizard
        open={transformarModalOpen}
        onClose={() => setTransformarModalOpen(false)}
        consulta={consulta}
        onSuccess={(processoId, numeroPasta) => {
          router.push(`/dashboard/processos/${processoId}`)
        }}
      />

      {/* Modal Lançar Despesa */}
      <DespesaModal
        open={despesaModalOpen}
        onOpenChange={setDespesaModalOpen}
        consultaId={consulta.id}
        onSuccess={() => setFinanceiroRefreshTrigger(prev => prev + 1)}
      />

      {/* Modal Lançar Honorário (Receita) */}
      <ReceitaModal
        open={receitaModalOpen}
        onOpenChange={setReceitaModalOpen}
        consultaId={consulta.id}
        clienteId={consulta.cliente_id}
        onSuccess={() => setFinanceiroRefreshTrigger(prev => prev + 1)}
      />

      {/* Modal Lançar Horas */}
      <TimesheetModal
        open={timesheetModalOpen}
        onOpenChange={(open) => {
          if (!open && tarefaParaConcluirId && !horasRegistradasRef.current) {
            // Fechou sem registrar horas → perguntar se quer concluir mesmo assim
            setTimesheetModalOpen(false)
            setConfirmSemHoras(true)
            return
          }
          if (!open && tarefaParaConcluirId && horasRegistradasRef.current) {
            setTarefaParaConcluirId(null)
          }
          setTimesheetModalOpen(open)
        }}
        consultaId={consulta.id}
        onSuccess={async () => {
          horasRegistradasRef.current = true
          setTimesheetModalOpen(false)
          setFinanceiroRefreshTrigger(prev => prev + 1)
          // Se estava concluindo tarefa, concluir agora
          if (tarefaParaConcluirId) {
            await executeConcluirTarefa(tarefaParaConcluirId)
            setTarefaParaConcluirId(null)
          }
        }}
      />

      {/* Modal Editar Timesheet */}
      {editTimesheetEntry && (
        <TimesheetModal
          open={editTimesheetModalOpen}
          onOpenChange={(open) => {
            setEditTimesheetModalOpen(open)
            if (!open) setEditTimesheetEntry(null)
          }}
          editTimesheetId={editTimesheetEntry.id}
          processoId={editTimesheetEntry.processo_id}
          consultaId={editTimesheetEntry.consulta_id || editTimesheetEntry.consultivo_id}
          defaultModoRegistro={editTimesheetEntry.hora_inicio ? 'horario' : 'duracao'}
          defaultDuracaoHoras={Math.floor(Number(editTimesheetEntry.horas))}
          defaultDuracaoMinutos={Math.round((Number(editTimesheetEntry.horas) % 1) * 60)}
          defaultAtividade={editTimesheetEntry.atividade}
          defaultDataTrabalho={editTimesheetEntry.data_trabalho}
          defaultHoraInicio={editTimesheetEntry.hora_inicio || undefined}
          defaultHoraFim={editTimesheetEntry.hora_fim || undefined}
          defaultFaturavel={editTimesheetEntry.faturavel}
          onSuccess={() => {
            setEditTimesheetEntry(null)
            setEditTimesheetModalOpen(false)
            setFinanceiroRefreshTrigger(prev => prev + 1)
          }}
        />
      )}

      {/* Dialog: concluir sem horas */}
      <Dialog open={confirmSemHoras} onOpenChange={setConfirmSemHoras}>
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
                setTarefaParaConcluirId(null)
                setConfirmSemHoras(false)
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (tarefaParaConcluirId) {
                  await executeConcluirTarefa(tarefaParaConcluirId)
                }
                setTarefaParaConcluirId(null)
                setConfirmSemHoras(false)
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Concluir sem horas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhe do Andamento */}
      <Dialog open={!!selectedAndamento} onOpenChange={(open) => !open && setSelectedAndamento(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0">
          <DialogTitle className="sr-only">Detalhe do Andamento</DialogTitle>
          {selectedAndamento && (() => {
            // Parsear descrição para tarefa_concluida
            const parsedTarefa = (() => {
              if (selectedAndamento.referencia_tipo !== 'agenda_tarefas') return null
              const match = selectedAndamento.descricao.match(/^Tarefa "(.+)" concluída por (.+)$/)
              if (match) return { titulo: match[1], concluidaPor: match[2] }
              return null
            })()

            return (
              <div className="bg-white dark:bg-surface-1 rounded-lg flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {selectedAndamento.tipo_descricao || CONSULTIVO_ANDAMENTO_TIPOS[selectedAndamento.tipo as ConsultivoAndamentoTipo]?.label || 'Andamento'}
                  </h2>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{format(new Date(selectedAndamento.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {parsedTarefa ? (
                    <>
                      {/* Informação estruturada para tarefa_concluida */}
                      <div>
                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          Tarefa
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                          {parsedTarefa.titulo}
                        </p>
                      </div>

                      <div>
                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          Concluída por
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {parsedTarefa.concluidaPor}
                          </span>
                        </div>
                      </div>

                      {/* Descrição da tarefa (quando houver) */}
                      {andamentoTarefaDescricao && (
                        <div>
                          <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                            Descrição da Tarefa
                          </div>
                          <div className="bg-slate-50 dark:bg-surface-0 rounded-md p-3 max-h-[200px] overflow-y-auto">
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                              {andamentoTarefaDescricao}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Layout genérico para outros andamentos */}
                      <div>
                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          Descrição
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                          {selectedAndamento.descricao}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-0/50 flex-shrink-0">
                  <div className="flex items-center justify-end gap-2">
                    {selectedAndamento.referencia_tipo === 'agenda_tarefas' && selectedAndamento.referencia_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200"
                        onClick={async () => {
                          const { data: tarefa } = await supabase
                            .from('agenda_tarefas')
                            .select('*')
                            .eq('id', selectedAndamento.referencia_id!)
                            .single()
                          if (tarefa) {
                            setSelectedAndamento(null)
                            setSelectedTarefa(tarefa)
                            setTarefaDetailOpen(true)
                          } else {
                            toast.error('Tarefa não encontrada')
                          }
                        }}
                      >
                        Ver detalhes da tarefa
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="text-xs bg-[#34495e] hover:bg-[#46627f] text-white"
                      onClick={() => setSelectedAndamento(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal Editar Andamento */}
      <Dialog open={editAndamentoOpen} onOpenChange={setEditAndamentoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34495e] dark:text-slate-200">Editar Andamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Descrição *</label>
              <Textarea
                placeholder="Descreva o andamento..."
                value={editandoAndamento?.descricao || ''}
                onChange={(e) => setEditandoAndamento(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                className="text-sm min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAndamentoOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveEditAndamento}
              disabled={salvandoEdicao || !editandoAndamento?.descricao.trim()}
              className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
            >
              {salvandoEdicao ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão de Andamento */}
      <Dialog open={deleteAndamentoOpen} onOpenChange={setDeleteAndamentoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34495e] dark:text-slate-200">Excluir Andamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tem certeza que deseja excluir este andamento? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAndamentoOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteAndamento}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
