'use client'

import { useState, useEffect } from 'react'
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
import { Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface BulkDeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onDeleted: () => void
}

export function BulkDeleteConfirmDialog({ open, onOpenChange, selectedIds, onDeleted }: BulkDeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deletableIds, setDeletableIds] = useState<string[]>([])
  const [blockedCount, setBlockedCount] = useState(0)

  useEffect(() => {
    if (open && selectedIds.length > 0) {
      checkRelationships()
    } else {
      setLoading(true)
      setDeletableIds([])
      setBlockedCount(0)
    }
  }, [open, selectedIds])

  const checkRelationships = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      // Buscar IDs que possuem vinculos em qualquer tabela
      const [processosRes, consultivosRes, contratosRes, oportunidadesRes] = await Promise.all([
        supabase.from('processos_processos').select('cliente_id').in('cliente_id', selectedIds),
        supabase.from('consultivo_consultas').select('cliente_id').in('cliente_id', selectedIds),
        supabase.from('contratos_honorarios').select('cliente_id').in('cliente_id', selectedIds),
        supabase.from('crm_oportunidades').select('pessoa_id').in('pessoa_id', selectedIds),
      ])

      const blockedSet = new Set<string>()
      processosRes.data?.forEach((r: { cliente_id: string }) => blockedSet.add(r.cliente_id))
      consultivosRes.data?.forEach((r: { cliente_id: string }) => blockedSet.add(r.cliente_id))
      contratosRes.data?.forEach((r: { cliente_id: string }) => blockedSet.add(r.cliente_id))
      oportunidadesRes.data?.forEach((r: { pessoa_id: string }) => blockedSet.add(r.pessoa_id))

      const canDelete = selectedIds.filter(id => !blockedSet.has(id))
      setDeletableIds(canDelete)
      setBlockedCount(blockedSet.size)
    } catch (error) {
      console.error('Erro ao verificar relacionamentos:', error)
      toast.error('Erro ao verificar vinculos')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (deletableIds.length === 0) return
    setDeleting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('crm_pessoas')
        .delete()
        .in('id', deletableIds)

      if (error) throw error

      toast.success(`${deletableIds.length} ${deletableIds.length === 1 ? 'pessoa excluida' : 'pessoas excluidas'} com sucesso`)
      onOpenChange(false)
      onDeleted()
    } catch (error: any) {
      console.error('Erro ao excluir pessoas:', error)
      toast.error(error.message || 'Erro ao excluir pessoas')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {loading ? (
            <>
              <AlertDialogTitle>Verificando vinculos...</AlertDialogTitle>
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            </>
          ) : (
            <>
              <AlertDialogTitle className="flex items-center gap-2">
                {blockedCount > 0 && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                Excluir {selectedIds.length} {selectedIds.length === 1 ? 'pessoa' : 'pessoas'}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  {deletableIds.length > 0 && blockedCount > 0 && (
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>{deletableIds.length}</strong> de {selectedIds.length} pessoas podem ser excluidas.
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {blockedCount} {blockedCount === 1 ? 'pessoa possui' : 'pessoas possuem'} vinculos (processos, contratos, consultas ou oportunidades) e {blockedCount === 1 ? 'sera ignorada' : 'serao ignoradas'}.
                      </p>
                    </>
                  )}
                  {deletableIds.length > 0 && blockedCount === 0 && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Tem certeza que deseja excluir {deletableIds.length} {deletableIds.length === 1 ? 'pessoa' : 'pessoas'}? Esta acao nao pode ser desfeita.
                    </p>
                  )}
                  {deletableIds.length === 0 && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Nenhuma das {selectedIds.length} pessoas selecionadas pode ser excluida. Todas possuem vinculos com processos, contratos, consultas ou oportunidades.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          {loading ? (
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          ) : deletableIds.length === 0 ? (
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          ) : (
            <>
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
                  `Excluir ${deletableIds.length} ${deletableIds.length === 1 ? 'pessoa' : 'pessoas'}`
                )}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
