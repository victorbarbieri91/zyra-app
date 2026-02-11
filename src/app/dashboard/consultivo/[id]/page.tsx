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
  Clock
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatBrazilDateTime, formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import TarefaDetailModal from '@/components/agenda/TarefaDetailModal'
import EventoDetailModal from '@/components/agenda/EventoDetailModal'
import AudienciaDetailModal from '@/components/agenda/AudienciaDetailModal'
import TransformarConsultivoWizard from '@/components/consultivo/TransformarConsultivoWizard'
import EditarConsultivoModal from '@/components/consultivo/EditarConsultivoModal'
import ConsultivoFinanceiroCard from '@/components/consultivo/ConsultivoFinanceiroCard'
import ProcessoCobrancaFixaCard from '@/components/processos/ProcessoCobrancaFixaCard'
import TimesheetModal from '@/components/financeiro/TimesheetModal'
import type { TarefaFormData } from '@/hooks/useTarefas'
import type { EventoFormData } from '@/hooks/useEventos'
import type { AudienciaFormData } from '@/hooks/useAudiencias'

interface Consulta {
  id: string
  numero: string | null
  titulo: string
  descricao: string | null
  cliente_id: string
  cliente_nome: string
  area: string
  status: string
  prioridade: string
  prazo: string | null
  responsavel_id: string
  responsavel_nome: string
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
}

