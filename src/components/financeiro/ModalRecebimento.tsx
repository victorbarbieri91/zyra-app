'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Info, Plus, Users, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { ContratoComissaoPadrao } from '@/hooks/useContratosHonorarios'

export interface ModalRecebimentoItem {
  id: string
  origem_id: string
  origem: string // 'fatura' | 'receita' | 'nota_debito' | etc
  descricao: string
  valor: number
  valor_pago: number
  /** Valor bruto da fatura (antes de retenções). Se não for fatura com retenção, = valor. */
  valor_bruto?: number
  /** Valor líquido (após retenções). Se não for fatura com retenção, = valor. */
  valor_liquido?: number
  /** Total de retenções tributárias (IRRF+PIS+COFINS+CSLL+ISS+INSS). 0 se não houver. */
  total_retencoes?: number
  data_vencimento: string | null
  conta_bancaria_id: string | null
  cliente_id: string | null
  processo_id: string | null
  escritorio_id: string
  entidade?: string | null
  contrato_id?: string | null
}

interface ContaBancaria {
  id: string
  banco: string
  agencia?: string
  numero_conta: string
}

interface Advogado {
  id: string
  user_id?: string
  nome: string
  percentual_comissao?: number | null
}

interface ParticipanteComissao {
  localId: string // UUID local (React key)
  user_id: string
  nome: string
  percentual: number
  ativo: boolean
  data_vencimento: string
  origem: 'contrato' | 'manual'
}

interface ModalRecebimentoProps {
  open: boolean
  onClose: () => void
  item: ModalRecebimentoItem | null
  contasBancarias: ContaBancaria[]
  advogados?: Advogado[]
  comissoesPadrao?: ContratoComissaoPadrao[]
  onPagamentoRealizado: () => void
}

