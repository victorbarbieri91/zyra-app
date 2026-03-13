'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Banknote, AlertCircle, Info, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export interface ModalRecebimentoItem {
  id: string
  origem_id: string
  origem: string // 'fatura' | 'receita' | 'nota_debito' | etc
  descricao: string
  valor: number
  valor_pago: number
  data_vencimento: string | null
  conta_bancaria_id: string | null
  cliente_id: string | null
  processo_id: string | null
  escritorio_id: string
  entidade?: string | null
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

interface ModalRecebimentoProps {
  open: boolean
  onClose: () => void
  item: ModalRecebimentoItem | null
  contasBancarias: ContaBancaria[]
  advogados?: Advogado[]
  onPagamentoRealizado: () => void
}

export function ModalRecebimento({
  open,
  onClose,
  item,
  contasBancarias,
  advogados = [],
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

  // Participacao advogado
  const [temParticipacao, setTemParticipacao] = useState(false)
  const [advogadoSelecionado, setAdvogadoSelecionado] = useState('')
  const [percentualParticipacao, setPercentualParticipacao] = useState(0)
  const [dataVencimentoParticipacao, setDataVencimentoParticipacao] = useState('')

  // Reset form when item changes
  useEffect(() => {
    if (item && open) {
      const saldoAberto = item.valor - (item.valor_pago || 0)
      setValor(saldoAberto)
      setDataEfetivacao(new Date().toISOString().split('T')[0])
      setFormaPagamento('pix')
      setContaBancariaId(item.conta_bancaria_id || contasBancarias[0]?.id || '')
      setDataVencimentoSaldo('')
      setObservacoes('')
      setTemParticipacao(false)
      setAdvogadoSelecionado('')
      setPercentualParticipacao(0)
      // Default: +30 dias para vencimento da participação
      const d30 = new Date()
      d30.setDate(d30.getDate() + 30)
      setDataVencimentoParticipacao(d30.toISOString().split('T')[0])
    }
  }, [item, open, contasBancarias])

  // Computed values
  const saldoAberto = useMemo(() => {
    if (!item) return 0
    return item.valor - (item.valor_pago || 0)
  }, [item])

  const valorDigitado = valor
  const isParcial = valorDigitado > 0 && valorDigitado < saldoAberto
  const isExcedente = valorDigitado > saldoAberto
  const saldoRestante = isParcial ? saldoAberto - valorDigitado : 0
  const valorCredito = isExcedente ? valorDigitado - saldoAberto : 0

  const valorParticipacao = temParticipacao && percentualParticipacao > 0
    ? (valorDigitado * percentualParticipacao) / 100
    : 0

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
    if (temParticipacao && (!advogadoSelecionado || !percentualParticipacao)) {
      toast.error('Selecione o advogado e o percentual de participação')
      return
    }
    if (temParticipacao && !dataVencimentoParticipacao) {
      toast.error('Informe a data de vencimento da participação')
      return
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

        await supabase
          .from('financeiro_notas_debito')
          .update({
            status: valorDigitado >= saldoAberto ? 'paga' : 'emitida',
            data_pagamento: dataEfetivacao,
            conta_bancaria_id: contaBancariaId,
          })
          .eq('id', item.origem_id)

        if (nota?.receita_id) {
          await supabase
            .from('financeiro_receitas')
            .update({
              status: valorDigitado >= saldoAberto ? 'pago' : 'parcial',
              valor_pago: (item.valor_pago || 0) + valorDigitado,
              data_pagamento: dataEfetivacao,
              conta_bancaria_id: contaBancariaId,
            })
            .eq('id', nota.receita_id)
        }

        // Marcar despesas vinculadas como reembolsadas se pago integralmente
        if (valorDigitado >= saldoAberto) {
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
        const novoValorPago = (item.valor_pago || 0) + valorDigitado
        const isPagoTotal = novoValorPago >= item.valor

        await supabase
          .from('financeiro_receitas')
          .update({
            status: isPagoTotal ? 'pago' : 'parcial',
            valor_pago: novoValorPago,
            data_pagamento: dataEfetivacao,
            conta_bancaria_id: contaBancariaId,
          })
          .eq('id', item.origem_id)
      }

      // Participação de advogado → cria despesa pendente
      if (temParticipacao && advogadoSelecionado && percentualParticipacao > 0) {
        const advogado = advogados.find(a => a.id === advogadoSelecionado)

        const { error: comissaoError } = await supabase.from('financeiro_despesas').insert({
          escritorio_id: item.escritorio_id,
          categoria: 'comissao',
          descricao: `Participação ${advogado?.nome || 'Advogado'} - ${item.descricao}`,
          valor: valorParticipacao,
          data_vencimento: dataVencimentoParticipacao,
          status: 'pendente',
          advogado_id: advogado?.user_id || null,
          observacoes: `Participação de ${percentualParticipacao}% sobre recebimento de ${formatCurrency(valorDigitado)}`,
          processo_id: item.processo_id,
          cliente_id: item.cliente_id,
        })
        if (comissaoError) {
          console.error('Erro ao criar despesa de comissão:', comissaoError)
          toast.error('Recebimento registrado, mas houve erro ao criar a despesa de comissão')
        }
      }

      // Recalcular saldo da conta bancária
      await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaBancariaId })

      if (temParticipacao && advogadoSelecionado) {
        const advogado = advogados.find(a => a.id === advogadoSelecionado)
        const dtVenc = new Date(dataVencimentoParticipacao + 'T12:00:00').toLocaleDateString('pt-BR')
        toast.success(`Recebimento registrado! Participação de ${formatCurrency(valorParticipacao)} pendente para ${advogado?.nome} (venc. ${dtVenc})`)
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Registrar Recebimento
          </DialogTitle>
          <DialogDescription>
            {item.descricao}
            {item.entidade && ` — ${item.entidade}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Info box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
            {item.entidade && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente</span>
                <span className="font-medium text-slate-700 truncate max-w-[200px]">{item.entidade}</span>
              </div>
            )}
            {item.data_vencimento && (
              <div className="flex justify-between">
                <span className="text-slate-500">Vencimento</span>
                <span className="font-medium text-slate-700">
                  {new Date(item.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Valor total</span>
              <span className="font-semibold text-slate-700">{formatCurrency(item.valor)}</span>
            </div>
            {item.valor_pago > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Já pago</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(item.valor_pago)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Saldo em aberto</span>
                  <span className="font-bold text-amber-700">{formatCurrency(saldoAberto)}</span>
                </div>
              </>
            )}
          </div>

          {/* Valor a receber */}
          <div className="grid gap-2">
            <Label htmlFor="valor-receber">Valor a receber *</Label>
            <CurrencyInput
              id="valor-receber"
              value={valor}
              onChange={setValor}
            />
            {isParcial && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Pagamento parcial — saldo de {formatCurrency(saldoRestante)} restante
              </p>
            )}
            {isExcedente && (
              <p className="text-[11px] text-blue-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Pagamento excedente — crédito de {formatCurrency(valorCredito)} será registrado
              </p>
            )}
          </div>

          {/* Data de efetivação */}
          <div className="grid gap-2">
            <Label htmlFor="data-efetivacao">Data de efetivação *</Label>
            <Input
              id="data-efetivacao"
              type="date"
              value={dataEfetivacao}
              onChange={(e) => setDataEfetivacao(e.target.value)}
            />
          </div>

          {/* Forma de pagamento */}
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

          {/* Conta bancária */}
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
            <p className="text-[10px] text-slate-400">
              O valor será lançado como entrada nesta conta.
            </p>
          </div>

          {/* Vencimento do saldo (apenas quando parcial) */}
          {isParcial && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <Label htmlFor="data-vencimento-saldo" className="text-xs text-amber-800">
                Vencimento do saldo restante *
              </Label>
              <Input
                id="data-vencimento-saldo"
                type="date"
                value={dataVencimentoSaldo}
                onChange={(e) => setDataVencimentoSaldo(e.target.value)}
              />
              <p className="text-[10px] text-amber-600">
                Saldo de {formatCurrency(saldoRestante)} com novo vencimento
              </p>
            </div>
          )}

          {/* Aviso de excedente */}
          {isExcedente && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Crédito complementar de {formatCurrency(valorCredito)} será registrado automaticamente.
              </p>
            </div>
          )}

          {/* Participação de advogado */}
          {advogados.length > 0 && (
            <div className={`rounded-lg border transition-colors ${temParticipacao ? 'border-[#89bcbe] bg-[#f0f9f9]' : 'border-slate-200 bg-slate-50'}`}>
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setTemParticipacao(!temParticipacao)}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${temParticipacao ? 'bg-[#89bcbe]/20 text-[#34495e]' : 'bg-slate-200 text-slate-400'}`}>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${temParticipacao ? 'text-[#34495e]' : 'text-slate-600'}`}>
                      Participação de advogado
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Gera despesa de comissão pendente
                    </p>
                  </div>
                </div>
                <Switch
                  checked={temParticipacao}
                  onCheckedChange={setTemParticipacao}
                />
              </div>

              {temParticipacao && (
                <div className="px-3 pb-3 space-y-3 border-t border-[#89bcbe]/30 pt-3">
                  <div className="grid gap-2">
                    <Label className="text-xs">Advogado</Label>
                    <Select
                      value={advogadoSelecionado}
                      onValueChange={(id) => {
                        setAdvogadoSelecionado(id)
                        const adv = advogados.find(a => a.id === id)
                        if (adv?.percentual_comissao && percentualParticipacao === 0) {
                          setPercentualParticipacao(adv.percentual_comissao)
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione o advogado..." />
                      </SelectTrigger>
                      <SelectContent>
                        {advogados.map((adv) => (
                          <SelectItem key={adv.id} value={adv.id}>
                            {adv.nome}
                            {adv.percentual_comissao ? ` (${adv.percentual_comissao}%)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Percentual (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        className="h-8 text-xs"
                        value={percentualParticipacao || ''}
                        onChange={(e) => setPercentualParticipacao(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Vencimento da comissão</Label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={dataVencimentoParticipacao}
                        onChange={(e) => setDataVencimentoParticipacao(e.target.value)}
                      />
                    </div>
                  </div>
                  {valorParticipacao > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/70 rounded-md px-2.5 py-1.5 border border-[#89bcbe]/20">
                      <Info className="w-3 h-3 text-[#46627f] shrink-0" />
                      <p className="text-[10px] text-[#46627f]">
                        Despesa pendente de <span className="font-semibold">{formatCurrency(valorParticipacao)}</span> com vencimento em{' '}
                        {dataVencimentoParticipacao
                          ? new Date(dataVencimentoParticipacao + 'T12:00:00').toLocaleDateString('pt-BR')
                          : '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Observacoes */}
          <div className="grid gap-2">
            <Label htmlFor="observacoes-recebimento">Observações (opcional)</Label>
            <Input
              id="observacoes-recebimento"
              placeholder="Ex: Comprovante recebido por email"
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
            disabled={loading || valorDigitado <= 0 || !contaBancariaId || !dataEfetivacao || (isParcial && !dataVencimentoSaldo) || (temParticipacao && (!advogadoSelecionado || !percentualParticipacao || !dataVencimentoParticipacao))}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Processando...' : 'Confirmar Recebimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
