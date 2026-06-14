'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Calendar,
  Plus,
  ListTodo,
  Gavel,
  CalendarClock,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Activity,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDateTime, formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import TarefaDetailModal from '@/components/agenda/TarefaDetailModal'
import EventoDetailModal from '@/components/agenda/EventoDetailModal'
import AudienciaDetailModal from '@/components/agenda/AudienciaDetailModal'
import AgendaCancelarModal, { TipoAgenda } from '@/components/agenda/AgendaCancelarModal'
import ProcessoFinanceiroCard from '@/components/processos/ProcessoFinanceiroCard'
import ProcessoCobrancasCard from '@/components/processos/ProcessoCobrancasCard'
import ProcessoCobrancaFixaCard from '@/components/processos/ProcessoCobrancaFixaCard'
import ProcessoDocumentos from '@/components/processos/ProcessoDocumentos'
import ProcessoDepositos from '@/components/processos/ProcessoDepositos'
import { CnjLink } from '@/components/processos/CnjLink'
import TimesheetModal from '@/components/financeiro/TimesheetModal'
import DespesaModal from '@/components/financeiro/DespesaModal'
import ReceitaModal from '@/components/financeiro/ReceitaModal'
import { useRouter } from 'next/navigation'
import type { TarefaFormData } from '@/hooks/useTarefas'

interface Processo {
  id: string
  numero_pasta: string
  numero_cnj: string
  tipo: string
  area: string
  fase: string
  instancia: string
  rito?: string
  tribunal: string
  link_tribunal?: string
  sistema_tribunal?: import('@/lib/tribunais').SistemaTribunal | null
  comarca?: string
  vara?: string
  data_distribuicao: string
  cliente_id: string
  cliente_nome: string
  polo_cliente: string
  parte_contraria?: string
  responsavel_id: string
  responsavel_nome: string
  colaboradores_ids: string[]
  colaboradores_nomes: string[]
  status: string
  valor_causa?: number
  valor_atualizado?: number
  data_ultima_atualizacao_monetaria?: string
  valor_acordo?: number
  valor_condenacao?: number
  provisao_sugerida?: number
  objeto_acao?: string
  observacoes?: string
  tags: string[]
  data_transito_julgado?: string
  data_arquivamento?: string
  created_at: string
  updated_at: string
}

interface ProcessoResumoProps {
  processo: Processo
  /**
   * Conteúdo renderizado na coluna esquerda entre "Informações Gerais"
   * e "Últimos Andamentos" — usado para Partes adicionais e Vínculos
   * (passado pelo parent porque precisa de dados brutos do processo).
   */
  topSectionsSlot?: React.ReactNode
  /** Slot renderizado entre Documentos e Depósitos — usado para Processos Vinculados */
  vinculosSlot?: React.ReactNode
}

interface Movimentacao {
  id: string
  data_movimento: string
  tipo_descricao?: string
  descricao: string
  conteudo_completo?: string | null
  origem?: string
  referencia_tipo?: string | null
  referencia_id?: string | null
  lida?: boolean | null
}

// ── V4: chrome compartilhado dos cards da ficha do processo ──
const V4_CARD = 'rounded-xl border border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] overflow-hidden'
const V4_HEADER = 'px-5 py-3 bg-[#f3f0e8] dark:bg-[#0f141c] border-b border-[#e6e3da] dark:border-[#253345] flex items-center gap-2'
const V4_HEADER_TITLE = 'text-[12.5px] font-bold text-[#2c3e50] dark:text-slate-200 tracking-[-0.01em]'
const V4_LABEL = 'text-[9px] font-bold uppercase tracking-[0.16em] text-[#9aa1a8] dark:text-[#5a6675]'
const V4_COUNT = 'text-[11px] font-bold text-white bg-[#89bcbe] rounded-lg px-[7px] min-w-[18px] text-center leading-[18px]'

// Cores por tipo de andamento (timeline V4)
const ANDAMENTO_TIPO: Record<string, { color: string; label: string }> = {
  conclusao: { color: '#6b9e84', label: 'Tarefa concluída' },
  andamento: { color: '#89bcbe', label: 'Andamento' },
  documento: { color: '#8a6438', label: 'Documento' },
  tribunal: { color: '#6a85a8', label: 'Tribunal' },
}

// Iniciais para avatar (1ª do primeiro + 1ª do último nome)
function inic(nome: string): string {
  const p = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '—'
  if (p.length === 1) return p[0].charAt(0).toUpperCase()
  return (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase()
}

// Dia da semana abreviado em 3 letras (ex.: "ter", "seg", "sáb")
function diaSemana(d: Date): string {
  return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()] ?? ''
}

// Campo da ficha (span = nº de colunas dentro da grade de 6)
function FichaField({ label, children, span = 1, mono = false }: { label: string; children: React.ReactNode; span?: number; mono?: boolean }) {
  const spanClass = span === 2 ? 'col-span-3 sm:col-span-2' : span === 3 ? 'col-span-6 sm:col-span-3' : 'col-span-3 sm:col-span-1'
  return (
    <div className={`${spanClass} py-3.5 min-w-0`}>
      <div className={`${V4_LABEL} mb-1.5`}>{label}</div>
      <div className={`text-[13px] text-[#2c3e50] dark:text-slate-300 leading-snug ${mono ? 'font-mono tracking-[0.01em]' : ''}`}>{children}</div>
    </div>
  )
}

// Descreve um andamento do escritório para a timeline V4
function describeEscritorio(mov: Movimentacao): { acao: string; autor: string | null; titulo: string; tipo: string } {
  if (mov.referencia_tipo === 'agenda_tarefas') {
    const m = mov.descricao.match(/^Tarefa "(.+)" conclu[ií]da por (.+)$/)
    if (m) return { acao: 'concluiu a tarefa', autor: m[2], titulo: m[1], tipo: 'conclusao' }
    return { acao: 'concluiu a tarefa', autor: null, titulo: mov.descricao, tipo: 'conclusao' }
  }
  if (mov.referencia_tipo === 'documentos') {
    return { acao: 'adicionou documento', autor: null, titulo: mov.descricao, tipo: 'documento' }
  }
  return {
    acao: 'registrou andamento',
    autor: null,
    titulo: mov.tipo_descricao || mov.descricao,
    tipo: 'andamento',
  }
}

