'use client'

import { useState, useEffect, useCallback, use, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Building2,
  Scale,
  User,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Edit,
  Archive,
  Download,
  Loader2,
  CalendarPlus,
  Gavel,
  CheckSquare,
  Link2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate, formatBrazilDateTime } from '@/lib/timezone'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'
import { useTarefas, TarefaFormData } from '@/hooks/useTarefas'
import { useEventos, EventoFormData } from '@/hooks/useEventos'
import { useAudiencias, AudienciaFormData } from '@/hooks/useAudiencias'
import { toast } from 'sonner'

type StatusPublicacao = 'pendente' | 'em_analise' | 'processada' | 'arquivada'

interface PublicacaoAnalise {
  id: string
  resumo_executivo: string | null
  tipo_decisao: string | null
  sentimento: string | null
  pontos_principais: string[] | null
  tem_prazo: boolean
  tipo_prazo: string | null
  prazo_dias: number | null
  prazo_tipo_dias: string | null
  data_intimacao: string | null
  data_limite: string | null
  fundamentacao_legal: string | null
  tem_determinacao: boolean
  determinacoes: string[] | null
  requer_manifestacao: boolean
  acoes_sugeridas: string[] | null
  template_sugerido: string | null
  confianca_analise: number | null
}

interface PublicacaoHistorico {
  id: string
  acao: string
  user_id: string | null
  detalhes: Record<string, unknown>
  created_at: string
  user_nome?: string
}

interface Publicacao {
  id: string
  escritorio_id: string
  aasp_id: string | null
  data_publicacao: string | null
  data_captura: string | null
  tribunal: string | null
  vara: string | null
  tipo_publicacao: string | null
  numero_processo: string | null
  processo_id: string | null
  cliente_id: string | null
  partes: string[] | null
  texto_completo: string | null
  pdf_url: string | null
  status: StatusPublicacao
  urgente: boolean
  source: string | null
  created_at: string
  updated_at: string
  associado_id: string | null
  agendamento_id: string | null
  agendamento_tipo: 'tarefa' | 'compromisso' | 'audiencia' | null
  // Joined data
  analise?: PublicacaoAnalise | null
  historico?: PublicacaoHistorico[]
  cliente?: { nome: string } | null
}

