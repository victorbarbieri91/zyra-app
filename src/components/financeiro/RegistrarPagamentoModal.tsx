'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import ContaBancariaSelect from '@/components/financeiro/ContaBancariaSelect'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle, Loader2 } from 'lucide-react'

interface RegistrarPagamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  despesa: { id: string; descricao: string; valor: number } | null
  escritorioIds: string[]
  onConfirm: (id: string, opts: { contaBancariaId: string; formaPagamento?: string }) => Promise<void>
}

export function RegistrarPagamentoModal({ open, onOpenChange, despesa, escritorioIds, onConfirm }: RegistrarPagamentoModalProps) {
  const [conta, setConta] = useState('')
  const [forma, setForma] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleOpenChange = (v: boolean) => {
    if (v) { setConta(''); setForma('') }
    onOpenChange(v)
  }

  const handleSubmit = async () => {
    if (!despesa || !conta) return
    setSubmitting(true)
    try {
      await onConfirm(despesa.id, {
        contaBancariaId: conta,
        formaPagamento: forma || undefined,
      })
      onOpenChange(false)
    } catch {
      // erro tratado no hook
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {despesa && (
            <div className="p-3 bg-slate-50 dark:bg-surface-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Despesa</p>
              <p className="text-sm font-medium">{despesa.descricao}</p>
              <p className="text-sm font-bold text-[#34495e] dark:text-slate-200">{formatCurrency(despesa.valor)}</p>
            </div>
          )}
          <div>
            <Label className="text-xs">Conta Bancária *</Label>
            <ContaBancariaSelect
              value={conta}
              onValueChange={setConta}
              escritorioIds={escritorioIds}
            />
          </div>
          <div>
            <Label className="text-xs">Forma de Pagamento</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="ted">TED</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="deposito">Depósito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !conta}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
            Registrar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
