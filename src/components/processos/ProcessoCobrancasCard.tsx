'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Receipt,
  Loader2,
  DollarSign,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  Pencil,
  Send,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useCobrancaAtos, AtoDisponivel, calcularValorAto } from '@/hooks/useCobrancaAtos'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ProcessoCobrancasCardProps {
  processoId: string
  valorCausa?: number
  formasDisponiveis?: string[]  // Array de formas do contrato
}

interface AtoComEstado extends AtoDisponivel {
  baseAlternativa: string
  usandoBaseAlternativa: boolean
  valorFinal: number
  calculoAtualizado: {
    valorCalculado: number
    valorPercentual: number
    usouMinimo: boolean
  }
}

export default function ProcessoCobrancasCard({
  processoId,
  valorCausa,
  formasDisponiveis,
}: ProcessoCobrancasCardProps) {
  const { escritorioAtivo } = useEscritorioAtivo()
  const { loadAtosDisponiveis, cobrarAto } = useCobrancaAtos(escritorioAtivo)
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [atosComEstado, setAtosComEstado] = useState<AtoComEstado[]>([])
  const [contratoForma, setContratoForma] = useState<string | null>(null)
  const [formasDoContrato, setFormasDisponiveis] = useState<string[]>([])
  const [atoExpandido, setAtoExpandido] = useState<string | null>(null)

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState<AtoComEstado | null>(null)
  const [cobrando, setCobrando] = useState(false)

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!processoId || !escritorioAtivo) return

    setLoading(true)
    try {
      const { data: processo } = await supabase
        .from('processos_processos')
        .select('contrato_id')
        .eq('id', processoId)
        .single()

      if (!processo?.contrato_id) {
        setLoading(false)
        return
      }

      const { data: contrato } = await supabase
        .from('financeiro_contratos_honorarios')
        .select('forma_cobranca, formas_pagamento')
        .eq('id', processo.contrato_id)
        .single()

      if (!contrato) {
        setLoading(false)
        return
      }

      setContratoForma(contrato.forma_cobranca)

      // Extrair formas disponíveis do contrato
      const formasDoContrato = contrato.formas_pagamento
        ? (contrato.formas_pagamento as Array<{ forma?: string; forma_cobranca?: string }>)
            .map(f => f.forma || f.forma_cobranca)
            .filter(Boolean)
        : [contrato.forma_cobranca]

      setFormasDisponiveis(formasDoContrato as string[])

      // Carregar atos se por_ato está nas formas disponíveis
      const temPorAto = formasDoContrato.includes('por_ato') || contrato.forma_cobranca === 'por_ato'
      if (temPorAto) {
        const atos = await loadAtosDisponiveis(processoId)

        // Inicializar estado de cada ato
        const atosComEstadoInicial: AtoComEstado[] = atos.map(ato => {
          const calculo = calcularValorAto(
            ato.percentual_contrato || ato.percentual_padrao,
            ato.valor_minimo_contrato || ato.valor_fixo_padrao,
            ato.base_calculo_padrao || valorCausa || 0
          )
          return {
            ...ato,
            baseAlternativa: '',
            usandoBaseAlternativa: false,
            valorFinal: calculo.valorCalculado,
            calculoAtualizado: calculo,
          }
        })
        setAtosComEstado(atosComEstadoInicial)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de cobrança:', error)
    } finally {
      setLoading(false)
    }
  }, [processoId, escritorioAtivo, supabase, loadAtosDisponiveis, valorCausa])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Atualizar base alternativa de um ato
  const handleAlterarBase = (atoId: string, novaBase: string) => {
    setAtosComEstado(prev => prev.map(ato => {
      if (ato.id !== atoId) return ato

      const baseCalculo = novaBase ? parseFloat(novaBase) : (ato.base_calculo_padrao || valorCausa || 0)
      const calculo = calcularValorAto(
        ato.percentual_contrato || ato.percentual_padrao,
        ato.valor_minimo_contrato || ato.valor_fixo_padrao,
        baseCalculo
      )

      return {
        ...ato,
        baseAlternativa: novaBase,
        usandoBaseAlternativa: !!novaBase,
        valorFinal: calculo.valorCalculado,
        calculoAtualizado: calculo,
      }
    }))
  }

  // Alternar uso de base alternativa
  const toggleBaseAlternativa = (atoId: string) => {
    setAtosComEstado(prev => prev.map(ato => {
      if (ato.id !== atoId) return ato

      if (ato.usandoBaseAlternativa) {
        // Voltar para valor da causa
        const calculo = calcularValorAto(
          ato.percentual_contrato || ato.percentual_padrao,
          ato.valor_minimo_contrato || ato.valor_fixo_padrao,
          ato.base_calculo_padrao || valorCausa || 0
        )
        return {
          ...ato,
          baseAlternativa: '',
          usandoBaseAlternativa: false,
          valorFinal: calculo.valorCalculado,
          calculoAtualizado: calculo,
        }
      } else {
        // Expandir para editar
        setAtoExpandido(atoId)
        return ato
      }
    }))
  }

  // Abrir modal de confirmação
  const handleAbrirConfirmacao = (ato: AtoComEstado) => {
    setModalConfirmacao(ato)
  }

  // Confirmar cobrança
  const handleConfirmarCobranca = async () => {
    if (!modalConfirmacao) return

    setCobrando(true)
    try {
      await cobrarAto(
        processoId,
        modalConfirmacao.id,
        modalConfirmacao.valorFinal,
        modalConfirmacao.nome
      )
      toast.success('Honorário enviado ao faturamento!')
      setModalConfirmacao(null)
      loadData()
    } catch (error) {
      console.error('Erro ao cobrar ato:', error)
      toast.error('Erro ao enviar ao faturamento')
    } finally {
      setCobrando(false)
    }
  }

  if (loading) {
    return null
  }

  // Exibir se: por_ato está nas formasDisponiveis (prop ou carregado do contrato)
  const deveExibir = formasDisponiveis?.includes('por_ato') || formasDoContrato.includes('por_ato') || contratoForma === 'por_ato'
  if (!deveExibir || atosComEstado.length === 0) {
    return null
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#89bcbe]" />
            Cobrança de Atos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="space-y-3">
            {atosComEstado.map(ato => (
              <div
                key={ato.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                {/* Cabeçalho do Ato */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#34495e] truncate">
                      {ato.nome}
                    </p>

                    {/* Info do Cálculo */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>
                          {ato.percentual_contrato || ato.percentual_padrao}% de{' '}
                          {formatCurrency(
                            ato.usandoBaseAlternativa && ato.baseAlternativa
                              ? parseFloat(ato.baseAlternativa)
                              : (ato.base_calculo_padrao || valorCausa || 0)
                          )}
                        </span>
                        {ato.calculoAtualizado.usouMinimo && (
                          <Badge className="text-[8px] px-1 py-0 h-3.5 bg-amber-100 text-amber-700 border-amber-200">
                            mín. aplicado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(ato.valorFinal)}
                      </p>
                    </div>
                  </div>

                  {/* Botão Cobrar */}
                  <Button
                    size="sm"
                    onClick={() => handleAbrirConfirmacao(ato)}
                    className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Cobrar
                  </Button>
                </div>

                {/* Opção de Alterar Base */}
                <Collapsible
                  open={atoExpandido === ato.id}
                  onOpenChange={(open) => setAtoExpandido(open ? ato.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-6 px-2 text-[10px] text-slate-500 hover:text-[#34495e] w-full justify-start"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      {ato.usandoBaseAlternativa ? 'Usando base alternativa' : 'Alterar base de cálculo'}
                      <ChevronDown className={cn(
                        "w-3 h-3 ml-auto transition-transform",
                        atoExpandido === ato.id && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-slate-500 whitespace-nowrap">
                          Base alternativa:
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={ato.baseAlternativa}
                          onChange={e => handleAlterarBase(ato.id, e.target.value)}
                          placeholder={formatCurrency(ato.base_calculo_padrao || valorCausa || 0)}
                          className="h-7 text-xs flex-1"
                        />
                      </div>
                      {ato.usandoBaseAlternativa && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBaseAlternativa(ato.id)}
                          className="h-6 px-2 text-[10px] text-slate-500"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Usar valor da causa
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação */}
      <Dialog open={!!modalConfirmacao} onOpenChange={() => setModalConfirmacao(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              Confirmar Cobrança
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-slate-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Ato:</span>
                <span className="text-xs font-medium text-[#34495e]">
                  {modalConfirmacao?.nome}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Base:</span>
                <span className="text-xs text-slate-600">
                  {modalConfirmacao?.usandoBaseAlternativa && modalConfirmacao?.baseAlternativa
                    ? formatCurrency(parseFloat(modalConfirmacao.baseAlternativa))
                    : formatCurrency(modalConfirmacao?.base_calculo_padrao || valorCausa || 0)
                  }
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm font-medium text-[#34495e]">Valor:</span>
                <span className="text-sm font-bold text-emerald-600">
                  {formatCurrency(modalConfirmacao?.valorFinal || 0)}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 text-center">
              O honorário será enviado para o faturamento
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalConfirmacao(null)}
              disabled={cobrando}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarCobranca}
              disabled={cobrando}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {cobrando ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
