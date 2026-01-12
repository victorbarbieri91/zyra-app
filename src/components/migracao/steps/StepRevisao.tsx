// ============================================
// STEP 4: REVISÃO DE ERROS E DUPLICATAS
// ============================================

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { MigracaoState, StepMigracao, ErroValidacao, Duplicata, CorrecaoUsuario } from '@/types/migracao'
import { createClient } from '@/lib/supabase/client'

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

  const job = state.job
  if (!job) return null

  const erros = job.erros || []
  const duplicatas = job.duplicatas || []

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
    const errosRevisados = erros.every(e => correcoes[e.linha])
    const dupsRevisadas = duplicatas.every(d => correcoes[d.linha])
    return errosRevisados && dupsRevisadas
  }

  // Salvar correções e continuar
  const continuar = async () => {
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Salvar correções no job
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

  // Se não há erros nem duplicatas, ir direto para confirmação
  if (erros.length === 0 && duplicatas.length === 0) {
    goToStep('confirmacao')
    return null
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-2xl font-bold text-green-600">{job.linhas_validas}</p>
          <p className="text-sm text-green-700">Linhas válidas</p>
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

      {/* Erros */}
      {erros.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Erros de validação ({erros.length})
          </h3>

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
        </div>
      )}

      {/* Duplicatas */}
      {duplicatas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Duplicatas encontradas ({duplicatas.length})
          </h3>

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
        </div>
      )}

      {/* Aviso se faltam decisões */}
      {!todasDecisoesTomadas() && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Clique em cada item acima para definir o que fazer com ele.
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
          {isSaving ? 'Salvando...' : 'Continuar'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
