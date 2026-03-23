'use client'

import { useState, useEffect, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Receipt, Loader2, Repeat, Calendar, Link2, ChevronRight } from 'lucide-react'
import { CurrencyInput } from '@/components/ui/currency-input'
import { toast } from 'sonner'
import {
  useCartoesCredito,
  LancamentoFormData,
  CartaoCredito,
  CATEGORIAS_DESPESA_CARTAO,
  TIPOS_LANCAMENTO,
} from '@/hooks/useCartoesCredito'
import { cn } from '@/lib/utils'
import VinculacaoSelector, { Vinculacao } from '@/components/agenda/VinculacaoSelector'

interface DespesaCartaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escritorioId: string
  cartaoId?: string
  onSuccess?: () => void
}

interface FaturaInfo {
  mes_referencia: string
  label: string
  status: 'aberta' | 'fechada'
}

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function gerarMesesDisponiveis(cartao: CartaoCredito | undefined): FaturaInfo[] {
  if (!cartao) return []
  const hoje = new Date()
  const meses: FaturaInfo[] = []
  const diaFechamento = cartao.dia_vencimento - (cartao.dias_antes_fechamento || 7)

  for (let offset = -2; offset <= 4; offset++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1)
    const mesRef = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const label = `${MESES_PT[d.getMonth()]}/${d.getFullYear()}`

    const dataFechamento = diaFechamento > 0
      ? new Date(d.getFullYear(), d.getMonth(), diaFechamento)
      : new Date(d.getFullYear(), d.getMonth(), 0 + diaFechamento)

    const isFechada = hoje > dataFechamento
    meses.push({ mes_referencia: mesRef, label, status: isFechada ? 'fechada' : 'aberta' })
  }
  return meses
}

function calcularMesReferenciaLocal(cartao: CartaoCredito | undefined, dataCompra: string): string | null {
  if (!cartao || !dataCompra) return null
  const compra = new Date(dataCompra + 'T12:00:00')
  const diaFechamento = cartao.dia_vencimento - (cartao.dias_antes_fechamento || 7)
  const diaCompra = compra.getDate()

  // mes_referencia = mês de VENCIMENTO da fatura
  if (diaCompra > diaFechamento) {
    // Compra após fechamento → fatura do MÊS SEGUINTE (vencimento)
    const mesVenc = new Date(compra.getFullYear(), compra.getMonth() + 1, 1)
    return `${mesVenc.getFullYear()}-${String(mesVenc.getMonth() + 1).padStart(2, '0')}-01`
  } else {
    // Compra antes/no fechamento → fatura do MÊS CORRENTE (vencimento)
    return `${compra.getFullYear()}-${String(compra.getMonth() + 1).padStart(2, '0')}-01`
  }
}

const initialFormData: LancamentoFormData = {
  cartao_id: '',
  descricao: '',
  categoria: 'outros',
  fornecedor: '',
  valor: 0,
  tipo: 'unica',
  parcelas: 2,
  parcela_inicial: 1,
  data_compra: new Date().toISOString().split('T')[0],
  mes_referencia: undefined,
  processo_id: null,
  consulta_id: null,
  observacoes: null,
}

