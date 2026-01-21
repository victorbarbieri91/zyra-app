'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
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
import { CreditCard, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCartoesCredito,
  CartaoFormData,
  CartaoCredito,
  BANDEIRAS_CARTAO,
  CORES_CARTAO,
} from '@/hooks/useCartoesCredito'

interface CartaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escritorioId: string
  cartaoParaEditar?: CartaoCredito | null
  onSuccess?: () => void
}

const initialFormData: CartaoFormData = {
  nome: '',
  banco: '',
  bandeira: 'visa',
  ultimos_digitos: '',
  dia_vencimento: 10,
  dias_antes_fechamento: 7,
  limite_total: null,
  cor: CORES_CARTAO[0],
  observacoes: null,
}

export default function CartaoModal({
  open,
  onOpenChange,
  escritorioId,
  cartaoParaEditar,
  onSuccess,
}: CartaoModalProps) {
  const [formData, setFormData] = useState<CartaoFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)

  const { createCartao, updateCartao } = useCartoesCredito(escritorioId)

  const isEditing = !!cartaoParaEditar

  // Carregar dados do cartão para edição
  useEffect(() => {
    if (open && cartaoParaEditar) {
      setFormData({
        nome: cartaoParaEditar.nome,
        banco: cartaoParaEditar.banco,
        bandeira: cartaoParaEditar.bandeira,
        ultimos_digitos: cartaoParaEditar.ultimos_digitos,
        dia_vencimento: cartaoParaEditar.dia_vencimento,
        dias_antes_fechamento: cartaoParaEditar.dias_antes_fechamento,
        limite_total: cartaoParaEditar.limite_total,
        cor: cartaoParaEditar.cor,
        observacoes: cartaoParaEditar.observacoes,
      })
    } else if (open) {
      setFormData(initialFormData)
    }
  }, [open, cartaoParaEditar])

  const updateField = (field: keyof CartaoFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // Validações
    if (!formData.nome.trim()) {
      toast.error('Informe o nome do cartão')
      return
    }
    if (!formData.banco.trim()) {
      toast.error('Informe o banco do cartão')
      return
    }
    if (!formData.ultimos_digitos || formData.ultimos_digitos.length !== 4) {
      toast.error('Informe os 4 últimos dígitos do cartão')
      return
    }
    if (formData.dia_vencimento < 1 || formData.dia_vencimento > 31) {
      toast.error('Dia de vencimento deve ser entre 1 e 31')
      return
    }
    if (formData.dias_antes_fechamento < 1 || formData.dias_antes_fechamento > 28) {
      toast.error('Dias antes do fechamento deve ser entre 1 e 28')
      return
    }

    try {
      setSubmitting(true)

      let success = false

      if (isEditing && cartaoParaEditar) {
        success = await updateCartao(cartaoParaEditar.id, formData)
        if (success) {
          toast.success('Cartão atualizado com sucesso!')
        }
      } else {
        const cartaoId = await createCartao(formData)
        success = !!cartaoId
        if (success) {
          toast.success('Cartão cadastrado com sucesso!')
        }
      }

      if (success) {
        setFormData(initialFormData)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error('Erro ao salvar cartão. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao salvar cartão:', error)
      toast.error('Erro ao salvar cartão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <CreditCard className="w-5 h-5" />
            {isEditing ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome e Banco */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome do Cartão *</Label>
              <Input
                id="nome"
                placeholder="Ex: Itaú PJ"
                value={formData.nome}
                onChange={(e) => updateField('nome', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="banco">Banco *</Label>
              <Input
                id="banco"
                placeholder="Ex: Itaú"
                value={formData.banco}
                onChange={(e) => updateField('banco', e.target.value)}
              />
            </div>
          </div>

          {/* Bandeira e Últimos dígitos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bandeira">Bandeira *</Label>
              <Select
                value={formData.bandeira}
                onValueChange={(v) => updateField('bandeira', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {BANDEIRAS_CARTAO.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: b.cor }}
                        />
                        {b.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ultimos_digitos">Últimos 4 Dígitos *</Label>
              <Input
                id="ultimos_digitos"
                placeholder="1234"
                maxLength={4}
                value={formData.ultimos_digitos}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  updateField('ultimos_digitos', value)
                }}
              />
            </div>
          </div>

          {/* Vencimento e Fechamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dia_vencimento">Dia de Vencimento *</Label>
              <Input
                id="dia_vencimento"
                type="number"
                min={1}
                max={31}
                value={formData.dia_vencimento}
                onChange={(e) => updateField('dia_vencimento', parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Dia do mês em que a fatura vence
              </p>
            </div>
            <div>
              <Label htmlFor="dias_antes_fechamento">Dias para Fechamento *</Label>
              <Input
                id="dias_antes_fechamento"
                type="number"
                min={1}
                max={28}
                value={formData.dias_antes_fechamento}
                onChange={(e) => updateField('dias_antes_fechamento', parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Quantos dias antes do vencimento a fatura fecha
              </p>
            </div>
          </div>

          {/* Info de fechamento */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700">
              <p className="font-medium">Cálculo inteligente de fechamento</p>
              <p>
                A fatura fechará {formData.dias_antes_fechamento} dias antes do vencimento.
                Se cair em fim de semana ou feriado, será antecipada para o dia útil anterior.
              </p>
            </div>
          </div>

          {/* Limite (opcional) */}
          <div>
            <Label htmlFor="limite_total">Limite Total (opcional)</Label>
            <Input
              id="limite_total"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={formData.limite_total || ''}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : null
                updateField('limite_total', value)
              }}
            />
          </div>

          {/* Cor do cartão */}
          <div>
            <Label>Cor do Cartão</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CORES_CARTAO.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    formData.cor === cor
                      ? 'border-slate-800 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: cor }}
                  onClick={() => updateField('cor', cor)}
                />
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Anotações sobre o cartão..."
              value={formData.observacoes || ''}
              onChange={(e) => updateField('observacoes', e.target.value || null)}
              rows={2}
            />
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
                <CreditCard className="w-4 h-4 mr-2" />
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Cartão'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
