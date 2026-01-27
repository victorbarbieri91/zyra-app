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
import { CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCartoesCredito,
  CartaoFormData,
  CartaoCredito,
  BANDEIRAS_CARTAO,
  CORES_CARTAO,
} from '@/hooks/useCartoesCredito'

interface EscritorioOption {
  id: string
  nome: string
}

interface CartaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escritorioId: string
  escritorios?: EscritorioOption[]
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

// Funções para máscara de moeda brasileira
const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  const numValue = parseInt(digits || '0', 10) / 100
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

const parseCurrencyToNumber = (value: string): number => {
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  return parseFloat(cleaned) || 0
}

export default function CartaoModal({
  open,
  onOpenChange,
  escritorioId,
  escritorios,
  cartaoParaEditar,
  onSuccess,
}: CartaoModalProps) {
  const [formData, setFormData] = useState<CartaoFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [escritorioSelecionado, setEscritorioSelecionado] = useState(escritorioId)
  const [limiteFormatado, setLimiteFormatado] = useState('R$ 0,00')

  const { createCartao, updateCartao } = useCartoesCredito(escritorioSelecionado)

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
      setEscritorioSelecionado(cartaoParaEditar.escritorio_id)
      // Formatar limite se existir
      if (cartaoParaEditar.limite_total) {
        setLimiteFormatado(cartaoParaEditar.limite_total.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }))
      } else {
        setLimiteFormatado('R$ 0,00')
      }
    } else if (open) {
      setFormData(initialFormData)
      setEscritorioSelecionado(escritorioId)
      setLimiteFormatado('R$ 0,00')
    }
  }, [open, cartaoParaEditar, escritorioId])

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
        const cartaoId = await createCartao(formData, escritorioSelecionado)
        success = !!cartaoId
        if (success) {
          toast.success('Cartão cadastrado com sucesso!')
        }
      }

      if (success) {
        setFormData(initialFormData)
        setLimiteFormatado('R$ 0,00')
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
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do cartão de crédito.'
              : 'Preencha as informações para cadastrar um novo cartão.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seletor de Escritório (apenas na criação e se tiver mais de 1) */}
          {!isEditing && escritorios && escritorios.length > 1 && (
            <div>
              <Label htmlFor="escritorio">Escritório *</Label>
              <Select
                value={escritorioSelecionado}
                onValueChange={setEscritorioSelecionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o escritório..." />
                </SelectTrigger>
                <SelectContent>
                  {escritorios.map((esc) => (
                    <SelectItem key={esc.id} value={esc.id}>
                      {esc.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {/* Limite (opcional) */}
          <div>
            <Label htmlFor="limite_total">Limite Total (opcional)</Label>
            <Input
              id="limite_total"
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={limiteFormatado}
              onChange={(e) => {
                const formatted = formatCurrencyInput(e.target.value)
                setLimiteFormatado(formatted)
                const numericValue = parseCurrencyToNumber(formatted)
                updateField('limite_total', numericValue > 0 ? numericValue : null)
              }}
              className="font-mono"
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
