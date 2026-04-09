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
import type { PessoaResumo } from '@/types/crm'

interface PessoaDeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoa: PessoaResumo | null
  onDeleted: () => void
}

export function PessoaDeleteConfirmDialog({ open, onOpenChange, pessoa, onDeleted }: PessoaDeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const isAlreadyArchived = pessoa?.status === 'arquivado'

  const handleDelete = async () => {
    if (!pessoa) return
    setDeleting(true)

    try {
      const supabase = createClient()

      // Tentar excluir diretamente
      const { error } = await supabase
        .from('crm_pessoas')
        .delete()
        .eq('id', pessoa.id)

      if (error) {
        // FK violation (código PostgreSQL 23503) — pessoa tem vínculos
        if (error.code === '23503') {
          if (isAlreadyArchived) {
            // Já está arquivada e não pode excluir — avisar
            toast.error('Não é possível excluir. A pessoa possui vínculos no sistema.')
          } else {
            // Arquivar automaticamente como fallback
            const { error: archiveError } = await supabase
              .from('crm_pessoas')
              .update({ status: 'arquivado' })
              .eq('id', pessoa.id)

            if (archiveError) throw archiveError

            toast.success('Pessoa possui vínculos e foi arquivada para preservar os dados')
          }
        } else {
          throw error
        }
      } else {
        toast.success('Pessoa excluída com sucesso')
      }

      onOpenChange(false)
      onDeleted()
    } catch (error: any) {
      console.error('Erro ao excluir pessoa:', error)
      toast.error(error.message || 'Erro ao excluir pessoa')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Pessoa</AlertDialogTitle>
          <AlertDialogDescription>
            {isAlreadyArchived ? (
              <>
                Esta pessoa já está arquivada. Deseja tentar excluir permanentemente{' '}
                <strong>{pessoa?.nome_completo}</strong>? Se houver vínculos, a exclusão não será possível.
              </>
            ) : (
              <>
                Tem certeza que deseja excluir <strong>{pessoa?.nome_completo}</strong>?
                Se houver vínculos no sistema, a pessoa será arquivada automaticamente.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
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
