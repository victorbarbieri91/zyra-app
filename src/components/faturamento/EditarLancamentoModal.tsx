'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Pencil, Loader2 } from 'lucide-react'
import { formatBrazilDate } from '@/lib/timezone'
import type { LancamentoProntoFaturar } from '@/hooks/useFaturamento'

interface EditarLancamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lancamento: LancamentoProntoFaturar | null
  onSalvar: (
    lancamentoId: string,
    dados: { descricao?: string; valor?: number; data_vencimento?: string },
    escopo: 'este' | 'este_e_proximos',
    regraRecorrenciaId?: string | null
  ) => Promise<boolean>
}

const formatCurrencyInput = (value: number): string => {
  if (!value && value !== 0) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const parseCurrencyInput = (raw: string): number => {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

export function EditarLancamentoModal({
  open,
  onOpenChange,
  lancamento,
  onSalvar,
}: EditarLancamentoModalProps) {
  const [descricao, setDescricao] = useState('')
  const [valorStr, setValorStr] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [escopo, setEscopo] = useState<'este' | 'este_e_proximos'>('este')
  const [saving, setSaving] = useState(false)

  const temRegra = !!lancamento?.regra_recorrencia_id

  useEffect(() => {
    if (open && lancamento) {
      setDescricao(lancamento.descricao || '')
      setValorStr(formatCurrencyInput(lancamento.valor || 0))
      setDataVencimento(lancamento.data_vencimento || '')
      setEscopo('este')
    }
  }, [open, lancamento])

  const handleSalvar = async () => {
    if (!lancamento) return
    setSaving(true)

    const valor = parseCurrencyInput(valorStr)
    const success = await onSalvar(
      lancamento.lancamento_id,
      { descricao, valor, data_vencimento: dataVencimento },
      escopo,
      lancamento.regra_recorrencia_id
    )

    setSaving(false)
    if (success) {
      onOpenChange(false)
    }
  }

  if (!lancamento) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Pencil className="h-4 w-4 text-[#89bcbe]" />
            Editar lançamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Descrição */}
          <div>
            <Label className="text-xs text-slate-500">Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="h-8 text-sm mt-1"
            />
          </div>

          {/* Valor */}
          <div>
            <Label className="text-xs text-slate-500">Valor (R$)</Label>
            <div className="relative mt-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
                className="h-8 text-sm pl-8"
              />
            </div>
          </div>

          {/* Data de Vencimento */}
          <div>
            <Label className="text-xs text-slate-500">Data de vencimento</Label>
            <Input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="h-8 text-sm mt-1"
            />
          </div>

          {/* Seletor de escopo — só aparece se tem regra de recorrência */}
          {temRegra && (
            <>
              <Separator />
              <div>
                <Label className="text-xs text-slate-500 mb-2 block">Escopo da alteração</Label>
                <RadioGroup
                  value={escopo}
                  onValueChange={(v) => setEscopo(v as 'este' | 'este_e_proximos')}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="este" id="escopo-este" className="h-3.5 w-3.5" />
                    <Label htmlFor="escopo-este" className="text-xs cursor-pointer">
                      Alterar somente este lançamento
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="este_e_proximos" id="escopo-proximos" className="h-3.5 w-3.5" />
                    <Label htmlFor="escopo-proximos" className="text-xs cursor-pointer">
                      Alterar este e os próximos meses
                    </Label>
                  </div>
                </RadioGroup>
                {escopo === 'este_e_proximos' && (
                  <p className="text-[10px] text-amber-600 mt-1.5 ml-5">
                    O valor da regra de recorrência será atualizado e aplicado aos meses futuros.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSalvar} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
