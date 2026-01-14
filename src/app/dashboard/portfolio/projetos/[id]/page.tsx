'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  XCircle,
  User,
  Users,
  Calendar,
  DollarSign,
  Layers,
  AlertCircle,
  Briefcase,
  Calculator,
  Building2,
  Scale,
  ChevronDown,
  ChevronRight,
  Check,
  FileText,
  MessageSquare,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate, formatBrazilDateTime } from '@/lib/timezone'
import type { StatusProjeto, StatusFase, AreaJuridica } from '@/types/portfolio'
import { STATUS_PROJETO_LABELS, STATUS_FASE_LABELS, AREA_JURIDICA_LABELS } from '@/types/portfolio'

// Configuração de status
const STATUS_CONFIG: Record<StatusProjeto, { icon: typeof Clock; color: string; bgColor: string }> = {
  rascunho: { icon: Clock, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  em_andamento: { icon: Play, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  pausado: { icon: Pause, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  concluido: { icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  cancelado: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
}

const FASE_STATUS_CONFIG: Record<StatusFase, { color: string; bgColor: string }> = {
  pendente: { color: 'text-slate-600', bgColor: 'bg-slate-100' },
  em_andamento: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  concluida: { color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  pulada: { color: 'text-amber-600', bgColor: 'bg-amber-100' },
}

// Ícones por área
const AREA_ICONS: Record<AreaJuridica, typeof Calculator> = {
  tributario: Calculator,
  societario: Building2,
  trabalhista: Users,
  civel: Scale,
  outro: Briefcase,
}

const AREA_COLORS: Record<AreaJuridica, string> = {
  tributario: 'from-[#34495e] to-[#46627f]',
  societario: 'from-[#1E3A8A] to-[#3659a8]',
  trabalhista: 'from-[#2d5a5a] to-[#4a7c7c]',
  civel: 'from-[#4a4168] to-[#6a6188]',
  outro: 'from-slate-500 to-slate-600',
}

interface ProjetoCompleto {
  id: string
  codigo: string
  nome: string
  status: StatusProjeto
  progresso_percentual: number
  data_inicio: string
  data_prevista_conclusao: string
  data_conclusao: string | null
  valor_negociado: number | null
  observacoes: string | null
  created_at: string
  produto: {
    id: string
    codigo: string
    nome: string
    area_juridica: AreaJuridica
  }
  cliente: {
    id: string
    nome: string
  }
  responsavel: {
    id: string
    nome: string
    email: string
  } | null
  fases: FaseProjeto[]
}

interface FaseProjeto {
  id: string
  ordem: number
  nome: string
  descricao: string | null
  status: StatusFase
  progresso_percentual: number
  data_inicio_prevista: string
  data_fim_prevista: string
  data_inicio_real: string | null
  data_fim_real: string | null
  checklist: ChecklistItem[]
}

interface ChecklistItem {
  id: string
  ordem: number
  item: string
  obrigatorio: boolean
  concluido: boolean
  concluido_em: string | null
}

export default function ProjetoDetalhesPage() {
  const router = useRouter()
  const params = useParams()
  const projetoId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projeto, setProjeto] = useState<ProjetoCompleto | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [expandedFases, setExpandedFases] = useState<Set<string>>(new Set())

  // Carregar projeto
  useEffect(() => {
    const loadProjeto = async () => {
      try {
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) setUserId(user.id)

        const { data, error: projetoError } = await supabase
          .from('portfolio_projetos')
          .select(`
            *,
            produto:portfolio_produtos(id, codigo, nome, area_juridica),
            cliente:crm_pessoas(id, nome),
            responsavel:profiles(id, nome, email),
            fases:portfolio_projetos_fases(
              *,
              checklist:portfolio_projetos_fases_checklist(*)
            )
          `)
          .eq('id', projetoId)
          .single()

        if (projetoError) throw projetoError

        // Ordenar fases e checklist
        if (data.fases) {
          data.fases.sort((a: any, b: any) => a.ordem - b.ordem)
          data.fases.forEach((fase: any) => {
            if (fase.checklist) {
              fase.checklist.sort((a: any, b: any) => a.ordem - b.ordem)
            }
          })
        }

        setProjeto(data as ProjetoCompleto)

        // Expandir fase em andamento por padrão
        const faseEmAndamento = data.fases?.find((f: any) => f.status === 'em_andamento')
        if (faseEmAndamento) {
          setExpandedFases(new Set([faseEmAndamento.id]))
        }

      } catch (err) {
        console.error('Erro ao carregar projeto:', err)
        setError('Erro ao carregar projeto')
      } finally {
        setLoading(false)
      }
    }

    loadProjeto()
  }, [projetoId])

  // Toggle fase expandida
  const toggleFase = (faseId: string) => {
    setExpandedFases(prev => {
      const next = new Set(prev)
      if (next.has(faseId)) {
        next.delete(faseId)
      } else {
        next.add(faseId)
      }
      return next
    })
  }

  // Marcar item do checklist
  const handleToggleChecklistItem = async (faseId: string, itemId: string, concluido: boolean) => {
    try {
      await supabase
        .from('portfolio_projetos_fases_checklist')
        .update({
          concluido,
          concluido_em: concluido ? new Date().toISOString() : null,
          concluido_por: concluido ? userId : null,
        })
        .eq('id', itemId)

      // Atualizar estado local
      setProjeto(prev => {
        if (!prev) return prev
        return {
          ...prev,
          fases: prev.fases.map(fase => {
            if (fase.id !== faseId) return fase
            return {
              ...fase,
              checklist: fase.checklist.map(item => {
                if (item.id !== itemId) return item
                return { ...item, concluido, concluido_em: concluido ? new Date().toISOString() : null }
              })
            }
          })
        }
      })

      // Recalcular progresso da fase
      await recalcularProgressoFase(faseId)

    } catch (err) {
      console.error('Erro ao atualizar checklist:', err)
    }
  }

  // Recalcular progresso da fase
  const recalcularProgressoFase = async (faseId: string) => {
    const fase = projeto?.fases.find(f => f.id === faseId)
    if (!fase) return

    const total = fase.checklist.length
    const concluidos = fase.checklist.filter(i => i.concluido).length
    const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0

    await supabase
      .from('portfolio_projetos_fases')
      .update({ progresso_percentual: progresso })
      .eq('id', faseId)

    // Atualizar estado local
    setProjeto(prev => {
      if (!prev) return prev
      const fases = prev.fases.map(f => f.id === faseId ? { ...f, progresso_percentual: progresso } : f)
      const projetoProgresso = Math.round(fases.reduce((acc, f) => acc + f.progresso_percentual, 0) / fases.length)
      return { ...prev, fases, progresso_percentual: projetoProgresso }
    })
  }

  // Iniciar fase
  const handleIniciarFase = async (faseId: string) => {
    try {
      await supabase
        .from('portfolio_projetos_fases')
        .update({
          status: 'em_andamento',
          data_inicio_real: new Date().toISOString().split('T')[0],
        })
        .eq('id', faseId)

      setProjeto(prev => {
        if (!prev) return prev
        return {
          ...prev,
          fases: prev.fases.map(f => f.id === faseId
            ? { ...f, status: 'em_andamento' as StatusFase, data_inicio_real: new Date().toISOString().split('T')[0] }
            : f
          )
        }
      })
    } catch (err) {
      console.error('Erro ao iniciar fase:', err)
    }
  }

  // Concluir fase
  const handleConcluirFase = async (faseId: string) => {
    try {
      await supabase
        .from('portfolio_projetos_fases')
        .update({
          status: 'concluida',
          progresso_percentual: 100,
          data_fim_real: new Date().toISOString().split('T')[0],
        })
        .eq('id', faseId)

      setProjeto(prev => {
        if (!prev) return prev
        const fases = prev.fases.map(f => f.id === faseId
          ? { ...f, status: 'concluida' as StatusFase, progresso_percentual: 100, data_fim_real: new Date().toISOString().split('T')[0] }
          : f
        )
        const projetoProgresso = Math.round(fases.reduce((acc, f) => acc + f.progresso_percentual, 0) / fases.length)
        return { ...prev, fases, progresso_percentual: projetoProgresso }
      })
    } catch (err) {
      console.error('Erro ao concluir fase:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#34495e]/20 border-t-[#34495e] animate-spin" />
          <p className="text-slate-500">Carregando projeto...</p>
        </div>
      </div>
    )
  }

  if (error || !projeto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-[#34495e] mb-2">Projeto não encontrado</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <Button onClick={() => router.push('/dashboard/portfolio/projetos')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Projetos
        </Button>
      </div>
    )
  }

  const StatusIcon = STATUS_CONFIG[projeto.status].icon
  const statusConfig = STATUS_CONFIG[projeto.status]
  const AreaIcon = AREA_ICONS[projeto.produto.area_juridica]
  const areaGradient = AREA_COLORS[projeto.produto.area_juridica]
  const isAtrasado = projeto.status === 'em_andamento' &&
    projeto.data_prevista_conclusao &&
    new Date(projeto.data_prevista_conclusao) < new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/portfolio/projetos')}
          className="text-slate-600"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${areaGradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <AreaIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{projeto.codigo}</Badge>
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {STATUS_PROJETO_LABELS[projeto.status]}
              </Badge>
              {isAtrasado && (
                <Badge className="bg-red-500 text-white border-0">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Atrasado
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[#34495e]">{projeto.nome}</h1>
            <p className="text-slate-500 mt-1">
              Produto: <span className="font-medium">{projeto.produto.nome}</span>
            </p>
          </div>
        </div>

        {/* Progresso geral */}
        <Card className="lg:w-64 border-slate-200">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <span className="text-3xl font-bold text-[#34495e]">{projeto.progresso_percentual}%</span>
              <p className="text-xs text-slate-500">Progresso Geral</p>
            </div>
            <Progress value={projeto.progresso_percentual} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Cliente</p>
                <p className="font-medium text-[#34495e] truncate">{projeto.cliente.nome}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium text-[#34495e] truncate">
                  {projeto.responsavel?.nome || projeto.responsavel?.email || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Previsão</p>
                <p className={`font-medium ${isAtrasado ? 'text-red-600' : 'text-[#34495e]'}`}>
                  {projeto.data_prevista_conclusao ? formatBrazilDate(projeto.data_prevista_conclusao) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Valor</p>
                <p className="font-medium text-[#34495e]">
                  {projeto.valor_negociado ? formatCurrency(projeto.valor_negociado) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fases */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg text-[#34495e] flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Fases do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projeto.fases.map((fase, index) => {
            const isExpanded = expandedFases.has(fase.id)
            const faseConfig = FASE_STATUS_CONFIG[fase.status]
            const checklistConcluidos = fase.checklist.filter(i => i.concluido).length
            const checklistTotal = fase.checklist.length

            return (
              <div key={fase.id} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Header da Fase */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleFase(fase.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-[#34495e] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {fase.ordem}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[#34495e]">{fase.nome}</h4>
                      <Badge className={`${faseConfig.bgColor} ${faseConfig.color} border-0 text-xs`}>
                        {STATUS_FASE_LABELS[fase.status]}
                      </Badge>
                    </div>
                    {fase.descricao && (
                      <p className="text-sm text-slate-500 truncate">{fase.descricao}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {checklistTotal > 0 && (
                      <span className="text-sm text-slate-500">
                        {checklistConcluidos}/{checklistTotal}
                      </span>
                    )}
                    <div className="w-20">
                      <Progress value={fase.progresso_percentual} className="h-2" />
                    </div>
                    <span className="text-sm font-medium text-[#34495e] w-10 text-right">
                      {fase.progresso_percentual}%
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50">
                    {/* Datas */}
                    <div className="flex flex-wrap gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-slate-500">Início previsto: </span>
                        <span className="font-medium">{formatBrazilDate(fase.data_inicio_prevista)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Fim previsto: </span>
                        <span className="font-medium">{formatBrazilDate(fase.data_fim_prevista)}</span>
                      </div>
                      {fase.data_inicio_real && (
                        <div>
                          <span className="text-slate-500">Início real: </span>
                          <span className="font-medium text-blue-600">{formatBrazilDate(fase.data_inicio_real)}</span>
                        </div>
                      )}
                      {fase.data_fim_real && (
                        <div>
                          <span className="text-slate-500">Fim real: </span>
                          <span className="font-medium text-emerald-600">{formatBrazilDate(fase.data_fim_real)}</span>
                        </div>
                      )}
                    </div>

                    {/* Ações da fase */}
                    {fase.status === 'pendente' && (
                      <div className="mb-4">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleIniciarFase(fase.id) }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Iniciar Fase
                        </Button>
                      </div>
                    )}

                    {fase.status === 'em_andamento' && (
                      <div className="mb-4">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleConcluirFase(fase.id) }}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Concluir Fase
                        </Button>
                      </div>
                    )}

                    {/* Checklist */}
                    {fase.checklist.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-slate-700 mb-3">Checklist</h5>
                        {fase.checklist.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                              item.concluido ? 'bg-emerald-50' : 'bg-white border border-slate-200'
                            }`}
                          >
                            <Checkbox
                              checked={item.concluido}
                              onCheckedChange={(checked) =>
                                handleToggleChecklistItem(fase.id, item.id, checked as boolean)
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <span className={`text-sm ${item.concluido ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                {item.item}
                              </span>
                              {item.obrigatorio && !item.concluido && (
                                <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-200">
                                  Obrigatório
                                </Badge>
                              )}
                            </div>
                            {item.concluido && item.concluido_em && (
                              <span className="text-xs text-slate-400">
                                {formatBrazilDate(item.concluido_em)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Observações */}
      {projeto.observacoes && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg text-[#34495e] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 whitespace-pre-wrap">{projeto.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
