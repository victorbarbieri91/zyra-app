// ============================================
// STEP 2: MAPEAMENTO DE CAMPOS COM IA
// ============================================

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { MigracaoState, StepMigracao } from '@/types/migracao'
import { getSchemaCampos } from '@/lib/migracao/constants'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
  setMapeamentoCampo: (header: string, campo: string | null) => void
  setError: (error: string | null) => void
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export function StepMapeamento({
  state,
  updateState,
  goToStep,
  setMapeamentoCampo,
  setError,
  setIsLoading,
  isLoading
}: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const campos = getSchemaCampos(state.modulo)
  const camposObrigatorios = campos.filter(c => c.obrigatorio)

  // Analisar com IA quando entrar no step
  useEffect(() => {
    if (Object.keys(state.mapeamento).length === 0 && state.headers.length > 0) {
      analisarComIA()
    }
  }, [])

  const analisarComIA = async () => {
    setIsAnalyzing(true)
    setAnalyzeError(null)

    try {
      const response = await fetch('/api/migracao/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: state.headers,
          amostra: state.amostra.slice(0, 5),
          modulo: state.modulo
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao analisar com IA')
      }

      const data = await response.json()

      updateState({
        mapeamento: data.mapeamento || {},
        confianca: data.confianca || {}
      })

      if (data.sugestoes?.length > 0) {
        console.log('Sugestões da IA:', data.sugestoes)
      }
    } catch (err) {
      setAnalyzeError('Não foi possível analisar automaticamente. Mapeie os campos manualmente.')

      // Inicializar mapeamento vazio
      const mapeamentoVazio: Record<string, string | null> = {}
      state.headers.forEach(h => { mapeamentoVazio[h] = null })
      updateState({ mapeamento: mapeamentoVazio, confianca: {} })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Verificar campos já mapeados
  const camposMapeados = Object.values(state.mapeamento).filter(Boolean) as string[]

  // Verificar campos obrigatórios não mapeados
  const obrigatoriosFaltando = camposObrigatorios.filter(
    c => !camposMapeados.includes(c.campo)
  )

  const podeContinar = obrigatoriosFaltando.length === 0

  const continuar = () => {
    goToStep('validacao')
  }

  const voltar = () => {
    goToStep('upload')
  }

  // Renderizar badge de confiança
  const renderConfianca = (header: string) => {
    const conf = state.confianca[header]
    if (conf === undefined) return null

    let variant: 'default' | 'secondary' | 'outline' = 'outline'
    let color = 'text-slate-500'

    if (conf >= 80) {
      variant = 'default'
      color = 'text-white'
    } else if (conf >= 50) {
      variant = 'secondary'
      color = 'text-slate-700'
    }

    return (
      <Badge variant={variant} className={`text-xs ${color}`}>
        {conf}%
      </Badge>
    )
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <Sparkles className="w-16 h-16 text-blue-500 animate-pulse" />
          <Loader2 className="w-8 h-8 text-blue-600 absolute -bottom-1 -right-1 animate-spin" />
        </div>
        <p className="text-lg font-medium text-slate-700 mt-6">
          Analisando campos com IA...
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Isso pode levar alguns segundos
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aviso de erro na análise */}
      {analyzeError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-700 font-medium">{analyzeError}</p>
            <Button
              variant="link"
              className="p-0 h-auto text-amber-600 text-sm"
              onClick={analisarComIA}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Tabela de mapeamento */}
      <Card className="overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b">
          <div className="grid grid-cols-[1fr,40px,1fr,80px] gap-4 text-sm font-medium text-slate-500">
            <span>Coluna na Planilha</span>
            <span></span>
            <span>Campo no Sistema</span>
            <span className="text-center">Confiança</span>
          </div>
        </div>

        <div className="divide-y">
          {state.headers.map(header => {
            const campoAtual = state.mapeamento[header]
            const campoInfo = campos.find(c => c.campo === campoAtual)

            return (
              <div
                key={header}
                className="grid grid-cols-[1fr,40px,1fr,80px] gap-4 items-center px-4 py-3 hover:bg-slate-50"
              >
                {/* Coluna original */}
                <div>
                  <span className="font-medium text-slate-700">{header}</span>
                  {state.amostra[0] && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      Ex: {String(state.amostra[0][header] || '-')}
                    </p>
                  )}
                </div>

                {/* Seta */}
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>

                {/* Select de campo */}
                <Select
                  value={campoAtual || '__ignorar__'}
                  onValueChange={(v) => setMapeamentoCampo(header, v === '__ignorar__' ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um campo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ignorar__">
                      <span className="text-slate-400">-- Adicionar às observações --</span>
                    </SelectItem>
                    {campos.map(campo => {
                      const jaMapeado = camposMapeados.includes(campo.campo) && campoAtual !== campo.campo

                      return (
                        <SelectItem
                          key={campo.campo}
                          value={campo.campo}
                          disabled={jaMapeado}
                        >
                          <div className="flex items-center gap-2">
                            <span>{campo.campo}</span>
                            {campo.obrigatorio && (
                              <span className="text-red-500">*</span>
                            )}
                            {jaMapeado && (
                              <span className="text-xs text-slate-400">(já usado)</span>
                            )}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                {/* Confiança */}
                <div className="flex justify-center">
                  {renderConfianca(header)}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Campos obrigatórios faltando */}
      {obrigatoriosFaltando.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">
                Campos obrigatórios não mapeados:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {obrigatoriosFaltando.map(c => (
                  <Badge key={c.campo} variant="destructive" className="text-xs">
                    {c.campo}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campos mapeados OK */}
      {podeContinar && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm text-green-700">
              Todos os campos obrigatórios foram mapeados!
            </p>
          </div>
        </div>
      )}

      {/* Info sobre campos não mapeados */}
      <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
        <p>
          <strong>Campos não mapeados</strong> serão concatenados automaticamente
          no campo &quot;observações&quot; do registro.
        </p>
      </div>

      {/* Botões de navegação */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={voltar}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Button onClick={continuar} disabled={!podeContinar} size="lg">
          Validar Dados
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
