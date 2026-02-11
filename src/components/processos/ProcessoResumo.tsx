'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Copy,
  Check,
  Users,
  MapPin,
  Clock,
  FileText,
  Calendar,
  CheckCircle,
  Plus,
  ListTodo,
  Gavel,
  User,
  CalendarClock,
  Tag,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDateTime, formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import TarefaDetailModal from '@/components/agenda/TarefaDetailModal'
import EventoDetailModal from '@/components/agenda/EventoDetailModal'
import AudienciaDetailModal from '@/components/agenda/AudienciaDetailModal'
import ProcessoTimelineHorizontal from '@/components/processos/ProcessoTimelineHorizontal'
import ProcessoFinanceiroCard from '@/components/processos/ProcessoFinanceiroCard'
import ProcessoCobrancasCard from '@/components/processos/ProcessoCobrancasCard'
import ProcessoCobrancaFixaCard from '@/components/processos/ProcessoCobrancaFixaCard'
import TimesheetModal from '@/components/financeiro/TimesheetModal'
import { useRouter } from 'next/navigation'
import type { TarefaFormData } from '@/hooks/useTarefas'
import type { EventoFormData } from '@/hooks/useEventos'
import type { AudienciaFormData } from '@/hooks/useAudiencias'

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
  comarca?: string
  vara?: string
  juiz?: string
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
}

interface Movimentacao {
  id: string
  data_movimento: string
  tipo_descricao?: string
  descricao: string
  conteudo_completo?: string | null
  origem?: string
}

