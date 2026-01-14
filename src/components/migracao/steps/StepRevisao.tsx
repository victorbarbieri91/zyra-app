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
  Loader2
} from 'lucide-react'
import { MigracaoState, StepMigracao, ErroValidacao, Duplicata, CorrecaoUsuario, MigracaoJob } from '@/types/migracao'
import { createClient } from '@/lib/supabase/client'
import { normalizarNome, precisaNormalizar } from '@/lib/migracao/validators'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
}

export function StepRevisao({ state, updateState, goToStep }: Props) {
  const [correcoes, setCorrecoes] = useState<Record<string, CorrecaoUsuario>>({})
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set())
  const [expandedDups, setExpandedDups] = useState<Set<number>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'resumo' | 'normalizacao' | 'erros' | 'duplicatas'>('resumo')
  const [isLoadingFullData, setIsLoadingFullData] = useState(false)
  const [localJob, setLocalJob] = useState<MigracaoJob | null>(state.job)

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

  // Verificar se todas as decisões foram tomadas
  const todasDecisoesTomadas = () => {
    if (erros.length === 0 && duplicatas.length === 0) return true
    const errosRevisados = erros.every(e => correcoes[e.linha])
    const dupsRevisadas = duplicatas.every(d => correcoes[d.linha])
    return errosRevisados && dupsRevisadas
  }

  // Salvar correções e continuar
  const continuar = async () => {
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Salvar correções no job (mesmo que vazio)
      await supabase
        .from('migracao_jobs')
        .update({ correcoes_usuario: correcoes })
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

  const temProblemas = erros.length > 0 || duplicatas.length > 0

  // Mostrar loading se estiver buscando dados completos
  if (isLoadingFullData) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-lg font-medium text-slate-700 mt-4">
          Carregando dados para revisão...
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Isso pode levar alguns segundos para arquivos grandes
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo de Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-2xl font-bold text-green-600">{job.linhas_validas}</p>
          <p className="text-sm text-green-700">Registros válidos</p>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{nomesParaNormalizar.length}</p>
          <p className="text-sm text-blue-700">Nomes a normalizar</p>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-2xl font-bold text-red-600">{erros.length}</p>
          <p className="text-sm text-red-700">Com erros</p>
        </Card>
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-2xl font-bold text-amber-600">{duplicatas.length}</p>
          <p className="text-sm text-amber-700">Duplicatas</p>
        </Card>
      </div>

      {/* Tabs de navegação */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
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
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'resumo' && (
        <div className="space-y-4">
          {/* Resumo dos tipos de contato */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
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
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-slate-500" />
              Preview dos Primeiros Registros
            </h3>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {dadosValidados.slice(0, 10).map((item, index) => (
                  <div key={index} className="text-xs bg-slate-50 p-2 rounded flex justify-between items-center">
                    <div>
                      <span className="font-medium text-slate-700">
                        {normalizarNome(item.dados?.nome_completo as string)}
                      </span>
                      {item.dados?.tipo_contato && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {item.dados.tipo_contato as string}
                        </Badge>
                      )}
                    </div>
                    <span className="text-slate-400">Linha {item.linha}</span>
                  </div>
                ))}
                {dadosValidados.length > 10 && (
                  <p className="text-xs text-slate-400 text-center py-2">
                    ... e mais {dadosValidados.length - 10} registros
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Status geral */}
          {!temProblemas && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Tudo certo!</p>
                <p className="text-sm text-green-600">
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
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Type className="w-4 h-4 text-blue-500" />
                Nomes que Serão Normalizados
              </h3>
              <Badge variant="secondary">
                {nomesParaNormalizar.length} nomes
              </Badge>
            </div>

            {nomesParaNormalizar.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Nenhum nome precisa de normalização. Todos já estão formatados corretamente.
              </p>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {nomesParaNormalizar.slice(0, 50).map((item, index) => (
                    <div key={index} className="text-xs bg-slate-50 p-3 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-12">L.{item.linha}</span>
                        <span className="text-red-500 line-through flex-1">{item.original}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-12"></span>
                        <span className="text-green-600 flex-1 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {item.normalizado}
                        </span>
                      </div>
                    </div>
                  ))}
                  {nomesParaNormalizar.length > 50 && (
                    <p className="text-xs text-slate-400 text-center py-2">
                      ... e mais {nomesParaNormalizar.length - 50} nomes
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}

            <p className="text-xs text-slate-500 mt-4 border-t pt-3">
              A normalização será aplicada automaticamente durante a importação.
              Siglas como S/A, LTDA, ME serão preservadas. Preposições (da, de, do) ficarão em minúsculo.
            </p>
          </Card>
        </div>
      )}

      {activeTab === 'erros' && erros.length > 0 && (
        <div className="space-y-3">
          {erros.map((erro: ErroValidacao) => {
            const isExpanded = expandedErrors.has(erro.linha)
            const correcao = correcoes[erro.linha]

            return (
              <Card key={erro.linha} className="border-red-200 overflow-hidden">
                {/* Header */}
                <div
                  className="p-4 bg-red-50 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleError(erro.linha)}
                >
                  <div>
                    <span className="font-medium text-slate-700">Linha {erro.linha}</span>
                    <div className="flex gap-2 mt-1">
                      {erro.erros.map((e, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {correcao && (
                      <Badge variant="outline" className="bg-white">
                        {correcao.tipo === 'pular' ? 'Será pulada' :
                         correcao.tipo === 'remover_campo' ? 'Sem CPF' :
                         'Corrigido'}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="p-4 border-t space-y-4">
                    {/* Dados da linha */}
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                      <p className="font-medium mb-1">Dados da linha:</p>
                      {Object.entries(erro.dados).map(([key, value]) => (
                        <p key={key} className="text-xs">
                          <span className="text-slate-400">{key}:</span> {String(value || '-')}
                        </p>
                      ))}
                    </div>

                    {/* Opções de correção */}
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
                          <span className="text-sm text-slate-500">ou corrigir:</span>
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

                    {/* Outros tipos de erro */}
                    {!erro.erros.some(e => e.includes('CPF') || e.includes('CNPJ')) && (
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
        <div className="space-y-3">
          {duplicatas.map((dup: Duplicata) => {
            const isExpanded = expandedDups.has(dup.linha)
            const correcao = correcoes[dup.linha]

            return (
              <Card key={dup.linha} className="border-amber-200 overflow-hidden">
                {/* Header */}
                <div
                  className="p-4 bg-amber-50 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleDup(dup.linha)}
                >
                  <div>
                    <span className="font-medium text-slate-700">Linha {dup.linha}</span>
                    <p className="text-sm text-amber-700 mt-1">
                      {dup.campo}: <strong>{dup.valor}</strong> já existe como &quot;{dup.existente.nome || dup.existente.numero}&quot;
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {correcao && (
                      <Badge variant="outline" className="bg-white">
                        {correcao.tipo === 'pular' ? 'Será pulada' : 'Atualizar existente'}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="p-4 border-t space-y-4">
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

      {/* Aviso se faltam decisões */}
      {temProblemas && !todasDecisoesTomadas() && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Clique em cada erro/duplicata nas abas acima para definir o que fazer com cada um.
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
