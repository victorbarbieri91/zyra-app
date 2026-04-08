'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ContaBancariaSelect from '@/components/financeiro/ContaBancariaSelect'
import { formatCurrency } from '@/lib/utils'
import { CalendarClock, Loader2 } from 'lucide-react'

interface AgendarPagamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  despesa: { id: string; descricao: string; valor: number; data_vencimento: string | null } | null
  escritorioIds: string[]
  onConfirm: (id: string, opts: { dataProgramada: string; contaBancariaId: string | null; observacoes?: string }) => Promise<void>
}

export function AgendarPagamentoModal({ open, onOpenChange, despesa, escritorioIds, onConfirm }: AgendarPagamentoModalProps) {
  const [data, setData] = useState('')
  const [conta, setConta] = useState('')
  const [obs, setObs] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Pré-preencher data com vencimento quando modal abre
  const handleOpenChange = (v: boolean) => {
    if (v && despesa) {
      setData(despesa.data_vencimento || '')
      setConta('')
      setObs('')
    }
    onOpenChange(v)
  }

  const handleSubmit = async () => {
    if (!despesa || !data) return
    setSubmitting(true)
    try {
      await onConfirm(despesa.id, {
        dataProgramada: data,
        contaBancariaId: conta || null,
        observacoes: obs || undefined,
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
          <DialogTitle className="text-base">Agendar Pagamento</DialogTitle>
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
            <Label className="text-xs">Data do Pagamento *</Label>
            <Input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Conta Bancária</Label>
            <ContaBancariaSelect
              value={conta}
              onValueChange={setConta}
              escritorioIds={escritorioIds}
            />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea
              placeholder="Observações do financeiro..."
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !data}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CalendarClock className="w-4 h-4 mr-1" />}
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