export default function DespesaCartaoModal({
  open,
  onOpenChange,
  escritorioId,
  cartaoId,
  onSuccess,
}: DespesaCartaoModalProps) {
  const [formData, setFormData] = useState<LancamentoFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [loadingCartoes, setLoadingCartoes] = useState(false)
  const [vinculacao, setVinculacao] = useState<Vinculacao | null>(null)
  const [showVinculacao, setShowVinculacao] = useState(false)

  const { loadCartoes, createLancamento } = useCartoesCredito(escritorioId)

  const cartaoSelecionado = cartoes.find((c) => c.id === formData.cartao_id)
  const mesesDisponiveis = useMemo(() => gerarMesesDisponiveis(cartaoSelecionado), [cartaoSelecionado])

  useEffect(() => {
    const fetchCartoes = async () => {
      if (!escritorioId || !open) return
      setLoadingCartoes(true)
      const data = await loadCartoes(true)
      setCartoes(data)
      setLoadingCartoes(false)
    }
    fetchCartoes()
  }, [escritorioId, open, loadCartoes])

  useEffect(() => {
    if (open) {
      setFormData({ ...initialFormData, cartao_id: cartaoId || '' })
      setVinculacao(null)
      setShowVinculacao(false)
    }
  }, [open, cartaoId])

  useEffect(() => {
    if (!formData.cartao_id || !formData.data_compra) return
    const mesCalculado = calcularMesReferenciaLocal(cartaoSelecionado, formData.data_compra)
    if (mesCalculado) {
      setFormData((prev) => ({ ...prev, mes_referencia: mesCalculado }))
    }
  }, [formData.cartao_id, formData.data_compra, cartaoSelecionado])

  const updateField = (field: keyof LancamentoFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleVinculacaoChange = (v: Vinculacao | null) => {
    setVinculacao(v)
    if (!v) {
      updateField('processo_id', null)
      updateField('consulta_id', null)
    } else if (v.modulo === 'processo') {
      setFormData((prev) => ({ ...prev, processo_id: v.modulo_registro_id, consulta_id: null }))
    } else {
      setFormData((prev) => ({ ...prev, consulta_id: v.modulo_registro_id, processo_id: null }))
    }
  }

  const handleSubmit = async () => {
    if (!formData.cartao_id) { toast.error('Selecione um cartão'); return }
    if (!formData.descricao.trim()) { toast.error('Informe a descrição'); return }
    if (!formData.categoria) { toast.error('Selecione uma categoria'); return }
    if (!formData.valor || formData.valor <= 0) { toast.error('Informe um valor válido'); return }
    if (!formData.data_compra) { toast.error('Informe a data da compra'); return }
    if (formData.tipo === 'parcelada' && (!formData.parcelas || formData.parcelas < 2)) {
      toast.error('Número de parcelas deve ser pelo menos 2'); return
    }
    if (formData.tipo === 'parcelada' && formData.parcela_inicial && formData.parcelas &&
      formData.parcela_inicial > formData.parcelas) {
      toast.error('Parcela inicial não pode ser maior que o total'); return
    }

    try {
      setSubmitting(true)
      const compraId = await createLancamento(formData)

      if (compraId) {
        let mensagem = ''
        if (formData.tipo === 'parcelada') {
          const inicio = formData.parcela_inicial || 1
          const total = formData.parcelas || 2
          mensagem = inicio > 1
            ? `Parcelas ${inicio}/${total} a ${total}/${total} criadas com sucesso!`
            : `Compra parcelada em ${total}x criada com sucesso!`
        } else if (formData.tipo === 'recorrente') {
          mensagem = 'Assinatura recorrente criada com sucesso!'
        } else {
          mensagem = 'Lançamento registrado com sucesso!'
        }
        toast.success(mensagem)
        setFormData(initialFormData)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error('Erro ao registrar lançamento. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao criar lançamento:', error)
      toast.error('Erro ao registrar lançamento. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const valorParcela = formData.tipo === 'parcelada' && formData.parcelas
    ? formData.valor / formData.parcelas
    : formData.valor

  const parcelamentoInfo = useMemo(() => {
    if (formData.tipo !== 'parcelada' || !formData.parcelas) return null
    const inicio = formData.parcela_inicial || 1
    const total = formData.parcelas
    const qtd = total - inicio + 1
    return `${qtd} parcela${qtd > 1 ? 's' : ''} (${inicio}/${total} a ${total}/${total})`
  }, [formData.tipo, formData.parcelas, formData.parcela_inicial])

  const mesSelecionado = mesesDisponiveis.find((m) => m.mes_referencia === formData.mes_referencia)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
            <Receipt className="w-5 h-5" />
            Novo Lançamento no Cartão
          </DialogTitle>
          <DialogDescription>
            Registre uma compra, parcela ou assinatura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 overflow-y-auto flex-1 px-0.5 -mx-0.5">
          {/* Cartão + Fatura */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cartao" className="text-xs">Cartão *</Label>
              <Select
                value={formData.cartao_id}
                onValueChange={(v) => updateField('cartao_id', v)}
                disabled={loadingCartoes || !!cartaoId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o cartão..." />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map((cartao) => (
                    <SelectItem key={cartao.id} value={cartao.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cartao.cor }} />
                        {cartao.nome} - •••• {cartao.ultimos_digitos}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cartaoSelecionado && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {cartaoSelecionado.banco} — vence dia {cartaoSelecionado.dia_vencimento}, fecha {cartaoSelecionado.dias_antes_fechamento || 7} dias antes
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Fatura (mês de referência)</Label>
              <Select
                value={formData.mes_referencia || ''}
                onValueChange={(v) => updateField('mes_referencia', v)}
                disabled={!cartaoSelecionado}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={cartaoSelecionado ? 'Selecione...' : 'Selecione um cartão primeiro'} />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponiveis.map((mes) => (
                    <SelectItem key={mes.mes_referencia} value={mes.mes_referencia}>
                      <div className="flex items-center gap-2">
                        {mes.label}
                        {mes.status === 'fechada' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Fechada</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mesSelecionado && mesSelecionado.status === 'fechada' && (
                <p className="text-[10px] text-amber-600 mt-0.5">Fatura já fechada — lançamento retroativo</p>
              )}
            </div>
          </div>

          {/* Tipo de Lançamento */}
          <div>
            <Label className="text-xs">Tipo de Lançamento *</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TIPOS_LANCAMENTO.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => updateField('tipo', tipo.value)}
                  className={cn(
                    'p-2 rounded-lg border text-left transition-all',
                    formData.tipo === tipo.value
                      ? 'border-[#1E3A8A] bg-blue-50 dark:bg-blue-500/10 ring-1 ring-[#1E3A8A]'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-surface-1'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {tipo.value === 'recorrente' && <Repeat className="w-3.5 h-3.5 text-purple-600" />}
                    {tipo.value === 'parcelada' && <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    {tipo.value === 'unica' && <Receipt className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
                    <span className={cn(
                      'font-medium text-xs',
                      formData.tipo === tipo.value ? 'text-[#1E3A8A]' : 'text-slate-700 dark:text-slate-300'
                    )}>
                      {tipo.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Descrição + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="descricao" className="text-xs">Descrição *</Label>
              <Input
                id="descricao"
                className="h-9"
                placeholder={formData.tipo === 'recorrente' ? 'Ex: Netflix, Spotify, AWS' : 'Ex: Material de escritório'}
                value={formData.descricao}
                onChange={(e) => updateField('descricao', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="categoria" className="text-xs">Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(v) => updateField('categoria', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA_CARTAO.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="valor" className="text-xs">
                {formData.tipo === 'parcelada' ? 'Valor Total *' : 'Valor *'}
              </Label>
              <CurrencyInput
                id="valor"
                className="h-9"
                value={formData.valor}
                onChange={(v) => updateField('valor', v)}
              />
            </div>
            <div>
              <Label htmlFor="data_compra" className="text-xs">
                {formData.tipo === 'recorrente' ? 'Data de Início *' : 'Data da Compra *'}
              </Label>
              <Input
                id="data_compra"
                className="h-9"
                type="date"
                value={formData.data_compra}
                onChange={(e) => updateField('data_compra', e.target.value)}
              />
            </div>
          </div>

          {/* Vincular a Pasta — colapsável */}
          <div>
            <button
              type="button"
              onClick={() => setShowVinculacao(!showVinculacao)}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#34495e] dark:hover:text-slate-200 transition-colors"
            >
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showVinculacao && "rotate-90")} />
              <Link2 className="w-3.5 h-3.5" />
              {vinculacao ? `Vinculado: ${vinculacao.metadados?.titulo || vinculacao.metadados?.numero_pasta || 'Pasta'}` : 'Vincular a Pasta'}
            </button>
            {showVinculacao && (
              <div className="mt-2">
                <VinculacaoSelector vinculacao={vinculacao} onChange={handleVinculacaoChange} />
              </div>
            )}
          </div>

          {/* Parcelamento — compacto */}
          {formData.tipo === 'parcelada' && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="parcela_inicial" className="text-xs">Parcela Atual</Label>
                  <Input
                    id="parcela_inicial"
                    type="number"
                    min={1}
                    max={formData.parcelas || 48}
                    value={formData.parcela_inicial || 1}
                    onChange={(e) => updateField('parcela_inicial', parseInt(e.target.value) || 1)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="numero_parcelas" className="text-xs">Total de Parcelas</Label>
                  <Input
                    id="numero_parcelas"
                    type="number"
                    min={2}
                    max={48}
                    value={formData.parcelas || 2}
                    onChange={(e) => updateField('parcelas', parseInt(e.target.value) || 2)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor da Parcela</Label>
                  <div className="h-8 flex items-center px-3 rounded-md bg-slate-50 dark:bg-surface-0 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#34495e] dark:text-slate-200">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorParcela)}
                  </div>
                </div>
              </div>
              {parcelamentoInfo && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">{parcelamentoInfo}</p>
              )}
            </div>
          )}
        </div>

        {/* Botões — fixos */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-1.5" />
                {formData.tipo === 'recorrente' ? 'Criar Assinatura' : 'Registrar'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
