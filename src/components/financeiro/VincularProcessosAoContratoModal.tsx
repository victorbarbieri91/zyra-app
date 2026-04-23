'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Scale, Loader2, FileText, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formaPrincipal } from '@/lib/contratos/formas'
import type { ContratoHonorario } from '@/hooks/useContratosHonorarios'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProcessoElegivel {
  id: string
  numero_pasta: string
  numero_cnj: string | null
  parte_contraria: string | null
  status: string
  cliente_nome: string
}

interface VincularProcessosAoContratoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contrato: ContratoHonorario | null
  onSuccess?: () => void
}

export default function VincularProcessosAoContratoModal({
  open,
  onOpenChange,
  contrato,
  onSuccess,
}: VincularProcessosAoContratoModalProps) {
  const supabase = createClient()
  const [processos, setProcessos] = useState<ProcessoElegivel[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Reset quando o modal abre
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set())
      setSearchQuery('')
    }
  }, [open])

  // Carregar processos elegíveis (mesmo cliente ou grupo, sem contrato vinculado)
  useEffect(() => {
    const load = async () => {
      if (!contrato || !open) return

      setLoading(true)
      try {
        // Resolver lista de cliente_ids: direto + membros do grupo, se habilitado
        const clienteIds = new Set<string>()
        clienteIds.add(contrato.cliente_id)
        const grupo = contrato.grupo_clientes
        if (grupo?.habilitado && Array.isArray(grupo.clientes)) {
          for (const c of grupo.clientes) {
            if (c.cliente_id) clienteIds.add(c.cliente_id)
          }
        }

        const { data, error } = await supabase
          .from('processos_processos')
          .select(`
            id,
            numero_pasta,
            numero_cnj,
            parte_contraria,
            status,
            cliente:crm_pessoas!processos_processos_cliente_id_fkey(nome_completo)
          `)
          .eq('escritorio_id', contrato.escritorio_id)
          .in('cliente_id', Array.from(clienteIds))
          .is('contrato_id', null)
          .order('numero_pasta', { ascending: true })

        if (error) throw error

        setProcessos(
          (data || []).map((p: any) => ({
            id: p.id,
            numero_pasta: p.numero_pasta,
            numero_cnj: p.numero_cnj,
            parte_contraria: p.parte_contraria,
            status: p.status,
            cliente_nome:
              (p.cliente as { nome_completo: string } | null)?.nome_completo || 'N/A',
          })),
        )
      } catch (err) {
        console.error('Erro ao carregar processos elegíveis:', err)
        toast.error('Erro ao carregar processos')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [contrato, open, supabase])

  const filteredProcessos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return processos
    return processos.filter(
      (p) =>
        p.numero_pasta?.toLowerCase().includes(q) ||
        p.numero_cnj?.toLowerCase().includes(q) ||
        p.parte_contraria?.toLowerCase().includes(q) ||
        p.cliente_nome.toLowerCase().includes(q),
    )
  }, [processos, searchQuery])

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllVisible = () => {
    const allVisibleSelected = filteredProcessos.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const p of filteredProcessos) next.delete(p.id)
      } else {
        for (const p of filteredProcessos) next.add(p.id)
      }
      return next
    })
  }

  const handleVincular = async () => {
    if (!contrato) return
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos um processo')
      return
    }

    setSaving(true)
    try {
      // Primeira forma canônica como modalidade padrão dos processos
      const modalidade = formaPrincipal(contrato.formas_cobranca) ?? contrato.forma_cobranca

      const { error } = await supabase
        .from('processos_processos')
        .update({
          contrato_id: contrato.id,
          modalidade_cobranca: modalidade,
        })
        .in('id', Array.from(selectedIds))

      if (error) throw error

      toast.success(
        selectedIds.size === 1
          ? 'Processo vinculado ao contrato!'
          : `${selectedIds.size} processos vinculados ao contrato!`,
      )
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao vincular processos:', err)
      toast.error(err?.message || 'Erro ao vincular processos ao contrato')
    } finally {
      setSaving(false)
    }
  }

  const allVisibleSelected =
    filteredProcessos.length > 0 && filteredProcessos.every((p) => selectedIds.has(p.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e] dark:text-slate-200">
            <FileText className="w-5 h-5 text-[#89bcbe]" />
            Vincular Processos ao Contrato
          </DialogTitle>
          <DialogDescription>
            Selecione os processos deste cliente que devem ser cobrados sob
            {contrato ? (
              <span className="ml-1 font-mono font-medium text-[#34495e] dark:text-slate-200">
                {contrato.numero_contrato}
              </span>
            ) : null}
            .
          </DialogDescription>
        </DialogHeader>

        {/* Busca + selecionar todos */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por pasta, CNJ, cliente ou parte contrária..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {filteredProcessos.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAllVisible}
              className="h-10 whitespace-nowrap"
            >
              {allVisibleSelected ? 'Desmarcar todos' : 'Marcar todos'}
            </Button>
          )}
        </div>

        {/* Lista */}
        <ScrollArea className="flex-1 min-h-[280px] max-h-[420px] border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : filteredProcessos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Scale className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? 'Nenhum processo encontrado com este termo.'
                  : processos.length === 0
                    ? 'Nenhum processo sem contrato disponível para este cliente.'
                    : 'Nenhum processo corresponde à busca.'}
              </p>
              {!searchQuery && processos.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Todos os processos do cliente já estão vinculados a algum contrato.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredProcessos.map((processo) => {
                const isSelected = selectedIds.has(processo.id)
                return (
                  <button
                    key={processo.id}
                    type="button"
                    onClick={() => toggleOne(processo.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors flex items-start gap-3',
                      isSelected
                        ? 'bg-[#f0f9f9] dark:bg-teal-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-surface-2',
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(processo.id)}
                      className="mt-0.5"
                      // onClick nativo é delegado para o botão pai — evita duplo toggle
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                          {processo.numero_pasta}
                        </span>
                        <Badge
                          className={cn(
                            'text-[9px] px-1.5 py-0',
                            processo.status === 'ativo'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
                          )}
                        >
                          {processo.status}
                        </Badge>
                      </div>
                      <p className="text-[12px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                        {processo.cliente_nome}
                        {processo.parte_contraria && (
                          <span className="text-slate-400"> vs {processo.parte_contraria}</span>
                        )}
                      </p>
                      {processo.numero_cnj && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5">
                          {processo.numero_cnj}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Ações */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {selectedIds.size > 0
              ? `${selectedIds.size} ${selectedIds.size === 1 ? 'processo selecionado' : 'processos selecionados'}`
              : 'Nenhum processo selecionado'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleVincular}
              disabled={selectedIds.size === 0 || saving}
              className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1.5" />
              )}
              Vincular
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
