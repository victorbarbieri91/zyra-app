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
import { Badge } from '@/components/ui/badge'
import { Edit2, Loader2, Repeat, Calendar, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  useCartoesCredito,
  LancamentoCartao,
  CATEGORIAS_DESPESA_CARTAO,
} from '@/hooks/useCartoesCredito'
import { cn } from '@/lib/utils'

interface EditarLancamentoCartaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escritorioId: string
  lancamento: LancamentoCartao | null
  onSuccess?: () => void
}

interface ProcessoOption {
  id: string
  numero_cnj: string
  pasta: string
}

export default function EditarLancamentoCartaoModal({
  open,
  onOpenChange,
  escritorioId,
  lancamento,
  onSuccess,
}: EditarLancamentoCartaoModalProps) {
  const [formData, setFormData] = useState({
    descricao: '',
    categoria: 'outros',
    fornecedor: '',
    valor: 0,
    data_compra: '',
    processo_id: null as string | null,
    documento_fiscal: '',
    observacoes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [processos, setProcessos] = useState<ProcessoOption[]>([])

  const supabase = createClient()
  const { updateLancamento } = useCartoesCredito(escritorioId)

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

  // Preencher formulário ao abrir
  useEffect(() => {
    if (open && lancamento) {
      setFormData({
        descricao: lancamento.descricao || '',
        categoria: lancamento.categoria || 'outros',
        fornecedor: lancamento.fornecedor || '',
        valor: lancamento.valor || 0,
        data_compra: lancamento.data_compra?.split('T')[0] || '',
        processo_id: lancamento.processo_id || null,
        documento_fiscal: lancamento.documento_fiscal || '',
        observacoes: lancamento.observacoes || '',
      })
    }
  }, [open, lancamento])

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!lancamento) return

    // Validacoes
    if (!formData.descricao.trim()) {
      toast.error('Informe a descricao')
      return
    }
    if (!formData.categoria) {
      toast.error('Selecione uma categoria')
      return
    }
    if (!formData.valor || formData.valor <= 0) {
      toast.error('Informe um valor valido')
      return
    }
    if (!formData.data_compra) {
      toast.error('Informe a data da compra')
      return
    }

    try {
      setSubmitting(true)

      const success = await updateLancamento(lancamento.id, {
        descricao: formData.descricao.trim(),
        categoria: formData.categoria,
        fornecedor: formData.fornecedor?.trim() || null,
        valor: formData.valor,
        data_compra: formData.data_compra,
        processo_id: formData.processo_id || null,
        documento_fiscal: formData.documento_fiscal?.trim() || null,
        observacoes: formData.observacoes?.trim() || null,
      })

      if (success) {
        toast.success('Lancamento atualizado com sucesso!')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error('Erro ao atualizar lancamento. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao atualizar lancamento:', error)
      toast.error('Erro ao atualizar lancamento. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const getTipoBadge = () => {
    if (!lancamento) return null

    switch (lancamento.tipo) {
      case 'unica':
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
            <Receipt className="w-3 h-3 mr-1" />
            A vista
          </Badge>
        )
      case 'parcelada':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Calendar className="w-3 h-3 mr-1" />
            Parcela {lancamento.parcela_numero}/{lancamento.parcela_total}
          </Badge>
        )
      case 'recorrente':
        return (
          <Badge className={cn(
            "border",
            lancamento.recorrente_ativo
              ? "bg-purple-100 text-purple-700 border-purple-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          )}>
            <Repeat className="w-3 h-3 mr-1" />
            {lancamento.recorrente_ativo ? 'Recorrente' : 'Cancelado'}
          </Badge>
        )
      default:
        return null
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (!lancamento) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Edit2 className="w-5 h-5" />
            Editar Lancamento
          </DialogTitle>
          <DialogDescription>
            Altere as informacoes do lancamento no cartao de credito.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do tipo de lancamento (nao editavel) */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Tipo:</span>
              {getTipoBadge()}
            </div>
            {lancamento.tipo === 'parcelada' && (
              <span className="text-xs text-slate-500">
                Valor total: {formatCurrency(lancamento.valor * lancamento.parcela_total)}
              </span>
            )}
          </div>

          {/* Descricao */}
          <div>
            <Label htmlFor="descricao">Descricao *</Label>
            <Input
              id="descricao"
              placeholder="Ex: Material de escritorio"
              value={formData.descricao}
              onChange={(e) => updateField('descricao', e.target.value)}
            />
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
              <Label htmlFor="valor">
                {lancamento.tipo === 'parcelada' ? 'Valor da Parcela (R$) *' : 'Valor (R$) *'}
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
              <Label htmlFor="data_compra">Data da Compra *</Label>
              <Input
                id="data_compra"
                type="date"
                value={formData.data_compra}
                onChange={(e) => updateField('data_compra', e.target.value)}
              />
            </div>
          </div>

          {/* Aviso para parcelado */}
          {lancamento.tipo === 'parcelada' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700">
                <strong>Atencao:</strong> Esta edicao altera apenas esta parcela ({lancamento.parcela_numero}/{lancamento.parcela_total}).
                As demais parcelas permanecem inalteradas.
              </p>
            </div>
          )}

          {/* Aviso para recorrente */}
          {lancamento.tipo === 'recorrente' && (
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-xs text-purple-700">
                <strong>Atencao:</strong> Esta edicao altera apenas este lancamento do mes atual.
                Lancamentos futuros nao serao afetados.
              </p>
            </div>
          )}

          {/* Vincular a Processo (opcional) */}
          <div>
            <Label htmlFor="processo">Vincular a Processo (opcional)</Label>
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

          {/* Documento Fiscal e Observacoes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="documento_fiscal">N Documento/NF</Label>
              <Input
                id="documento_fiscal"
                placeholder="Opcional"
                value={formData.documento_fiscal}
                onChange={(e) => updateField('documento_fiscal', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="observacoes">Observacoes</Label>
              <Input
                id="observacoes"
                placeholder="Opcional"
                value={formData.observacoes}
                onChange={(e) => updateField('observacoes', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Botoes */}
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
                <Edit2 className="w-4 h-4 mr-2" />
                Salvar Alteracoes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