export default function ProcessoResumo({ processo, topSectionsSlot, vinculosSlot }: ProcessoResumoProps) {
  // Copiar CNJ agora é gerenciado pelo componente <CnjLink />

  const [openNovoAndamento, setOpenNovoAndamento] = useState(false)
  const [novoAndamento, setNovoAndamento] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    tipo: '',
    descricao: ''
  })

  // Estados para Agenda
  const [agendaItems, setAgendaItems] = useState<any[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(true)
  const [agendaPage, setAgendaPage] = useState(1)
  const agendaPerPage = 5
  const [showTarefaWizard, setShowTarefaWizard] = useState(false)
  const [showEventoWizard, setShowEventoWizard] = useState(false)
  const [showAudienciaWizard, setShowAudienciaWizard] = useState(false)
  const [showTimesheetModal, setShowTimesheetModal] = useState(false)
  const [showDespesaModal, setShowDespesaModal] = useState(false)
  const [showReceitaModal, setShowReceitaModal] = useState(false)
  const [editTimesheetEntry, setEditTimesheetEntry] = useState<import('@/hooks/useProcessoFinanceiro').TimesheetEntry | null>(null)
  const [editTimesheetModalOpen, setEditTimesheetModalOpen] = useState(false)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [financeiroRefreshTrigger, setFinanceiroRefreshTrigger] = useState(0)

  // Estados para Modais de Detalhes
  const [selectedTarefa, setSelectedTarefa] = useState<any | null>(null)
  const [selectedEvento, setSelectedEvento] = useState<any | null>(null)
  const [selectedAudiencia, setSelectedAudiencia] = useState<any | null>(null)
  const [tarefaDetailOpen, setTarefaDetailOpen] = useState(false)
  const [eventoDetailOpen, setEventoDetailOpen] = useState(false)
  const [audienciaDetailOpen, setAudienciaDetailOpen] = useState(false)

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

  // Estados para edição de tarefa/evento/audiência
  const [editingTarefa, setEditingTarefa] = useState(false)
  const [editingEvento, setEditingEvento] = useState(false)
  const [editingAudiencia, setEditingAudiencia] = useState(false)

  // Estados para conclusão com modal de horas
  const [tarefaParaConcluirId, setTarefaParaConcluirId] = useState<string | null>(null)
  const [confirmSemHoras, setConfirmSemHoras] = useState(false)
  const horasRegistradasRef = useRef(false)

  const supabase = createClient()
  const router = useRouter()

  // Carregar escritorioId
  useEffect(() => {
    const loadEscritorioId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
    loadEscritorioId()
  }, [])

  // Carregar agendamentos do processo
  // Usa função especial que permite ver todos os agendamentos vinculados ao processo
  // (independente de quem é o responsável, desde que seja do mesmo escritório)
  useEffect(() => {
    const loadAgendaItems = async () => {
      try {
        setLoadingAgenda(true)
        // Usar função RPC que bypassa RLS por responsável mas mantém segurança por escritório
        const { data, error } = await supabase
          .rpc('get_agenda_processo', { p_processo_id: processo.id })

        if (error) {
          console.error('Erro ao carregar agenda do processo via RPC:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
        }

        if (data) {
          // Ordenar por data (audiências e outros já vêm ordenados da função)
          // Guardar todos os itens - paginação é feita no render
          setAgendaItems(data)
        }
        setLoadingAgenda(false)
      } catch (error) {
        console.error('Erro ao carregar agenda:', error)
        setLoadingAgenda(false)
      }
    }

    if (processo.id) {
      loadAgendaItems()
    }
  }, [processo.id])

  // Movimentações - carregadas do banco
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(true)
  const [selectedMovimentacao, setSelectedMovimentacao] = useState<Movimentacao | null>(null)
  const [movimentacaoTarefaDescricao, setMovimentacaoTarefaDescricao] = useState<string | null>(null)

  // Carregar descrição da tarefa vinculada quando o modal de movimentação abre
  useEffect(() => {
    if (!selectedMovimentacao?.referencia_id || selectedMovimentacao?.referencia_tipo !== 'agenda_tarefas') {
      setMovimentacaoTarefaDescricao(null)
      return
    }
    const loadDescricao = async () => {
      const { data } = await supabase
        .from('agenda_tarefas')
        .select('descricao')
        .eq('id', selectedMovimentacao.referencia_id!)
        .single()
      setMovimentacaoTarefaDescricao(data?.descricao || null)
    }
    loadDescricao()
  }, [selectedMovimentacao?.referencia_id, selectedMovimentacao?.referencia_tipo])

  // Paginação de movimentações + aba (Escritório / Tribunal)
  const [movimentacaoPage, setMovimentacaoPage] = useState(1)
  const [andamentoTab, setAndamentoTab] = useState<'escritorio' | 'tribunal'>('escritorio')
  const movimentacoesPerPage = 5

  // Edição de movimentação
  const [editandoMovimentacao, setEditandoMovimentacao] = useState<Movimentacao | null>(null)
  const [editMovimentacaoOpen, setEditMovimentacaoOpen] = useState(false)
  const [editMovimentacaoForm, setEditMovimentacaoForm] = useState({ tipo_descricao: '', descricao: '' })
  const [salvandoMovimentacao, setSalvandoMovimentacao] = useState(false)

  // Exclusão de movimentação
  const [excluindoMovimentacaoId, setExcluindoMovimentacaoId] = useState<string | null>(null)
  const [deleteMovimentacaoOpen, setDeleteMovimentacaoOpen] = useState(false)

  // Carregar movimentações reais do banco
  const loadMovimentacoes = async () => {
    try {
      setLoadingMovimentacoes(true)
      const { data, error } = await supabase
        .from('processos_movimentacoes')
        .select('id, data_movimento, tipo_descricao, descricao, conteudo_completo, origem, referencia_tipo, referencia_id, lida')
        .eq('processo_id', processo.id)
        .order('data_movimento', { ascending: false })

      if (!error && data) {
        setMovimentacoes(data)
      }
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error)
    } finally {
      setLoadingMovimentacoes(false)
    }
  }

  useEffect(() => {
    if (processo.id) {
      loadMovimentacoes()
    }
  }, [processo.id, supabase])

  // Helper para recarregar agenda
  const reloadAgenda = async () => {
    const { data } = await supabase
      .rpc('get_agenda_processo', { p_processo_id: processo.id })
    if (data) setAgendaItems(data.slice(0, 5))
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
      const { error } = await supabase
        .from('agenda_tarefas')
        .delete()
        .eq('id', tarefaId)

      if (error) throw error

      toast.success('Tarefa excluída com sucesso!')
      setTarefaDetailOpen(false)
      setSelectedTarefa(null)
      await reloadAgenda()
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error)
      toast.error('Erro ao excluir tarefa')
    }
  }

  const handleConcluirTarefa = async (tarefaId: string) => {
    // Abrir modal de horas antes de concluir (processo sempre vinculado neste contexto)
    setTarefaParaConcluirId(tarefaId)
    horasRegistradasRef.current = false
    setTarefaDetailOpen(false)
    setShowTimesheetModal(true)
  }

  // Executar conclusão direta (após horas ou sem horas)
  const executeConcluirTarefa = async (tarefaId: string) => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas')
        .update({
          status: 'concluida',
          data_conclusao: new Date().toISOString()
        })
        .eq('id', tarefaId)

      if (error) throw error

      toast.success('Tarefa concluída!')
      setSelectedTarefa(null)
      await reloadAgenda()
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error)
      toast.error('Erro ao concluir tarefa')
    }
  }

  const handleReabrirTarefa = async (tarefaId: string) => {
    try {
      const { error } = await supabase
        .from('agenda_tarefas')
        .update({
          status: 'pendente',
          data_conclusao: null
        })
        .eq('id', tarefaId)

      if (error) throw error

      toast.success('Tarefa reaberta!')
      setTarefaDetailOpen(false)
      setSelectedTarefa(null)
      await reloadAgenda()
    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error)
      toast.error('Erro ao reabrir tarefa')
    }
  }

  const handleLancarHorasTarefa = () => {
    setTarefaDetailOpen(false)
    setShowTimesheetModal(true)
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
      const { error } = await supabase
        .from('agenda_eventos')
        .delete()
        .eq('id', eventoId)

      if (error) throw error

      toast.success('Evento excluído com sucesso!')
      setEventoDetailOpen(false)
      setSelectedEvento(null)
      await reloadAgenda()
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
      await reloadAgenda()
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
      await reloadAgenda()
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
      const { error } = await supabase
        .from('agenda_audiencias')
        .delete()
        .eq('id', audienciaId)

      if (error) throw error

      toast.success('Audiência excluída com sucesso!')
      setAudienciaDetailOpen(false)
      setSelectedAudiencia(null)
      await reloadAgenda()
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
      await reloadAgenda()
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
      await reloadAgenda()
    } catch (error) {
      console.error('Erro ao reabrir audiência:', error)
      toast.error('Erro ao reabrir audiência')
    }
  }

  // Estado para loading ao adicionar andamento
  const [salvandoAndamento, setSalvandoAndamento] = useState(false)

  const handleAddAndamento = async () => {
    if (!novoAndamento.tipo || !novoAndamento.descricao || !escritorioId) {
      if (!escritorioId) {
        toast.error('Erro: escritório não identificado')
      }
      return
    }

    setSalvandoAndamento(true)
    try {
      // Usar parseDateInBrazil para evitar problema de timezone
      const dataMovimento = parseDateInBrazil(novoAndamento.data, 'yyyy-MM-dd')

      const { data: inserted, error } = await supabase
        .from('processos_movimentacoes')
        .insert({
          processo_id: processo.id,
          escritorio_id: escritorioId,
          data_movimento: dataMovimento.toISOString(),
          tipo_descricao: novoAndamento.tipo,
          descricao: novoAndamento.descricao,
          origem: 'manual'
        })
        .select('id, data_movimento, tipo_descricao, descricao, conteudo_completo, origem, referencia_tipo, referencia_id, lida')
        .single()

      if (error) throw error

      toast.success('Andamento adicionado com sucesso!')

      // Recarregar movimentações do banco para garantir consistência
      await loadMovimentacoes()

      setNovoAndamento({
        data: format(new Date(), 'yyyy-MM-dd'),
        tipo: '',
        descricao: ''
      })
      setOpenNovoAndamento(false)
    } catch (error) {
      console.error('Erro ao adicionar andamento:', error)
      toast.error('Erro ao adicionar andamento')
    } finally {
      setSalvandoAndamento(false)
    }
  }

  // Divisão por origem: Escritório (equipe) x Tribunal (automático)
  const movEscritorio = movimentacoes.filter((m) => m.origem === 'sistema' || m.origem === 'manual')
  const movTribunal = movimentacoes.filter((m) => m.origem !== 'sistema' && m.origem !== 'manual')
  const movAtivas = andamentoTab === 'escritorio' ? movEscritorio : movTribunal

  // Paginação da aba ativa de movimentações
  const totalMovPages = Math.ceil(movAtivas.length / movimentacoesPerPage)
  const movStartIndex = (movimentacaoPage - 1) * movimentacoesPerPage
  const paginatedMovimentacoes = movAtivas.slice(movStartIndex, movStartIndex + movimentacoesPerPage)

  const trocarAndamentoTab = (tab: 'escritorio' | 'tribunal') => {
    setAndamentoTab(tab)
    setMovimentacaoPage(1)
  }

  // Editar movimentação
  const handleEditMovimentacao = (mov: Movimentacao, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditandoMovimentacao(mov)
    setEditMovimentacaoForm({
      tipo_descricao: mov.tipo_descricao || '',
      descricao: mov.descricao
    })
    setEditMovimentacaoOpen(true)
  }

  const handleSaveEditMovimentacao = async () => {
    if (!editandoMovimentacao || !editMovimentacaoForm.descricao.trim()) {
      toast.error('Preencha a descrição')
      return
    }

    setSalvandoMovimentacao(true)
    try {
      const { error } = await supabase
        .from('processos_movimentacoes')
        .update({
          tipo_descricao: editMovimentacaoForm.tipo_descricao || null,
          descricao: editMovimentacaoForm.descricao
        })
        .eq('id', editandoMovimentacao.id)

      if (error) throw error

      toast.success('Movimentação atualizada')
      setEditMovimentacaoOpen(false)
      setEditandoMovimentacao(null)
      loadMovimentacoes()
    } catch (error) {
      console.error('Erro ao editar movimentação:', error)
      toast.error('Erro ao editar movimentação')
    } finally {
      setSalvandoMovimentacao(false)
    }
  }

  // Excluir movimentação
  const handleDeleteMovimentacaoClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExcluindoMovimentacaoId(id)
    setDeleteMovimentacaoOpen(true)
  }

  const handleConfirmDeleteMovimentacao = async () => {
    if (!excluindoMovimentacaoId) return

    try {
      const { error } = await supabase
        .from('processos_movimentacoes')
        .delete()
        .eq('id', excluindoMovimentacaoId)

      if (error) throw error

      toast.success('Movimentação excluída')
      setDeleteMovimentacaoOpen(false)
      setExcluindoMovimentacaoId(null)
      loadMovimentacoes()

      // Ajustar página se necessário
      const newTotal = Math.ceil((movimentacoes.length - 1) / movimentacoesPerPage)
      if (movimentacaoPage > newTotal && newTotal > 0) {
        setMovimentacaoPage(newTotal)
      }
    } catch (error) {
      console.error('Erro ao excluir movimentação:', error)
      toast.error('Erro ao excluir movimentação')
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_352px] gap-4 items-start">

      {/* Coluna Principal */}
      <div className="space-y-3.5 min-w-0">

        {/* Card Principal - Informações Gerais */}
        {/* ── FICHA DO PROCESSO (V4: grade 6 colunas, alinhamento vertical) ── */}
        {(() => {
          const poloClienteAtivo = processo.polo_cliente === 'ativo'
          const poloClienteLabel = poloClienteAtivo ? 'POLO ATIVO · AUTOR' : processo.polo_cliente === 'passivo' ? 'POLO PASSIVO · RÉU' : 'PARTE'
          const poloContrariaLabel = poloClienteAtivo ? 'POLO PASSIVO · RÉU' : processo.polo_cliente === 'passivo' ? 'POLO ATIVO · AUTOR' : 'PARTE CONTRÁRIA'
          const Sep = () => <div className="col-span-6 h-px bg-[#f0ede3] dark:bg-[#1d2a3c]" />
          return (
            <div className={V4_CARD}>
              {/* header */}
              <div className={cn(V4_HEADER, 'px-6')}>
                <FileText className="w-3.5 h-3.5 text-[#89bcbe]" />
                <span className={V4_HEADER_TITLE}>Ficha do processo</span>
                <div className="flex-1" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e0eeee] dark:bg-teal-500/15 text-[#3f7376] dark:text-teal-300 tracking-[0.06em]">
                  {processo.area}
                </span>
              </div>

              {/* grade única de 6 colunas */}
              <div className="grid grid-cols-6 gap-x-5 px-6">
                {/* Partes */}
                <div className="col-span-6 sm:col-span-3 py-4 min-w-0">
                  <div className={`${V4_LABEL} mb-1.5`}>Cliente</div>
                  <div className="text-sm font-semibold text-[#2c3e50] dark:text-slate-200 tracking-[-0.01em] mb-1.5 truncate" title={processo.cliente_nome}>{processo.cliente_nome}</div>
                  <span className="inline-block text-[9.5px] font-bold px-[7px] py-0.5 rounded bg-[#e8f5f5] dark:bg-teal-500/15 text-[#3f7376] dark:text-teal-300 tracking-[0.05em]">{poloClienteLabel}</span>
                </div>
                <div className="col-span-6 sm:col-span-3 py-4 min-w-0">
                  <div className={`${V4_LABEL} mb-1.5`}>Parte contrária</div>
                  <div className="text-sm font-semibold text-[#2c3e50] dark:text-slate-200 tracking-[-0.01em] mb-1.5 truncate" title={processo.parte_contraria || '—'}>{processo.parte_contraria || '—'}</div>
                  <span className="inline-block text-[9.5px] font-bold px-[7px] py-0.5 rounded bg-[#f1ede2] dark:bg-[#1a212c] text-[#5a6775] dark:text-slate-400 tracking-[0.05em]">{poloContrariaLabel}</span>
                </div>

                <Sep />

                {/* CNJ + classificação */}
                <div className="col-span-6 sm:col-span-3 py-3.5 min-w-0">
                  <div className={`${V4_LABEL} mb-1.5`}>Número CNJ</div>
                  {processo.numero_cnj ? (
                    <CnjLink
                      numeroCnj={processo.numero_cnj}
                      processoId={processo.id}
                      escritorioId={escritorioId}
                      sistemaCache={processo.sistema_tribunal}
                      linkManual={processo.link_tribunal}
                    />
                  ) : (
                    <div className="text-[13px] text-slate-400">—</div>
                  )}
                </div>
                <FichaField label="Fase">{processo.fase || '—'}</FichaField>
                <FichaField label="Instância">{processo.instancia || '—'}</FichaField>
                <FichaField label="Rito"><span className="capitalize">{processo.rito || '—'}</span></FichaField>

                <Sep />

                {/* Localização */}
                <FichaField label="Tribunal">{processo.tribunal || '—'}</FichaField>
                <FichaField label="Vara" span={2}>{processo.vara || '—'}</FichaField>
                <FichaField label="Comarca">{processo.comarca || '—'}</FichaField>
                <FichaField label="Distribuição" span={2} mono>
                  {processo.data_distribuicao ? format(new Date(processo.data_distribuicao), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                </FichaField>

                <Sep />

                {/* Valores */}
                <div className="col-span-6 sm:col-span-3 pt-3.5 pb-4">
                  <div className={`${V4_LABEL} mb-1.5`}>Valor da causa</div>
                  <div className="font-serif text-[22px] font-medium text-[#2c3e50] dark:text-slate-100 tracking-[-0.025em] leading-none">
                    {processo.valor_causa ? formatCurrency(processo.valor_causa) : '—'}
                  </div>
                </div>
                {processo.valor_atualizado && processo.valor_atualizado !== processo.valor_causa ? (
                  <div className="col-span-6 sm:col-span-3 pt-3.5 pb-4">
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#3f6a54] dark:text-emerald-400 mb-1.5">Valor atualizado</div>
                    <div className="font-serif text-[22px] font-medium text-[#3f6a54] dark:text-emerald-400 tracking-[-0.025em] leading-none">
                      {formatCurrency(processo.valor_atualizado)}
                    </div>
                    {processo.data_ultima_atualizacao_monetaria && (
                      <div className="text-[10.5px] text-[#9aa1a8] dark:text-slate-500 mt-1">
                        em {format(new Date(processo.data_ultima_atualizacao_monetaria), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="col-span-6 sm:col-span-3" />
                )}

                {/* Objeto da ação — linha larga */}
                {processo.objeto_acao && (
                  <>
                    <Sep />
                    <div className="col-span-6 py-3.5">
                      <div className={`${V4_LABEL} mb-1.5`}>Objeto da ação</div>
                      <div className="text-[13px] text-[#2c3e50] dark:text-slate-300 leading-relaxed">{processo.objeto_acao}</div>
                    </div>
                  </>
                )}
              </div>

              {/* rodapé — responsável + colaboradores */}
              <div className="px-6 py-3.5 border-t border-[#f0ede3] dark:bg-[#0f141c] dark:border-[#1d2a3c] bg-[#faf8f2] flex items-center gap-5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center text-[10px] font-bold text-white">{inic(processo.responsavel_nome)}</span>
                  <div>
                    <div className="text-[11.5px] font-semibold text-[#2c3e50] dark:text-slate-200">{processo.responsavel_nome}</div>
                    <div className="text-[10px] text-[#9aa1a8] dark:text-slate-500">Advogado responsável</div>
                  </div>
                </div>
                {processo.colaboradores_nomes.map((nome, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center text-[10px] font-bold text-white">{inic(nome)}</span>
                    <div>
                      <div className="text-[11.5px] font-medium text-[#5a6775] dark:text-slate-300">{nome}</div>
                      <div className="text-[10px] text-[#9aa1a8] dark:text-slate-500">Colaborador</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── ANDAMENTOS (V4: timeline, toggle Escritório/Tribunal, paginação) ── */}
        <div className={V4_CARD}>
          <div className={V4_HEADER}>
            <Activity className="w-3.5 h-3.5 text-[#89bcbe]" />
            <span className={V4_HEADER_TITLE}>Andamentos</span>
            <div className="flex-1" />
            {/* toggle */}
            <div className="flex gap-0.5 bg-[#ece9e2] dark:bg-[#1a212c] p-[3px] rounded-lg">
              <button
                onClick={() => trocarAndamentoTab('escritorio')}
                className={cn(
                  'px-[9px] py-[5px] rounded-md text-[11px] font-semibold transition-colors',
                  andamentoTab === 'escritorio'
                    ? 'bg-white dark:bg-[#2a3544] text-[#34495e] dark:text-slate-200 shadow-sm'
                    : 'text-[#7c8693] dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                )}
              >
                Escritório
              </button>
              <button
                onClick={() => trocarAndamentoTab('tribunal')}
                className={cn(
                  'px-[9px] py-[5px] rounded-md text-[11px] font-semibold transition-colors',
                  andamentoTab === 'tribunal'
                    ? 'bg-white dark:bg-[#2a3544] text-[#34495e] dark:text-slate-200 shadow-sm'
                    : 'text-[#7c8693] dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                )}
              >
                Tribunal
              </button>
            </div>
            <Dialog open={openNovoAndamento} onOpenChange={setOpenNovoAndamento}>
              <DialogTrigger asChild>
                <button className="h-[26px] px-[9px] rounded-md bg-transparent border border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-slate-300 text-[10.5px] font-semibold inline-flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-[#1a212c] transition-colors">
                  <Plus className="w-2.5 h-2.5" />
                  Registrar
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-[#34495e] dark:text-slate-200">
                    Novo Andamento Manual
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Data</label>
                      <Input
                        type="date"
                        value={novoAndamento.data}
                        onChange={(e) => setNovoAndamento({ ...novoAndamento, data: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Tipo de Andamento</label>
                      <Input
                        placeholder="Ex: Atualização, Reunião com cliente, Análise..."
                        value={novoAndamento.tipo}
                        onChange={(e) => setNovoAndamento({ ...novoAndamento, tipo: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Descrição</label>
                    <Textarea
                      placeholder="Descreva o andamento..."
                      value={novoAndamento.descricao}
                      onChange={(e) => setNovoAndamento({ ...novoAndamento, descricao: e.target.value })}
                      className="text-sm min-h-[120px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setOpenNovoAndamento(false)} disabled={salvandoAndamento}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddAndamento}
                      disabled={!novoAndamento.tipo || !novoAndamento.descricao || salvandoAndamento}
                      className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
                    >
                      {salvandoAndamento ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : 'Adicionar Andamento'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* timeline */}
          <div className="px-5 pt-1.5 pb-4">
            {loadingMovimentacoes ? (
              <div className="text-center py-8">
                <div className="w-5 h-5 mx-auto border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : movAtivas.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {andamentoTab === 'escritorio' ? 'Nenhum andamento do escritório' : 'Nenhum andamento do tribunal'}
                </p>
              </div>
            ) : (
              paginatedMovimentacoes.map((mov, index) => {
                const isEscritorio = andamentoTab === 'escritorio'
                const desc = isEscritorio ? describeEscritorio(mov) : null
                const tipo = isEscritorio ? (desc!.tipo) : 'tribunal'
                const cfg = ANDAMENTO_TIPO[tipo] || ANDAMENTO_TIPO.andamento
                const d = new Date(mov.data_movimento)
                const isLast = index === paginatedMovimentacoes.length - 1
                return (
                  <div key={mov.id} id={`andamento-${mov.id}`} className="grid grid-cols-[52px_18px_1fr] gap-3.5" style={{ paddingTop: index === 0 ? 14 : 0 }}>
                    {/* data */}
                    <div className="pt-3 text-right">
                      <div className="font-mono text-[13px] font-bold text-[#2c3e50] dark:text-slate-200 tracking-[-0.01em] leading-none">{format(d, 'dd/MM')}</div>
                      <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-slate-500 mt-0.5">{diaSemana(d)}</div>
                    </div>
                    {/* track */}
                    <div className="flex flex-col items-center relative">
                      <div className="w-[1.5px] h-3.5 bg-[#f0ede3] dark:bg-[#1d2a3c]" />
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 z-10 ring-[3px] ring-white dark:ring-[#151e2b]" style={{ background: cfg.color }} />
                      {!isLast && <div className="flex-1 w-[1.5px] bg-[#f0ede3] dark:bg-[#1d2a3c] min-h-[20px]" />}
                    </div>
                    {/* conteúdo */}
                    <div className={`min-w-0 pt-1.5 group ${isLast ? '' : 'pb-4'}`}>
                      <div className="flex items-start gap-2">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedMovimentacao(mov)}
                        >
                          {isEscritorio ? (
                            <>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {desc!.autor && (
                                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center text-[8.5px] font-bold text-white flex-shrink-0">{inic(desc!.autor)}</span>
                                )}
                                <span className="text-[12.5px] text-[#2c3e50] dark:text-slate-300 leading-snug">
                                  {desc!.autor && <strong className="font-semibold">{desc!.autor.split(' ')[0]}</strong>}
                                  <span className="text-[#9aa1a8] dark:text-slate-500">{desc!.autor ? ' ' : ''}{desc!.acao}</span>
                                </span>
                              </div>
                              <div className={`text-[12.5px] text-[#2c3e50] dark:text-slate-200 leading-relaxed tracking-[-0.005em] ${desc!.autor ? 'pl-[26px]' : ''}`}>{desc!.titulo}</div>
                              <span className={`mt-1 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded tracking-[0.06em] ${desc!.autor ? 'ml-[26px]' : ''}`} style={{ background: `${cfg.color}28`, color: cfg.color }}>{cfg.label}</span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[13px] font-semibold text-[#2c3e50] dark:text-slate-200 tracking-[-0.01em]">{mov.tipo_descricao || 'Movimentação'}</span>
                                {mov.lida === false && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#89bcbe] text-white tracking-[0.05em] flex-shrink-0">NOVO</span>
                                )}
                              </div>
                              <div className="text-[12px] text-[#5a6775] dark:text-slate-400 leading-relaxed line-clamp-2">{mov.descricao}</div>
                              <span className="mt-1 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded tracking-[0.06em]" style={{ background: `${cfg.color}28`, color: cfg.color }}>{cfg.label}</span>
                            </>
                          )}
                        </div>
                        {/* editar/excluir (só andamentos do escritório) */}
                        {isEscritorio && (
                          <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={(e) => handleEditMovimentacao(mov, e)} className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={(e) => handleDeleteMovimentacaoClick(mov.id, e)} className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-red-600">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* paginação */}
          {movAtivas.length > movimentacoesPerPage && (
            <div className="px-5 py-2.5 border-t border-[#f0ede3] dark:border-[#1d2a3c] flex items-center justify-between">
              <span className="text-[11px] text-[#9aa1a8] dark:text-slate-500 font-mono">
                {movStartIndex + 1}–{Math.min(movStartIndex + movimentacoesPerPage, movAtivas.length)} de {movAtivas.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMovimentacaoPage((p) => Math.max(1, p - 1))}
                  disabled={movimentacaoPage === 1}
                  className="w-7 h-7 rounded-md border border-[#e6e3da] dark:border-[#253345] flex items-center justify-center text-[#5a6775] dark:text-slate-300 disabled:opacity-40 disabled:cursor-default hover:bg-slate-50 dark:hover:bg-[#1a212c] transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex gap-1.5 items-center">
                  {Array.from({ length: totalMovPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setMovimentacaoPage(i + 1)}
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: i + 1 === movimentacaoPage ? 20 : 6, background: i + 1 === movimentacaoPage ? '#89bcbe' : '#dcd8cd' }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setMovimentacaoPage((p) => Math.min(totalMovPages, p + 1))}
                  disabled={movimentacaoPage === totalMovPages}
                  className="w-7 h-7 rounded-md border border-[#e6e3da] dark:border-[#253345] flex items-center justify-center text-[#5a6775] dark:text-slate-300 disabled:opacity-40 disabled:cursor-default hover:bg-slate-50 dark:hover:bg-[#1a212c] transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Partes adicionais (colapsável) */}
        {topSectionsSlot}

        {/* Processos vinculados — recursos, incidentes, processo principal */}
        {vinculosSlot}

        {/* Documentos — card inline com drag-drop (sempre visível) */}
        <ProcessoDocumentos processoId={processo.id} variant="inline" inlineLimit={5} />

        {/* Depósitos judiciais — seção retrátil abaixo dos documentos */}
        <ProcessoDepositos processoId={processo.id} />

      </div>

      {/* Coluna Lateral - Sticky (V4) */}
      <div className="space-y-3 xl:sticky xl:top-6 xl:self-start min-w-0">

        {/* Agenda */}
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
                <DropdownMenuItem onClick={() => setShowAudienciaWizard(true)}>
                  <Gavel className="w-4 h-4 mr-2 text-emerald-600" />
                  <span className="text-sm">Nova Audiência</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="py-1.5">
            {loadingAgenda ? (
              <div className="text-center py-3">
                <div className="w-5 h-5 mx-auto border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
              </div>
            ) : agendaItems.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum agendamento vinculado</p>
              </div>
            ) : (
              <div>
                {(() => {
                  // Paginação da agenda
                  const agendaStartIndex = (agendaPage - 1) * agendaPerPage
                  const paginatedAgenda = agendaItems.slice(agendaStartIndex, agendaStartIndex + agendaPerPage)
                  return paginatedAgenda
                })().map((item) => {
                  const handleClick = async () => {
                    if (item.tipo_entidade === 'tarefa') {
                      // Buscar tarefa completa
                      const { data: tarefa } = await supabase
                        .from('agenda_tarefas')
                        .select('*')
                        .eq('id', item.id)
                        .single()
                      if (tarefa) {
                        setSelectedTarefa(tarefa)
                        setTarefaDetailOpen(true)
                      }
                    } else if (item.tipo_entidade === 'evento') {
                      // Buscar evento completo
                      const { data: evento } = await supabase
                        .from('agenda_eventos')
                        .select('*')
                        .eq('id', item.id)
                        .single()
                      if (evento) {
                        setSelectedEvento(evento)
                        setEventoDetailOpen(true)
                      }
                    } else if (item.tipo_entidade === 'audiencia') {
                      // Buscar audiência completa
                      const { data: audiencia } = await supabase
                        .from('agenda_audiencias')
                        .select('*')
                        .eq('id', item.id)
                        .single()
                      if (audiencia) {
                        setSelectedAudiencia({
                          ...audiencia,
                          data_inicio: audiencia.data_hora ?? audiencia.data_inicio,
                        })
                        setAudienciaDetailOpen(true)
                      }
                    }
                  }

                  const dataRef = new Date(item.data_inicio)
                  const prazo = item.tipo_entidade === 'tarefa' ? item.prazo_data_limite : null
                  const urgente = !!prazo && (new Date(prazo).getTime() - new Date().setHours(0, 0, 0, 0)) <= 3 * 86400000
                  const barColor = urgente
                    ? '#a85a3e'
                    : item.tipo_entidade === 'audiencia'
                      ? '#3f7376'
                      : item.tipo_entidade === 'evento'
                        ? '#6a85a8'
                        : '#89bcbe'
                  const resps: string[] = (item.responsaveis_nomes?.length > 0
                    ? item.responsaveis_nomes
                    : item.responsavel_nome ? [item.responsavel_nome] : [])

                  return (
                    <div
                      key={item.id}
                      onClick={handleClick}
                      className="grid grid-cols-[54px_3px_1fr] gap-2.5 px-3.5 py-2.5 border-b border-[#f0ede3] dark:border-[#1d2a3c] last:border-0 cursor-pointer hover:bg-[#faf8f2] dark:hover:bg-[#1a212c] transition-colors items-start"
                    >
                      {/* data */}
                      <div className="text-center pt-0.5">
                        <div
                          className="font-serif text-[19px] font-semibold leading-none tracking-[-0.025em]"
                          style={{ color: urgente ? '#a85a3e' : undefined }}
                        >
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
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {((agendaPage - 1) * agendaPerPage) + 1}-{Math.min(agendaPage * agendaPerPage, agendaItems.length)} de {agendaItems.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAgendaPage(p => Math.max(1, p - 1))}
                        disabled={agendaPage === 1}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                      {Array.from({ length: Math.ceil(agendaItems.length / agendaPerPage) }, (_, i) => i + 1).slice(0, 5).map(page => (
                        <Button
                          key={page}
                          variant={agendaPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAgendaPage(page)}
                          className={`h-6 w-6 p-0 text-[10px] ${agendaPage === page ? 'bg-[#34495e] hover:bg-[#46627f]' : ''}`}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAgendaPage(p => Math.min(Math.ceil(agendaItems.length / agendaPerPage), p + 1))}
                        disabled={agendaPage === Math.ceil(agendaItems.length / agendaPerPage)}
                        className="h-6 w-6 p-0"
                      >
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
                onClick={() => router.push(`/dashboard/agenda?processo_id=${processo.id}`)}
                className="w-full flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[#89bcbe] hover:text-[#6ba9ab] transition-colors"
              >
                Ver todos os agendamentos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Card Financeiro */}
        <ProcessoFinanceiroCard
          processoId={processo.id}
          onLancarHonorario={() => setShowReceitaModal(true)}
          onLancarHoras={() => setShowTimesheetModal(true)}
          onLancarDespesa={() => setShowDespesaModal(true)}
          onEditTimesheet={(entry) => {
            setEditTimesheetEntry(entry)
            setEditTimesheetModalOpen(true)
          }}
          refreshTrigger={financeiroRefreshTrigger}
        />

        {/* Card de Cobrança de Atos (apenas para contratos por_ato) */}
        <ProcessoCobrancasCard
          processoId={processo.id}
          valorCausa={processo.valor_causa}
        />

        {/* Card de Cobrança Fixa (apenas para contratos fixo) */}
        <ProcessoCobrancaFixaCard processoId={processo.id} />

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
          // Modo edição - atualiza a tarefa
          const { error } = await supabase
            .from('agenda_tarefas')
            .update(data)
            .eq('id', selectedTarefa.id)
          if (error) throw error
          toast.success('Tarefa atualizada com sucesso!')
        } : undefined}
        onCreated={async () => {
          // Recarregar agendamentos usando função RPC
          await reloadAgenda()
          if (!editingTarefa) {
            toast.success('Tarefa criada com sucesso!')
          }
        }}
        initialData={editingTarefa && selectedTarefa ? selectedTarefa : { processo_id: processo.id }}
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
          await reloadAgenda()
        }}
        initialData={editingEvento && selectedEvento ? selectedEvento : { processo_id: processo.id }}
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
          await reloadAgenda()
        }}
        initialData={editingAudiencia && selectedAudiencia ? selectedAudiencia : { processo_id: processo.id }}
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
          onUpdate={reloadAgenda}
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
          await reloadAgenda()
          setSelectedTarefa(null)
          setSelectedEvento(null)
          setSelectedAudiencia(null)
        }}
      />

      {/* Modal de Detalhe da Movimentação */}
      <Dialog open={!!selectedMovimentacao} onOpenChange={(open) => !open && setSelectedMovimentacao(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0">
          <DialogTitle className="sr-only">Detalhe da Movimentação</DialogTitle>
          {selectedMovimentacao && (() => {
            // Parsear descrição para TAREFA_CONCLUIDA
            const parsedTarefa = (() => {
              if (selectedMovimentacao.referencia_tipo !== 'agenda_tarefas') return null
              const match = selectedMovimentacao.descricao.match(/^Tarefa "(.+)" concluída por (.+)$/)
              if (match) return { titulo: match[1], concluidaPor: match[2] }
              return null
            })()

            return (
              <div className="bg-white dark:bg-surface-1 rounded-lg flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {selectedMovimentacao.tipo_descricao || 'Movimentação'}
                  </h2>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                    {selectedMovimentacao.origem && (
                      <span className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded font-medium border',
                        selectedMovimentacao.origem === 'sistema'
                          ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30'
                          : selectedMovimentacao.origem === 'tribunal'
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                            : 'bg-slate-100 dark:bg-surface-2 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      )}>
                        {selectedMovimentacao.origem === 'sistema' ? 'Sistema' : selectedMovimentacao.origem === 'tribunal' ? 'Tribunal' : 'Manual'}
                      </span>
                    )}
                    <span>{format(new Date(selectedMovimentacao.data_movimento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {parsedTarefa ? (
                    <>
                      {/* Informação estruturada para TAREFA_CONCLUIDA */}
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
                      {movimentacaoTarefaDescricao && (
                        <div>
                          <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                            Descrição da Tarefa
                          </div>
                          <div className="bg-slate-50 dark:bg-surface-0 rounded-md p-3 max-h-[200px] overflow-y-auto">
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                              {movimentacaoTarefaDescricao}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Layout genérico para outras movimentações */}
                      <div>
                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          Descrição
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                          {selectedMovimentacao.conteudo_completo || selectedMovimentacao.descricao}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-0/50 flex-shrink-0">
                  <div className="flex items-center justify-end gap-2">
                    {selectedMovimentacao.referencia_tipo === 'agenda_tarefas' && selectedMovimentacao.referencia_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200"
                        onClick={async () => {
                          const { data: tarefa } = await supabase
                            .from('agenda_tarefas')
                            .select('*')
                            .eq('id', selectedMovimentacao.referencia_id!)
                            .single()
                          if (tarefa) {
                            setSelectedMovimentacao(null)
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
                      onClick={() => setSelectedMovimentacao(null)}
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

      {/* Modal de Despesa */}
      <DespesaModal
        open={showDespesaModal}
        onOpenChange={setShowDespesaModal}
        processoId={processo.id}
        onSuccess={() => setFinanceiroRefreshTrigger(prev => prev + 1)}
      />

      {/* Modal de Honorário (Receita) */}
      <ReceitaModal
        open={showReceitaModal}
        onOpenChange={setShowReceitaModal}
        processoId={processo.id}
        clienteId={processo.cliente_id}
        onSuccess={() => setFinanceiroRefreshTrigger(prev => prev + 1)}
      />

      {/* Modal de Timesheet */}
      <TimesheetModal
        open={showTimesheetModal}
        onOpenChange={(open) => {
          if (!open && tarefaParaConcluirId && !horasRegistradasRef.current) {
            // Fechou sem registrar horas → perguntar se quer concluir mesmo assim
            setShowTimesheetModal(false)
            setConfirmSemHoras(true)
            return
          }
          if (!open && tarefaParaConcluirId && horasRegistradasRef.current) {
            // Já registrou com sucesso - limpar
            setTarefaParaConcluirId(null)
          }
          setShowTimesheetModal(open)
        }}
        processoId={processo.id}
        onSuccess={async () => {
          horasRegistradasRef.current = true
          setShowTimesheetModal(false)
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
          consultaId={editTimesheetEntry.consulta_id}
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

      {/* Modal Editar Movimentação */}
      <Dialog open={editMovimentacaoOpen} onOpenChange={setEditMovimentacaoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34495e] dark:text-slate-200">Editar Andamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Tipo</label>
              <Input
                placeholder="Ex: Sentença, Despacho, Juntada..."
                value={editMovimentacaoForm.tipo_descricao}
                onChange={(e) => setEditMovimentacaoForm(prev => ({ ...prev, tipo_descricao: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Descrição *</label>
              <Textarea
                placeholder="Descreva o andamento..."
                value={editMovimentacaoForm.descricao}
                onChange={(e) => setEditMovimentacaoForm(prev => ({ ...prev, descricao: e.target.value }))}
                className="text-sm min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMovimentacaoOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveEditMovimentacao}
              disabled={salvandoMovimentacao || !editMovimentacaoForm.descricao.trim()}
              className="bg-gradient-to-r from-[#34495e] to-[#46627f]"
            >
              {salvandoMovimentacao ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão de Movimentação */}
      <Dialog open={deleteMovimentacaoOpen} onOpenChange={setDeleteMovimentacaoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34495e] dark:text-slate-200">Excluir Andamento</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              Tem certeza que deseja excluir este andamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMovimentacaoOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteMovimentacao}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
