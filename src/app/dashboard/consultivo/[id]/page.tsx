'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Scale,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  BookOpen,
  Timer,
  DollarSign,
  Upload,
  Plus,
  Edit,
  Trash,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  Save,
  Send
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Consulta {
  id: string
  numero_interno: string
  assunto: string
  descricao: string
  cliente_id: string
  cliente_nome: string
  tipo: string
  area: string
  urgencia: string
  status: string
  responsavel_id: string
  responsavel_nome: string
  revisor_nome: string | null
  data_recebimento: string
  data_conclusao_estimada: string | null
  data_conclusao_real: string | null
  status_sla: string
  horas_reais: number
  horas_estimadas: number
  horas_nao_faturadas: number
  forma_cobranca: string
  valor_servico: number | null
  observacoes: string | null
}

interface TimelineItem {
  id: string
  tipo_acao: string
  descricao: string
  user_id: string
  created_at: string
  metadata: any
}

interface Documento {
  id: string
  titulo: string
  tipo: string
  arquivo_nome: string
  created_at: string
}

interface Referencia {
  id: string
  tipo: string
  titulo: string
  referencia_completa: string
  relevancia: string
  created_at: string
}

interface LancamentoHora {
  id: string
  data_trabalho: string
  horas: number
  atividade: string
  faturavel: boolean
  faturado: boolean
  user_id: string
}

