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
import { CurrencyInput } from '@/components/ui/currency-input'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ContaBancaria {
  id: string
  banco: string
  numero_conta: string
}

interface TransferenciaEditarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transferenciaId: string | null
  contasBancarias: ContaBancaria[]
  escritorioId: string
  onSaved: () => void
}

export default function TransferenciaEditarModal({
  open,
  onOpenChange,
  transferenciaId,
  contasBancarias,
  escritorioId,
  onSaved,
}: TransferenciaEditarModalProps) {
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    conta_origem_id: '',
    conta_destino_id: '',
    valor: 0,
    data_transferencia: '',
    descricao: '',
  })
  const [originalContaOrigemId, setOriginalContaOrigemId] = useState('')
  const [originalContaDestinoId, setOriginalContaDestinoId] = useState('')

  useEffect(() => {
    if (open && transferenciaId) {
      loadTransferencia()
    }
  }, [open, transferenciaId])

  const loadTransferencia = async () => {
    if (!transferenciaId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('financeiro_transferencias')
        .select('*')
        .eq('id', transferenciaId)
        .eq('escritorio_id', escritorioId)
        .single()

      if (error) throw error

      if (data) {
        setForm({
          conta_origem_id: data.conta_origem_id || '',
          conta_destino_id: data.conta_destino_id || '',
          valor: Number(data.valor) || 0,
          data_transferencia: data.data_transferencia || '',
          descricao: data.descricao || '',
        })
        setOriginalContaOrigemId(data.conta_origem_id || '')
        setOriginalContaDestinoId(data.conta_destino_id || '')
      }
    } catch (error) {
      console.error('Erro ao carregar transferência:', error)
      toast.error('Erro ao carregar dados da transferência')
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    if (!transferenciaId) return

    if (!form.conta_origem_id || !form.conta_destino_id) {
      toast.error('Selecione as contas de origem e destino')
      return
    }

    if (form.conta_origem_id === form.conta_destino_id) {
      toast.error('Conta de origem e destino devem ser diferentes')
      return
    }

    if (form.valor <= 0) {
      toast.error('Valor deve ser maior que zero')
      return
    }

    if (!form.data_transferencia) {
      toast.error('Informe a data da transferência')
      return
    }

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('financeiro_transferencias')
        .update({
          conta_origem_id: form.conta_origem_id,
          conta_destino_id: form.conta_destino_id,
          valor: form.valor,
          data_transferencia: form.data_transferencia,
          descricao: form.descricao || 'Transferência entre contas',
        })
        .eq('id', transferenciaId)
        .eq('escritorio_id', escritorioId)

      if (error) throw error

      // Recalcular saldo de todas as contas afetadas (deduplicadas)
      const contasParaRecalcular = new Set([
        originalContaOrigemId,
        originalContaDestinoId,
        form.conta_origem_id,
        form.conta_destino_id,
      ])

      for (const contaId of contasParaRecalcular) {
        if (contaId) {
          await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId })
        }
      }

      toast.success('Transferência atualizada!')
      onOpenChange(false)
      onSaved()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao atualizar transferência')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            Editar Transferência
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Conta de Origem *</Label>
              <select
                value={form.conta_origem_id}
                onChange={(e) => setForm({ ...form, conta_origem_id: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm"
              >
                <option value="">Selecione</option>
                {contasBancarias
                  .filter((cb) => cb.id !== form.conta_destino_id)
                  .map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.banco} - {cb.numero_conta}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Conta de Destino *</Label>
              <select
                value={form.conta_destino_id}
                onChange={(e) => setForm({ ...form, conta_destino_id: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 text-sm"
              >
                <option value="">Selecione</option>
                {contasBancarias
                  .filter((cb) => cb.id !== form.conta_origem_id)
                  .map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.banco} - {cb.numero_conta}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor *</Label>
                <CurrencyInput
                  value={form.valor}
                  onChange={(val) => setForm({ ...form, valor: val })}
                />
              </div>
              <div>
                <Label className="text-xs">Data *</Label>
                <Input
                  type="date"
                  value={form.data_transferencia}
                  onChange={(e) => setForm({ ...form, data_transferencia: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Pagamento de fornecedor"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSalvar}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
