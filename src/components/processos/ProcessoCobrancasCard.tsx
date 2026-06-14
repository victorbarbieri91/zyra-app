'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2,
  Check,
  X,
  Pencil,
  Send,
  ArrowRight,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useCobrancaAtos, AtoDisponivel, calcularValorAto } from '@/hooks/useCobrancaAtos'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { type FormaCobranca, parseFormasPagamento, contratoTemForma } from '@/lib/contratos/formas'

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
  const { loadAtosDisponiveis, cobrarAto, marcarAtoRecebido, desfazerAtoRecebido } = useCobrancaAtos(escritorioAtivo)
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [atosComEstado, setAtosComEstado] = useState<AtoComEstado[]>([])
  const [contratoForma, setContratoForma] = useState<string | null>(null)
  const [formasDoContrato, setFormasDisponiveis] = useState<string[]>([])
  const [atoExpandido, setAtoExpandido] = useState<string | null>(null)

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState<AtoComEstado | null>(null)
  const [cobrando, setCobrando] = useState(false)

  // Modal "já recebido" (desativa faturamento do item)
  const [modalRecebido, setModalRecebido] = useState<AtoComEstado | null>(null)
  const [recebendo, setRecebendo] = useState(false)
  const [desfazendoId, setDesfazendoId] = useState<string | null>(null)

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

      // Canônico: parse do array formas_pagamento (com fallback para forma_cobranca legada).
      const formasContrato: FormaCobranca[] =
        parseFormasPagamento(contrato.formas_pagamento).length > 0
          ? parseFormasPagamento(contrato.formas_pagamento)
          : contrato.forma_cobranca
            ? [contrato.forma_cobranca as FormaCobranca]
            : []

      setContratoForma(formasContrato[0] ?? null)
      setFormasDisponiveis(formasContrato as string[])

      // Reconhece contratos híbridos: aceita 'por_ato' em qualquer posição do array.
      const temPorAto = contratoTemForma(formasContrato, 'por_ato')
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

  // Confirmar "já recebido" (marca como recebido fora do sistema, sem faturar)
  const handleConfirmarRecebido = async () => {
    if (!modalRecebido) return

    setRecebendo(true)
    try {
      await marcarAtoRecebido(
        processoId,
        modalRecebido.id,
        modalRecebido.valorFinal,
        modalRecebido.nome
      )
      toast.success('Ato marcado como recebido — fora do faturamento')
      setModalRecebido(null)
      loadData()
    } catch (error) {
      console.error('Erro ao marcar ato como recebido:', error)
      toast.error('Erro ao marcar como recebido')
    } finally {
      setRecebendo(false)
    }
  }

  // Desfazer "já recebido" — devolve o ato à cobrança (one-click)
  const handleDesfazerRecebido = async (ato: AtoComEstado) => {
    if (!ato.receitaId) return
    setDesfazendoId(ato.id)
    try {
      await desfazerAtoRecebido(ato.receitaId)
      toast.success('Recebimento desfeito — ato voltou para cobrança')
      loadData()
    } catch (error) {
      console.error('Erro ao desfazer recebimento:', error)
      toast.error('Erro ao desfazer')
    } finally {
      setDesfazendoId(null)
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

  const cobradosCount = atosComEstado.filter(a => a.jaCobrado).length

  return (
    <>
      <Card className="border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] rounded-xl shadow-none overflow-hidden">
        <div className="px-4 pt-3.5 pb-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-[#2c3e50] dark:text-slate-200">Cobrança de atos</span>
            <span className="text-[10.5px] font-mono text-[#9aa1a8] dark:text-slate-500">
              {cobradosCount}/{atosComEstado.length} faturado{cobradosCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="px-4 pb-3">
          {atosComEstado.map((ato, i) => {
            const pct = ato.percentual_contrato || ato.percentual_padrao
            const base = ato.usandoBaseAlternativa && ato.baseAlternativa
              ? parseFloat(ato.baseAlternativa)
              : (ato.base_calculo_padrao || valorCausa || 0)
            const valor = ato.jaCobrado ? (ato.receitaValor ?? ato.valorFinal) : ato.valorFinal
            const statusLabel = ato.receitaStatus === 'pago' ? 'RECEBIDO' : ato.receitaStatus === 'faturado' ? 'FATURADO' : 'ENVIADO'
            const statusColor = ato.receitaStatus === 'enviado' ? '#8a6438' : '#3f6a54'
            return (
              <div key={ato.id} className={cn(i < atosComEstado.length - 1 && 'border-b border-[#f0ede3] dark:border-[#1d2a3c]')}>
                <div className="grid grid-cols-[1fr_auto] gap-2.5 py-2.5 items-start">
                  {/* esquerda: nome + base */}
                  <div className="min-w-0">
                    <div className={cn('text-[12.5px] font-semibold tracking-[-0.005em]', ato.jaCobrado ? 'text-[#9aa1a8] dark:text-slate-500' : 'text-[#2c3e50] dark:text-slate-200')}>
                      {ato.nome}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10.5px] text-[#9aa1a8] dark:text-slate-500">{pct}% · {formatCurrency(base)}</span>
                      {!ato.jaCobrado && ato.calculoAtualizado.usouMinimo && (
                        <span className="text-[8.5px] font-bold px-1 py-0 rounded bg-[#f7f0e7] dark:bg-amber-500/10 text-[#8a6438] dark:text-amber-300">mín.</span>
                      )}
                    </div>
                  </div>

                  {/* direita: valor + ação */}
                  <div className="text-right">
                    <div className={cn('text-[12px] font-semibold font-mono', ato.jaCobrado ? 'text-[#9aa1a8] dark:text-slate-500' : 'text-[#2c3e50] dark:text-slate-200')}>
                      {formatCurrency(valor)}
                    </div>
                    {ato.jaCobrado ? (
                      ato.recebidoForaSistema ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-[9px] font-bold tracking-[0.08em] text-[#3f7376]">RECEBIDO</span>
                          <button
                            onClick={() => handleDesfazerRecebido(ato)}
                            disabled={desfazendoId === ato.id}
                            title="Desfazer — voltar a cobrar"
                            className="text-[#9aa1a8] hover:text-[#834545] transition-colors disabled:opacity-40"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold tracking-[0.08em]" style={{ color: statusColor }}>{statusLabel}</span>
                      )
                    ) : (
                      <div className="flex flex-col items-end gap-1 mt-1">
                        <button
                          onClick={() => handleAbrirConfirmacao(ato)}
                          className="h-6 px-2.5 rounded-md bg-gradient-to-br from-[#34495e] to-[#46627f] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-[0_2px_6px_-2px_rgba(52,73,94,0.3)] hover:from-[#46627f] hover:to-[#34495e] transition-colors"
                        >
                          Faturar <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAtoExpandido(atoExpandido === ato.id ? null : ato.id)}
                            className="text-[10px] text-[#9aa1a8] dark:text-slate-500 hover:text-[#5a6775] dark:hover:text-slate-300 underline underline-offset-2 inline-flex items-center gap-1"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            {ato.usandoBaseAlternativa ? 'base ajustada' : 'ajustar base'}
                          </button>
                          <button
                            onClick={() => setModalRecebido(ato)}
                            className="text-[10px] text-[#9aa1a8] dark:text-slate-500 hover:text-[#5a6775] dark:hover:text-slate-300 underline underline-offset-2"
                          >
                            já recebido
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* base alternativa — expande abaixo da linha */}
                {!ato.jaCobrado && atoExpandido === ato.id && (
                  <div className="pb-2.5 -mt-0.5">
                    <div className="p-2.5 bg-[#faf8f2] dark:bg-[#0f141c] rounded-lg border border-[#f0ede3] dark:border-[#1d2a3c] space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-[#9aa1a8] dark:text-slate-400 whitespace-nowrap">Base alternativa:</Label>
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
                          className="h-6 px-2 text-[10px] text-slate-500 dark:text-slate-400"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Usar valor da causa
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
            <div className="p-3 bg-slate-50 dark:bg-surface-0 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Ato:</span>
                <span className="text-xs font-medium text-[#34495e] dark:text-slate-200">
                  {modalConfirmacao?.nome}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Base:</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {modalConfirmacao?.usandoBaseAlternativa && modalConfirmacao?.baseAlternativa
                    ? formatCurrency(parseFloat(modalConfirmacao.baseAlternativa))
                    : formatCurrency(modalConfirmacao?.base_calculo_padrao || valorCausa || 0)
                  }
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-sm font-medium text-[#34495e] dark:text-slate-200">Valor:</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
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

      {/* Modal "já recebido" — desativa o faturamento do item */}
      <Dialog open={!!modalRecebido} onOpenChange={() => setModalRecebido(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Check className="w-4 h-4 text-[#3f7376]" />
              Marcar como recebido
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-slate-50 dark:bg-surface-0 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Ato:</span>
                <span className="text-xs font-medium text-[#34495e] dark:text-slate-200">
                  {modalRecebido?.nome}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-sm font-medium text-[#34495e] dark:text-slate-200">Valor:</span>
                <span className="text-sm font-bold font-mono text-[#3f7376] dark:text-teal-300">
                  {formatCurrency(modalRecebido?.valorFinal || 0)}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 text-center leading-relaxed">
              O ato será registrado como recebido fora do sistema e <strong>não será enviado ao faturamento</strong>.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalRecebido(null)}
              disabled={recebendo}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarRecebido}
              disabled={recebendo}
              className="bg-[#3f7376] hover:bg-[#356164] text-white"
            >
              {recebendo ? (
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