export default function ConsultaDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [referencias, setReferencias] = useState<Referencia[]>([])
  const [lancamentosHora, setLancamentosHora] = useState<LancamentoHora[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para edição
  const [editandoAnalise, setEditandoAnalise] = useState(false)
  const [analiseTexto, setAnaliseTexto] = useState('')

  // Estado para novo lançamento de hora
  const [novoLancamento, setNovoLancamento] = useState({
    atividade: '',
    horas: '',
    faturavel: true
  })

  useEffect(() => {
    if (params.id) {
      loadConsulta()
      loadTimeline()
      loadDocumentos()
      loadReferencias()
      loadLancamentosHora()
    }
  }, [params.id])

  const loadConsulta = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('v_consultivo_consultas_completas')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setConsulta(data)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar consulta:', error)
      toast.error('Erro ao carregar consulta')
      setLoading(false)
    }
  }

  const loadTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('consultivo_timeline')
        .select('*')
        .eq('consulta_id', params.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTimeline(data || [])
    } catch (error) {
      console.error('Erro ao carregar timeline:', error)
    }
  }

  const loadDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('consultivo_documentos')
        .select('*')
        .eq('consulta_id', params.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocumentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
    }
  }

  const loadReferencias = async () => {
    try {
      const { data, error } = await supabase
        .from('consultivo_referencias')
        .select('*')
        .eq('consulta_id', params.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReferencias(data || [])
    } catch (error) {
      console.error('Erro ao carregar referências:', error)
    }
  }

  const loadLancamentosHora = async () => {
    try {
      const { data, error } = await supabase
        .from('consultivo_timesheet')
        .select('*')
        .eq('consulta_id', params.id)
        .order('data_trabalho', { ascending: false })

      if (error) throw error
      setLancamentosHora(data || [])
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error)
    }
  }

  const handleRegistrarHoras = async () => {
    if (!novoLancamento.atividade || !novoLancamento.horas) {
      toast.error('Preencha todos os campos')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('consultivo_timesheet')
        .insert({
          consulta_id: params.id,
          user_id: user?.id,
          atividade: novoLancamento.atividade,
          horas: parseFloat(novoLancamento.horas),
          faturavel: novoLancamento.faturavel,
          data_trabalho: new Date().toISOString().split('T')[0]
        })

      if (error) throw error

      toast.success('Horas registradas com sucesso')
      setNovoLancamento({ atividade: '', horas: '', faturavel: true })
      loadLancamentosHora()
      loadConsulta()
    } catch (error) {
      console.error('Erro ao registrar horas:', error)
      toast.error('Erro ao registrar horas')
    }
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      nova: { label: 'Nova', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      em_analise: { label: 'Em Análise', className: 'bg-amber-100 text-amber-700 border-amber-200' },
      em_revisao: { label: 'Em Revisão', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      concluida: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    }
    const config = configs[status] || configs.nova
    return <Badge className={cn('text-[10px] font-medium border', config.className)}>{config.label}</Badge>
  }

  const getSLABadge = (statusSla: string) => {
    if (statusSla === 'vencido') {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-medium border">
          <AlertCircle className="w-3 h-3 mr-1" />
          Atrasado
        </Badge>
      )
    }
    if (statusSla === 'critico') {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-medium border">
          <Clock className="w-3 h-3 mr-1" />
          Urgente
        </Badge>
      )
    }
    return null
  }

  if (loading || !consulta) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="mt-6 text-center text-slate-600">Carregando consulta...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="px-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono text-slate-500">{consulta.numero_interno}</span>
              {getStatusBadge(consulta.status)}
              {getSLABadge(consulta.status_sla)}
            </div>
            <h1 className="text-2xl font-bold text-[#34495e]">{consulta.assunto}</h1>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar ao Cliente
          </Button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Coluna Esquerda - Informações Principais */}
        <div className="xl:col-span-2 space-y-6">

          {/* Dados Básicos */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#34495e]">Informações da Consulta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Cliente</p>
                  <p className="text-sm text-[#34495e] font-medium">{consulta.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Responsável</p>
                  <p className="text-sm text-[#34495e] font-medium">{consulta.responsavel_nome}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Tipo</p>
                  <p className="text-sm text-slate-600 capitalize">{consulta.tipo.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Área</p>
                  <p className="text-sm text-slate-600 capitalize">{consulta.area}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Recebimento</p>
                  <p className="text-sm text-slate-600">
                    {format(new Date(consulta.data_recebimento), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                {consulta.data_conclusao_estimada && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Prazo</p>
                    <p className="text-sm text-slate-600">
                      {format(new Date(consulta.data_conclusao_estimada), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Descrição</p>
                <p className="text-sm text-slate-700 leading-relaxed">{consulta.descricao}</p>
              </div>

              {consulta.observacoes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Observações</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{consulta.observacoes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Análise e Parecer */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-[#34495e]">Análise e Parecer</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditandoAnalise(!editandoAnalise)}
                >
                  <Edit className="w-3.5 h-3.5 mr-2" />
                  {editandoAnalise ? 'Cancelar' : 'Editar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editandoAnalise ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Escreva sua análise, parecer ou opinião jurídica aqui..."
                    value={analiseTexto}
                    onChange={(e) => setAnaliseTexto(e.target.value)}
                    className="min-h-[300px] border-slate-200"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-gradient-to-r from-[#34495e] to-[#46627f] text-white">
                      <Save className="w-3.5 h-3.5 mr-2" />
                      Salvar Rascunho
                    </Button>
                    <Button variant="outline" size="sm">
                      <Send className="w-3.5 h-3.5 mr-2" />
                      Enviar para Revisão
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600 italic">
                  Nenhuma análise registrada ainda. Clique em "Editar" para começar.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-[#34495e]">
                  Documentos ({documentos.length})
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Upload className="w-3.5 h-3.5 mr-2" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documentos.length === 0 ? (
                <p className="text-sm text-slate-600 italic">Nenhum documento anexado</p>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-[#34495e]">{doc.titulo}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referências Jurídicas */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-[#34495e]">
                  Referências Jurídicas ({referencias.length})
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {referencias.length === 0 ? (
                <p className="text-sm text-slate-600 italic">Nenhuma referência adicionada</p>
              ) : (
                <div className="space-y-3">
                  {referencias.map((ref) => (
                    <div key={ref.id} className="p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className="text-[10px] bg-slate-100 text-slate-700 border-slate-200">
                          {ref.tipo}
                        </Badge>
                        <Badge
                          className={cn(
                            'text-[10px] border',
                            ref.relevancia === 'alta' && 'bg-red-100 text-red-700 border-red-200',
                            ref.relevancia === 'media' && 'bg-amber-100 text-amber-700 border-amber-200',
                            ref.relevancia === 'baixa' && 'bg-slate-100 text-slate-700 border-slate-200'
                          )}
                        >
                          {ref.relevancia}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-[#34495e] mb-1">{ref.titulo}</p>
                      <p className="text-xs text-slate-600">{ref.referencia_completa}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Coluna Direita - Sidebar */}
        <div className="space-y-6">

          {/* Widget de Registro Rápido de Horas */}
          {consulta.forma_cobranca === 'hora' && (
            <Card className="border-[#89bcbe] shadow-sm bg-gradient-to-br from-[#f0f9f9] to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#34495e] flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[#89bcbe]" />
                  Registro de Horas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Hoje:</span>
                  <span className="font-bold text-[#34495e]">0h</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Total:</span>
                  <span className="font-bold text-[#34495e]">{consulta.horas_reais}h</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Não faturado:</span>
                  <span className="font-bold text-amber-600">{consulta.horas_nao_faturadas}h</span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Input
                    placeholder="Descrição da atividade..."
                    value={novoLancamento.atividade}
                    onChange={(e) => setNovoLancamento({ ...novoLancamento, atividade: e.target.value })}
                    className="text-xs border-slate-200"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Horas"
                      value={novoLancamento.horas}
                      onChange={(e) => setNovoLancamento({ ...novoLancamento, horas: e.target.value })}
                      className="text-xs border-slate-200"
                    />
                    <Button
                      size="sm"
                      onClick={handleRegistrarHoras}
                      className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] text-white"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Registrar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estatísticas */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#34495e]">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Documentos</span>
                </div>
                <span className="text-sm font-bold text-[#34495e]">{documentos.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Referências</span>
                </div>
                <span className="text-sm font-bold text-[#34495e]">{referencias.length}</span>
              </div>
              {consulta.forma_cobranca === 'hora' && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Timer className="w-3.5 h-3.5" />
                      <span>Horas Trabalhadas</span>
                    </div>
                    <span className="text-sm font-bold text-[#34495e]">{consulta.horas_reais}h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>A Faturar</span>
                    </div>
                    <span className="text-sm font-bold text-amber-600">{consulta.horas_nao_faturadas}h</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timesheet Detalhado */}
          {consulta.forma_cobranca === 'hora' && lancamentosHora.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#34495e]">Lançamentos de Hora</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {lancamentosHora.map((lancamento) => (
                    <div key={lancamento.id} className="p-2 border border-slate-200 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#34495e]">{lancamento.horas}h</span>
                        <span className="text-[10px] text-slate-500">
                          {format(new Date(lancamento.data_trabalho), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{lancamento.atividade}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {lancamento.faturavel && (
                          <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200">
                            Faturável
                          </Badge>
                        )}
                        {lancamento.faturado && (
                          <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">
                            Faturado
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#34495e]">Timeline de Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {timeline.map((item, index) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-[#89bcbe] rounded-full" />
                      {index < timeline.length - 1 && (
                        <div className="w-px h-full bg-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-xs font-medium text-[#34495e]">{item.descricao}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
