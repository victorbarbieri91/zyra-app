'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  AlertTriangle,
  CalendarPlus,
  CheckSquare,
  Gavel,
  Archive,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Modais padrão da agenda
import TarefaModal from '@/components/agenda/TarefaModal'
import AudienciaModal from '@/components/agenda/AudienciaModal'
import EventoModal from '@/components/agenda/EventoModal'

// Tipos
type StatusPublicacao = 'pendente' | 'em_analise' | 'processada' | 'arquivada'
type TipoPublicacao = 'intimacao' | 'sentenca' | 'despacho' | 'decisao' | 'acordao' | 'citacao' | 'outro'
type TipoAgendamento = 'tarefa' | 'evento' | 'audiencia'

interface Publicacao {
  id: string
  data_publicacao: string
  tribunal: string
  vara?: string
  tipo_publicacao: TipoPublicacao
  numero_processo?: string
  processo_id?: string
  status: StatusPublicacao
  urgente: boolean
  texto_completo?: string
  created_at: string
  escritorio_id: string
}

interface AnaliseIA {
  resumo: string
  tipo_publicacao: TipoPublicacao
  tem_prazo: boolean
  prazo_dias?: number
  prazo_tipo?: 'uteis' | 'corridos'
  data_limite_sugerida?: string
  urgente: boolean
  acao_sugerida?: string
  fundamentacao_legal?: string
}