export default function PublicacaoDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [publicacao, setPublicacao] = useState<Publicacao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false)
  const [eventoModalOpen, setEventoModalOpen] = useState(false)
  const [audienciaModalOpen, setAudienciaModalOpen] = useState(false)
  const [processoEncontrado, setProcessoEncontrado] = useState<{
    id: string
    numero_cnj: string
    parte_contraria: string | null
    status: string
  } | null>(null)
  const [buscandoProcesso, setBuscandoProcesso] = useState(false)
  const [vinculando, setVinculando] = useState(false)

  const { escritorioAtivo } = useEscritorioAtivo()

  // Usar useRef para manter a mesma referência do supabase client
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  // Hooks para criar agendamentos
  const { createTarefa } = useTarefas(escritorioAtivo || undefined)
  const { createEvento } = useEventos(escritorioAtivo || undefined)
  const { createAudiencia } = useAudiencias(escritorioAtivo || undefined)

  const carregarPublicacao = useCallback(async () => {
    if (!id) return

    setCarregando(true)
    setErro(null)

    try {
      // Buscar publicação
      const { data: pub, error: pubError } = await supabase
        .from('publicacoes_publicacoes')
        .select('*')
        .eq('id', id)
        .single()

      if (pubError || !pub) {
        console.error('Erro ao buscar publicação:', pubError)
        setErro('Publicação não encontrada')
        return
      }

      // Buscar nome do cliente se existir cliente_id
      let clienteNome = null
      if (pub.cliente_id) {
        const { data: cliente } = await supabase
          .from('crm_pessoas')
          .select('nome')
          .eq('id', pub.cliente_id)
          .single()
        clienteNome = cliente?.nome
      }

      // Buscar análise IA (se existir)
      const { data: analise } = await supabase
        .from('publicacoes_analises')
        .select('*')
        .eq('publicacao_id', id)
        .maybeSingle()

      // Buscar histórico
      const { data: historico } = await supabase
        .from('publicacoes_historico')
        .select('*')
        .eq('publicacao_id', id)
        .order('created_at', { ascending: true })

      // Buscar nomes dos usuários do histórico
      const historicoComNomes = await Promise.all(
        (historico || []).map(async (item) => {
          if (item.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('nome')
              .eq('id', item.user_id)
              .single()
            return { ...item, user_nome: profile?.nome || 'Sistema' }
          }
          return { ...item, user_nome: 'Sistema' }
        })
      )

      setPublicacao({
        ...pub,
        analise: analise || null,
        historico: historicoComNomes,
        cliente: clienteNome ? { nome: clienteNome } : null
      })
    } catch (err) {
      console.error('Erro ao carregar publicação:', err)
      setErro('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [id, supabase])

  useEffect(() => {
    carregarPublicacao()
  }, [carregarPublicacao])

  // Busca inteligente de processo existente
  const buscarProcessoExistente = useCallback(async () => {
    if (!publicacao?.numero_processo || publicacao.processo_id || !escritorioAtivo) {
      setProcessoEncontrado(null)
      return
    }

    setBuscandoProcesso(true)
    try {
      const { data, error } = await supabase
        .from('processos_processos')
        .select('id, numero_cnj, parte_contraria, status')
        .eq('escritorio_id', escritorioAtivo)
        .eq('numero_cnj', publicacao.numero_processo)
        .maybeSingle()

      if (error || !data) {
        setProcessoEncontrado(null)
      } else {
        setProcessoEncontrado(data)
      }
    } catch (err) {
      console.error('Erro ao buscar processo:', err)
      setProcessoEncontrado(null)
    } finally {
      setBuscandoProcesso(false)
    }
  }, [publicacao?.numero_processo, publicacao?.processo_id, escritorioAtivo, supabase])

  // Executar busca quando a publicação for carregada
  useEffect(() => {
    buscarProcessoExistente()
  }, [buscarProcessoExistente])

  // Vincular publicação ao processo existente
  const vincularProcesso = async (processoId: string) => {
    if (!publicacao) return

    setVinculando(true)
    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ processo_id: processoId })
        .eq('id', publicacao.id)

      if (error) throw error

      // Recarregar publicação para atualizar UI
      await carregarPublicacao()
      setProcessoEncontrado(null)
    } catch (err) {
      console.error('Erro ao vincular processo:', err)
    } finally {
      setVinculando(false)
    }
  }

  const getStatusConfig = (status: StatusPublicacao) => {
    const configs = {
      pendente: {
        badge: 'bg-red-100 text-red-700 border-red-200',
        label: 'Pendente de Análise',
        icon: Clock
      },
      em_analise: {
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        label: 'Em Análise',
        icon: Brain
      },
      processada: {
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        label: 'Processada',
        icon: CheckCircle2
      },
      arquivada: {
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
        label: 'Arquivada',
        icon: Archive
      }
    }
    return configs[status] || configs.pendente
  }

  const getSentimentoConfig = (sentimento: string | null) => {
    const configs = {
      favoravel: {
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        label: 'Favorável'
      },
      desfavoravel: {
        icon: TrendingDown,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        label: 'Desfavorável'
      },
      neutro: {
        icon: Minus,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        label: 'Neutro'
      }
    }
    return configs[sentimento as keyof typeof configs] || configs.neutro
  }

  // Loading state
  if (carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
          <p className="text-sm text-slate-600">Carregando publicação...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (erro || !publicacao) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <p className="text-sm text-slate-600">{erro || 'Publicação não encontrada'}</p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/publicacoes')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Publicações
          </Button>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(publicacao.status)
  const StatusIcon = statusConfig.icon
  const analise = publicacao.analise
  const sentimentoConfig = analise ? getSentimentoConfig(analise.sentimento) : getSentimentoConfig('neutro')
  const SentimentoIcon = sentimentoConfig.icon

  // Calcular dias restantes se houver prazo
  const diasRestantes = analise?.data_limite
    ? Math.ceil(
        (new Date(analise.data_limite).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header Compacto */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/publicacoes')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs border', statusConfig.badge)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                {publicacao.urgente && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Urgente
                  </Badge>
                )}
                {analise?.tem_prazo && diasRestantes !== null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      diasRestantes <= 3
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : diasRestantes <= 7
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    )}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {diasRestantes} dias restantes
                  </Badge>
                )}
                {publicacao.agendamento_tipo && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    {publicacao.agendamento_tipo === 'tarefa' && <CheckSquare className="w-3 h-3 mr-1" />}
                    {publicacao.agendamento_tipo === 'compromisso' && <Calendar className="w-3 h-3 mr-1" />}
                    {publicacao.agendamento_tipo === 'audiencia' && <Gavel className="w-3 h-3 mr-1" />}
                    {publicacao.agendamento_tipo === 'tarefa' && 'Tarefa agendada'}
                    {publicacao.agendamento_tipo === 'compromisso' && 'Compromisso agendado'}
                    {publicacao.agendamento_tipo === 'audiencia' && 'Audiência agendada'}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {publicacao.status !== 'processada' && (
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A] hover:to-[#2563EB]"
                  onClick={() => router.push(`/dashboard/publicacoes/processar/${publicacao.id}`)}
                >
                  <Play className="w-4 h-4" />
                  Processar com IA
                </Button>
              )}
              {!publicacao.agendamento_id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarPlus className="w-4 h-4" />
                      Agendar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTarefaModalOpen(true)}>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Nova Tarefa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEventoModalOpen(true)}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Novo Compromisso
                    </DropdownMenuItem>
                    {publicacao.processo_id && (
                      <DropdownMenuItem onClick={() => setAudienciaModalOpen(true)}>
                        <Gavel className="w-4 h-4 mr-2" />
                        Nova Audiência
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-4 h-4" />
                Editar Análise
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Archive className="w-4 h-4" />
                Arquivar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo - Layout 2 Colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6">
        {/* COLUNA ESQUERDA (2/3) */}
        <div className="xl:col-span-2 space-y-4">
          {/* Card: Informações da Publicação */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Informações da Publicação</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Data da Publicação</div>
                    <div className="text-sm font-medium text-slate-700">
                      {publicacao.data_publicacao
                        ? formatBrazilDate(publicacao.data_publicacao)
                        : '-'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Tribunal / Vara</div>
                    <div className="text-sm font-medium text-slate-700">
                      {publicacao.tribunal || '-'}
                    </div>
                    {publicacao.vara && (
                      <div className="text-xs text-slate-500">{publicacao.vara}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Tipo de Publicação</div>
                    <div className="text-sm font-medium text-slate-700 capitalize">
                      {publicacao.tipo_publicacao || '-'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Scale className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Número do Processo</div>
                    {publicacao.numero_processo ? (
                      publicacao.processo_id ? (
                        <Link
                          href={`/dashboard/processos/${publicacao.processo_id}`}
                          className="text-sm font-medium text-[#1E3A8A] hover:underline flex items-center gap-1"
                        >
                          {publicacao.numero_processo}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <div className="text-sm font-medium text-slate-700">
                          {publicacao.numero_processo}
                        </div>
                      )
                    ) : (
                      <div className="text-sm text-slate-400">Não informado</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Cliente</div>
                    <div className="text-sm font-medium text-slate-700">
                      {publicacao.cliente?.nome || '-'}
                    </div>
                  </div>
                </div>

                {publicacao.partes && publicacao.partes.length > 0 && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500">Partes</div>
                      <div className="text-sm text-slate-700">
                        {publicacao.partes.join(' x ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Texto Completo */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Texto da Publicação</h2>
              {publicacao.pdf_url && (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={publicacao.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-3.5 h-3.5" />
                    PDF Original
                  </a>
                </Button>
              )}
            </div>
            <div className="p-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {publicacao.texto_completo || 'Texto não disponível'}
                </pre>
              </div>
            </div>
          </div>

          {/* Card: Histórico de Ações */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Histórico de Ações</h2>
            </div>
            <div className="p-4">
              {publicacao.historico && publicacao.historico.length > 0 ? (
                <div className="space-y-3">
                  {publicacao.historico.map((item, index) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          item.acao === 'recebida' ? 'bg-blue-500' :
                          item.acao === 'analisada_ia' ? 'bg-purple-500' :
                          item.acao === 'visualizada' ? 'bg-slate-400' :
                          item.acao === 'processada' ? 'bg-emerald-500' :
                          item.acao === 'arquivada' ? 'bg-slate-500' :
                          'bg-amber-500'
                        )} />
                        {index < publicacao.historico!.length - 1 && (
                          <div className="w-px h-full bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium text-slate-700 capitalize">
                            {item.acao.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatBrazilDateTime(item.created_at)}
                          </div>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {item.user_nome}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">
                  Nenhum histórico registrado
                </p>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (1/3) */}
        <div className="space-y-4">
          {/* Card: Análise IA */}
          {analise ? (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 shadow-sm">
              <div className="px-4 py-3 border-b border-purple-200 bg-white/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    Análise por IA
                  </h2>
                  {analise.confianca_analise && (
                    <Badge variant="outline" className="text-xs bg-white border-purple-300 text-purple-700">
                      {Math.round(analise.confianca_analise * 100)}% confiança
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Resumo Executivo */}
                {analise.resumo_executivo && (
                  <div>
                    <div className="text-xs font-medium text-slate-600 mb-1.5">Resumo Executivo</div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {analise.resumo_executivo}
                    </p>
                  </div>
                )}

                {/* Tipo e Sentimento */}
                <div className="grid grid-cols-2 gap-3">
                  {analise.tipo_decisao && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Tipo de Decisão</div>
                      <div className="text-xs font-medium text-slate-700">
                        {analise.tipo_decisao}
                      </div>
                    </div>
                  )}
                  {analise.sentimento && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Sentimento</div>
                      <Badge
                        variant="outline"
                        className={cn('text-xs border', sentimentoConfig.bg, sentimentoConfig.color, sentimentoConfig.border)}
                      >
                        <SentimentoIcon className="w-3 h-3 mr-1" />
                        {sentimentoConfig.label}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Pontos Principais */}
                {analise.pontos_principais && analise.pontos_principais.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-600 mb-2">Pontos Principais</div>
                    <ul className="space-y-1.5">
                      {analise.pontos_principais.map((ponto, index) => (
                        <li key={index} className="flex gap-2 text-xs text-slate-700">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span className="flex-1">{ponto}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <Brain className="w-10 h-10 text-slate-300" />
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Análise não disponível</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Clique em "Processar com IA" para gerar uma análise automática desta publicação.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A] hover:to-[#2563EB] mt-2"
                  onClick={() => router.push(`/dashboard/publicacoes/processar/${publicacao.id}`)}
                >
                  <Play className="w-4 h-4" />
                  Processar com IA
                </Button>
              </div>
            </div>
          )}

          {/* Card: Prazo Detectado */}
          {analise?.tem_prazo && diasRestantes !== null && (
            <div className={cn(
              'rounded-lg border shadow-sm',
              diasRestantes <= 3
                ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
                : diasRestantes <= 7
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
                : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
            )}>
              <div className={cn(
                'px-4 py-3 border-b bg-white/50',
                diasRestantes <= 3 ? 'border-red-200' :
                diasRestantes <= 7 ? 'border-amber-200' : 'border-blue-200'
              )}>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className={cn(
                    'w-4 h-4',
                    diasRestantes <= 3 ? 'text-red-600' :
                    diasRestantes <= 7 ? 'text-amber-600' : 'text-blue-600'
                  )} />
                  Prazo Detectado
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {analise.tipo_prazo && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Tipo de Prazo</div>
                    <div className="text-sm font-semibold text-slate-700">
                      {analise.tipo_prazo}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {analise.prazo_dias && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Prazo</div>
                      <div className="text-sm font-medium text-slate-700">
                        {analise.prazo_dias} dias {analise.prazo_tipo_dias || ''}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Restam</div>
                    <div className={cn(
                      'text-sm font-bold',
                      diasRestantes <= 3 ? 'text-red-600' :
                      diasRestantes <= 7 ? 'text-amber-600' : 'text-blue-600'
                    )}>
                      {diasRestantes} dias
                    </div>
                  </div>
                </div>

                {analise.data_intimacao && analise.data_limite && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Intimação → Limite</div>
                    <div className="text-xs font-medium text-slate-700">
                      {formatBrazilDate(analise.data_intimacao)}
                      {' → '}
                      {formatBrazilDate(analise.data_limite)}
                    </div>
                  </div>
                )}

                {analise.fundamentacao_legal && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Fundamentação Legal</div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {analise.fundamentacao_legal}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card: Ações Sugeridas */}
          {analise?.acoes_sugeridas && analise.acoes_sugeridas.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Ações Sugeridas
                </h2>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  {analise.acoes_sugeridas.map((acao, index) => (
                    <li key={index} className="flex gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="flex-1">{acao}</span>
                    </li>
                  ))}
                </ul>

                {analise.template_sugerido && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-xs text-slate-500 mb-2">Template Sugerido</div>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      <FileText className="w-3 h-3 mr-1" />
                      {analise.template_sugerido}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card: Processo não vinculado - Vinculação Inteligente */}
          {publicacao.numero_processo && !publicacao.processo_id && (
            <div className={cn(
              'rounded-lg border shadow-sm',
              processoEncontrado
                ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
                : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
            )}>
              <div className={cn(
                'px-4 py-3 border-b bg-white/50',
                processoEncontrado ? 'border-emerald-200' : 'border-amber-200'
              )}>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  {buscandoProcesso ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      Buscando processo...
                    </>
                  ) : processoEncontrado ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Processo encontrado no sistema
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Processo não cadastrado
                    </>
                  )}
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {buscandoProcesso ? (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Verificando se o processo existe no sistema...
                  </p>
                ) : processoEncontrado ? (
                  <>
                    <p className="text-xs text-slate-600">
                      Encontramos o processo <span className="font-mono font-medium">{processoEncontrado.numero_cnj}</span> no sistema.
                    </p>
                    <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                      <div className="text-xs text-slate-500 mb-1">Parte contrária</div>
                      <div className="text-sm font-medium text-slate-700">
                        {processoEncontrado.parte_contraria || 'Não informada'}
                      </div>
                      <div className="text-xs text-slate-500 mt-2">Status</div>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {processoEncontrado.status}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-2 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                      onClick={() => vincularProcesso(processoEncontrado.id)}
                      disabled={vinculando}
                    >
                      {vinculando ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      {vinculando ? 'Vinculando...' : 'Vincular a este processo'}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-600">
                      O processo <span className="font-mono font-medium">{publicacao.numero_processo}</span> não está cadastrado no sistema.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2 text-xs"
                        onClick={() => router.push(`/dashboard/processos?busca=${publicacao.numero_processo}`)}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Buscar Manual
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-2 text-xs bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6]"
                        onClick={() => router.push(`/dashboard/processos/novo?numero=${publicacao.numero_processo}`)}
                      >
                        <Scale className="w-3.5 h-3.5" />
                        Criar Pasta
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wizards de Agendamento - Padrão da Agenda */}
      {escritorioAtivo && tarefaModalOpen && (
        <TarefaWizard
          escritorioId={escritorioAtivo}
          onClose={() => {
            setTarefaModalOpen(false)
            carregarPublicacao()
          }}
          onCreated={() => {
            toast.success('Tarefa criada com sucesso!')
            carregarPublicacao()
          }}
          initialData={{
            titulo: `Tarefa: Publicação ${publicacao.tipo_publicacao || ''} - ${publicacao.numero_processo || 'Sem processo'}`,
            descricao: publicacao.texto_completo || '',
            processo_id: publicacao.processo_id || undefined,
          }}
        />
      )}

      {escritorioAtivo && eventoModalOpen && (
        <EventoWizard
          escritorioId={escritorioAtivo}
          onClose={() => {
            setEventoModalOpen(false)
            carregarPublicacao()
          }}
          onSubmit={async (data: EventoFormData) => {
            try {
              await createEvento(data)
              toast.success('Compromisso criado com sucesso!')
              setEventoModalOpen(false)
              carregarPublicacao()
            } catch (err) {
              console.error('Erro ao criar compromisso:', err)
              toast.error('Erro ao criar compromisso')
              throw err
            }
          }}
          initialData={{
            titulo: `Compromisso: ${publicacao.tipo_publicacao || 'Publicação'}`,
            descricao: publicacao.texto_completo || '',
            processo_id: publicacao.processo_id || undefined,
          }}
        />
      )}

      {escritorioAtivo && audienciaModalOpen && publicacao.processo_id && (
        <AudienciaWizard
          escritorioId={escritorioAtivo}
          processoId={publicacao.processo_id}
          onClose={() => {
            setAudienciaModalOpen(false)
            carregarPublicacao()
          }}
          onSubmit={async (data: AudienciaFormData) => {
            try {
              await createAudiencia(data)
              toast.success('Audiência criada com sucesso!')
              setAudienciaModalOpen(false)
              carregarPublicacao()
            } catch (err) {
              console.error('Erro ao criar audiência:', err)
              toast.error('Erro ao criar audiência')
              throw err
            }
          }}
          initialData={{
            observacoes: publicacao.texto_completo || '',
          }}
        />
      )}
    </div>
  )
}
