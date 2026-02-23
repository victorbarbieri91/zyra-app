'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Loader2,
  DollarSign,
  Check,
  CheckCircle2,
  Pencil,
  Send,
  ChevronDown,
  X,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useCobrancaFixa, ValorFixoDisponivel } from '@/hooks/useCobrancaFixa'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { cn } from '@/lib/utils'

interface ProcessoCobrancaFixaCardProps {
  processoId?: string
  consultivoId?: string
  formasDisponiveis?: string[]  // Array de formas do contrato
}

interface ValorComEstado extends ValorFixoDisponivel {
  valorEditado: string
  usandoValorEditado: boolean
  valorFinal: number
}

export default function ProcessoCobrancaFixaCard({
  processoId,
  consultivoId,
  formasDisponiveis,
}: ProcessoCobrancaFixaCardProps) {
  const { escritorioAtivo } = useEscritorioAtivo()
  const {
    loading,
    valoresDisponiveis,
    contratoTitulo,
    formaCobranca,
    formasDisponiveis: formasDoContrato,
    loadValoresFixos,
    lancarValorFixo,
  } = useCobrancaFixa(escritorioAtivo)

  const [valoresComEstado, setValoresComEstado] = useState<ValorComEstado[]>([])
  const [valorExpandido, setValorExpandido] = useState<string | null>(null)

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState<ValorComEstado | null>(null)
  const [lancando, setLancando] = useState(false)

  // Carregar dados
  const loadData = useCallback(async () => {
    if ((!processoId && !consultivoId) || !escritorioAtivo) return
    await loadValoresFixos({ processoId, consultivoId })
  }, [processoId, consultivoId, escritorioAtivo, loadValoresFixos])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Inicializar estado dos valores quando carregam
  useEffect(() => {
    if (valoresDisponiveis.length > 0) {
      setValoresComEstado(valoresDisponiveis.map(valor => ({
        ...valor,
        valorEditado: '',
        usandoValorEditado: false,
        valorFinal: valor.valor,
      })))
    }
  }, [valoresDisponiveis])

  // Atualizar valor editado
  const handleAlterarValor = (valorId: string, novoValor: string) => {
    setValoresComEstado(prev => prev.map(valor => {
      if (valor.id !== valorId) return valor

      const valorNumerico = novoValor ? parseFloat(novoValor) : valor.valor

      return {
        ...valor,
        valorEditado: novoValor,
        usandoValorEditado: !!novoValor,
        valorFinal: valorNumerico > 0 ? valorNumerico : valor.valor,
      }
    }))
  }

  // Voltar para valor original
  const resetarValor = (valorId: string) => {
    setValoresComEstado(prev => prev.map(valor => {
      if (valor.id !== valorId) return valor

      return {
        ...valor,
        valorEditado: '',
        usandoValorEditado: false,
        valorFinal: valor.valor,
      }
    }))
    setValorExpandido(null)
  }

  // Abrir modal de confirmação
  const handleAbrirConfirmacao = (valor: ValorComEstado) => {
    setModalConfirmacao(valor)
  }

  // Confirmar lançamento
  const handleConfirmarLancamento = async () => {
    if (!modalConfirmacao) return

    setLancando(true)
    try {
      await lancarValorFixo(
        { processoId, consultivoId },
        modalConfirmacao.id,
        modalConfirmacao.valorFinal,
        modalConfirmacao.descricao
      )
      toast.success('Honorário enviado ao faturamento!')
      setModalConfirmacao(null)
      loadData()
    } catch (error) {
      console.error('Erro ao lançar honorário:', error)
      toast.error('Erro ao enviar ao faturamento')
    } finally {
      setLancando(false)
    }
  }

  if (loading) {
    return null
  }

  // Exibir se: fixo está nas formasDisponiveis (prop ou carregado do contrato)
  const deveExibir = formasDisponiveis?.includes('fixo') || formasDoContrato.includes('fixo') || formaCobranca === 'fixo'
  if (!deveExibir || valoresComEstado.length === 0) {
    return null
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#89bcbe]" />
            Honorários Fixos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="space-y-3">
            {valoresComEstado.map(valor => (
              <div
                key={valor.id}
                className={cn(
                  "p-3 rounded-lg border",
                  valor.jaCobrado
                    ? "bg-slate-100/60 border-slate-200/80"
                    : "bg-slate-50 border-slate-200"
                )}
              >
                {/* Cabeçalho do Valor */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-medium truncate",
                      valor.jaCobrado ? "text-slate-500" : "text-[#34495e]"
                    )}>
                      {valor.descricao}
                    </p>

                    {/* Info do Valor */}
                    <div className="mt-2 space-y-1">
                      {!valor.jaCobrado && valor.usandoValorEditado && (
                        <p className="text-[10px] text-slate-400 line-through">
                          Valor original: {formatCurrency(valor.valor)}
                        </p>
                      )}
                      <p className={cn(
                        "text-sm font-semibold",
                        valor.jaCobrado ? "text-slate-500" : "text-emerald-600"
                      )}>
                        {formatCurrency(valor.jaCobrado ? (valor.receitaValor ?? valor.valorFinal) : valor.valorFinal)}
                      </p>
                    </div>
                  </div>

                  {valor.jaCobrado ? (
                    /* Badge de Status */
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium shrink-0",
                      valor.receitaStatus === 'pago'
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : valor.receitaStatus === 'faturado'
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                    )}>
                      <CheckCircle2 className="w-3 h-3" />
                      {valor.receitaStatus === 'pago' ? 'Pago'
                        : valor.receitaStatus === 'faturado' ? 'Faturado'
                        : 'Enviado'}
                    </div>
                  ) : (
                    /* Botão Cobrar */
                    <Button
                      size="sm"
                      onClick={() => handleAbrirConfirmacao(valor)}
                      className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Cobrar
                    </Button>
                  )}
                </div>

                {/* Opção de Editar Valor - só mostra se NÃO foi cobrado */}
                {!valor.jaCobrado && (
                  <Collapsible
                    open={valorExpandido === valor.id}
                    onOpenChange={(open) => setValorExpandido(open ? valor.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-6 px-2 text-[10px] text-slate-500 hover:text-[#34495e] w-full justify-start"
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        {valor.usandoValorEditado ? 'Valor alterado' : 'Alterar valor'}
                        <ChevronDown className={cn(
                          "w-3 h-3 ml-auto transition-transform",
                          valorExpandido === valor.id && "rotate-180"
                        )} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] text-slate-500 whitespace-nowrap">
                            Novo valor:
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valor.valorEditado}
                            onChange={e => handleAlterarValor(valor.id, e.target.value)}
                            placeholder={formatCurrency(valor.valor)}
                            className="h-7 text-xs flex-1"
                          />
                        </div>
                        {valor.usandoValorEditado && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetarValor(valor.id)}
                            className="h-6 px-2 text-[10px] text-slate-500"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Usar valor original
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
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
                <span className="text-xs text-slate-500">Descrição:</span>
                <span className="text-xs font-medium text-[#34495e]">
                  {modalConfirmacao?.descricao}
                </span>
              </div>
              {modalConfirmacao?.usandoValorEditado && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Original:</span>
                  <span className="text-xs text-slate-400 line-through">
                    {formatCurrency(modalConfirmacao?.valor || 0)}
                  </span>
                </div>
              )}
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
              disabled={lancando}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarLancamento}
              disabled={lancando}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {lancando ? (
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
