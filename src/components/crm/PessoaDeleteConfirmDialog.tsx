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
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Scale, FileText, FileSignature, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { PessoaResumo } from '@/types/crm'

interface PessoaDeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoa: PessoaResumo | null
  onDeleted: () => void
}

interface RelationCounts {
  processos: number
  consultivos: number
  contratos: number
  oportunidades: number
}

export function PessoaDeleteConfirmDialog({ open, onOpenChange, pessoa, onDeleted }: PessoaDeleteConfirmDialogProps) {
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [counts, setCounts] = useState<RelationCounts>({ processos: 0, consultivos: 0, contratos: 0, oportunidades: 0 })
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (open && pessoa) {
      checkRelationships()
    } else {
      setLoadingCounts(true)
      setCounts({ processos: 0, consultivos: 0, contratos: 0, oportunidades: 0 })
    }
  }, [open, pessoa])

  const checkRelationships = async () => {
    if (!pessoa) return
    setLoadingCounts(true)

    try {
      const supabase = createClient()

      const [processosRes, consultivosRes, contratosRes, oportunidadesRes] = await Promise.all([
        supabase.from('processos_processos').select('id', { count: 'exact', head: true }).eq('cliente_id', pessoa.id),
        supabase.from('consultivo_consultas').select('id', { count: 'exact', head: true }).eq('cliente_id', pessoa.id),
        supabase.from('contratos_honorarios').select('id', { count: 'exact', head: true }).eq('cliente_id', pessoa.id),
        supabase.from('crm_oportunidades').select('id', { count: 'exact', head: true }).eq('pessoa_id', pessoa.id),
      ])

      setCounts({
        processos: processosRes.count || 0,
        consultivos: consultivosRes.count || 0,
        contratos: contratosRes.count || 0,
        oportunidades: oportunidadesRes.count || 0,
      })
    } catch (error) {
      console.error('Erro ao verificar relacionamentos:', error)
    } finally {
      setLoadingCounts(false)
    }
  }

  const totalRelations = counts.processos + counts.consultivos + counts.contratos + counts.oportunidades
  const hasRelations = totalRelations > 0

  const handleDelete = async () => {
    if (!pessoa) return
    setDeleting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('crm_pessoas')
        .delete()
        .eq('id', pessoa.id)

      if (error) throw error

      toast.success('Pessoa excluida com sucesso')
      onOpenChange(false)
      onDeleted()
    } catch (error: any) {
      console.error('Erro ao excluir pessoa:', error)
      toast.error(error.message || 'Erro ao excluir pessoa')
    } finally {
      setDeleting(false)
    }
  }

  const handleArchive = async () => {
    if (!pessoa) return
    setArchiving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('crm_pessoas')
        .update({ status: 'arquivado' })
        .eq('id', pessoa.id)

      if (error) throw error

      toast.success('Pessoa arquivada com sucesso')
      onOpenChange(false)
      onDeleted()
    } catch (error: any) {
      console.error('Erro ao arquivar pessoa:', error)
      toast.error(error.message || 'Erro ao arquivar pessoa')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {loadingCounts ? (
            <>
              <AlertDialogTitle>Verificando vinculos...</AlertDialogTitle>
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            </>
          ) : hasRelations ? (
            <>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Nao e possivel excluir
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <strong>{pessoa?.nome_completo}</strong> possui vinculos que impedem a exclusao:
                  </p>
                  <div className="space-y-1.5">
                    {counts.processos > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Scale className="w-3.5 h-3.5 text-blue-500" />
                        {counts.processos} {counts.processos === 1 ? 'processo' : 'processos'}
                      </div>
                    )}
                    {counts.consultivos > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-teal-500" />
                        {counts.consultivos} {counts.consultivos === 1 ? 'consulta' : 'consultas'}
                      </div>
                    )}
                    {counts.contratos > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <FileSignature className="w-3.5 h-3.5 text-amber-500" />
                        {counts.contratos} {counts.contratos === 1 ? 'contrato' : 'contratos'}
                      </div>
                    )}
                    {counts.oportunidades > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Target className="w-3.5 h-3.5 text-purple-500" />
                        {counts.oportunidades} {counts.oportunidades === 1 ? 'oportunidade' : 'oportunidades'}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Voce pode arquivar a pessoa como alternativa. Ela ficara oculta mas os vinculos serao preservados.
                  </p>
                </div>
              </AlertDialogDescription>
            </>
          ) : (
            <>
              <AlertDialogTitle>Excluir Pessoa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <strong>{pessoa?.nome_completo}</strong>? Esta acao nao pode ser desfeita.
              </AlertDialogDescription>
            </>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          {loadingCounts ? (
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          ) : hasRelations ? (
            <>
              <AlertDialogCancel disabled={archiving}>Fechar</AlertDialogCancel>
              {pessoa?.status !== 'arquivado' && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleArchive}
                  disabled={archiving}
                >
                  {archiving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Arquivando...
                    </>
                  ) : (
                    'Arquivar'
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
