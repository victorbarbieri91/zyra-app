'use client'

import { Button } from '@/components/ui/button'
import { Users, Activity, X, Loader2, FileText } from 'lucide-react'

export type BulkActionCRM = 'alterar_status' | 'alterar_categoria' | 'vincular_contrato'

interface BulkActionsToolbarCRMProps {
  selectedCount: number
  onClearSelection: () => void
  onAction: (action: BulkActionCRM) => void
  loading?: boolean
}

export function BulkActionsToolbarCRM({
  selectedCount,
  onClearSelection,
  onAction,
  loading = false,
}: BulkActionsToolbarCRMProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#34495e] text-white rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3">
        {/* Contador */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/20">
          <span className="text-xs font-medium">
            {selectedCount} {selectedCount === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-5 w-5 p-0 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Botao Alterar Status */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-white hover:bg-white/10"
          disabled={loading}
          onClick={() => onAction('alterar_status')}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Activity className="w-3.5 h-3.5 mr-1.5" />
          )}
          Alterar Status
        </Button>

        {/* Botao Alterar Categoria */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-white hover:bg-white/10"
          disabled={loading}
          onClick={() => onAction('alterar_categoria')}
        >
          <Users className="w-3.5 h-3.5 mr-1.5" />
          Alterar Categoria
        </Button>

        {/* Botao Vincular Contrato */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-white hover:bg-white/10"
          disabled={loading}
          onClick={() => onAction('vincular_contrato')}
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          Vincular Contrato
        </Button>
      </div>
    </div>
  )
}
