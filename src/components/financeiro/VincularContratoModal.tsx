'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, FileText, Loader2, User, Calendar, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'

interface Contrato {
  id: string
  numero_contrato: string
  titulo: string | null
  cliente_id: string
  cliente_nome: string
  forma_cobranca: string
  data_inicio: string
}

interface VincularContratoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: 'processo' | 'consultivo'
  selectedIds: string[]
  onSuccess: () => void
}

export function VincularContratoModal({
  open,
  onOpenChange,
  tipo,
  selectedIds,
  onSuccess,
}: VincularContratoModalProps) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null)

  useEffect(() => {
    if (open && escritorioAtivo) {
      loadContratos()
      setSelectedContratoId(null)
      setSearchQuery('')
    }
  }, [open, escritorioAtivo])

  const loadContratos = async () => {
    if (!escritorioAtivo) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Buscar contratos filtrando por escritório
      const { data: contratosData, error: contratosError } = await supabase
        .from('financeiro_contratos_honorarios')
        .select('id, numero_contrato, titulo, cliente_id, forma_cobranca, data_inicio')
        .eq('escritorio_id', escritorioAtivo)
        .eq('ativo', true)
        .order('created_at', { ascending: false })

      if (contratosError) {
        console.error('Erro na query de contratos:', contratosError)
        throw contratosError
      }

      // Buscar nomes dos clientes
      const clienteIds = [...new Set((contratosData || []).map((c: { cliente_id: string }) => c.cliente_id).filter(Boolean))]
      let clientesMap: Record<string, string> = {}

      if (clienteIds.length > 0) {
        const { data: clientesData, error: clientesError } = await supabase
          .from('crm_pessoas')
          .select('id, nome_completo')
          .in('id', clienteIds)

        if (clientesError) {
          console.error('Erro na query de clientes:', clientesError)
        }

        clientesData?.forEach((c: { id: string; nome_completo: string }) => {
          clientesMap[c.id] = c.nome_completo
        })
      }

      const contratosFormatados: Contrato[] = (contratosData || []).map((c: any) => ({
        id: c.id,
        numero_contrato: c.numero_contrato,
        titulo: c.titulo,
        cliente_id: c.cliente_id,
        cliente_nome: clientesMap[c.cliente_id] || 'Cliente não encontrado',
        forma_cobranca: c.forma_cobranca,
        data_inicio: c.data_inicio,
      }))

      setContratos(contratosFormatados)
    } catch (error: any) {
      console.error('Erro ao carregar contratos:', error?.message || error)
      toast.error('Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }

  const filteredContratos = useMemo(() => {
    if (!searchQuery.trim()) return contratos

    const search = searchQuery.toLowerCase()
    return contratos.filter(
      (c) =>
        c.numero_contrato?.toLowerCase().includes(search) ||
        c.titulo?.toLowerCase().includes(search) ||
        c.cliente_nome.toLowerCase().includes(search)
    )
  }, [contratos, searchQuery])

  const handleVincular = async () => {
    if (!selectedContratoId) {
      toast.error('Selecione um contrato')
      return
    }

    setSaving(true)
    try {
      const tabela = tipo === 'processo' ? 'processos_processos' : 'consultivo_consultas'

      const { error } = await supabase
        .from(tabela)
        .update({ contrato_id: selectedContratoId })
        .in('id', selectedIds)

      if (error) throw error

      toast.success(
        `Contrato vinculado a ${selectedIds.length} ${
          selectedIds.length === 1
            ? tipo === 'processo'
              ? 'processo'
              : 'consulta'
            : tipo === 'processo'
            ? 'processos'
            : 'consultas'
        } com sucesso!`
      )
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao vincular contrato:', error)
      toast.error('Erro ao vincular contrato')
    } finally {
      setSaving(false)
    }
  }

  const formatFormaCobranca = (forma: string) => {
    const map: Record<string, string> = {
      fixo: 'Fixo',
      por_hora: 'Por Hora',
      por_cargo: 'Por Cargo',
      por_pasta: 'Por Pasta',
      por_ato: 'Por Ato',
      misto: 'Misto',
      pro_bono: 'Pro Bono',
    }
    return map[forma] || forma
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#34495e]">
            Vincular Contrato de Honorários
          </DialogTitle>
          <DialogDescription>
            Selecione o contrato para vincular aos {selectedIds.length}{' '}
            {tipo === 'processo'
              ? selectedIds.length === 1
                ? 'processo selecionado'
                : 'processos selecionados'
              : selectedIds.length === 1
              ? 'consulta selecionada'
              : 'consultas selecionadas'}
          </DialogDescription>
        </DialogHeader>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por número, título ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de Contratos */}
        <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : filteredContratos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">
                {searchQuery ? 'Nenhum contrato encontrado' : 'Nenhum contrato ativo'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredContratos.map((contrato) => (
                <button
                  key={contrato.id}
                  onClick={() => setSelectedContratoId(contrato.id)}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors',
                    selectedContratoId === contrato.id && 'bg-blue-50 hover:bg-blue-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#34495e]">
                          {contrato.numero_contrato}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-slate-100 text-slate-600"
                        >
                          {formatFormaCobranca(contrato.forma_cobranca)}
                        </Badge>
                      </div>
                      {contrato.titulo && (
                        <p className="text-xs text-slate-600 mt-0.5 truncate">
                          {contrato.titulo}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{contrato.cliente_nome}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>{formatBrazilDate(contrato.data_inicio)}</span>
                        </div>
                      </div>
                    </div>
                    {selectedContratoId === contrato.id && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleVincular}
            disabled={!selectedContratoId || saving}
            className="bg-[#34495e] hover:bg-[#46627f] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vinculando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Vincular Contrato
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
