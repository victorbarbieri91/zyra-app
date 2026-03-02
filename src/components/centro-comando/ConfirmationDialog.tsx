'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ArrowRight } from 'lucide-react'
import { AcaoPendente } from '@/types/centro-comando'

interface ConfirmationDialogProps {
  acao: AcaoPendente | null
  onConfirm: (duplaConfirmacao?: boolean) => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmationDialog({ acao, onConfirm, onCancel, loading }: ConfirmationDialogProps) {
  const [duplaConfirmacao, setDuplaConfirmacao] = useState(false)
  const requiresDouble = acao?.requires_double_confirmation || acao?.requer_dupla_confirmacao || acao?.tipo === 'delete'
  const changedFields = useMemo(() => {
    if (!acao?.antes || !acao?.depois) return []
    return Object.keys(acao.depois).filter((key) => JSON.stringify(acao.antes?.[key]) !== JSON.stringify(acao.depois?.[key]))
  }, [acao])

  if (!acao) return null

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? 'Sim' : 'Nao'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const handleConfirm = () => {
    if (requiresDouble && !duplaConfirmacao) return
    onConfirm(requiresDouble ? true : undefined)
    setDuplaConfirmacao(false)
  }

  return (
    <Dialog open={!!acao} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-[#34495e]">Confirmar acao</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">{acao.explicacao}</DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Tabela</span>
            <span className="text-slate-600">{acao.tabela}</span>
          </div>
          {acao.target_label && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Alvo</span>
              <span className="text-slate-600">{acao.target_label}</span>
            </div>
          )}
          {acao.expires_at && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Expira em</span>
              <span className="text-slate-600">{new Date(acao.expires_at).toLocaleString('pt-BR')}</span>
            </div>
          )}
          {acao.preview_human && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 whitespace-pre-wrap text-xs text-slate-600">
              {acao.preview_human}
            </div>
          )}
          {acao.tipo === 'insert' && acao.dados && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              {Object.entries(acao.dados).map(([key, value]) => (
                <div key={key} className="flex text-xs gap-2">
                  <span className="text-slate-400 w-32">{key}:</span>
                  <span className="text-slate-600 break-all">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          )}
          {acao.tipo === 'update' && acao.antes && acao.depois && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              {changedFields.map((field) => (
                <div key={field} className="text-xs">
                  <span className="text-slate-400">{field}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-1 bg-white text-slate-500 rounded border border-slate-200 line-through">{formatValue(acao.antes?.[field])}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                    <span className="px-2 py-1 bg-white text-slate-700 rounded border border-[#89bcbe]/30">{formatValue(acao.depois?.[field])}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {requiresDouble && (
            <div className="mt-2 p-3 bg-red-50/50 border border-red-100 rounded-lg">
              <p className="text-xs text-red-600 mb-3">Esta acao exige confirmacao reforcada.</p>
              <div className="flex items-center space-x-2">
                <Checkbox id="dupla-confirmacao" checked={duplaConfirmacao} onCheckedChange={(checked) => setDuplaConfirmacao(checked as boolean)} />
                <Label htmlFor="dupla-confirmacao" className="text-xs text-red-600 cursor-pointer">Confirmo que revisei os dados e desejo executar</Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading} size="sm" className="text-xs">Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading || (requiresDouble && !duplaConfirmacao)} size="sm" className={`${requiresDouble ? 'bg-red-600 hover:bg-red-700' : 'bg-[#34495e] hover:bg-[#46627f]'} text-xs`}>
            {loading ? 'Executando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