export default function ConsultaDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(false)

  // Estados para novo andamento
  const [novoAndamentoOpen, setNovoAndamentoOpen] = useState(false)
  const [novoAndamento, setNovoAndamento] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    tipo: '',
    descricao: ''
  })
  const [salvandoAndamento, setSalvandoAndamento] = useState(false)

  // Estados para editar andamento
  const [editandoAndamento, setEditandoAndamento] = useState<{ index: number; tipo: string; descricao: string } | null>(null)
  const [editAndamentoOpen, setEditAndamentoOpen] = useState(false)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Estados para excluir andamento
  const [excluindoAndamentoIndex, setExcluindoAndamentoIndex] = useState<number | null>(null)
  const [deleteAndamentoOpen, setDeleteAndamentoOpen] = useState(false)

  // Estado para detalhe de andamento
  const [selectedAndamento, setSelectedAndamento] = useState<Andamento | null>(null)

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

  // Estados para Financeiro
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false)

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

  const loadAgenda = async () => {
    try {
      setLoadingAgenda(true)

      const [tarefasRes, eventosRes, audienciasRes] = await Promise.all([
        supabase
          .from('agenda_tarefas')
          .select('id, titulo, status, data_inicio, responsavel_id, prazo_data_limite, profiles!agenda_tarefas_responsavel_id_fkey(nome_completo)')
          .eq('consultivo_id', params.id)
          .order('data_inicio', { ascending: true }),
        supabase
          .from('agenda_eventos')
          .select('id, titulo, status, data_inicio, responsavel_id, profiles!agenda_eventos_responsavel_id_fkey(nome_completo)')
          .eq('consultivo_id', params.id)
          .order('data_inicio', { ascending: true }),
        supabase
          .from('agenda_audiencias')
          .select('id, titulo, status, data_hora, responsavel_id, profiles!agenda_audiencias_responsavel_id_fkey(nome_completo)')
          .eq('consultivo_id', params.id)
          .order('data_hora', { ascending: true })
      ])

      const items: any[] = []

      if (tarefasRes.data) {
        tarefasRes.data.forEach((t: any) => items.push({
          ...t,
          tipo_entidade: 'tarefa',
          responsavel_nome: t.profiles?.nome_completo || null
        }))
      }
      if (eventosRes.data) {
        eventosRes.data.forEach((e: any) => items.push({
          ...e,
          tipo_entidade: 'evento',
          responsavel_nome: e.profiles?.nome_completo || null
        }))
      }
      if (audienciasRes.data) {
        audienciasRes.data.forEach((a: any) => items.push({
          ...a,
          tipo_entidade: 'audiencia',
          data_inicio: a.data_hora,
          responsavel_nome: a.profiles?.nome_completo || null
        }))
      }

      // Filtrar itens concluídos/realizados (ficam apenas nos andamentos)
      const activeItems = items.filter(item =>
        item.status !== 'concluida' && item.status !== 'realizada' && item.status !== 'cancelada'
      )

      activeItems.sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())

      setAgendaItems(activeItems)
      setLoadingAgenda(false)
    } catch (error) {
      console.error('Erro ao carregar agenda:', error)
      setLoadingAgenda(false)
    }
  }

  // Adicionar andamento
  const handleAddAndamento = async () => {
    if (!novoAndamento.tipo.trim() || !novoAndamento.descricao.trim()) {
      toast.error('Preencha o tipo e a descrição')
      return
    }

    setSalvandoAndamento(true)

    try {
      const dataAndamento = parseDateInBrazil(novoAndamento.data, 'yyyy-MM-dd')

      const novoItem: Andamento = {
        data: dataAndamento.toISOString(),
        tipo: novoAndamento.tipo,
        descricao: novoAndamento.descricao,
        user_id: userId || undefined
      }

      const andamentosAtualizados = [...(consulta?.andamentos || []), novoItem]

      const { error } = await supabase
        .from('consultivo_consultas')
        .update({ andamentos: andamentosAtualizados })
        .eq('id', params.id)

      if (error) throw error

      setConsulta(prev => prev ? { ...prev, andamentos: andamentosAtualizados } : null)
      setNovoAndamento({
        data: format(new Date(), 'yyyy-MM-dd'),
        tipo: '',
        descricao: ''
      })
      setNovoAndamentoOpen(false)
      toast.success('Andamento adicionado')
    } catch (error) {
      console.error('Erro ao adicionar andamento:', error)
      toast.error('Erro ao adicionar andamento')
    } finally {
      setSalvandoAndamento(false)
    }
  }

  // Editar andamento
  const handleEditAndamento = (index: number) => {
    const andamentos = consulta?.andamentos || []
    const reversedIndex = andamentos.length - 1 - index // Ajustar para array reverso
    const andamento = andamentos[reversedIndex]
    if (andamento) {
      setEditandoAndamento({ index: reversedIndex, tipo: andamento.tipo || '', descricao: andamento.descricao })
      setEditAndamentoOpen(true)
    }
  }

  const handleSaveEditAndamento = async () => {
    if (!editandoAndamento || !editandoAndamento.descricao.trim()) {
      toast.error('Preencha a descrição')
      return
    }

    setSalvandoEdicao(true)

    try {
      const andamentosAtualizados = [...(consulta?.andamentos || [])]
      andamentosAtualizados[editandoAndamento.index] = {
        ...andamentosAtualizados[editandoAndamento.index],
        tipo: editandoAndamento.tipo || undefined,
        descricao: editandoAndamento.descricao
      }

      const { error } = await supabase
        .from('consultivo_consultas')
        .update({ andamentos: andamentosAtualizados })
        .eq('id', params.id)

      if (error) throw error

      setConsulta(prev => prev ? { ...prev, andamentos: andamentosAtualizados } : null)
      setEditAndamentoOpen(false)
      setEditandoAndamento(null)
      toast.success('Andamento atualizado')
    } catch (error) {
      console.error('Erro ao editar andamento:', error)
      toast.error('Erro ao editar andamento')
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // Excluir andamento
  const handleDeleteAndamentoClick = (index: number) => {
    const andamentos = consulta?.andamentos || []
    const reversedIndex = andamentos.length - 1 - index // Ajustar para array reverso
    setExcluindoAndamentoIndex(reversedIndex)
    setDeleteAndamentoOpen(true)
  }

  const handleConfirmDeleteAndamento = async () => {
    if (excluindoAndamentoIndex === null) return

    try {
      const andamentosAtualizados = (consulta?.andamentos || []).filter((_, i) => i !== excluindoAndamentoIndex)

      const { error } = await supabase
        .from('consultivo_consultas')
        .update({ andamentos: andamentosAtualizados })
        .eq('id', params.id)

      if (error) throw error

      setConsulta(prev => prev ? { ...prev, andamentos: andamentosAtualizados } : null)
      setDeleteAndamentoOpen(false)
      setExcluindoAndamentoIndex(null)
      toast.success('Andamento excluído')

      // Ajustar página se necessário
      const newTotal = Math.ceil(andamentosAtualizados.length / andamentosPerPage)
      if (andamentoPage > newTotal && newTotal > 0) {
        setAndamentoPage(newTotal)
      }
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
      ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      arquivado: 'bg-slate-100 text-slate-700 border-slate-200',
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

  const getPrioridadeBadge = (prioridade: string) => {
    const styles: Record<string, string> = {
      baixa: 'bg-slate-100 text-slate-600 border-slate-200',
      media: 'bg-blue-100 text-blue-700 border-blue-200',
      alta: 'bg-amber-100 text-amber-700 border-amber-200',
      urgente: 'bg-red-100 text-red-700 border-red-200',
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
          <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#34495e] mb-2">Consulta não encontrada</h2>
          <Button onClick={() => router.push('/dashboard/consultivo')}>Voltar para lista</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#34495e] to-[#46627f] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/consultivo')} className="text-white/80 hover:text-white hover:bg-white/10 h-8">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              {consulta.status === 'ativo' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTransformarModalOpen(true)}
                  className="h-8 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20 gap-2"
                >
                  <Scale className="w-4 h-4" />
                  <ArrowRight className="w-3 h-3" />
                  Transformar em Processo
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleArchive}
                className={cn(
                  "h-8",
                  consulta.status === 'arquivado'
                    ? "text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                {consulta.status === 'arquivado' ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reativar
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivar
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 h-8"
                onClick={() => setEditarModalOpen(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Consultivo</span>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">{consulta.numero || 'S/N'}</h1>
                  {consulta.numero && (
                    <Button variant="ghost" size="sm" onClick={copyId} className="h-6 w-6 p-0 hover:bg-white/10">
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5 text-white/60" />}
                    </Button>
                  )}
                </div>
              </div>
              <div className="w-px h-10 bg-white/20 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-white truncate" title={consulta.titulo}>{consulta.titulo}</h2>
                <p className="text-sm text-white/70">{consulta.cliente_nome}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getStatusBadge(consulta.status)}
              {getPrioridadeBadge(consulta.prioridade)}
              <div className="w-px h-8 bg-white/20" />
              <span className="text-sm text-white/80">{consulta.responsavel_nome}</span>
            </div>
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Coluna Principal (8/12) */}
          <div className="xl:col-span-8 space-y-6">

            {/* Informações Gerais */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium text-[#34495e]">Informações da Consulta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Cliente</p>
                      <p className="text-sm font-semibold text-[#34495e]">{consulta.cliente_nome}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Área</p>
                      <p className="text-sm text-slate-700">{formatArea(consulta.area)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Prazo</p>
                      <p className="text-sm text-slate-700">
                        {consulta.prazo ? format(new Date(consulta.prazo + 'T00:00:00'), 'dd/MM/yyyy') : 'Não definido'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Responsável</p>
                      <p className="text-sm font-semibold text-[#34495e]">{consulta.responsavel_nome}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Criado em</p>
                      <p className="text-sm text-slate-700">{format(new Date(consulta.created_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  </div>
                </div>

                {consulta.descricao && (
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">Descrição</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{consulta.descricao}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Andamentos */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-1">
                  <CardTitle className="text-sm font-medium text-[#34495e]">
                    Últimos Andamentos
                  </CardTitle>
                  <Dialog open={novoAndamentoOpen} onOpenChange={setNovoAndamentoOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Adicionar Andamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-[#34495e]">
                          Novo Andamento
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
                            onClick={() => setNovoAndamentoOpen(false)}
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
              <CardContent>
                {!consulta.andamentos || consulta.andamentos.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Nenhum andamento registrado</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {(() => {
                        const reversed = [...consulta.andamentos].reverse()
                        const startIndex = (andamentoPage - 1) * andamentosPerPage
                        const paginated = reversed.slice(startIndex, startIndex + andamentosPerPage)

                        return paginated.map((andamento: Andamento, index) => (
                          <div
                            key={index}
                            className="transition-colors duration-300 cursor-pointer hover:bg-slate-50 rounded-md p-2 -mx-2 group border-b border-slate-100 last:border-0"
                            onClick={() => setSelectedAndamento(andamento)}
                          >
                            <div className="flex gap-3">
                              {/* Data */}
                              <div className="flex-shrink-0 w-20">
                                <p className="text-xs font-medium text-slate-700">
                                  {format(new Date(andamento.data), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              </div>

                              {/* Conteúdo */}
                              <div className="flex-1">
                                {andamento.tipo && (
                                  <p className="text-xs font-semibold text-[#34495e] mb-0.5">
                                    {formatTipoAndamento(andamento.tipo)}
                                  </p>
                                )}
                                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                                  {andamento.descricao}
                                </p>
                              </div>

                              {/* Botões Editar/Excluir */}
                              <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleEditAndamento(startIndex + index) }}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-[#34495e]"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAndamentoClick(startIndex + index) }}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>

                    {/* Paginação de Andamentos */}
                    {consulta.andamentos.length > andamentosPerPage && (
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-500">
                          {Math.min((andamentoPage - 1) * andamentosPerPage + 1, consulta.andamentos.length)}-{Math.min(andamentoPage * andamentosPerPage, consulta.andamentos.length)} de {consulta.andamentos.length}
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
                          {Array.from({ length: Math.ceil(consulta.andamentos.length / andamentosPerPage) }, (_, i) => i + 1).map(page => (
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
                            onClick={() => setAndamentoPage(p => Math.min(Math.ceil(consulta.andamentos.length / andamentosPerPage), p + 1))}
                            disabled={andamentoPage === Math.ceil(consulta.andamentos.length / andamentosPerPage)}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Anexos */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-[#34495e]">Anexos ({consulta.anexos?.length || 0})</CardTitle>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!consulta.anexos || consulta.anexos.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Nenhum anexo</p>
                    <p className="text-xs text-slate-500 mt-1">Clique em Upload para adicionar arquivos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {consulta.anexos.map((anexo: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-[#34495e]">{anexo.nome}</p>
                            <p className="text-xs text-slate-500">{anexo.tamanho ? `${(anexo.tamanho / 1024).toFixed(0)} KB` : ''}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                          const { data: tarefa } = await supabase
                            .from('agenda_tarefas').select('*').eq('id', item.id).single()
                          if (tarefa) { setSelectedTarefa(tarefa); setTarefaDetailOpen(true) }
                        } else if (item.tipo_entidade === 'evento') {
                          const { data: evento } = await supabase
                            .from('agenda_eventos').select('*').eq('id', item.id).single()
                          if (evento) { setSelectedEvento(evento); setEventoDetailOpen(true) }
                        } else if (item.tipo_entidade === 'audiencia') {
                          const { data: audiencia } = await supabase
                            .from('agenda_audiencias').select('*').eq('id', item.id).single()
                          if (audiencia) { setSelectedAudiencia(audiencia); setAudienciaDetailOpen(true) }
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
                            {/* Data/Horário */}
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-[#89bcbe]" />
                              <span className="text-[10px] text-slate-600">
                                {item.tipo_entidade === 'tarefa'
                                  ? formatBrazilDate(item.data_inicio)
                                  : formatBrazilDateTime(item.data_inicio)}
                              </span>
                            </div>

                            {/* Responsável */}
                            {item.responsavel_nome && (
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-[#89bcbe] flex-shrink-0" />
                                <span className="text-[10px] text-slate-600 truncate">
                                  {item.responsavel_nome}
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
                    onClick={() => router.push(`/dashboard/agenda?consultivo_id=${consulta.id}`)}
                  >
                    Ver agenda completa →
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Financeiro - Card Completo */}
            <ConsultivoFinanceiroCard
              consultivoId={consulta.id}
              clienteId={consulta.cliente_id}
              clienteNome={consulta.cliente_nome}
              onLancarHoras={() => setTimesheetModalOpen(true)}
              onLancarDespesa={() => {
                // TODO: Implementar modal de despesa
                toast.info('Lancamento de despesas em desenvolvimento')
              }}
              onLancarHonorario={() => {
                // TODO: Implementar modal de honorario
                toast.info('Lancamento de honorarios em desenvolvimento')
              }}
              onContratoVinculado={loadConsulta}
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
          onSubmit={async (data: EventoFormData) => {
            if (editingEvento && selectedEvento) {
              const { error } = await supabase
                .from('agenda_eventos')
                .update(data)
                .eq('id', selectedEvento.id)
              if (error) throw error
              toast.success('Evento atualizado com sucesso!')
            } else {
              const { error } = await supabase.from('agenda_eventos').insert(data)
              if (error) throw error
              toast.success('Evento criado com sucesso!')
            }
            setShowEventoWizard(false)
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
          onSubmit={async (data: AudienciaFormData) => {
            if (editingAudiencia && selectedAudiencia) {
              const { error } = await supabase
                .from('agenda_audiencias')
                .update(data)
                .eq('id', selectedAudiencia.id)
              if (error) throw error
              toast.success('Audiência atualizada com sucesso!')
            } else {
              const { error } = await supabase.from('agenda_audiencias').insert(data)
              if (error) throw error
              toast.success('Audiência criada com sucesso!')
            }
            setShowAudienciaWizard(false)
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
            area: consulta.area,
            prioridade: consulta.prioridade,
            prazo: consulta.prazo,
            responsavel_id: consulta.responsavel_id,
            responsavel_nome: consulta.responsavel_nome,
          }}
          onSuccess={loadConsulta}
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

      {/* Modal Detalhe do Andamento */}
      <Dialog open={!!selectedAndamento} onOpenChange={(open) => !open && setSelectedAndamento(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34495e]">
              Detalhe do Andamento
            </DialogTitle>
          </DialogHeader>

          {selectedAndamento && (
            <div className="space-y-4 pt-2">
              {/* Data e Tipo */}
              <div className="flex items-baseline gap-4 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Data</p>
                  <p className="text-sm font-medium text-[#34495e]">
                    {format(new Date(selectedAndamento.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                {selectedAndamento.tipo && (
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Tipo</p>
                    <p className="text-sm font-medium text-[#34495e]">
                      {formatTipoAndamento(selectedAndamento.tipo)}
                    </p>
                  </div>
                )}
              </div>

              {/* Descrição Completa */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Descrição</p>
                <div className="bg-slate-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedAndamento.descricao}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Editar Andamento */}
      <Dialog open={editAndamentoOpen} onOpenChange={setEditAndamentoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#34495e]">Editar Andamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Tipo</label>
              <Input
                placeholder="Ex: Reunião, Análise, Parecer..."
                value={editandoAndamento?.tipo || ''}
                onChange={(e) => setEditandoAndamento(prev => prev ? { ...prev, tipo: e.target.value } : null)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Descrição *</label>
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
            <DialogTitle className="text-base font-semibold text-[#34495e]">Excluir Andamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
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
