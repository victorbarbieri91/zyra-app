'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface BulkDeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onDeleted: () => void
}

export function BulkDeleteConfirmDialog({ open, onOpenChange, selectedIds, onDeleted }: BulkDeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setDeleting(true)

    try {
      const supabase = createClient()

      // Tentar excluir todas de uma vez
      const { error } = await supabase
        .from('crm_pessoas')
        .delete()
        .in('id', selectedIds)

      if (error) {
        // FK violation — pelo menos uma pessoa tem vínculos
        // Como Supabase faz transação em batch, se 1 falha, todas falham
        // Fallback: arquivar todas que não estejam já arquivadas
        if (error.code === '23503') {
          const { error: archiveError } = await supabase
            .from('crm_pessoas')
            .update({ status: 'arquivado' })
            .in('id', selectedIds)
            .neq('status', 'arquivado')

          if (archiveError) throw archiveError

          toast.success('Pessoas possuem vínculos e foram arquivadas para preservar os dados')
        } else {
          throw error
        }
      } else {
        const n = selectedIds.length
        toast.success(`${n} ${n === 1 ? 'pessoa excluída' : 'pessoas excluídas'} com sucesso`)
      }

      onOpenChange(false)
      onDeleted()
    } catch (error: any) {
      console.error('Erro ao excluir pessoas:', error)
      toast.error(error.message || 'Erro ao excluir pessoas')
    } finally {
      setDeleting(false)
    }
  }

  const n = selectedIds.length

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir {n} {n === 1 ? 'pessoa' : 'pessoas'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Pessoas com vínculos no sistema serão arquivadas automaticamente para preservar os dados.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
