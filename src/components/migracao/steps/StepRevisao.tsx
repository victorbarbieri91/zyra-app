// ============================================
// STEP 4: REVISÃO DE DADOS E PREVIEW
// ============================================

'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  Type,
  Eye,
  Users,
  Loader2,
  Sparkles,
  SkipForward,
  CheckCheck,
  UserPlus,
  Link2
} from 'lucide-react'
import { MigracaoState, StepMigracao, ErroValidacao, Duplicata, CorrecaoUsuario, MigracaoJob, Pendencia, DecisaoPendencia } from '@/types/migracao'
import { createClient } from '@/lib/supabase/client'
import { normalizarNome, precisaNormalizar } from '@/lib/migracao/validators'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
}

interface Sugestao {
  linha: number
  campo: string
  valorSugerido: string
  origem: string
  confianca: number
}

export function StepRevisao({ state, updateState, goToStep }: Props) {
  const [correcoes, setCorrecoes] = useState<Record<string, CorrecaoUsuario>>({})
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set())
  const [expandedDups, setExpandedDups] = useState<Set<number>>(new Set())
  const [expandedPendencias, setExpandedPendencias] = useState<Set<number>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'resumo' | 'normalizacao' | 'erros' | 'duplicatas' | 'pendencias'>('resumo')
  const [isLoadingFullData, setIsLoadingFullData] = useState(false)
  const [localJob, setLocalJob] = useState<MigracaoJob | null>(state.job)

  // Estados para sugestões da IA
  const [sugestoes, setSugestoes] = useState<Record<number, Sugestao[]>>({})
  const [isLoadingSugestoes, setIsLoadingSugestoes] = useState(false)
  const [sugestoesCarregadas, setSugestoesCarregadas] = useState(false)

  // Estados para decisões de pendências (clientes não encontrados)
  const [decisoesPendencias, setDecisoesPendencias] = useState<Record<number, DecisaoPendencia>>({})
  const [isCriandoCliente, setIsCriandoCliente] = useState<number | null>(null)

  // Usar job local ou do state
  const job = localJob || state.job

  // Buscar dados completos se resultado_final estiver incompleto
  useEffect(() => {
    const fetchFullJob = async () => {
      if (!state.job?.id) return

      // Se linhas_validas > 0 mas dados_validados está vazio, precisamos buscar novamente
      const dadosArray = state.job.resultado_final?.dados_validados || []
      const linhasValidas = state.job.linhas_validas || 0

      if (linhasValidas > 0 && dadosArray.length === 0) {
        console.log('Dados incompletos detectados, buscando job completo...')
        setIsLoadingFullData(true)

        try {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('migracao_jobs')
            .select('*')
            .eq('id', state.job.id)
            .single()

          if (!error && data) {
            console.log('Job completo carregado:', data.resultado_final?.dados_validados?.length, 'registros')
            setLocalJob(data as MigracaoJob)
            updateState({ job: data as MigracaoJob })
          }
        } catch (err) {
          console.error('Erro ao buscar job completo:', err)
        } finally {
          setIsLoadingFullData(false)
        }
      }
    }

    fetchFullJob()
  }, [state.job?.id, state.job?.linhas_validas])

  if (!job) return null

  const erros = job.erros || []
  const duplicatas = job.duplicatas || []
  const pendencias = (job.pendencias || []) as Pendencia[]

  // Calcular quantos nomes precisam de normalização
  const dadosValidados = job.resultado_final?.dados_validados || []
  const nomesParaNormalizar = useMemo(() => {
    return dadosValidados.filter(item => {
      const nome = item.dados?.nome_completo as string
      return nome && precisaNormalizar(nome)
    }).map(item => ({
      linha: item.linha,
      original: item.dados?.nome_completo as string,
      normalizado: normalizarNome(item.dados?.nome_completo as string)
    }))
  }, [dadosValidados])

  // Contagem de tipos de contato
  const contagemTipos = useMemo(() => {
    const tipos: Record<string, number> = {}
    dadosValidados.forEach(item => {
      const tipo = (item.dados?.tipo_contato as string) || 'cliente'
      tipos[tipo] = (tipos[tipo] || 0) + 1
    })
    return tipos
  }, [dadosValidados])

  // Atualizar correção
  const setCorrecao = (linha: number, correcao: CorrecaoUsuario) => {
    setCorrecoes(prev => ({
      ...prev,
      [linha]: correcao
    }))
  }

  // Toggle expand
  const toggleError = (linha: number) => {
    const newSet = new Set(expandedErrors)
    if (newSet.has(linha)) {
      newSet.delete(linha)
    } else {
      newSet.add(linha)
    }
    setExpandedErrors(newSet)
  }

  const toggleDup = (linha: number) => {
    const newSet = new Set(expandedDups)
    if (newSet.has(linha)) {
      newSet.delete(linha)
    } else {
      newSet.add(linha)
    }
    setExpandedDups(newSet)
  }

  // ========================================
  // FUNÇÕES DE IA E AÇÕES EM LOTE
  // ========================================

  // Buscar sugestões da IA
  const buscarSugestoes = async () => {
    if (erros.length === 0) return

    setIsLoadingSugestoes(true)
    try {
      const response = await fetch('/api/migracao/sugerir-correcoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erros,
          modulo: state.modulo
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSugestoes(data.sugestoes || {})
        setSugestoesCarregadas(true)
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error)
    } finally {
      setIsLoadingSugestoes(false)
    }
  }

  // Aplicar TODAS as sugestões da IA
  const aplicarTodasSugestoes = () => {
    const novasCorrecoes: Record<string, CorrecaoUsuario> = { ...correcoes }

    for (const [linhaStr, sugestoesLinha] of Object.entries(sugestoes)) {
      const linha = parseInt(linhaStr)
      // Para cada linha, criar correção com todos os campos sugeridos
      const campos: Record<string, string> = {}
      for (const sug of sugestoesLinha) {
        campos[sug.campo] = sug.valorSugerido
      }

      // Se temos sugestões, aplicar como correção
      if (Object.keys(campos).length > 0) {
        // Se há apenas um campo, usar formato simples
        if (Object.keys(campos).length === 1) {
          const [campo, valor] = Object.entries(campos)[0]
          novasCorrecoes[linha] = { tipo: 'corrigir', campo, valor }
        } else {
          // Múltiplos campos - usar primeiro como principal
          const [campo, valor] = Object.entries(campos)[0]
          novasCorrecoes[linha] = { tipo: 'corrigir', campo, valor, camposExtras: campos }
        }
      }
    }

    // Para erros sem sugestão, marcar para pular
    for (const erro of erros) {
      if (!novasCorrecoes[erro.linha] && !sugestoes[erro.linha]) {
        novasCorrecoes[erro.linha] = { tipo: 'pular' }
      }
    }

    setCorrecoes(novasCorrecoes)
  }

  // Pular TODOS os erros
  const pularTodosErros = () => {
    const novasCorrecoes: Record<string, CorrecaoUsuario> = { ...correcoes }
    for (const erro of erros) {
      novasCorrecoes[erro.linha] = { tipo: 'pular' }
    }
    setCorrecoes(novasCorrecoes)
  }

  // Pular TODAS as duplicatas
  const pularTodasDuplicatas = () => {
    const novasCorrecoes: Record<string, CorrecaoUsuario> = { ...correcoes }
    for (const dup of duplicatas) {
      novasCorrecoes[dup.linha] = { tipo: 'pular' }
    }
    setCorrecoes(novasCorrecoes)
  }

  // Aceitar sugestão individual
  const aceitarSugestao = (linha: number, sugestao: Sugestao) => {
    setCorrecoes(prev => ({
      ...prev,
      [linha]: { tipo: 'corrigir', campo: sugestao.campo, valor: sugestao.valorSugerido }
    }))
  }

  // Contar quantos erros têm sugestão
  const errosComSugestao = useMemo(() => {
    return erros.filter(e => sugestoes[e.linha]?.length > 0).length
  }, [erros, sugestoes])

  // Verificar se todas as decisões foram tomadas
  const todasDecisoesTomadas = () => {
    if (erros.length === 0 && duplicatas.length === 0 && pendencias.length === 0) return true
    const errosRevisados = erros.every(e => correcoes[e.linha])
    const dupsRevisadas = duplicatas.every(d => correcoes[d.linha])
    const pendenciasRevisadas = pendencias.every(p => decisoesPendencias[p.linha])
    return errosRevisados && dupsRevisadas && pendenciasRevisadas
  }

  // Toggle expandir pendência
  const togglePendencia = (linha: number) => {
    const newSet = new Set(expandedPendencias)
    if (newSet.has(linha)) {
      newSet.delete(linha)
    } else {
      newSet.add(linha)
    }
    setExpandedPendencias(newSet)
  }

  // Criar cliente e vincular
  const criarClienteParaPendencia = async (pendencia: Pendencia) => {
    setIsCriandoCliente(pendencia.linha)
    try {
      const response = await fetch('/api/migracao/criar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_completo: pendencia.valor,
          tipo_contato: 'cliente',
          escritorio_id: job.escritorio_id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setDecisoesPendencias(prev => ({
          ...prev,
          [pendencia.linha]: {
            tipo: 'criar',
            clienteId: data.cliente.id,
            dadosCliente: { nome_completo: pendencia.valor }
          }
        }))
      }
    } catch (error) {
      console.error('Erro ao criar cliente:', error)
    } finally {
      setIsCriandoCliente(null)
    }
  }

  // Vincular a cliente existente
  const vincularClienteExistente = (linha: number, clienteId: string) => {
    setDecisoesPendencias(prev => ({
      ...prev,
      [linha]: { tipo: 'vincular', clienteId }
    }))
  }

  // Pular pendência (não importar)
  const pularPendencia = (linha: number) => {
    setDecisoesPendencias(prev => ({
      ...prev,
      [linha]: { tipo: 'pular' }
    }))
  }

  // Criar todos os clientes faltantes
  const criarTodosClientes = async () => {
    for (const pendencia of pendencias) {
      if (!decisoesPendencias[pendencia.linha]) {
        await criarClienteParaPendencia(pendencia)
      }
    }
  }

  // Pular todas as pendências
  const pularTodasPendencias = () => {
    const novasDecisoes: Record<number, DecisaoPendencia> = { ...decisoesPendencias }
    for (const pendencia of pendencias) {
      novasDecisoes[pendencia.linha] = { tipo: 'pular' }
    }
    setDecisoesPendencias(novasDecisoes)
  }

  // Salvar correções e continuar
  const continuar = async () => {
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Salvar correções e decisões de pendências no job
      await supabase
        .from('migracao_jobs')
        .update({
          correcoes_usuario: correcoes,
          decisoes_pendencias: decisoesPendencias
        })
        .eq('id', job.id)

      goToStep('confirmacao')
    } catch (error) {
      console.error('Erro ao salvar correções:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const voltar = () => {
    goToStep('mapeamento')
  }

  const temProblemas = erros.length > 0 || duplicatas.length > 0 || pendencias.length > 0

  // Mostrar loading se estiver buscando dados completos
  if (isLoadingFullData) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mt-4">
          Carregando dados para revisão...
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Isso pode levar alguns segundos para arquivos grandes
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo de Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-green-50 dark:bg-emerald-500/10 border-green-200 dark:border-emerald-500/30">
          <p className="text-2xl font-bold text-green-600 dark:text-emerald-400">{job.linhas_validas}</p>
          <p className="text-sm text-green-700 dark:text-emerald-400">Registros válidos</p>
        </Card>
        <Card className="p-4 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{nomesParaNormalizar.length}</p>
          <p className="text-sm text-blue-700 dark:text-blue-400">Nomes a normalizar</p>
        </Card>
        <Card className="p-4 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{erros.length}</p>
          <p className="text-sm text-red-700 dark:text-red-400">Com erros</p>
        </Card>
        <Card className="p-4 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{duplicatas.length}</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">Duplicatas</p>
        </Card>
      </div>

      {/* Tabs de navegação */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <Button
          variant={activeTab === 'resumo' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('resumo')}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          Resumo
        </Button>
        <Button
          variant={activeTab === 'normalizacao' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('normalizacao')}
          className="gap-2"
        >
          <Type className="w-4 h-4" />
          Normalização ({nomesParaNormalizar.length})
        </Button>
        {erros.length > 0 && (
          <Button
            variant={activeTab === 'erros' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('erros')}
            className="gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Erros ({erros.length})
          </Button>
        )}
        {duplicatas.length > 0 && (
          <Button
            variant={activeTab === 'duplicatas' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('duplicatas')}
            className="gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Duplicatas ({duplicatas.length})
          </Button>
        )}
        {pendencias.length > 0 && (
          <Button
            variant={activeTab === 'pendencias' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('pendencias')}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Clientes ({pendencias.length})
          </Button>
        )}
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'resumo' && (
        <div className="space-y-4">
          {/* Resumo dos tipos de contato */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-500" />
              Distribuição por Tipo de Contato
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(contagemTipos).map(([tipo, count]) => (
                <Badge key={tipo} variant="secondary" className="text-sm py-1 px-3">
                  {tipo}: <strong className="ml-1">{count}</strong>
                </Badge>
              ))}
            </div>
          </Card>

          {/* Preview de amostra */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-slate-500" />
              Preview dos Primeiros Registros
            </h3>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {dadosValidados.slice(0, 10).map((item, index) => (
                  <div key={index} className="text-xs bg-slate-50 dark:bg-surface-0 p-2 rounded flex justify-between items-center">
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {normalizarNome(item.dados?.nome_completo as string)}
                      </span>
                      {(() => {
                        const tipo = (item.dados as Record<string, string>)?.tipo_contato
                        return tipo ? (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {tipo}
                          </Badge>
                        ) : null
                      })()}
                    </div>
                    <span className="text-slate-400 dark:text-slate-500">Linha {item.linha}</span>
                  </div>
                ))}
                {dadosValidados.length > 10 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                    ... e mais {dadosValidados.length - 10} registros
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Status geral */}
          {!temProblemas && (
            <div className="bg-green-50 dark:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-emerald-400">Tudo certo!</p>
                <p className="text-sm text-green-600 dark:text-emerald-400">
                  Nenhum erro ou duplicata encontrada. Os nomes serão normalizados automaticamente durante a importação.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'normalizacao' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Type className="w-4 h-4 text-blue-500" />
                Nomes que Serão Normalizados
              </h3>
              <Badge variant="secondary">
                {nomesParaNormalizar.length} nomes
              </Badge>
            </div>

            {nomesParaNormalizar.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                Nenhum nome precisa de normalização. Todos já estão formatados corretamente.
              </p>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {nomesParaNormalizar.slice(0, 50).map((item, index) => (
                    <div key={index} className="text-xs bg-slate-50 dark:bg-surface-0 p-3 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 dark:text-slate-500 w-12">L.{item.linha}</span>
                        <span className="text-red-500 line-through flex-1">{item.original}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-12"></span>
                        <span className="text-green-600 dark:text-emerald-400 flex-1 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {item.normalizado}
                        </span>
                      </div>
                    </div>
                  ))}
                  {nomesParaNormalizar.length > 50 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                      ... e mais {nomesParaNormalizar.length - 50} nomes
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 border-t dark:border-slate-700 pt-3">
              A normalização será aplicada automaticamente durante a importação.
              Siglas como S/A, LTDA, ME serão preservadas. Preposições (da, de, do) ficarão em minúsculo.
            </p>
          </Card>
        </div>
      )}

      {activeTab === 'erros' && erros.length > 0 && (
        <div className="space-y-4">
          {/* Barra de ações em lote */}
          <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-500/10 dark:to-blue-500/10 border-purple-200 dark:border-purple-500/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {sugestoesCarregadas
                    ? `${errosComSugestao} de ${erros.length} erros com sugestão de correção`
                    : `${erros.length} erros encontrados`
                  }
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {!sugestoesCarregadas ? (
                  <Button
                    onClick={buscarSugestoes}
                    disabled={isLoadingSugestoes}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoadingSugestoes ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analisar com IA
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    {errosComSugestao > 0 && (
                      <Button
                        onClick={aplicarTodasSugestoes}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Aplicar {errosComSugestao} sugestões
                      </Button>
                    )}
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={pularTodosErros}
                  className="border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Pular todos
                </Button>
              </div>
            </div>

            {sugestoesCarregadas && errosComSugestao > 0 && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-3">
                💡 A IA encontrou sugestões de correção analisando os dados. Clique em &quot;Aplicar sugestões&quot; para aceitar todas ou revise individualmente abaixo.
              </p>
            )}
          </Card>

          {/* Lista de erros */}
          {erros.map((erro: ErroValidacao) => {
            const isExpanded = expandedErrors.has(erro.linha)
            const correcao = correcoes[erro.linha]
            const sugestoesLinha = sugestoes[erro.linha] || []
            const temSugestao = sugestoesLinha.length > 0

            return (
              <Card key={erro.linha} className={`overflow-hidden ${temSugestao && !correcao ? 'border-purple-300 dark:border-purple-500/30 bg-purple-50/30 dark:bg-purple-500/10' : 'border-red-200 dark:border-red-500/30'}`}>
                {/* Header */}
                <div
                  className={`p-4 flex items-center justify-between cursor-pointer ${temSugestao && !correcao ? 'bg-purple-50 dark:bg-purple-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}
                  onClick={() => toggleError(erro.linha)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Linha {erro.linha}</span>
                      {temSugestao && !correcao && (
                        <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-[10px]">
                          <Sparkles className="w-3 h-3 mr-1" />
                          IA sugeriu correção
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {erro.erros.map((e, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {e}
                        </Badge>
                      ))}
                    </div>

                    {/* Preview da sugestão */}
                    {temSugestao && !correcao && (
                      <div className="mt-2 text-xs text-purple-700 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-500/20 rounded px-2 py-1 inline-block">
                        Sugestão: {sugestoesLinha.map(s => `${s.campo} = "${s.valorSugerido}"`).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* Botões de ação rápida */}
                    {temSugestao && !correcao && (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          sugestoesLinha.forEach(s => aceitarSugestao(erro.linha, s))
                        }}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Aceitar
                      </Button>
                    )}
                    {!correcao && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCorrecao(erro.linha, { tipo: 'pular' })
                        }}
                      >
                        Pular
                      </Button>
                    )}
                    {correcao && (
                      <Badge variant="outline" className="bg-white dark:bg-surface-1">
                        {correcao.tipo === 'pular' ? '⏭️ Pulada' :
                         correcao.tipo === 'remover_campo' ? '✂️ Sem CPF' :
                         '✅ Corrigido'}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="p-4 border-t dark:border-slate-700 space-y-4">
                    {/* Dados da linha - original e saneado */}
                    <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-surface-0 p-3 rounded">
                      <p className="font-medium mb-2">Dados da linha:</p>
                      {Object.entries(erro.dados).map(([key, value]) => (
                        <p key={key} className="text-xs">
                          <span className="text-slate-400 dark:text-slate-500">{key}:</span> {String(value || '-')}
                        </p>
                      ))}
                    </div>

                    {/* Mostrar dados saneados se diferentes */}
                    {(erro as any).dadosSaneados && (
                      <div className="text-sm bg-blue-50 dark:bg-blue-500/10 p-3 rounded border border-blue-200 dark:border-blue-500/30">
                        <p className="font-medium mb-2 text-blue-700 dark:text-blue-400">Dados após saneamento automático:</p>
                        {Object.entries((erro as any).dadosSaneados).map(([key, value]) => (
                          <p key={key} className="text-xs">
                            <span className="text-blue-400 dark:text-blue-500">{key}:</span>{' '}
                            <span className="text-blue-700 dark:text-blue-300">{String(value || '-')}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Opções de correção para CNJ */}
                    {erro.erros.some(e => e.includes('CNJ')) && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Corrigir número do processo:</p>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Digite o número CNJ correto (ex: 0000000-00.0000.0.00.0000)"
                            className="flex-1"
                            onChange={(e) => {
                              if (e.target.value) {
                                setCorrecao(erro.linha, {
                                  tipo: 'corrigir',
                                  campo: 'numero_cnj',
                                  valor: e.target.value
                                })
                              }
                            }}
                          />
                          <Button
                            variant={correcao?.tipo === 'pular' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => setCorrecao(erro.linha, { tipo: 'pular' })}
                          >
                            Pular esta linha
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Opções de correção para Cliente */}
                    {erro.erros.some(e => e.includes('Cliente')) && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Corrigir cliente:</p>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Digite o nome ou CPF/CNPJ do cliente"
                            className="flex-1"
                            onChange={(e) => {
                              if (e.target.value) {
                                setCorrecao(erro.linha, {
                                  tipo: 'corrigir',
                                  campo: 'cliente_ref',
                                  valor: e.target.value
                                })
                              }
                            }}
                          />
                          <Button
                            variant={correcao?.tipo === 'pular' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => setCorrecao(erro.linha, { tipo: 'pular' })}
                          >
                            Pular esta linha
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          💡 O cliente precisa existir no CRM. Verifique se o nome está correto ou importe os clientes primeiro.
                        </p>
                      </div>
                    )}

                    {/* Opções de correção para CPF/CNPJ */}
                    {erro.erros.some(e => e.includes('CPF') || e.includes('CNPJ')) && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">O que fazer com esta linha?</p>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={correcao?.tipo === 'remover_campo' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCorrecao(erro.linha, { tipo: 'remover_campo', campo: 'cpf_cnpj' })}
                          >
                            Importar sem CPF/CNPJ
                          </Button>

                          <Button
                            variant={correcao?.tipo === 'pular' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => setCorrecao(erro.linha, { tipo: 'pular' })}
                          >
                            Pular esta linha
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500 dark:text-slate-400">ou corrigir:</span>
                          <Input
                            placeholder="Digite o CPF/CNPJ correto"
                            className="w-48"
                            onChange={(e) => {
                              if (e.target.value) {
                                setCorrecao(erro.linha, {
                                  tipo: 'corrigir',
                                  campo: 'cpf_cnpj',
                                  valor: e.target.value
                                })
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Outros tipos de erro genéricos */}
                    {!erro.erros.some(e => e.includes('CPF') || e.includes('CNPJ') || e.includes('CNJ') || e.includes('Cliente')) && (
                      <div className="flex gap-2">
                        <Button
                          variant={correcao?.tipo === 'pular' ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => setCorrecao(erro.linha, { tipo: 'pular' })}
                        >
                          Pular esta linha
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {activeTab === 'duplicatas' && duplicatas.length > 0 && (
        <div className="space-y-4">
          {/* Barra de ações em lote para duplicatas */}
          <Card className="p-4 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {duplicatas.length} registros já existem no sistema
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={pularTodasDuplicatas}
                  className="border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/10"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Pular todas
                </Button>
              </div>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              💡 Duplicatas são registros que já existem no sistema. Você pode pular todos ou decidir individualmente.
            </p>
          </Card>

          {duplicatas.map((dup: Duplicata) => {
            const isExpanded = expandedDups.has(dup.linha)
            const correcao = correcoes[dup.linha]

            return (
              <Card key={dup.linha} className="border-amber-200 dark:border-amber-500/30 overflow-hidden">
                {/* Header */}
                <div
                  className="p-4 bg-amber-50 dark:bg-amber-500/10 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleDup(dup.linha)}
                >
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Linha {dup.linha}</span>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      {dup.campo}: <strong>{dup.valor}</strong> já existe como &quot;{dup.existente.nome || dup.existente.numero}&quot;
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {correcao && (
                      <Badge variant="outline" className="bg-white dark:bg-surface-1">
                        {correcao.tipo === 'pular' ? 'Será pulada' : 'Atualizar existente'}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="p-4 border-t dark:border-slate-700 space-y-4">
                    <RadioGroup
                      value={correcao?.tipo || ''}
                      onValueChange={(value) => setCorrecao(dup.linha, { tipo: value as 'pular' | 'atualizar' })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pular" id={`pular-${dup.linha}`} />
                        <Label htmlFor={`pular-${dup.linha}`}>
                          Pular (não importar esta linha)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="atualizar" id={`atualizar-${dup.linha}`} />
                        <Label htmlFor={`atualizar-${dup.linha}`}>
                          Atualizar o registro existente com os novos dados
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Tab de Pendências (Clientes não encontrados) */}
      {activeTab === 'pendencias' && pendencias.length > 0 && (
        <div className="space-y-4">
          {/* Barra de ações em lote */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {pendencias.length} clientes não encontrados no CRM
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={criarTodosClientes}
                  disabled={isCriandoCliente !== null}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isCriandoCliente !== null ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar todos
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={pularTodasPendencias}
                  className="border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Pular todos
                </Button>
              </div>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              💡 Esses clientes precisam existir no CRM para vincular aos processos. Você pode criá-los agora ou pular (não importar os processos).
            </p>
          </Card>

          {/* Lista de pendências */}
          {pendencias.map((pendencia: Pendencia) => {
            const isExpanded = expandedPendencias.has(pendencia.linha)
            const decisao = decisoesPendencias[pendencia.linha]

            return (
              <Card key={pendencia.linha} className="border-blue-200 dark:border-blue-500/30 overflow-hidden">
                {/* Header */}
                <div
                  className="p-4 bg-blue-50 dark:bg-blue-500/10 flex items-center justify-between cursor-pointer"
                  onClick={() => togglePendencia(pendencia.linha)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Linha {pendencia.linha}</span>
                      {!decisao && pendencia.sugestoes && pendencia.sugestoes.length > 0 && (
                        <Badge className="bg-green-100 dark:bg-emerald-500/20 text-green-700 dark:text-emerald-400 text-[10px]">
                          {pendencia.sugestoes.length} sugestões
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Cliente: <strong>&quot;{pendencia.valor}&quot;</strong> não encontrado
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* Botões de ação rápida */}
                    {!decisao && (
                      <>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-xs"
                          disabled={isCriandoCliente === pendencia.linha}
                          onClick={(e) => {
                            e.stopPropagation()
                            criarClienteParaPendencia(pendencia)
                          }}
                        >
                          {isCriandoCliente === pendencia.linha ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3 mr-1" />
                              Criar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            pularPendencia(pendencia.linha)
                          }}
                        >
                          Pular
                        </Button>
                      </>
                    )}
                    {decisao && (
                      <Badge variant="outline" className="bg-white dark:bg-surface-1">
                        {decisao.tipo === 'pular' ? '⏭️ Pulado' :
                         decisao.tipo === 'criar' ? '✅ Cliente criado' :
                         '🔗 Vinculado'}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="p-4 border-t dark:border-slate-700 space-y-4">
                    {/* Sugestões de clientes similares */}
                    {pendencia.sugestoes && pendencia.sugestoes.length > 0 && (
                      <div className="bg-green-50 dark:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/30 rounded p-3">
                        <p className="text-sm font-medium text-green-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                          <Link2 className="w-4 h-4" />
                          Clientes similares encontrados:
                        </p>
                        <div className="space-y-2">
                          {pendencia.sugestoes.map((sug) => (
                            <div key={sug.id} className="flex items-center justify-between bg-white dark:bg-surface-1 rounded p-2">
                              <span className="text-sm">
                                {sug.nome}
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  {Math.round(sug.similaridade * 100)}% similar
                                </Badge>
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => vincularClienteExistente(pendencia.linha, sug.id)}
                              >
                                <Link2 className="w-3 h-3 mr-1" />
                                Vincular
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Opções de ação */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => criarClienteParaPendencia(pendencia)}
                        disabled={isCriandoCliente === pendencia.linha}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isCriandoCliente === pendencia.linha ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Criar cliente &quot;{pendencia.valor}&quot;
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={() => pularPendencia(pendencia.linha)}
                      >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Não importar este processo
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Aviso se faltam decisões */}
      {temProblemas && !todasDecisoesTomadas() && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Revise todas as pendências nas abas acima para continuar.
        </div>
      )}

      {/* Botões de navegação */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Mapeamento
        </Button>

        <Button
          onClick={continuar}
          disabled={!todasDecisoesTomadas() || isSaving}
          size="lg"
        >
          {isSaving ? 'Salvando...' : 'Continuar para Importação'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
