'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
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
  User,
  DollarSign,
  Link as LinkIcon,
  Loader2,
  Copy,
  Check,
  Archive,
  RotateCcw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { formatBrazilDateTime } from '@/lib/timezone'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import TarefaDetailModal from '@/components/agenda/TarefaDetailModal'
import EventoDetailModal from '@/components/agenda/EventoDetailModal'
import VincularContratoConsultivoModal from '@/components/consultivo/VincularContratoConsultivoModal'
import type { TarefaFormData } from '@/hooks/useTarefas'
import type { EventoFormData } from '@/hooks/useEventos'

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
  const [novoAndamento, setNovoAndamento] = useState({ descricao: '' })
  const [salvandoAndamento, setSalvandoAndamento] = useState(false)

  // Estados para Agenda
  const [agendaItems, setAgendaItems] = useState<any[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(true)
  const [showTarefaWizard, setShowTarefaWizard] = useState(false)
  const [showEventoWizard, setShowEventoWizard] = useState(false)
  const [escritorioId, setEscritorioId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Estados para Modais de Detalhes
  const [selectedTarefa, setSelectedTarefa] = useState<any | null>(null)
  const [selectedEvento, setSelectedEvento] = useState<any | null>(null)
  const [tarefaDetailOpen, setTarefaDetailOpen] = useState(false)
  const [eventoDetailOpen, setEventoDetailOpen] = useState(false)

  // Estados para Financeiro
  const [contratoInfo, setContratoInfo] = useState<any | null>(null)
  const [vincularModalOpen, setVincularModalOpen] = useState(false)

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

      // Carregar contrato se existir
      if (data.contrato_id) {
        loadContrato(data.contrato_id)
      }

      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar consulta:', error)
      toast.error('Erro ao carregar consulta')
      setLoading(false)
    }
  }

  const loadContrato = async (contratoId: string) => {
    const { data } = await supabase
      .from('financeiro_contratos_honorarios')
      .select('id, numero_contrato, forma_cobranca, valor_total')
      .eq('id', contratoId)
      .single()

    if (data) {
      setContratoInfo(data)
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

      const [tarefasRes, eventosRes] = await Promise.all([
        supabase
          .from('agenda_tarefas')
          .select('id, titulo, status, data_inicio, responsavel_id')
          .eq('consultivo_id', params.id)
          .order('data_inicio', { ascending: true })
          .limit(5),
        supabase
          .from('agenda_eventos')
          .select('id, titulo, status, data_inicio, responsavel_id')
          .eq('consultivo_id', params.id)
          .order('data_inicio', { ascending: true })
          .limit(5)
      ])

      const items: any[] = []

      if (tarefasRes.data) {
        tarefasRes.data.forEach(t => items.push({ ...t, tipo_entidade: 'tarefa' }))
      }
      if (eventosRes.data) {
        eventosRes.data.forEach(e => items.push({ ...e, tipo_entidade: 'evento' }))
      }

      items.sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())

      setAgendaItems(items.slice(0, 5))
      setLoadingAgenda(false)
    } catch (error) {
      console.error('Erro ao carregar agenda:', error)
      setLoadingAgenda(false)
    }
  }

  // Adicionar andamento
  const handleAddAndamento = async () => {
    if (!novoAndamento.descricao.trim()) {
      toast.error('Preencha a descricao')
      return
    }

    setSalvandoAndamento(true)

    try {
      const novoItem: Andamento = {
        data: new Date().toISOString(),
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
      setNovoAndamento({ descricao: '' })
      setNovoAndamentoOpen(false)
      toast.success('Andamento adicionado')
    } catch (error) {
      console.error('Erro ao adicionar andamento:', error)
      toast.error('Erro ao adicionar andamento')
    } finally {
      setSalvandoAndamento(false)
    }
  }

  const copyId = () => {
    if (consulta?.numero) {
      navigator.clipboard.writeText(consulta.numero)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  const formatArea = (area: string) => {
    const map: Record<string, string> = {
      'civel': 'Cível', 'trabalhista': 'Trabalhista', 'tributario': 'Tributário',
      'societario': 'Societário', 'contratual': 'Contratual', 'familia': 'Família',
      'consumidor': 'Consumidor', 'ambiental': 'Ambiental', 'imobiliario': 'Imobiliário',
      'propriedade_intelectual': 'Prop. Intelectual', 'outros': 'Outros'
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
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 h-8">
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-[#34495e]">Andamentos ({consulta.andamentos?.length || 0})</CardTitle>
                  <Dialog open={novoAndamentoOpen} onOpenChange={setNovoAndamentoOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-[#34495e]">Novo Andamento</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <Textarea placeholder="Descreva o andamento..." value={novoAndamento.descricao} onChange={(e) => setNovoAndamento({ descricao: e.target.value })} className="text-sm min-h-[120px]" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setNovoAndamentoOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddAndamento} disabled={salvandoAndamento || !novoAndamento.descricao.trim()} className="bg-gradient-to-r from-[#34495e] to-[#46627f]">
                          {salvandoAndamento ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                          Salvar
                        </Button>
                      </DialogFooter>
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
                  <div className="space-y-3">
                    {[...consulta.andamentos].reverse().map((andamento: Andamento, index) => (
                      <div key={index} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-20">
                            <p className="text-xs font-medium text-slate-700">{format(new Date(andamento.data), "dd/MM/yyyy", { locale: ptBR })}</p>
                            <p className="text-[10px] text-slate-500">{format(new Date(andamento.data), "HH:mm", { locale: ptBR })}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-700 leading-relaxed">{andamento.descricao}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#89bcbe]" />
                    Agenda
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-[#89bcbe] hover:text-white transition-colors">
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAgenda ? (
                  <div className="text-center py-3">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin text-[#89bcbe]" />
                  </div>
                ) : agendaItems.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-500">Nenhum agendamento vinculado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agendaItems.map((item) => {
                      const Icon = item.tipo_entidade === 'tarefa' ? ListTodo : Calendar
                      const iconBg = item.tipo_entidade === 'tarefa'
                        ? 'bg-gradient-to-br from-[#34495e] to-[#46627f]'
                        : 'bg-gradient-to-br from-[#89bcbe] to-[#aacfd0]'

                      return (
                        <div
                          key={item.id}
                          className="border border-slate-200 rounded-lg p-3 hover:border-[#89bcbe] hover:shadow-sm transition-all cursor-pointer"
                          onClick={async () => {
                            if (item.tipo_entidade === 'tarefa') {
                              const { data } = await supabase.from('agenda_tarefas').select('*').eq('id', item.id).single()
                              if (data) { setSelectedTarefa(data); setTarefaDetailOpen(true) }
                            } else {
                              const { data } = await supabase.from('agenda_eventos').select('*').eq('id', item.id).single()
                              if (data) { setSelectedEvento(data); setEventoDetailOpen(true) }
                            }
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                              <Icon className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#34495e] truncate">{item.titulo}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{formatBrazilDateTime(item.data_inicio)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financeiro */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#89bcbe]" />
                  Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!contratoInfo ? (
                  <div className="text-center py-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Nenhum contrato vinculado</p>
                    <p className="text-xs text-slate-500 mb-3">Vincule um contrato para gerenciar o financeiro</p>
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setVincularModalOpen(true)}>
                      <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                      Vincular Contrato
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-600">{contratoInfo.numero_contrato}</span>
                    </div>
                    {contratoInfo.valor_total && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Valor do Contrato</span>
                        <span className="text-sm font-semibold text-[#34495e]">{formatCurrency(contratoInfo.valor_total)}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Wizards de Agenda */}
      {showTarefaWizard && escritorioId && (
        <TarefaWizard
          escritorioId={escritorioId}
          onClose={() => setShowTarefaWizard(false)}
          onCreated={loadAgenda}
          initialData={{ consultivo_id: consulta.id }}
        />
      )}

      {showEventoWizard && escritorioId && (
        <EventoWizard
          escritorioId={escritorioId}
          onClose={() => setShowEventoWizard(false)}
          onSubmit={async (data: EventoFormData) => {
            const { error } = await supabase.from('agenda_eventos').insert(data)
            if (error) throw error
            setShowEventoWizard(false)
            loadAgenda()
          }}
          initialData={{ consultivo_id: consulta.id }}
        />
      )}

      {/* Modais de Detalhes */}
      {selectedTarefa && (
        <TarefaDetailModal
          open={tarefaDetailOpen}
          onOpenChange={(open) => { setTarefaDetailOpen(open); if (!open) setSelectedTarefa(null) }}
          tarefa={selectedTarefa}
          onUpdate={loadAgenda}
        />
      )}

      {selectedEvento && (
        <EventoDetailModal
          open={eventoDetailOpen}
          onOpenChange={(open) => { setEventoDetailOpen(open); if (!open) { setSelectedEvento(null); loadAgenda() } }}
          evento={selectedEvento}
          onConsultivoClick={() => {}}
        />
      )}

      {/* Modal Vincular Contrato */}
      <VincularContratoConsultivoModal
        open={vincularModalOpen}
        onOpenChange={setVincularModalOpen}
        consultaId={consulta.id}
        clienteId={consulta.cliente_id}
        clienteNome={consulta.cliente_nome}
        onSuccess={loadConsulta}
      />
    </div>
  )
}
