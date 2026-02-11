'use client'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Repeat, Trash2, X } from 'lucide-react'

interface RecorrenciaDeleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  tipo: 'tarefa' | 'evento'
  onDeleteEsta: () => void
  onDeleteTodas: () => void
  loading?: boolean
}

export default function RecorrenciaDeleteModal({
  open,
  onOpenChange,
  titulo,
  tipo,
  onDeleteEsta,
  onDeleteTodas,
  loading,
}: RecorrenciaDeleteModalProps) {
  const label = tipo === 'tarefa' ? 'tarefa' : 'evento'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-[#34495e]">
            <Repeat className="w-5 h-5 text-[#89bcbe]" />
            Excluir {label} recorrente
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600">
            <span className="font-medium text-[#34495e]">&ldquo;{titulo}&rdquo;</span> é uma ocorrência de {label} recorrente. O que deseja fazer?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={onDeleteEsta}
            disabled={loading}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#89bcbe]/60 hover:bg-slate-50 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
              <X className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-[#34495e]">Apenas esta ocorrência</div>
              <div className="text-xs text-slate-500 mt-0.5">Remove somente esta data. As demais continuam normalmente.</div>
            </div>
          </button>

          <button
            onClick={onDeleteTodas}
            disabled={loading}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/50 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-[#34495e]">Todas as ocorrências</div>
              <div className="text-xs text-slate-500 mt-0.5">Desativa a regra de recorrência. Nenhuma nova ocorrência será exibida.</div>
            </div>
          </button>
        </div>

        <AlertDialogFooter className="mt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
