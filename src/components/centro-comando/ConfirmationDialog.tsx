'use client'

import { useState } from 'react'
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

export function ConfirmationDialog({
  acao,
  onConfirm,
  onCancel,
  loading,
}: ConfirmationDialogProps) {
  const [duplaConfirmacao, setDuplaConfirmacao] = useState(false)

  if (!acao) return null

  const isDelete = acao.tipo === 'delete'
  const isUpdate = acao.tipo === 'update'
  const isInsert = acao.tipo === 'insert'

  const handleConfirm = () => {
    if (isDelete && !duplaConfirmacao) {
      return
    }
    onConfirm(isDelete ? true : undefined)
    setDuplaConfirmacao(false)
  }

  const handleCancel = () => {
    setDuplaConfirmacao(false)
    onCancel()
  }

  // Formatar valor para exibição
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  // Renderizar preview dos dados
  const renderPreview = () => {
    if (isInsert && acao.dados) {
      return (
        <div className="bg-slate-50 rounded-lg p-3 space-y-1">
          {Object.entries(acao.dados).map(([key, value]) => (
            <div key={key} className="flex text-xs">
              <span className="text-slate-400 w-32">{key}:</span>
              <span className="text-slate-600">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      )
    }

    if (isUpdate && acao.antes && acao.depois) {
      const changedFields = Object.keys(acao.depois).filter(
        key => JSON.stringify(acao.antes[key]) !== JSON.stringify(acao.depois[key])
      )

      return (
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          {changedFields.map(field => (
            <div key={field} className="text-xs">
              <span className="text-slate-400">{field}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-1 bg-white text-slate-500 rounded border border-slate-200 line-through">
                  {formatValue(acao.antes[field])}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-300" />
                <span className="px-2 py-1 bg-white text-slate-700 rounded border border-[#89bcbe]/30">
                  {formatValue(acao.depois[field])}
                </span>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (isDelete && acao.registro) {
      return (
        <div className="bg-red-50/50 rounded-lg p-3 space-y-1">
          {Object.entries(acao.registro)
            .filter(([key]) => !['id', 'escritorio_id', 'created_at', 'updated_at'].includes(key))
            .slice(0, 5)
            .map(([key, value]) => (
              <div key={key} className="flex text-xs">
                <span className="text-slate-400 w-32">{key}:</span>
                <span className="text-slate-600">{formatValue(value)}</span>
              </div>
            ))}
        </div>
      )
    }

    return null
  }

  const getTitle = () => {
    if (isDelete) return 'Confirmar exclusão'
    if (isUpdate) return 'Confirmar alteração'
    return 'Confirmar criação'
  }

  return (
    <Dialog open={!!acao} onOpenChange={() => handleCancel()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-[#34495e]">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {acao.explicacao}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          {/* Tabela afetada */}
          <div className="mb-3">
            <span className="text-xs text-slate-400">Tabela: </span>
            <span className="text-xs text-slate-600">{acao.tabela}</span>
          </div>

          {/* Preview dos dados */}
          {renderPreview()}

          {/* Checkbox de dupla confirmação para DELETE */}
          {isDelete && (
            <div className="mt-4 p-3 bg-red-50/50 border border-red-100 rounded-lg">
              <p className="text-xs text-red-600 mb-3">
                Esta ação é irreversível.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dupla-confirmacao"
                  checked={duplaConfirmacao}
                  onCheckedChange={(checked) => setDuplaConfirmacao(checked as boolean)}
                />
                <Label
                  htmlFor="dupla-confirmacao"
                  className="text-xs text-red-600 cursor-pointer"
                >
                  Confirmo a exclusão permanente
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            size="sm"
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (isDelete && !duplaConfirmacao)}
            size="sm"
            className={`text-xs ${
              isDelete
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#34495e] hover:bg-[#46627f]'
            }`}
          >
            {loading ? 'Executando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