export default function PublicacaoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const publicacaoId = params.id as string

  const [publicacao, setPublicacao] = useState<Publicacao | null>(null)
  const [analise, setAnalise] = useState<AnaliseIA | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [analisando, setAnalisando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Modais de agendamento
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false)
  const [audienciaModalOpen, setAudienciaModalOpen] = useState(false)
  const [eventoModalOpen, setEventoModalOpen] = useState(false)

  // Carregar publicacao
  const carregarPublicacao = useCallback(async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('publicacoes_publicacoes')
        .select('*')
        .eq('id', publicacaoId)
        .single()

      if (error) throw error
      setPublicacao(data)

      // Verificar se ja tem analise em cache
      const { data: analiseCache } = await supabase
        .from('publicacoes_analises')
        .select('resultado')
        .eq('publicacao_id', publicacaoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (analiseCache?.resultado) {
        setAnalise(analiseCache.resultado as AnaliseIA)
      }
    } catch (err) {
      console.error('Erro ao carregar publicacao:', err)
      toast.error('Erro ao carregar publicacao')
    } finally {
      setCarregando(false)
    }
  }, [publicacaoId, supabase])

  useEffect(() => {
    carregarPublicacao()
  }, [carregarPublicacao])

  // Analisar com IA
  const analisarComIA = async () => {
    setAnalisando(true)
    try {
      const response = await fetch('/api/publicacoes/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicacao_id: publicacaoId })
      })

      const data = await response.json()

      if (!data.sucesso) {
        throw new Error(data.error)
      }

      setAnalise(data.analise)
      toast.success(data.cached ? 'Analise carregada do cache' : 'Analise concluida!')

      // Recarregar publicacao para pegar atualizacoes
      await carregarPublicacao()
    } catch (err: any) {
      console.error('Erro ao analisar:', err)
      toast.error(err.message || 'Erro ao analisar publicacao')
    } finally {
      setAnalisando(false)
    }
  }

  // Arquivar publicacao
  const arquivarPublicacao = async () => {
    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'arquivada' })
        .eq('id', publicacaoId)

      if (error) throw error
      toast.success('Publicacao arquivada')
      router.push('/dashboard/publicacoes')
    } catch (err) {
      console.error('Erro ao arquivar:', err)
      toast.error('Erro ao arquivar')
    }
  }

  // Marcar como tratada
  const marcarTratada = async () => {
    try {
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'processada' })
        .eq('id', publicacaoId)

      if (error) throw error
      toast.success('Marcada como tratada')
      await carregarPublicacao()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      toast.error('Erro ao atualizar')
    }
  }

  // Copiar texto
  const copiarTexto = () => {
    if (publicacao?.texto_completo) {
      navigator.clipboard.writeText(publicacao.texto_completo)
      setCopiado(true)
      toast.success('Texto copiado!')
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  // Callbacks para quando os modais fecham (para atualizar status)
  const handleModalClose = async (tipo: TipoAgendamento, open: boolean) => {
    if (tipo === 'tarefa') setTarefaModalOpen(open)
    else if (tipo === 'audiencia') setAudienciaModalOpen(open)
    else setEventoModalOpen(open)

    // Se fechou o modal, atualizar status da publicação para processada
    if (!open && publicacao?.status === 'pendente') {
      await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'processada' })
        .eq('id', publicacaoId)
      await carregarPublicacao()
    }
  }

  const getStatusBadge = (status: StatusPublicacao) => {
    const variants = {
      pendente: 'bg-red-100 text-red-700 border-red-200',
      em_analise: 'bg-amber-100 text-amber-700 border-amber-200',
      processada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      arquivada: 'bg-slate-100 text-slate-600 border-slate-200'
    }
    const labels = {
      pendente: 'Pendente',
      em_analise: 'Em Analise',
      processada: 'Tratada',
      arquivada: 'Arquivada'
    }
    return (
      <Badge variant="outline" className={cn('text-xs font-medium border', variants[status])}>
        {labels[status]}
      </Badge>
    )
  }

  const getTipoLabel = (tipo: TipoPublicacao) => {
    const labels: Record<TipoPublicacao, string> = {
      intimacao: 'Intimacao',
      sentenca: 'Sentenca',
      despacho: 'Despacho',
      decisao: 'Decisao',
      acordao: 'Acordao',
      citacao: 'Citacao',
      outro: 'Outro'
    }
    return labels[tipo] || tipo
  }

  // Gerar descricao para os modais
  const gerarDescricao = () => {
    const partes = [
      `Publicacao: ${getTipoLabel(publicacao?.tipo_publicacao || 'outro')}`,
      `Data: ${publicacao?.data_publicacao ? new Date(publicacao.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}`,
      `Tribunal: ${publicacao?.tribunal || 'N/A'}`,
      publicacao?.vara ? `Vara: ${publicacao.vara}` : '',
      publicacao?.numero_processo ? `Processo: ${publicacao.numero_processo}` : '',
      '',
      analise?.resumo ? `Resumo IA: ${analise.resumo}` : '',
      analise?.fundamentacao_legal ? `Fundamentacao: ${analise.fundamentacao_legal}` : '',
    ]
    return partes.filter(Boolean).join('\n')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!publicacao) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">Publicacao nao encontrada</h2>
          <Link href="/dashboard/publicacoes">
            <Button variant="outline" className="mt-4">Voltar para lista</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/publicacoes')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-[#34495e]">
                {getTipoLabel(publicacao.tipo_publicacao)}
              </h1>
              {getStatusBadge(publicacao.status)}
              {publicacao.urgente && (
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Urgente
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600">
              {publicacao.tribunal} {publicacao.vara && `- ${publicacao.vara}`}
            </p>
            <p className="text-sm text-slate-500">
              Publicado em {new Date(publicacao.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {publicacao.status !== 'processada' && (
              <Button
                variant="outline"
                size="sm"
                onClick={marcarTratada}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Marcar como Tratada
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={arquivarPublicacao}
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <Archive className="w-4 h-4" />
              Arquivar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal - Texto */}
        <div className="lg:col-span-2 space-y-4">
          {/* Processo vinculado */}
          {publicacao.numero_processo && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Processo</p>
                    <p className="text-sm font-mono font-medium text-slate-700">
                      {publicacao.numero_processo}
                    </p>
                  </div>
                </div>
                {publicacao.processo_id ? (
                  <Link href={`/dashboard/processos/${publicacao.processo_id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Ver Processo
                    </Button>
                  </Link>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                    Sem pasta vinculada
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Texto da publicacao */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Texto da Publicacao</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={copiarTexto}
                className="gap-2 h-8"
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiado ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {publicacao.texto_completo || 'Sem texto disponivel'}
              </p>
            </div>
          </div>
        </div>

        {/* Coluna lateral - Analise IA */}
        <div className="space-y-4">
          {/* Card de Analise IA */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">Analise com IA</h2>
                  <p className="text-xs text-slate-500">DeepSeek Reasoner</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {!analise ? (
                <div className="text-center py-6">
                  <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-4">
                    Clique para analisar o texto e extrair prazos e acoes sugeridas
                  </p>
                  <Button
                    onClick={analisarComIA}
                    disabled={analisando}
                    className="gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  >
                    {analisando ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        Analisar com IA
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Resumo */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Resumo</p>
                    <p className="text-sm text-slate-700">{analise.resumo}</p>
                  </div>

                  {/* Prazo */}
                  {analise.tem_prazo && (
                    <div className={cn(
                      'rounded-lg p-3',
                      analise.urgente ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className={cn('w-4 h-4', analise.urgente ? 'text-red-600' : 'text-amber-600')} />
                        <span className={cn('text-sm font-medium', analise.urgente ? 'text-red-700' : 'text-amber-700')}>
                          Prazo Identificado
                        </span>
                        {analise.urgente && (
                          <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-200">
                            Urgente
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700">
                          <strong>{analise.prazo_dias}</strong> dias {analise.prazo_tipo}
                        </p>
                        {analise.data_limite_sugerida && (
                          <p className="text-sm text-slate-600">
                            Data limite: <strong>{new Date(analise.data_limite_sugerida + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                          </p>
                        )}
                        {analise.fundamentacao_legal && (
                          <p className="text-xs text-slate-500 mt-1">{analise.fundamentacao_legal}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Acao sugerida */}
                  {analise.acao_sugerida && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Acao Sugerida</p>
                      <p className="text-sm text-slate-700">{analise.acao_sugerida}</p>
                    </div>
                  )}

                  {/* Botoes de acao - Agora abre modais padrão */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-medium text-slate-500 mb-2">Agendar a partir desta analise:</p>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => setTarefaModalOpen(true)}
                      >
                        <CheckSquare className="w-4 h-4" />
                        Criar Tarefa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => setEventoModalOpen(true)}
                      >
                        <CalendarPlus className="w-4 h-4" />
                        Criar Compromisso
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => setAudienciaModalOpen(true)}
                      >
                        <Gavel className="w-4 h-4" />
                        Criar Audiencia
                      </Button>
                    </div>
                  </div>

                  {/* Botao para re-analisar */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={analisarComIA}
                    disabled={analisando}
                    className="w-full text-slate-500 hover:text-slate-700"
                  >
                    {analisando ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Brain className="w-4 h-4 mr-2" />
                    )}
                    Analisar novamente
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Tarefa (padrão da agenda) */}
      <TarefaModal
        open={tarefaModalOpen}
        onOpenChange={(open) => handleModalClose('tarefa', open)}
        escritorioId={publicacao.escritorio_id}
        // Pré-preenchimento com dados da análise IA
        tituloPadrao={analise?.acao_sugerida || `${getTipoLabel(publicacao.tipo_publicacao)} - ${publicacao.numero_processo || 'Sem processo'}`}
        descricaoPadrao={gerarDescricao()}
        processoIdPadrao={publicacao.processo_id || undefined}
        tipoPadrao="prazo_processual"
        prioridadePadrao={analise?.urgente ? 'alta' : 'media'}
        dataInicioPadrao={new Date().toISOString().split('T')[0]}
        dataLimitePadrao={analise?.data_limite_sugerida || undefined}
        prazoDataIntimacaoPadrao={publicacao.data_publicacao}
        prazoQuantidadeDiasPadrao={analise?.prazo_dias || undefined}
        prazoDiasUteisPadrao={analise?.prazo_tipo === 'uteis'}
      />

      {/* Modal de Evento/Compromisso (padrão da agenda) */}
      <EventoModal
        open={eventoModalOpen}
        onOpenChange={(open) => handleModalClose('evento', open)}
        escritorioId={publicacao.escritorio_id}
        // Pré-preenchimento com dados da análise IA
        tituloPadrao={analise?.acao_sugerida || `${getTipoLabel(publicacao.tipo_publicacao)} - ${publicacao.numero_processo || 'Sem processo'}`}
        descricaoPadrao={gerarDescricao()}
        processoIdPadrao={publicacao.processo_id || undefined}
        dataInicioPadrao={analise?.data_limite_sugerida ? `${analise.data_limite_sugerida}T09:00` : undefined}
      />

      {/* Modal de Audiência (padrão da agenda) */}
      <AudienciaModal
        open={audienciaModalOpen}
        onOpenChange={(open) => handleModalClose('audiencia', open)}
        escritorioId={publicacao.escritorio_id}
        // Pré-preenchimento com dados da análise IA
        processoIdPadrao={publicacao.processo_id || undefined}
        descricaoPadrao={gerarDescricao()}
        dataHoraPadrao={analise?.data_limite_sugerida ? `${analise.data_limite_sugerida}T09:00` : undefined}
        tribunalPadrao={publicacao.tribunal}
        varaPadrao={publicacao.vara}
      />
    </div>
  )
}
