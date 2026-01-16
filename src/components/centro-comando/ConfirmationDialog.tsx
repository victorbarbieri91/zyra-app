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
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Check, X, ArrowRight } from 'lucide-react'
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
      return // Não permite confirmar delete sem checkbox
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs font-medium text-green-700 mb-2">
            Dados a serem criados:
          </div>
          <div className="space-y-1">
            {Object.entries(acao.dados).map(([key, value]) => (
              <div key={key} className="flex text-xs">
                <span className="text-slate-500 w-32">{key}:</span>
                <span className="text-slate-700">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (isUpdate && acao.antes && acao.depois) {
      // Encontrar campos alterados
      const changedFields = Object.keys(acao.depois).filter(
        key => JSON.stringify(acao.antes[key]) !== JSON.stringify(acao.depois[key])
      )

      return (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-xs font-medium text-amber-700 mb-2">
              Alterações:
            </div>
            <div className="space-y-2">
              {changedFields.map(field => (
                <div key={field} className="text-xs">
                  <span className="text-slate-500">{field}:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded line-through">
                      {formatValue(acao.antes[field])}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                      {formatValue(acao.depois[field])}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (isDelete && acao.registro) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs font-medium text-red-700 mb-2">
            Registro a ser excluído:
          </div>
          <div className="space-y-1">
            {Object.entries(acao.registro)
              .filter(([key]) => !['id', 'escritorio_id', 'created_at', 'updated_at'].includes(key))
              .slice(0, 5)
              .map(([key, value]) => (
                <div key={key} className="flex text-xs">
                  <span className="text-slate-500 w-32">{key}:</span>
                  <span className="text-slate-700">{formatValue(value)}</span>
                </div>
              ))}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Dialog open={!!acao} onOpenChange={() => handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDelete ? (
              <>
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span>Confirmar Exclusão</span>
              </>
            ) : isUpdate ? (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Confirmar Alteração</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 text-green-500" />
                <span>Confirmar Criação</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {acao.explicacao}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Badge da tabela */}
          <div className="mb-3">
            <span className="text-xs text-slate-500">Tabela: </span>
            <Badge variant="secondary">{acao.tabela}</Badge>
          </div>

          {/* Preview dos dados */}
          {renderPreview()}

          {/* Checkbox de dupla confirmação para DELETE */}
          {isDelete && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Atenção!</span>
              </div>
              <p className="text-xs text-red-600 mb-3">
                Esta ação é irreversível. O registro será permanentemente excluído.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dupla-confirmacao"
                  checked={duplaConfirmacao}
                  onCheckedChange={(checked) => setDuplaConfirmacao(checked as boolean)}
                />
                <Label
                  htmlFor="dupla-confirmacao"
                  className="text-sm text-red-700 cursor-pointer"
                >
                  Eu entendo e desejo excluir permanentemente
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (isDelete && !duplaConfirmacao)}
            className={
              isDelete
                ? 'bg-red-600 hover:bg-red-700'
                : isUpdate
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-green-600 hover:bg-green-700'
            }
          >
            <Check className="w-4 h-4 mr-2" />
            {loading ? 'Executando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
