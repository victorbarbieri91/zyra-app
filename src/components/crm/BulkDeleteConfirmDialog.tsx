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

      // Buscar status atual de todas as pessoas selecionadas para detectar
      // as que já estão arquivadas
      const { data: pessoasAtuais, error: fetchError } = await supabase
        .from('crm_pessoas')
        .select('id, status')
        .in('id', selectedIds)

      if (fetchError) throw fetchError

      const statusMap = new Map<string, string>()
      pessoasAtuais?.forEach((p: { id: string; status: string }) => statusMap.set(p.id, p.status))

      let excluidas = 0
      let arquivadas = 0
      let bloqueadas = 0
      let erros = 0

      // Processar individualmente para tratar cada caso
      for (const id of selectedIds) {
        const statusAtual = statusMap.get(id)

        // Tentar excluir
        const { error: deleteError, count } = await supabase
          .from('crm_pessoas')
          .delete({ count: 'exact' })
          .eq('id', id)

        if (!deleteError && (count ?? 0) > 0) {
          excluidas++
          continue
        }

        // Erro de FK violation — pessoa tem vínculos
        if (deleteError && deleteError.code === '23503') {
          if (statusAtual === 'arquivado') {
            // Já arquivada e não pode excluir — bloqueada
            bloqueadas++
          } else {
            // Arquivar como fallback
            const { error: updateError, count: updateCount } = await supabase
              .from('crm_pessoas')
              .update({ status: 'arquivado' }, { count: 'exact' })
              .eq('id', id)

            if (!updateError && (updateCount ?? 0) > 0) {
              arquivadas++
            } else {
              console.error('Erro ao arquivar pessoa', id, updateError)
              erros++
            }
          }
        } else if (deleteError) {
          console.error('Erro ao excluir pessoa', id, deleteError)
          erros++
        } else {
          // count === 0: linha não foi afetada (RLS ou já não existe)
          erros++
        }
      }

      // Montar mensagem de feedback detalhada
      const partes: string[] = []
      if (excluidas > 0) partes.push(`${excluidas} ${excluidas === 1 ? 'excluída' : 'excluídas'}`)
      if (arquivadas > 0) partes.push(`${arquivadas} ${arquivadas === 1 ? 'arquivada' : 'arquivadas'}`)
      if (bloqueadas > 0) partes.push(`${bloqueadas} ${bloqueadas === 1 ? 'bloqueada' : 'bloqueadas'}`)
      if (erros > 0) partes.push(`${erros} com erro`)

      const resumo = partes.join(', ')

      if (erros === selectedIds.length) {
        toast.error('Não foi possível processar nenhuma pessoa. Verifique as permissões.')
      } else if (bloqueadas > 0 && excluidas === 0 && arquivadas === 0) {
        toast.error(`${bloqueadas} ${bloqueadas === 1 ? 'pessoa já está arquivada e possui vínculos' : 'pessoas já estão arquivadas e possuem vínculos'} — não é possível excluir.`)
      } else {
        toast.success(resumo)
      }

      onOpenChange(false)
      onDeleted()
    } catch (error: any) {
      console.error('Erro ao processar exclusão em massa:', error)
      toast.error(error.message || 'Erro ao processar exclusão')
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
            Pessoas sem vínculos serão excluídas permanentemente. Pessoas com vínculos no sistema serão arquivadas automaticamente para preservar os dados.
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
                Processando...
              </>
            ) : (
              'Confirmar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
