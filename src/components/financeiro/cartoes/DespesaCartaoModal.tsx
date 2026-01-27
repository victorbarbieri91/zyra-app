'use client'

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Receipt, Loader2, CreditCard, Info } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  useCartoesCredito,
  DespesaCartaoFormData,
  CartaoCredito,
  CATEGORIAS_DESPESA_CARTAO,
} from '@/hooks/useCartoesCredito'
import { formatBrazilDate } from '@/lib/timezone'

interface DespesaCartaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escritorioId: string
  cartaoId?: string // Se especificado, pré-seleciona o cartão
  onSuccess?: () => void
}

interface ProcessoOption {
  id: string
  numero_cnj: string
  pasta: string
}

const initialFormData: DespesaCartaoFormData = {
  cartao_id: '',
  descricao: '',
  categoria: 'outras',
  fornecedor: '',
  valor_total: 0,
  numero_parcelas: 1,
  data_compra: new Date().toISOString().split('T')[0],
  processo_id: null,
  documento_fiscal: null,
  observacoes: null,
}

export default function DespesaCartaoModal({
  open,
  onOpenChange,
  escritorioId,
  cartaoId,
  onSuccess,
}: DespesaCartaoModalProps) {
  const [formData, setFormData] = useState<DespesaCartaoFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [processos, setProcessos] = useState<ProcessoOption[]>([])
  const [parcelado, setParcelado] = useState(false)
  const [loadingCartoes, setLoadingCartoes] = useState(false)

  const supabase = createClient()
  const { loadCartoes, createDespesa } = useCartoesCredito(escritorioId)

  // Carregar cartões
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

  // Carregar processos
  useEffect(() => {
    const fetchProcessos = async () => {
      if (!escritorioId || !open) return

      const { data } = await supabase
        .from('processos_processos')
        .select('id, numero_cnj, pasta')
        .eq('escritorio_id', escritorioId)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(100)

      setProcessos(data || [])
    }
    fetchProcessos()
  }, [escritorioId, open, supabase])

  // Reset form ao abrir
  useEffect(() => {
    if (open) {
      setFormData({
        ...initialFormData,
        cartao_id: cartaoId || '',
      })
      setParcelado(false)
    }
  }, [open, cartaoId])

  const updateField = (field: keyof DespesaCartaoFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // Validações
    if (!formData.cartao_id) {
      toast.error('Selecione um cartão')
      return
    }
    if (!formData.descricao.trim()) {
      toast.error('Informe a descrição da despesa')
      return
    }
    if (!formData.categoria) {
      toast.error('Selecione uma categoria')
      return
    }
    if (!formData.valor_total || formData.valor_total <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!formData.data_compra) {
      toast.error('Informe a data da compra')
      return
    }
    if (parcelado && formData.numero_parcelas < 2) {
      toast.error('Número de parcelas deve ser pelo menos 2')
      return
    }

    try {
      setSubmitting(true)

      const despesaId = await createDespesa({
        ...formData,
        numero_parcelas: parcelado ? formData.numero_parcelas : 1,
      })

      if (despesaId) {
        toast.success(
          parcelado
            ? `Despesa parcelada em ${formData.numero_parcelas}x criada com sucesso!`
            : 'Despesa registrada com sucesso!'
        )
        setFormData(initialFormData)
        setParcelado(false)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error('Erro ao registrar despesa. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao criar despesa:', error)
      toast.error('Erro ao registrar despesa. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const cartaoSelecionado = cartoes.find((c) => c.id === formData.cartao_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Receipt className="w-5 h-5" />
            Nova Despesa no Cartão
          </DialogTitle>
          <DialogDescription>
            Registre uma nova despesa no cartão de crédito.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de Cartão */}
          <div>
            <Label htmlFor="cartao">Cartão *</Label>
            <Select
              value={formData.cartao_id}
              onValueChange={(v) => updateField('cartao_id', v)}
              disabled={loadingCartoes || !!cartaoId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cartão..." />
              </SelectTrigger>
              <SelectContent>
                {cartoes.map((cartao) => (
                  <SelectItem key={cartao.id} value={cartao.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cartao.cor }}
                      />
                      {cartao.nome} - •••• {cartao.ultimos_digitos}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info do cartão selecionado */}
          {cartaoSelecionado && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
              <CreditCard
                className="w-4 h-4"
                style={{ color: cartaoSelecionado.cor }}
              />
              <span className="text-sm text-slate-600">
                {cartaoSelecionado.banco} - Vence dia {cartaoSelecionado.dia_vencimento}
              </span>
            </div>
          )}

          {/* Descrição e Fornecedor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder="Ex: Material de escritório"
                value={formData.descricao}
                onChange={(e) => updateField('descricao', e.target.value)}
              />
            </div>
          </div>

          {/* Categoria e Fornecedor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => updateField('categoria', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA_CARTAO.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fornecedor">Fornecedor/Loja</Label>
              <Input
                id="fornecedor"
                placeholder="Ex: Amazon"
                value={formData.fornecedor}
                onChange={(e) => updateField('fornecedor', e.target.value)}
              />
            </div>
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor_total">Valor Total (R$) *</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valor_total || ''}
                onChange={(e) => updateField('valor_total', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="data_compra">Data da Compra *</Label>
              <Input
                id="data_compra"
                type="date"
                value={formData.data_compra}
                onChange={(e) => updateField('data_compra', e.target.value)}
              />
            </div>
          </div>

          {/* Parcelamento */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="parcelado"
                checked={parcelado}
                onCheckedChange={(checked) => setParcelado(!!checked)}
              />
              <div className="flex-1">
                <Label htmlFor="parcelado" className="cursor-pointer">
                  <span className="font-medium">Compra parcelada</span>
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribui o valor em várias faturas mensais
                </p>
              </div>
            </div>

            {parcelado && (
              <div className="pt-3 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero_parcelas">Número de Parcelas</Label>
                    <Input
                      id="numero_parcelas"
                      type="number"
                      min={2}
                      max={48}
                      value={formData.numero_parcelas}
                      onChange={(e) => updateField('numero_parcelas', parseInt(e.target.value) || 2)}
                    />
                  </div>
                  <div>
                    <Label>Valor da Parcela</Label>
                    <div className="h-10 flex items-center px-3 rounded-lg bg-white border border-slate-200 text-sm font-medium text-[#34495e]">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(formData.valor_total / (formData.numero_parcelas || 1))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Vincular a Processo (opcional) */}
          <div>
            <Label htmlFor="processo">Vincular a Processo (opcional)</Label>
            <Select
              value={formData.processo_id || ''}
              onValueChange={(v) => updateField('processo_id', v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.pasta || p.numero_cnj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Documento Fiscal e Observações */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="documento_fiscal">Nº Documento/NF</Label>
              <Input
                id="documento_fiscal"
                placeholder="Opcional"
                value={formData.documento_fiscal || ''}
                onChange={(e) => updateField('documento_fiscal', e.target.value || null)}
              />
            </div>
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                placeholder="Opcional"
                value={formData.observacoes || ''}
                onChange={(e) => updateField('observacoes', e.target.value || null)}
              />
            </div>
          </div>

          {/* Info sobre faturamento */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700">
              <p className="font-medium">Quando esta despesa será faturada?</p>
              <p>
                Depende da data de fechamento do cartão. Compras feitas antes do
                fechamento entram na fatura atual, após entram na próxima.
              </p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                Registrar Despesa
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
