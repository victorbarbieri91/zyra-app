'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Eye,
  EyeOff,
  Briefcase,
  User,
  Activity,
  AlertTriangle,
  Tag,
  X,
  ChevronDown,
  Loader2,
  RefreshCw,
  FileText
} from 'lucide-react'

export type BulkAction =
  | 'ativar_monitoramento'
  | 'desativar_monitoramento'
  | 'atualizar_andamentos'
  | 'alterar_area'
  | 'alterar_responsavel'
  | 'alterar_status'
  | 'alterar_prioridade'
  | 'adicionar_tags'
  | 'vincular_contrato'

interface BulkActionsToolbarProps {
  selectedCount: number
  onClearSelection: () => void
  onAction: (action: BulkAction) => void
  loading?: boolean
  hasMonitoramento?: boolean // true se pelo menos um selecionado tem monitoramento
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onAction,
  loading = false,
  hasMonitoramento = false
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#34495e] text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-4">
        {/* Contador */}
        <div className="flex items-center gap-2 pr-4 border-r border-white/20">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'processo selecionado' : 'processos selecionados'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Atualizar Andamentos */}
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
          disabled={loading}
          onClick={() => onAction('atualizar_andamentos')}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar Andamentos
        </Button>

        {/* Ações de Monitoramento */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Monitoramento
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => onAction('ativar_monitoramento')}>
              <Eye className="w-4 h-4 mr-2 text-emerald-600" />
              <span>Ativar Monitoramento</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('desativar_monitoramento')}>
              <EyeOff className="w-4 h-4 mr-2 text-slate-500" />
              <span>Desativar Monitoramento</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Alterar Campos */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              disabled={loading}
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Alterar
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => onAction('alterar_area')}>
              <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
              <span>Alterar Área</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('alterar_responsavel')}>
              <User className="w-4 h-4 mr-2 text-violet-600" />
              <span>Alterar Responsável</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('alterar_status')}>
              <Activity className="w-4 h-4 mr-2 text-emerald-600" />
              <span>Alterar Status</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('alterar_prioridade')}>
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
              <span>Alterar Prioridade</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('adicionar_tags')}>
              <Tag className="w-4 h-4 mr-2 text-teal-600" />
              <span>Adicionar Tags</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('vincular_contrato')}>
              <FileText className="w-4 h-4 mr-2 text-[#89bcbe]" />
              <span>Vincular Contrato</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
