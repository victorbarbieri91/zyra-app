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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Receipt, Loader2, CreditCard, Info, Repeat, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  useCartoesCredito,
  LancamentoFormData,
  CartaoCredito,
  CATEGORIAS_DESPESA_CARTAO,
  TIPOS_LANCAMENTO,
} from '@/hooks/useCartoesCredito'
import { cn } from '@/lib/utils'

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

const initialFormData: LancamentoFormData = {
  cartao_id: '',
  descricao: '',
  categoria: 'outros',
  fornecedor: '',
  valor: 0,
  tipo: 'unica',
  parcelas: 2,
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
  const [formData, setFormData] = useState<LancamentoFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [processos, setProcessos] = useState<ProcessoOption[]>([])
  const [loadingCartoes, setLoadingCartoes] = useState(false)

  const supabase = createClient()
  const { loadCartoes, createLancamento } = useCartoesCredito(escritorioId)

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
    }
  }, [open, cartaoId])

  const updateField = (field: keyof LancamentoFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // Validações
    if (!formData.cartao_id) {
      toast.error('Selecione um cartão')
      return
    }
    if (!formData.descricao.trim()) {
      toast.error('Informe a descrição')
      return
    }
    if (!formData.categoria) {
      toast.error('Selecione uma categoria')
      return
    }
    if (!formData.valor || formData.valor <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!formData.data_compra) {
      toast.error('Informe a data da compra')
      return
    }
    if (formData.tipo === 'parcelada' && (!formData.parcelas || formData.parcelas < 2)) {
      toast.error('Número de parcelas deve ser pelo menos 2')
      return
    }

    try {
      setSubmitting(true)

      const compraId = await createLancamento(formData)

      if (compraId) {
        let mensagem = ''
        switch (formData.tipo) {
          case 'parcelada':
            mensagem = `Compra parcelada em ${formData.parcelas}x criada com sucesso!`
            break
          case 'recorrente':
            mensagem = 'Assinatura recorrente criada com sucesso!'
            break
          default:
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

  const cartaoSelecionado = cartoes.find((c) => c.id === formData.cartao_id)

  // Calcula valor da parcela
  const valorParcela = formData.tipo === 'parcelada' && formData.parcelas
    ? formData.valor / formData.parcelas
    : formData.valor

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw]">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
            <Receipt className="w-5 h-5" />
            Novo Lançamento no Cartão
          </DialogTitle>
          <DialogDescription>
            Registre uma compra, parcela ou assinatura no cartão de crédito.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cartão + Info inline */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
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
            {cartaoSelecionado && (
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-slate-50 dark:bg-surface-0 border border-slate-200 dark:border-slate-700 shrink-0">
                <CreditCard
                  className="w-4 h-4"
                  style={{ color: cartaoSelecionado.cor }}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {cartaoSelecionado.banco} - Vence dia {cartaoSelecionado.dia_vencimento}
                </span>
              </div>
            )}
          </div>

          {/* Tipo de Lançamento */}
          <div>
            <Label>Tipo de Lançamento *</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {TIPOS_LANCAMENTO.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => updateField('tipo', tipo.value)}
                  className={cn(
                    'p-2.5 rounded-lg border text-left transition-all',
                    formData.tipo === tipo.value
                      ? 'border-[#1E3A8A] bg-blue-50 dark:bg-blue-500/10 ring-1 ring-[#1E3A8A]'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-surface-1'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {tipo.value === 'recorrente' && (
                      <Repeat className="w-4 h-4 text-purple-600" />
                    )}
                    {tipo.value === 'parcelada' && (
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                    {tipo.value === 'unica' && (
                      <Receipt className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    )}
                    <span className={cn(
                      'font-medium text-sm',
                      formData.tipo === tipo.value ? 'text-[#1E3A8A]' : 'text-slate-700 dark:text-slate-300'
                    )}>
                      {tipo.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tipo.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Descrição + Categoria + Fornecedor em 3 colunas */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder={
                  formData.tipo === 'recorrente'
                    ? 'Ex: Netflix, Spotify, AWS'
                    : 'Ex: Material de escritório'
                }
                value={formData.descricao}
                onChange={(e) => updateField('descricao', e.target.value)}
              />
            </div>
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
                value={formData.fornecedor || ''}
                onChange={(e) => updateField('fornecedor', e.target.value)}
              />
            </div>
          </div>

          {/* Valor + Data + Parcelas/Processo em 3 colunas */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="valor">
                {formData.tipo === 'parcelada' ? 'Valor Total (R$) *' : 'Valor (R$) *'}
              </Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valor || ''}
                onChange={(e) => updateField('valor', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="data_compra">
                {formData.tipo === 'recorrente' ? 'Data de Início *' : 'Data da Compra *'}
              </Label>
              <Input
                id="data_compra"
                type="date"
                value={formData.data_compra}
                onChange={(e) => updateField('data_compra', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="processo">Vincular a Processo</Label>
              <Select
                value={formData.processo_id || 'none'}
                onValueChange={(v) => updateField('processo_id', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {processos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.pasta || p.numero_cnj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Opções para Parcelado */}
          {formData.tipo === 'parcelada' && (
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-500/10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-800 text-sm">Parcelamento</span>
                </div>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-32">
                    <Label htmlFor="numero_parcelas" className="text-xs">Nº Parcelas</Label>
                    <Input
                      id="numero_parcelas"
                      type="number"
                      min={2}
                      max={48}
                      value={formData.parcelas || 2}
                      onChange={(e) => updateField('parcelas', parseInt(e.target.value) || 2)}
                      className="h-9"
                    />
                  </div>
                  <div className="w-40">
                    <Label className="text-xs">Valor da Parcela</Label>
                    <div className="h-9 flex items-center px-3 rounded-lg bg-white dark:bg-surface-1 border border-blue-200 text-sm font-medium text-[#34495e] dark:text-slate-200">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(valorParcela)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info para Recorrente */}
          {formData.tipo === 'recorrente' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
              <Repeat className="w-4 h-4 text-purple-600 shrink-0" />
              <p className="text-xs text-purple-700">
                <span className="font-medium">Assinatura Recorrente</span> — aparecerá automaticamente em todas as faturas futuras até ser cancelada.
              </p>
            </div>
          )}

          {/* Documento + Observações + Info em linha */}
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
          {formData.tipo !== 'recorrente' && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-surface-0 border border-slate-200 dark:border-slate-700">
              <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium">Quando será faturado?</span> Compras antes do fechamento entram na fatura atual, após entram na próxima.
              </p>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
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
                {formData.tipo === 'recorrente' ? 'Criar Assinatura' : 'Registrar Lançamento'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