export default function ProcessoResumo({ processo }: ProcessoResumoProps) {
  const [copiedCNJ, setCopiedCNJ] = useState(false)
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
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [financeiroRefreshTrigger, setFinanceiroRefreshTrigger] = useState(0)

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

  // Paginação de movimentações
  const [movimentacaoPage, setMovimentacaoPage] = useState(1)
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
        .select('id, data_movimento, tipo_descricao, descricao, conteudo_completo, origem')
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

  const copyCNJ = () => {
    navigator.clipboard.writeText(processo.numero_cnj)
    setCopiedCNJ(true)
    setTimeout(() => setCopiedCNJ(false), 2000)
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
        .select('id, data_movimento, tipo_descricao, descricao, conteudo_completo, origem')
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

  // Paginação de movimentações
  const totalMovPages = Math.ceil(movimentacoes.length / movimentacoesPerPage)
  const movStartIndex = (movimentacaoPage - 1) * movimentacoesPerPage
  const paginatedMovimentacoes = movimentacoes.slice(movStartIndex, movStartIndex + movimentacoesPerPage)

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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

      {/* Coluna Principal - Ficha (8/12) */}
      <div className="xl:col-span-8 space-y-6">

        {/* Card Principal - Informações Gerais */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-[#34495e] mb-1">
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-6">

              {/* Coluna Esquerda - Informações Principais */}
              <div className="col-span-7 space-y-3.5">

                {/* Partes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Cliente</p>
                    <Button variant="link" className="text-sm font-semibold text-[#34495e] hover:text-[#89bcbe] p-0 h-auto max-w-full truncate block" title={processo.cliente_nome}>
                      {processo.cliente_nome}
                    </Button>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Parte Contrária</p>
                    <p className="text-sm font-semibold text-slate-700 truncate" title={processo.parte_contraria || 'Não informado'}>{processo.parte_contraria || 'Não informado'}</p>
                  </div>
                </div>

                {/* CNJ */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Número CNJ</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">{processo.numero_cnj}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyCNJ}
                        className="h-6 w-6 p-0 hover:bg-slate-100"
                        title="Copiar CNJ"
                      >
                        {copiedCNJ ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Data de Distribuição</p>
                    <p className="text-sm text-slate-700">
                      {format(new Date(processo.data_distribuicao), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Informações Processuais */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Fase / Instância</p>
                    <p className="text-sm text-slate-700">
                      {processo.fase} / {processo.instancia}
                    </p>
                  </div>

                  {processo.rito && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5">Rito</p>
                      <p className="text-sm text-slate-700 capitalize">{processo.rito}</p>
                    </div>
                  )}
                </div>

                {/* Objeto da Ação */}
                {processo.objeto_acao && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Objeto da Ação</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{processo.objeto_acao}</p>
                  </div>
                )}

                {/* Valores */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2.5">Valores</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-600">Valor da Causa:</span>
                      <span className="text-sm font-semibold text-[#34495e]">
                        {processo.valor_causa ? formatCurrency(processo.valor_causa) : 'Não definido'}
                      </span>
                    </div>

                    {processo.valor_atualizado && processo.valor_atualizado !== processo.valor_causa && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-600">Valor Atualizado:</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-emerald-700">
                            {formatCurrency(processo.valor_atualizado)}
                          </span>
                          {processo.data_ultima_atualizacao_monetaria && (
                            <p className="text-[10px] text-slate-500">
                              Atualizado em {format(new Date(processo.data_ultima_atualizacao_monetaria), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Coluna Direita - Localização e Responsável */}
              <div className="col-span-5 pl-6 border-l border-slate-100 space-y-4">
                {/* Localização */}
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#89bcbe] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 mb-2.5">Localização</p>
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-xs text-slate-500">Tribunal</p>
                        {processo.link_tribunal ? (
                          <Button
                            variant="link"
                            className="text-sm text-[#34495e] hover:text-[#89bcbe] font-medium p-0 h-auto"
                            onClick={() => window.open(processo.link_tribunal, '_blank')}
                          >
                            {processo.tribunal} →
                          </Button>
                        ) : (
                          <p className="text-sm text-slate-700 font-medium">{processo.tribunal}</p>
                        )}
                      </div>
                      {processo.comarca && (
                        <div>
                          <p className="text-xs text-slate-500">Comarca</p>
                          <p className="text-sm text-slate-700">{processo.comarca}</p>
                        </div>
                      )}
                      {processo.vara && (
                        <div>
                          <p className="text-xs text-slate-500">Vara</p>
                          <p className="text-sm text-slate-700">{processo.vara}</p>
                        </div>
                      )}
                      {processo.juiz && (
                        <div>
                          <p className="text-xs text-slate-500">Juiz</p>
                          <p className="text-sm text-slate-700">{processo.juiz}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Responsável */}
                <div className="flex items-start gap-2 pt-3 border-t border-slate-100">
                  <Users className="w-4 h-4 text-[#89bcbe] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 mb-2.5">Responsável</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-white">
                          {processo.responsavel_nome.split(' ')[1]?.charAt(0) || processo.responsavel_nome.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#34495e]">{processo.responsavel_nome}</p>
                        <p className="text-[10px] text-slate-500">Advogado responsável</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Andamentos Processuais */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-1">
              <CardTitle className="text-sm font-medium text-[#34495e]">
                Últimos Andamentos
              </CardTitle>

              <Dialog open={openNovoAndamento} onOpenChange={setOpenNovoAndamento}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Adicionar Andamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-[#34495e]">
                      Novo Andamento Manual
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                          Data
                        </label>
                        <Input
                          type="date"
                          value={novoAndamento.data}
                          onChange={(e) => setNovoAndamento({ ...novoAndamento, data: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                          Tipo de Andamento
                        </label>
                        <Input
                          placeholder="Ex: Atualização, Reunião com cliente, Análise..."
                          value={novoAndamento.tipo}
                          onChange={(e) => setNovoAndamento({ ...novoAndamento, tipo: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                        Descrição
                      </label>
                      <Textarea
                        placeholder="Descreva o andamento..."
                        value={novoAndamento.descricao}
                        onChange={(e) => setNovoAndamento({ ...novoAndamento, descricao: e.target.value })}
                        className="text-sm min-h-[120px]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setOpenNovoAndamento(false)}
                        disabled={salvandoAndamento}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddAndamento}
                        disabled={!novoAndamento.tipo || !novoAndamento.descricao || salvandoAndamento}
                        className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
                      >
                        {salvandoAndamento ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          'Adicionar Andamento'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {paginatedMovimentacoes.map((mov, index) => (
              <div
                key={mov.id}
                id={`andamento-${mov.id}`}
                className={`transition-colors duration-300 cursor-pointer hover:bg-slate-50 rounded-md p-2 -mx-2 group ${index !== paginatedMovimentacoes.length - 1 ? 'pb-3 border-b border-slate-100' : ''}`}
                onClick={() => setSelectedMovimentacao(mov)}
              >
                <div className="flex gap-3">
                  {/* Data */}
                  <div className="flex-shrink-0 w-20">
                    <p className="text-xs font-medium text-slate-700">
                      {format(new Date(mov.data_movimento), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[#34495e] mb-0.5">
                      {mov.tipo_descricao}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {mov.descricao}
                    </p>
                  </div>

                  {/* Botões Editar/Excluir */}
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEditMovimentacao(mov, e)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-[#34495e]"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteMovimentacaoClick(mov.id, e)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {movimentacoes.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Nenhum andamento registrado</p>
              </div>
            )}

            {/* Paginação de Movimentações */}
            {movimentacoes.length > movimentacoesPerPage && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {movStartIndex + 1}-{Math.min(movStartIndex + movimentacoesPerPage, movimentacoes.length)} de {movimentacoes.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMovimentacaoPage(p => Math.max(1, p - 1))}
                    disabled={movimentacaoPage === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  {Array.from({ length: totalMovPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={movimentacaoPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMovimentacaoPage(page)}
                      className={`h-7 w-7 p-0 text-xs ${movimentacaoPage === page ? 'bg-[#34495e] hover:bg-[#46627f]' : ''}`}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMovimentacaoPage(p => Math.min(totalMovPages, p + 1))}
                    disabled={movimentacaoPage === totalMovPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Visual Horizontal */}
        {movimentacoes.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <ProcessoTimelineHorizontal
                movimentacoes={movimentacoes}
                onItemClick={(movId) => {
                  // Abrir modal de detalhe da movimentação
                  const mov = movimentacoes.find(m => m.id === movId)
                  if (mov) {
                    setSelectedMovimentacao(mov)
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

      </div>

      {/* Coluna Lateral (4/12) */}
      <div className="xl:col-span-4 space-y-6">

        {/* Agenda */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-[#89bcbe]" />
                Agenda
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-[#89bcbe] hover:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
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
          </CardHeader>
          <CardContent>
            {loadingAgenda ? (
              <div className="text-center py-3">
                <div className="w-5 h-5 mx-auto border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
              </div>
            ) : agendaItems.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500">Nenhum agendamento vinculado</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {(() => {
                  // Paginação da agenda
                  const totalAgendaPages = Math.ceil(agendaItems.length / agendaPerPage)
                  const agendaStartIndex = (agendaPage - 1) * agendaPerPage
                  const paginatedAgenda = agendaItems.slice(agendaStartIndex, agendaStartIndex + agendaPerPage)
                  return paginatedAgenda
                })().map((item) => {
                  const statusConfig: Record<string, { bg: string; text: string }> = {
                    pendente: { bg: 'bg-amber-100', text: 'text-amber-700' },
                    em_andamento: { bg: 'bg-blue-100', text: 'text-blue-700' },
                    concluida: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
                    agendada: { bg: 'bg-blue-100', text: 'text-blue-700' },
                  }
                  const statusStyle = statusConfig[item.status] || statusConfig.pendente

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
                        setSelectedAudiencia(audiencia)
                        setAudienciaDetailOpen(true)
                      }
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={handleClick}
                      className="border border-slate-200 rounded-lg p-4 hover:border-[#89bcbe] hover:shadow-sm transition-all cursor-pointer"
                    >
                      {/* Header com título e status */}
                      <div className="flex items-start gap-2.5 mb-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#34495e] leading-tight truncate">
                            {item.titulo}
                          </p>
                        </div>
                        <Badge className={`text-[10px] h-4 px-1.5 flex-shrink-0 border ${statusStyle.bg} ${statusStyle.text}`}>
                          {item.status}
                        </Badge>
                      </div>

                      {/* Info adicional */}
                      <div className="space-y-1.5">
                        {/* Data/Horário - tarefas sem hora, eventos e audiências com hora */}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#89bcbe]" />
                          <span className="text-[10px] text-slate-600">
                            {item.tipo_entidade === 'tarefa'
                              ? formatBrazilDate(item.data_inicio)
                              : formatBrazilDateTime(item.data_inicio)}
                          </span>
                        </div>

                        {/* Responsáveis */}
                        {(item.responsaveis_nomes?.length > 0 || item.responsavel_nome) && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
                            <span className="text-[10px] text-slate-600 truncate">
                              {item.responsaveis_nomes?.length > 0
                                ? item.responsaveis_nomes.join(', ')
                                : item.responsavel_nome}
                            </span>
                          </div>
                        )}

                        {/* Prazo Fatal (apenas para tarefas) */}
                        {item.tipo_entidade === 'tarefa' && item.prazo_data_limite && (
                          <div className="flex items-center gap-1.5">
                            <CalendarClock className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] text-red-600 font-medium">
                              Fatal: {formatBrazilDate(item.prazo_data_limite)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Paginação da Agenda */}
                {agendaItems.length > agendaPerPage && (
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
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

            {agendaItems.length > 0 && (
              <Button
                variant="link"
                className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] p-0 h-auto mt-3 w-full"
                onClick={() => router.push(`/dashboard/agenda?processo_id=${processo.id}`)}
              >
                Ver agenda completa →
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Card Financeiro */}
        <ProcessoFinanceiroCard
          processoId={processo.id}
          onLancarHonorario={() => {
            // TODO: Abrir modal de honorário
            console.log('Lançar honorário')
          }}
          onLancarHoras={() => setShowTimesheetModal(true)}
          onLancarDespesa={() => {
            // TODO: Abrir modal de despesa
            console.log('Lançar despesa')
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
        onSubmit={async (data: EventoFormData) => {
          if (editingEvento && selectedEvento) {
            // Modo edição - atualiza o evento
            const { error } = await supabase
              .from('agenda_eventos')
              .update(data)
              .eq('id', selectedEvento.id)
            if (error) throw error
            toast.success('Evento atualizado com sucesso!')
          } else {
            // Modo criação - insere novo evento
            const { error } = await supabase
              .from('agenda_eventos')
              .insert(data)
            if (error) throw error
            toast.success('Evento criado com sucesso!')
          }
          setShowEventoWizard(false)
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
        onSubmit={async (data: AudienciaFormData) => {
          if (editingAudiencia && selectedAudiencia) {
            // Modo edição - atualiza a audiência
            const { error } = await supabase
              .from('agenda_audiencias')
              .update(data)
              .eq('id', selectedAudiencia.id)
            if (error) throw error
            toast.success('Audiência atualizada com sucesso!')
          } else {
            // Modo criação - insere nova audiência
            const { error } = await supabase
              .from('agenda_audiencias')
              .insert(data)
            if (error) throw error
            toast.success('Audiência criada com sucesso!')
          }
          setShowAudienciaWizard(false)
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
          onCancelar={() => handleDeleteEvento(selectedEvento.id)}
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
          onCancelar={() => handleDeleteAudiencia(selectedAudiencia.id)}
        />
      )}

      {/* Modal de Detalhe da Movimentação */}
      <Dialog open={!!selectedMovimentacao} onOpenChange={(open) => !open && setSelectedMovimentacao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34495e]">
              Detalhe da Movimentação
            </DialogTitle>
          </DialogHeader>

          {selectedMovimentacao && (
            <div className="space-y-4 pt-2">
              {/* Data e Tipo */}
              <div className="flex items-baseline gap-4 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Data</p>
                  <p className="text-sm font-medium text-[#34495e]">
                    {format(new Date(selectedMovimentacao.data_movimento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                {selectedMovimentacao.tipo_descricao && (
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Tipo</p>
                    <p className="text-sm font-medium text-[#34495e]">
                      {selectedMovimentacao.tipo_descricao}
                    </p>
                  </div>
                )}
                {selectedMovimentacao.origem && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Origem</p>
                    <p className="text-xs text-slate-600 capitalize">
                      {selectedMovimentacao.origem}
                    </p>
                  </div>
                )}
              </div>

              {/* Conteúdo Completo */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Descrição</p>
                <div className="bg-slate-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedMovimentacao.conteudo_completo || selectedMovimentacao.descricao}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Dialog: concluir sem horas */}
      <Dialog open={confirmSemHoras} onOpenChange={setConfirmSemHoras}>
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
            <DialogTitle className="text-base font-semibold text-[#34495e]">Editar Andamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Tipo</label>
              <Input
                placeholder="Ex: Sentença, Despacho, Juntada..."
                value={editMovimentacaoForm.tipo_descricao}
                onChange={(e) => setEditMovimentacaoForm(prev => ({ ...prev, tipo_descricao: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Descrição *</label>
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
            <DialogTitle className="text-base font-semibold text-[#34495e]">Excluir Andamento</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
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