export function ModalRecebimento({
  open,
  onClose,
  item,
  contasBancarias,
  advogados = [],
  comissoesPadrao,
  onPagamentoRealizado,
}: ModalRecebimentoProps) {
  const supabase = createClient()

  // Form state
  const [valor, setValor] = useState(0)
  const [dataEfetivacao, setDataEfetivacao] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [contaBancariaId, setContaBancariaId] = useState('')
  const [dataVencimentoSaldo, setDataVencimentoSaldo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)

  // Participação de advogados (multi)
  const [temParticipacao, setTemParticipacao] = useState(false)
  const [participantes, setParticipantes] = useState<ParticipanteComissao[]>([])

  // Reset form when item changes
  useEffect(() => {
    if (item && open) {
      // Quando há retenção, usar valor_liquido como referência (o cliente paga o líquido)
      const totalEsperado = item.valor_liquido ?? item.valor
      const saldoAberto = totalEsperado - (item.valor_pago || 0)
      setValor(saldoAberto)
      setDataEfetivacao(new Date().toISOString().split('T')[0])
      setFormaPagamento('pix')
      setContaBancariaId(item.conta_bancaria_id || contasBancarias[0]?.id || '')
      setDataVencimentoSaldo('')
      setObservacoes('')

      // Pré-preenchimento a partir das comissões padrão do contrato
      if (comissoesPadrao && comissoesPadrao.length > 0) {
        const iniciais: ParticipanteComissao[] = comissoesPadrao.map((c) => ({
          localId: crypto.randomUUID(),
          user_id: c.user_id,
          nome: c.nome || '',
          percentual: Number(c.percentual) || 0,
          ativo: true,
          data_vencimento: '', // será preenchido via RPC
          origem: 'contrato',
        }))
        setParticipantes(iniciais)
        setTemParticipacao(true)
      } else {
        setParticipantes([])
        setTemParticipacao(false)
      }
    }
  }, [item, open, contasBancarias, comissoesPadrao])

  // Recalcular data_vencimento via RPC quando dataEfetivacao mudar
  // ou quando houver participantes sem data
  useEffect(() => {
    if (!item || !dataEfetivacao) return
    const precisaCalcular = participantes.some((p) => !p.data_vencimento)
    if (!precisaCalcular) return

    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('calcular_data_limite_prazo', {
        p_data_intimacao: dataEfetivacao,
        p_quantidade_dias: 3,
        p_dias_uteis: true,
        p_escritorio_id: item.escritorio_id,
      })
      if (cancelled) return
      if (error) {
        console.error('[ModalRecebimento] Erro ao calcular data de vencimento:', error)
        // Fallback: +3 dias corridos
        const fallback = new Date(dataEfetivacao + 'T12:00:00')
        fallback.setDate(fallback.getDate() + 3)
        const fallbackStr = fallback.toISOString().split('T')[0]
        setParticipantes((prev) =>
          prev.map((p) =>
            p.data_vencimento ? p : { ...p, data_vencimento: fallbackStr }
          )
        )
        return
      }
      if (data) {
        setParticipantes((prev) =>
          prev.map((p) => (p.data_vencimento ? p : { ...p, data_vencimento: data as string }))
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dataEfetivacao, item, participantes, supabase])

  // Computed values
  const valorBruto = useMemo(() => Number(item?.valor_bruto ?? item?.valor ?? 0), [item])
  const valorLiquido = useMemo(() => Number(item?.valor_liquido ?? item?.valor ?? 0), [item])
  const temRetencao = useMemo(() => Number(item?.total_retencoes ?? 0) > 0, [item])

  const saldoAberto = useMemo(() => {
    if (!item) return 0
    return valorLiquido - (item.valor_pago || 0)
  }, [item, valorLiquido])

  const valorDigitado = valor
  const isParcial = valorDigitado > 0 && valorDigitado < saldoAberto
  const isExcedente = valorDigitado > saldoAberto
  const saldoRestante = isParcial ? saldoAberto - valorDigitado : 0
  const valorCredito = isExcedente ? valorDigitado - saldoAberto : 0

  const participantesAtivos = useMemo(
    () => participantes.filter((p) => p.ativo && p.user_id && p.percentual > 0),
    [participantes]
  )

  // Comissão sempre sobre o BRUTO, proporcional ao quanto foi pago do líquido
  const baseComissao = useMemo(() => {
    if (valorLiquido <= 0) return valorDigitado
    const proporcaoRecebida = valorDigitado / valorLiquido
    return proporcaoRecebida * valorBruto
  }, [valorDigitado, valorLiquido, valorBruto])

  const totalComissao = useMemo(
    () =>
      participantesAtivos.reduce(
        (sum, p) => sum + (baseComissao * p.percentual) / 100,
        0
      ),
    [participantesAtivos, baseComissao]
  )

  const totalPercentual = useMemo(
    () => participantesAtivos.reduce((sum, p) => sum + p.percentual, 0),
    [participantesAtivos]
  )

  // Handlers de participantes
  const adicionarParticipante = () => {
    const novo: ParticipanteComissao = {
      localId: crypto.randomUUID(),
      user_id: '',
      nome: '',
      percentual: 0,
      ativo: true,
      data_vencimento: '', // useEffect preenche via RPC
      origem: 'manual',
    }
    setParticipantes((prev) => [...prev, novo])
  }

  const removerParticipante = (localId: string) => {
    setParticipantes((prev) => prev.filter((p) => p.localId !== localId))
  }

  const atualizarParticipante = (
    localId: string,
    patch: Partial<ParticipanteComissao>
  ) => {
    setParticipantes((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, ...patch } : p))
    )
  }

  const usuariosEscolhidos = useMemo(
    () => new Set(participantes.map((p) => p.user_id).filter(Boolean)),
    [participantes]
  )

  const handleConfirmar = async () => {
    if (!item) return

    if (valorDigitado <= 0) {
      toast.error('Informe o valor a receber')
      return
    }
    if (!contaBancariaId) {
      toast.error('Selecione uma conta bancária')
      return
    }
    if (!dataEfetivacao) {
      toast.error('Informe a data de efetivação')
      return
    }
    if (isParcial && !dataVencimentoSaldo) {
      toast.error('Informe a data de vencimento do saldo restante')
      return
    }

    // Validação de participantes
    if (temParticipacao) {
      if (participantesAtivos.length === 0) {
        toast.error('Adicione pelo menos um advogado ou desative a participação')
        return
      }
      for (const p of participantesAtivos) {
        if (!p.user_id) {
          toast.error('Selecione o advogado em todas as linhas ativas')
          return
        }
        if (p.percentual <= 0 || p.percentual > 100) {
          toast.error('Percentual inválido em uma das linhas')
          return
        }
        if (!p.data_vencimento) {
          toast.error('Data de vencimento da comissão é obrigatória')
          return
        }
      }
      const userIdsUnicos = new Set(participantesAtivos.map((p) => p.user_id))
      if (userIdsUnicos.size !== participantesAtivos.length) {
        toast.error('Não é possível selecionar o mesmo advogado duas vezes')
        return
      }
    }

    try {
      setLoading(true)

      if (item.origem === 'fatura') {
        // Usar RPC pagar_fatura para faturas
        const { data: { user } } = await supabase.auth.getUser()
        const { error: rpcError } = await supabase.rpc('pagar_fatura', {
          p_fatura_id: item.origem_id,
          p_valor_pago: valorDigitado,
          p_data_pagamento: dataEfetivacao,
          p_forma_pagamento: formaPagamento,
          p_conta_bancaria_id: contaBancariaId,
          p_user_id: user?.id || null,
          p_observacoes: observacoes || null,
          p_data_vencimento_saldo: isParcial ? dataVencimentoSaldo : null,
        })
        if (rpcError) throw rpcError
      } else if (item.origem === 'nota_debito') {
        // Nota de débito
        const { data: nota } = await supabase
          .from('financeiro_notas_debito')
          .select('receita_id')
          .eq('id', item.origem_id)
          .single()

        if (isParcial && nota?.receita_id) {
          // Pagamento parcial: atualizar ND e receita shadow diretamente
          const novoValorPago = (item.valor_pago || 0) + valorDigitado

          await supabase
            .from('financeiro_notas_debito')
            .update({
              status: 'parcialmente_paga',
              valor_pago: novoValorPago,
              data_vencimento_saldo: dataVencimentoSaldo,
              conta_bancaria_id: contaBancariaId,
            })
            .eq('id', item.origem_id)

          await supabase
            .from('financeiro_receitas')
            .update({
              status: 'parcial',
              valor_pago: novoValorPago,
              data_pagamento: dataEfetivacao,
              conta_bancaria_id: contaBancariaId,
            })
            .eq('id', nota.receita_id)
        } else {
          // Pagamento total (ou pagamento do saldo restante)
          await supabase
            .from('financeiro_notas_debito')
            .update({
              status: 'paga',
              valor_pago: item.valor,
              data_pagamento: dataEfetivacao,
              data_vencimento_saldo: null,
              conta_bancaria_id: contaBancariaId,
            })
            .eq('id', item.origem_id)

          if (nota?.receita_id) {
            await supabase
              .from('financeiro_receitas')
              .update({
                status: 'pago',
                valor_pago: item.valor,
                data_pagamento: dataEfetivacao,
                conta_bancaria_id: contaBancariaId,
              })
              .eq('id', nota.receita_id)
          }

          // Marcar despesas vinculadas como reembolsadas
          const { data: itensNota } = await supabase
            .from('financeiro_notas_debito_itens')
            .select('despesa_id')
            .eq('nota_debito_id', item.origem_id)

          if (itensNota && itensNota.length > 0) {
            await supabase
              .from('financeiro_despesas')
              .update({ reembolso_status: 'reembolsado' })
              .in('id', itensNota.map((i: any) => i.despesa_id))
          }
        }
      } else {
        // Receita normal
        if (isParcial) {
          // Pagamento parcial: usar RPC para criar receita de saldo automaticamente
          const { error: rpcError } = await supabase.rpc('receber_receita_parcial', {
            p_receita_id: item.origem_id,
            p_valor_pago: valorDigitado,
            p_nova_data_vencimento: dataVencimentoSaldo,
            p_conta_bancaria_id: contaBancariaId,
            p_forma_pagamento: formaPagamento,
            p_data_pagamento: dataEfetivacao,
          })
          if (rpcError) throw rpcError
        } else {
          // Pagamento total
          const novoValorPago = (item.valor_pago || 0) + valorDigitado
          await supabase
            .from('financeiro_receitas')
            .update({
              status: 'pago',
              valor_pago: novoValorPago,
              data_pagamento: dataEfetivacao,
              conta_bancaria_id: contaBancariaId,
            })
            .eq('id', item.origem_id)
        }
      }

      // Participação de advogados → cria N despesas pendentes (batch insert)
      // Comissão SEMPRE sobre o valor BRUTO, proporcional ao quanto foi pago do líquido.
      if (temParticipacao && participantesAtivos.length > 0) {
        const rowsComissao = participantesAtivos.map((p) => {
          const valorComissao = (baseComissao * p.percentual) / 100
          const sufixoOrigem = p.origem === 'contrato' ? ' (padrão do contrato)' : ''
          const sufixoRetencao = temRetencao
            ? ` (base bruta ${formatCurrency(baseComissao)} — recebido líquido ${formatCurrency(valorDigitado)})`
            : ''
          return {
            escritorio_id: item.escritorio_id,
            categoria: 'comissao',
            descricao: `Participação ${p.nome || 'Advogado'} - ${item.descricao}`,
            valor: valorComissao,
            data_vencimento: p.data_vencimento,
            status: 'pendente',
            advogado_id: p.user_id,
            observacoes:
              `Participação de ${p.percentual}% sobre ${formatCurrency(baseComissao)} (bruto)${sufixoOrigem}${sufixoRetencao}`,
            processo_id: item.processo_id,
            cliente_id: item.cliente_id,
          }
        })

        const { error: comissaoError } = await supabase
          .from('financeiro_despesas')
          .insert(rowsComissao)

        if (comissaoError) {
          console.error('Erro ao criar despesas de comissão:', comissaoError)
          toast.error('Recebimento registrado, mas houve erro ao criar as despesas de comissão')
        }
      }

      // Recalcular saldo da conta bancária
      await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaBancariaId })

      if (temParticipacao && participantesAtivos.length > 0) {
        toast.success(
          `Recebimento registrado! ${participantesAtivos.length} comissão${participantesAtivos.length > 1 ? 'ões' : ''} pendente${participantesAtivos.length > 1 ? 's' : ''} — total ${formatCurrency(totalComissao)}`
        )
      } else {
        toast.success('Recebimento registrado com sucesso!')
      }

      onPagamentoRealizado()
      onClose()
    } catch (error: any) {
      console.error('Erro ao registrar recebimento:', error)
      toast.error(error?.message || 'Erro ao registrar recebimento')
    } finally {
      setLoading(false)
    }
  }

  if (!item) return null

  const somaPercentualInvalida = totalPercentual > 100

  // Indica se há algum impedimento para confirmar (botão desabilitado)
  const confirmDesabilitado =
    loading ||
    valorDigitado <= 0 ||
    !contaBancariaId ||
    !dataEfetivacao ||
    (isParcial && !dataVencimentoSaldo) ||
    (temParticipacao && participantesAtivos.length === 0) ||
    somaPercentualInvalida

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base text-[#34495e] dark:text-slate-200">
            Registrar Recebimento
          </DialogTitle>
          <DialogDescription className="text-sm text-[#46627f]">
            {item.descricao}
            {item.entidade && ` — ${item.entidade}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Info box */}
          <div className="bg-[#f0f9f9] border border-[#aacfd0]/40 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              {item.entidade && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[#46627f]/70 text-[10px] uppercase tracking-wide">Cliente</span>
                  <span className="font-semibold text-[#34495e]">{item.entidade}</span>
                </div>
              )}
              {item.data_vencimento && (
                <div className="flex flex-col gap-0.5 text-center">
                  <span className="text-[#46627f]/70 text-[10px] uppercase tracking-wide">Vencimento</span>
                  <span className="font-medium text-[#34495e]">
                    {new Date(item.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-[#46627f]/70 text-[10px] uppercase tracking-wide">
                  {temRetencao ? 'Bruto' : 'Valor total'}
                </span>
                <span className="font-bold text-[#34495e] text-sm">{formatCurrency(valorBruto)}</span>
              </div>
              {temRetencao && (
                <div className="flex flex-col gap-0.5 text-right pl-3 border-l border-[#89bcbe]/30">
                  <span className="text-[#46627f]/70 text-[10px] uppercase tracking-wide">Líquido a receber</span>
                  <span className="font-bold text-[#34495e] text-sm">{formatCurrency(valorLiquido)}</span>
                  <span className="text-[10px] text-[#46627f]/70">
                    retenções −{formatCurrency(Number(item.total_retencoes ?? 0))}
                  </span>
                </div>
              )}
              {item.valor_pago > 0 && (
                <>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[#46627f]/70 text-[10px] uppercase tracking-wide">Já pago</span>
                    <span className="font-semibold text-emerald-600 text-sm">{formatCurrency(item.valor_pago)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right pl-3 border-l border-[#89bcbe]/30">
                    <span className="text-[#46627f]/70 text-[10px] uppercase tracking-wide">Saldo aberto</span>
                    <span className="font-bold text-[#34495e] text-sm">{formatCurrency(saldoAberto)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Valor + Data (2 colunas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="valor-receber">Valor a receber *</Label>
              <CurrencyInput
                id="valor-receber"
                value={valor}
                onChange={setValor}
              />
              {isParcial && (
                <p className="text-[11px] text-[#46627f] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0 text-[#89bcbe]" />
                  Parcial — saldo de {formatCurrency(saldoRestante)}
                </p>
              )}
              {isExcedente && (
                <p className="text-[11px] text-[#46627f] flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0 text-[#89bcbe]" />
                  Excedente — crédito de {formatCurrency(valorCredito)}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="data-efetivacao">Data de efetivação *</Label>
              <Input
                id="data-efetivacao"
                type="date"
                value={dataEfetivacao}
                onChange={(e) => setDataEfetivacao(e.target.value)}
              />
            </div>
          </div>

          {/* Forma de pagamento + Conta bancária (2 colunas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Conta bancária *</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.banco} {conta.agencia ? `- Ag: ${conta.agencia} / ` : '- '}CC: {conta.numero_conta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vencimento do saldo (apenas quando parcial) */}
          {isParcial && (
            <div className="bg-[#f0f9f9] border border-[#aacfd0]/40 rounded-lg p-3 space-y-2">
              <Label htmlFor="data-vencimento-saldo" className="text-xs text-[#34495e]">
                Vencimento do saldo restante *
              </Label>
              <Input
                id="data-vencimento-saldo"
                type="date"
                value={dataVencimentoSaldo}
                onChange={(e) => setDataVencimentoSaldo(e.target.value)}
              />
              <p className="text-[10px] text-[#46627f]">
                Saldo de {formatCurrency(saldoRestante)} com novo vencimento
              </p>
            </div>
          )}

          {/* Aviso de excedente */}
          {isExcedente && (
            <div className="bg-[#f0f9f9] border border-[#aacfd0]/40 rounded-lg p-3">
              <p className="text-xs text-[#46627f] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#89bcbe]" />
                Crédito complementar de {formatCurrency(valorCredito)} será registrado automaticamente.
              </p>
            </div>
          )}

          {/* Participação de advogados (multi) */}
          {(advogados.length > 0 || (comissoesPadrao && comissoesPadrao.length > 0)) && (
            <div
              className={cn(
                'rounded-lg border transition-colors',
                temParticipacao
                  ? 'border-[#89bcbe] bg-[#f0f9f9]'
                  : 'border-slate-200 bg-slate-50'
              )}
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setTemParticipacao(!temParticipacao)}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                      temParticipacao
                        ? 'bg-[#89bcbe]/20 text-[#34495e]'
                        : 'bg-slate-200 text-slate-400'
                    )}
                  >
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-xs font-medium',
                        temParticipacao ? 'text-[#34495e]' : 'text-slate-600'
                      )}
                    >
                      Participação de advogados
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {comissoesPadrao && comissoesPadrao.length > 0
                        ? 'Pré-preenchido a partir do contrato — editável'
                        : 'Gera uma despesa de comissão por advogado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {temParticipacao && participantesAtivos.length > 0 && (
                    <span className="text-[10px] text-[#46627f] font-medium">
                      {formatCurrency(totalComissao)}
                    </span>
                  )}
                  <Switch checked={temParticipacao} onCheckedChange={setTemParticipacao} />
                </div>
              </div>

              {temParticipacao && (
                <div className="px-3 pb-3 space-y-2 border-t border-[#89bcbe]/30 pt-3">
                  {temRetencao && (
                    <div className="flex items-start gap-2 px-2.5 py-2 rounded-md bg-[#f0f9f9] border border-[#89bcbe]/40">
                      <Info className="w-3.5 h-3.5 text-[#89bcbe] mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-[#46627f] leading-relaxed">
                        Comissão sobre <strong className="text-[#34495e]">bruto</strong>: base de{' '}
                        <strong className="text-[#34495e]">{formatCurrency(baseComissao)}</strong>{' '}
                        (proporcional ao líquido {formatCurrency(valorDigitado)} de {formatCurrency(valorLiquido)}).
                      </p>
                    </div>
                  )}
                  {participantes.length === 0 && (
                    <p className="text-[11px] text-slate-500 italic px-1">
                      Nenhum advogado adicionado. Clique em "Adicionar advogado".
                    </p>
                  )}

                  {participantes.map((p) => {
                    const valorComissao = p.ativo
                      ? (baseComissao * p.percentual) / 100
                      : 0
                    const advogadosLinha = advogados.filter(
                      (a) =>
                        (a.user_id || '') === p.user_id ||
                        !usuariosEscolhidos.has(a.user_id || '')
                    )
                    return (
                      <div
                        key={p.localId}
                        className="rounded-md border border-[#89bcbe]/30 bg-white/60 p-2 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={p.ativo}
                            onCheckedChange={(v) =>
                              atualizarParticipante(p.localId, { ativo: v })
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <Select
                              value={p.user_id || undefined}
                              onValueChange={(userId) => {
                                const adv = advogados.find(
                                  (a) => (a.user_id || '') === userId
                                )
                                atualizarParticipante(p.localId, {
                                  user_id: userId,
                                  nome: adv?.nome || p.nome || '',
                                  // auto-preenche percentual com o padrão global, se ainda zero
                                  percentual:
                                    p.percentual > 0
                                      ? p.percentual
                                      : Number(adv?.percentual_comissao) || 0,
                                })
                              }}
                              disabled={!p.ativo}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue
                                  placeholder={
                                    p.nome || 'Selecione o advogado...'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {advogadosLinha.length === 0 && (
                                  <div className="px-2 py-1.5 text-xs text-slate-400">
                                    Nenhum advogado disponível
                                  </div>
                                )}
                                {advogadosLinha.map((adv) => (
                                  <SelectItem
                                    key={adv.id}
                                    value={adv.user_id || adv.id}
                                  >
                                    {adv.nome}
                                    {adv.percentual_comissao
                                      ? ` (${adv.percentual_comissao}%)`
                                      : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="relative w-20">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              className="h-8 text-xs pr-5"
                              value={p.percentual || ''}
                              onChange={(e) =>
                                atualizarParticipante(p.localId, {
                                  percentual: parseFloat(e.target.value) || 0,
                                })
                              }
                              disabled={!p.ativo}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                              %
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                            onClick={() => removerParticipante(p.localId)}
                            aria-label="Remover participante"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 pl-10">
                          <Label className="text-[10px] text-slate-500 uppercase tracking-wide shrink-0">
                            Vence
                          </Label>
                          <Input
                            type="date"
                            className="h-7 text-[11px] flex-1"
                            value={p.data_vencimento}
                            onChange={(e) =>
                              atualizarParticipante(p.localId, {
                                data_vencimento: e.target.value,
                              })
                            }
                            disabled={!p.ativo}
                          />
                          <span className="text-[10px] text-[#46627f] font-semibold shrink-0">
                            {formatCurrency(valorComissao)}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={adicionarParticipante}
                      disabled={
                        advogados.length === 0 ||
                        advogados.length <= participantes.length
                      }
                      className="h-7 text-[11px] border-dashed"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar advogado
                    </Button>
                    {participantesAtivos.length > 0 && (
                      <div className="text-[10px] text-[#46627f]">
                        Total:{' '}
                        <span
                          className={cn(
                            'font-semibold',
                            somaPercentualInvalida ? 'text-red-600' : 'text-[#34495e]'
                          )}
                        >
                          {totalPercentual.toFixed(2).replace(/\.?0+$/, '')}%
                        </span>
                        {' → '}
                        <span className="font-semibold text-[#34495e]">
                          {formatCurrency(totalComissao)}
                        </span>
                      </div>
                    )}
                  </div>

                  {somaPercentualInvalida && (
                    <p className="text-[11px] text-red-600 font-medium px-1">
                      A soma dos percentuais excede 100%.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Observacoes */}
          <div className="grid gap-2">
            <Label htmlFor="observacoes-recebimento" className="text-xs text-[#46627f]">Observações</Label>
            <Textarea
              id="observacoes-recebimento"
              rows={2}
              placeholder="Ex: Comprovante recebido por email, número do comprovante..."
              className="resize-none text-sm"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={confirmDesabilitado}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Processando...' : 'Confirmar Recebimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
