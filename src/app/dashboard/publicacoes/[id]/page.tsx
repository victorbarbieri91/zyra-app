'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
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
  Check,
  Calendar,
  FolderPlus
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Wizards padrão da agenda (componentes corretos com steps)
import TarefaWizard from '@/components/agenda/TarefaWizard'
import EventoWizard from '@/components/agenda/EventoWizard'
import AudienciaWizard from '@/components/agenda/AudienciaWizard'

// Wizard de processo para criar pasta
import ProcessoWizard from '@/components/processos/ProcessoWizard'

// Hooks
import { useEventos } from '@/hooks/useEventos'
import { useAudiencias } from '@/hooks/useAudiencias'

// Tipos
type StatusPublicacao = 'pendente' | 'em_analise' | 'processada' | 'arquivada'
type TipoPublicacao = 'intimacao' | 'sentenca' | 'despacho' | 'decisao' | 'acordao' | 'citacao' | 'outro'

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
  is_snippet?: boolean
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
  const [marcandoTratada, setMarcandoTratada] = useState(false)

  // Wizards de agendamento
  const [tarefaWizardOpen, setTarefaWizardOpen] = useState(false)
  const [eventoWizardOpen, setEventoWizardOpen] = useState(false)
  const [audienciaWizardOpen, setAudienciaWizardOpen] = useState(false)

  // Wizard de processo (criar pasta)
  const [processoWizardOpen, setProcessoWizardOpen] = useState(false)

  // Hooks para criação
  const { createEvento } = useEventos(publicacao?.escritorio_id || '')
  const { createAudiencia } = useAudiencias()

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
    if (!publicacao) return

    setMarcandoTratada(true)
    try {
      // Se a publicação está vinculada a um processo, criar andamento
      if (publicacao.processo_id) {
        const { error: movError } = await supabase
          .from('processos_movimentacoes')
          .insert({
            processo_id: publicacao.processo_id,
            escritorio_id: publicacao.escritorio_id,
            data_movimento: publicacao.data_publicacao,
            tipo_codigo: publicacao.tipo_publicacao?.toUpperCase() || 'PUBLICACAO',
            tipo_descricao: publicacao.tipo_publicacao
              ? publicacao.tipo_publicacao.charAt(0).toUpperCase() + publicacao.tipo_publicacao.slice(1)
              : 'Publicação',
            descricao: `${publicacao.tribunal || 'Diário Oficial'} - ${publicacao.tipo_publicacao || 'Publicação'}`,
            conteudo_completo: publicacao.texto_completo || '',
            origem: 'publicacao_diario',
            importante: publicacao.urgente || false,
            lida: true,
          })

        if (movError) {
          console.error('Erro ao criar andamento:', movError)
          // Continua mesmo se falhar o andamento
        }
      }

      // Atualizar status da publicação
      const { error } = await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'processada' })
        .eq('id', publicacaoId)

      if (error) throw error

      if (publicacao.processo_id) {
        toast.success('Marcada como tratada e salva nos andamentos do processo')
      } else {
        toast.success('Marcada como tratada')
      }
      await carregarPublicacao()
    } catch (err) {
      console.error('Erro ao atualizar:', err)
      toast.error('Erro ao atualizar')
    } finally {
      setMarcandoTratada(false)
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

  // Callback para quando os wizards criam com sucesso
  const handleWizardCreated = async () => {
    if (publicacao?.status === 'pendente') {
      await supabase
        .from('publicacoes_publicacoes')
        .update({ status: 'processada' })
        .eq('id', publicacaoId)
      await carregarPublicacao()
    }
    toast.success('Agendamento criado com sucesso!')
  }

  // Callback quando processo é criado
  const handleProcessoCriado = async (processoId: string) => {
    // Vincular a publicação ao processo criado
    await supabase
      .from('publicacoes_publicacoes')
      .update({ processo_id: processoId })
      .eq('id', publicacaoId)

    toast.success('Pasta criada e vinculada!')
    await carregarPublicacao()
    setProcessoWizardOpen(false)
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

  // Gerar descricao para os wizards
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

  const jaTratada = publicacao.status === 'processada' || publicacao.status === 'arquivada'

  return (
    <TooltipProvider>
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

            {/* Botões de ação rápida */}
            <div className="flex items-center gap-2">
              {/* Botão de Check - Marcar como Tratada */}
              {!jaTratada && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={marcarTratada}
                      disabled={marcandoTratada}
                      className="h-9 w-9 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                    >
                      {marcandoTratada ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Marcar como tratada</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Dropdown de Agendar */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                      >
                        <Calendar className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Agendar</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setTarefaWizardOpen(true)} className="gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Criar Tarefa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEventoWizardOpen(true)} className="gap-2">
                    <CalendarPlus className="w-4 h-4" />
                    Criar Compromisso
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAudienciaWizardOpen(true)} className="gap-2">
                    <Gavel className="w-4 h-4" />
                    Criar Audiencia
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Botão de Arquivar */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={arquivarPublicacao}
                    className="h-9 w-9 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Arquivar</p>
                </TooltipContent>
              </Tooltip>
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
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-slate-600" />
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setProcessoWizardOpen(true)}
                    >
                      <FolderPlus className="w-4 h-4" />
                      Criar Pasta
                    </Button>
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
                {publicacao.is_snippet && (
                  <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-xs text-amber-700">
                      Este texto pode estar incompleto. A fonte retornou apenas um trecho da publicacao original.
                    </p>
                  </div>
                )}
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
                  <Sparkles className="w-4 h-4 text-[#34495e]" />
                  <h2 className="text-sm font-semibold text-slate-700">Analise Inteligente</h2>
                </div>
              </div>

              <div className="p-4">
                {!analise ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500 mb-4">
                      Extraia prazos e acoes sugeridas automaticamente
                    </p>
                    <Button
                      onClick={analisarComIA}
                      disabled={analisando}
                      variant="outline"
                      className="gap-2"
                    >
                      {analisando ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Analisar
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

                    {/* Botoes de acao - Abre Wizards padrão */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-medium text-slate-500 mb-2">Agendar a partir desta analise:</p>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setTarefaWizardOpen(true)}
                        >
                          <CheckSquare className="w-4 h-4" />
                          Criar Tarefa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setEventoWizardOpen(true)}
                        >
                          <CalendarPlus className="w-4 h-4" />
                          Criar Compromisso
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setAudienciaWizardOpen(true)}
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
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Analisar novamente
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wizard de Tarefa (padrão da agenda com steps) */}
        {tarefaWizardOpen && (
          <TarefaWizard
            escritorioId={publicacao.escritorio_id}
            onClose={() => setTarefaWizardOpen(false)}
            onCreated={handleWizardCreated}
            initialData={{
              tipo: 'prazo_processual',
              titulo: analise?.acao_sugerida || `${getTipoLabel(publicacao.tipo_publicacao)} - ${publicacao.numero_processo || 'Sem processo'}`,
              descricao: gerarDescricao(),
              processo_id: publicacao.processo_id || undefined,
              prioridade: analise?.urgente ? 'alta' : 'media',
              data_inicio: new Date().toISOString().split('T')[0],
              data_fim: analise?.data_limite_sugerida || undefined,
            }}
          />
        )}

        {/* Wizard de Evento/Compromisso (padrão da agenda com steps) */}
        {eventoWizardOpen && (
          <EventoWizard
            escritorioId={publicacao.escritorio_id}
            onClose={() => setEventoWizardOpen(false)}
            onSubmit={async (data) => {
              await createEvento(data)
              await handleWizardCreated()
              setEventoWizardOpen(false)
            }}
            initialData={{
              titulo: analise?.acao_sugerida || `${getTipoLabel(publicacao.tipo_publicacao)} - ${publicacao.numero_processo || 'Sem processo'}`,
              descricao: gerarDescricao(),
              processo_id: publicacao.processo_id || undefined,
              data_inicio: analise?.data_limite_sugerida ? `${analise.data_limite_sugerida}T09:00` : undefined,
            }}
          />
        )}

        {/* Wizard de Audiência (padrão da agenda com steps) */}
        {audienciaWizardOpen && (
          <AudienciaWizard
            escritorioId={publicacao.escritorio_id}
            processoId={publicacao.processo_id}
            onClose={() => setAudienciaWizardOpen(false)}
            onSubmit={async () => {
              // O wizard já cria a audiência internamente via useAudiencias
              await handleWizardCreated()
              setAudienciaWizardOpen(false)
            }}
            initialData={{
              titulo: `Audiencia - ${publicacao.numero_processo || 'Sem processo'}`,
              descricao: gerarDescricao(),
              data_hora: analise?.data_limite_sugerida ? `${analise.data_limite_sugerida}T09:00` : undefined,
              tribunal: publicacao.tribunal,
              vara: publicacao.vara,
            }}
          />
        )}

        {/* Wizard de Processo (criar pasta) */}
        <ProcessoWizard
          open={processoWizardOpen}
          onOpenChange={setProcessoWizardOpen}
          onSuccess={handleProcessoCriado}
        />
      </div>
    </TooltipProvider>
  )
}
