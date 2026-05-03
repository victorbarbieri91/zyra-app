'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CalendarDays, ChevronsRight, Loader2, Repeat, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import type {
  LancamentoDetalhes,
  LancamentoRef,
} from '@/lib/financeiro/lancamento-types'
import { useLancamentoMutations } from '@/lib/financeiro/useLancamentoMutations'

type Escopo = 'instancia' | 'em-diante' | 'serie'

interface LancamentoExcluirModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lancamento: LancamentoRef | null
  onSuccess: () => void
}

const PALAVRA_INSTANCIA = 'EXCLUIR'
const PALAVRA_EM_DIANTE = 'EXCLUIR EM DIANTE'
const PALAVRA_SERIE = 'EXCLUIR TUDO'

export default function LancamentoExcluirModal({
  open,
  onOpenChange,
  lancamento,
  onSuccess,
}: LancamentoExcluirModalProps) {
  const { carregarDetalhes, excluirInstancia, excluirSerie } = useLancamentoMutations()

  const [detalhes, setDetalhes] = useState<LancamentoDetalhes | null>(null)
  const [escopo, setEscopo] = useState<Escopo>('instancia')
  const [textoConfirmacao, setTextoConfirmacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [executando, setExecutando] = useState(false)

  useEffect(() => {
    if (!open || !lancamento) {
      setDetalhes(null)
      setEscopo('instancia')
      setTextoConfirmacao('')
      return
    }

    let cancelado = false
    setLoading(true)
    setEscopo('instancia')
    setTextoConfirmacao('')

    carregarDetalhes(lancamento)
      .then((det) => {
        if (cancelado) return
        if (!det) {
          toast.error('Não foi possível carregar este lançamento.')
          onOpenChange(false)
          return
        }
        setDetalhes(det)
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [open, lancamento, carregarDetalhes, onOpenChange])

  // Limpar texto quando muda escopo
  useEffect(() => {
    setTextoConfirmacao('')
  }, [escopo])

  const isDespesa = detalhes?.tipo === 'despesa'
  const tipoLabel = isDespesa ? 'Despesa' : 'Receita'
  const pendentes = detalhes?.regra?.pendentes_futuras ?? 0
  const pendentesAPartirDesta = detalhes?.regra?.pendentes_a_partir_desta ?? 0
  const proximaDataAfetavel = detalhes?.regra?.proxima_data_afetavel ?? null
  const proximoNumeroParcela = detalhes?.regra?.proximo_numero_parcela ?? null
  const temSerieRemovivel = Boolean(detalhes?.regra && pendentes > 1)
  const temEmDianteRemovivel = Boolean(
    detalhes?.regra && pendentesAPartirDesta >= 1 && proximaDataAfetavel,
  )
  const isParcelamento = detalhes?.regra?.is_parcelamento ?? false
  const isSerie = escopo === 'serie'
  const isEmDiante = escopo === 'em-diante'
  const palavraRequerida = isSerie
    ? PALAVRA_SERIE
    : isEmDiante
      ? PALAVRA_EM_DIANTE
      : PALAVRA_INSTANCIA
  const textoValido = textoConfirmacao.trim() === palavraRequerida

  const handleExcluir = async () => {
    if (!detalhes || !textoValido) return

    setExecutando(true)
    try {
      if (isSerie || isEmDiante) {
        const dataCorte = isEmDiante
          ? (proximaDataAfetavel ?? detalhes.data_vencimento)
          : undefined
        const result = await excluirSerie(detalhes, dataCorte)
        if (!result) {
          toast.error(isEmDiante ? 'Erro ao excluir desta data em diante' : 'Erro ao excluir série')
          return
        }
        const tipoMsg = isEmDiante ? 'Lançamentos a partir desta data excluídos' : 'Série excluída'
        toast.success(
          `${tipoMsg}. ${result.removidas} ${result.removidas === 1 ? 'ocorrência removida' : 'ocorrências removidas'}.`,
        )
      } else {
        const ok = await excluirInstancia(detalhes)
        if (!ok) {
          toast.error('Erro ao excluir lançamento')
          return
        }
        toast.success('Lançamento excluído')
      }
      onSuccess()
      onOpenChange(false)
    } finally {
      setExecutando(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!executando) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-2xl !p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-3 text-[#34495e] dark:text-slate-200">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-lg font-semibold">Excluir {tipoLabel}</span>
          </DialogTitle>
          {detalhes && (
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 pl-[52px]">
                <span className="text-sm font-medium text-[#34495e] dark:text-slate-300">
                  {detalhes.descricao}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isDespesa ? 'text-red-600' : 'text-emerald-600',
                  )}
                >
                  {formatCurrency(detalhes.valor)}
                </span>
                {detalhes.data_vencimento && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Venc. {formatBrazilDate(detalhes.data_vencimento)}
                  </span>
                )}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#89bcbe]" />
          </div>
        )}

        {!loading && detalhes && (
          <div className="px-6 py-5 space-y-5">
            {/* Escopo (toggle de 3 botões: apenas esta / desta em diante / toda a série) */}
            {temSerieRemovivel && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-surface-2 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEscopo('instancia')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                    escopo === 'instancia'
                      ? 'bg-[#34495e] text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                  )}
                >
                  <CalendarDays className="w-4 h-4" />
                  Apenas esta
                </button>
                {temEmDianteRemovivel && (
                  <button
                    type="button"
                    onClick={() => setEscopo('em-diante')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                      escopo === 'em-diante'
                        ? 'bg-[#34495e] text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                    )}
                  >
                    <ChevronsRight className="w-4 h-4" />
                    Desta em diante ({pendentesAPartirDesta})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEscopo('serie')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
                    escopo === 'serie'
                      ? 'bg-[#34495e] text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-300',
                  )}
                >
                  <Repeat className="w-4 h-4" />
                  Toda a série ({pendentes})
                </button>
              </div>
            )}

            {/* Lista de impacto — tom neutro do sistema */}
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-lg bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-slate-700">
              <AlertCircle className="w-4 h-4 text-[#46627f] dark:text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm text-[#46627f] dark:text-slate-300 space-y-2">
                <p className="font-medium text-[#34495e] dark:text-slate-200">
                  O que acontecerá
                </p>
                {isSerie ? (
                  <ul className="list-disc list-outside pl-4 space-y-1 text-[13px] leading-relaxed">
                    <li>
                      <strong className="text-[#34495e] dark:text-slate-200">
                        {pendentes}
                      </strong>{' '}
                      {pendentes === 1
                        ? 'ocorrência será removida permanentemente'
                        : 'ocorrências serão removidas permanentemente'}
                    </li>
                    <li>A regra será desativada</li>
                    <li>Lançamentos já pagos ou cancelados permanecem intactos</li>
                  </ul>
                ) : isEmDiante ? (
                  <ul className="list-disc list-outside pl-4 space-y-1 text-[13px] leading-relaxed">
                    <li>
                      <strong className="text-[#34495e] dark:text-slate-200">
                        {pendentesAPartirDesta}
                      </strong>{' '}
                      {pendentesAPartirDesta === 1 ? 'ocorrência' : 'ocorrências'} a partir{' '}
                      {isParcelamento && proximoNumeroParcela && detalhes.regra?.parcela_total ? (
                        <>
                          da{' '}
                          <strong className="text-[#34495e] dark:text-slate-200">
                            Parcela {proximoNumeroParcela}/{detalhes.regra.parcela_total}
                          </strong>{' '}
                          (
                          {formatBrazilDate(proximaDataAfetavel ?? detalhes.data_vencimento)}
                          )
                        </>
                      ) : (
                        <>
                          de{' '}
                          <strong className="text-[#34495e] dark:text-slate-200">
                            {formatBrazilDate(proximaDataAfetavel ?? detalhes.data_vencimento)}
                          </strong>
                        </>
                      )}{' '}
                      {pendentesAPartirDesta === 1 ? 'será removida' : 'serão removidas'}
                    </li>
                    {isParcelamento ? (
                      <li>
                        A regra do parcelamento permanece ativa; total e parcela_total
                        reajustados automaticamente
                      </li>
                    ) : (
                      <li>A recorrência continua ativa; vigência encurtada</li>
                    )}
                    <li>Anteriores e já pagas permanecem intactas</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-outside pl-4 space-y-1 text-[13px] leading-relaxed">
                    <li>Este lançamento será removido permanentemente do banco</li>
                    {detalhes.regra && pendentes > 1 && (
                      <li>As demais ocorrências da série continuam normalmente</li>
                    )}
                    {detalhes.conta_bancaria_id && (
                      <li>O saldo da conta bancária será recalculado automaticamente</li>
                    )}
                  </ul>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  Esta ação é irreversível.
                </p>
              </div>
            </div>

            {/* Input de confirmação */}
            <div>
              <Label className="text-sm">
                Para confirmar, digite{' '}
                <span className="font-mono font-semibold text-[#34495e] dark:text-slate-200">
                  {palavraRequerida}
                </span>
              </Label>
              <Input
                value={textoConfirmacao}
                onChange={(e) => setTextoConfirmacao(e.target.value)}
                placeholder={palavraRequerida}
                disabled={executando}
                autoFocus
                className="mt-1.5 font-mono"
              />
            </div>
          </div>
        )}

        {!loading && detalhes && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-2/30">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={executando}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleExcluir}
              disabled={executando || !textoValido}
            >
              {executando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isSerie ? 'Excluir série' : isEmDiante ? 'Excluir em diante' : 'Excluir'}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
