'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  FileText,
  Loader2,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'
import { formatCurrency } from '@/lib/utils'
import { ContratoModal } from '@/components/financeiro/ContratoModal'
import { useContratosHonorarios, ContratoFormData } from '@/hooks/useContratosHonorarios'
import { toast } from 'sonner'

type FormaCobranca = 'fixo' | 'por_hora' | 'misto' | 'por_pasta' | 'por_ato' | 'por_cargo' | 'por_etapa'

interface ContratoDisponivel {
  id: string
  numero_contrato: string
  forma_cobranca: FormaCobranca
  data_inicio: string
  data_fim: string | null
  valor_total: number | null
}

interface VincularContratoConsultivoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultaId: string
  clienteId: string | null
  clienteNome?: string
  onSuccess?: () => void
}

const FORMA_LABELS: Record<FormaCobranca, string> = {
  fixo: 'Valor Fixo',
  por_hora: 'Por Hora',
  por_cargo: 'Por Cargo/Timesheet',
  por_pasta: 'Por Pasta',
  por_ato: 'Por Ato Processual',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
}

const FORMA_COLORS: Record<FormaCobranca, string> = {
  fixo: 'bg-blue-100 text-blue-700',
  por_hora: 'bg-purple-100 text-purple-700',
  por_cargo: 'bg-indigo-100 text-indigo-700',
  por_pasta: 'bg-cyan-100 text-cyan-700',
  por_ato: 'bg-rose-100 text-rose-700',
  por_etapa: 'bg-emerald-100 text-emerald-700',
  misto: 'bg-amber-100 text-amber-700',
}

export default function VincularContratoConsultivoModal({
  open,
  onOpenChange,
  consultaId,
  clienteId,
  clienteNome,
  onSuccess,
}: VincularContratoConsultivoModalProps) {
  const supabase = createClient()
  const { createContrato } = useContratosHonorarios()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contratos, setContratos] = useState<ContratoDisponivel[]>([])
  const [selectedContrato, setSelectedContrato] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contratoModalOpen, setContratoModalOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Carregar contratos do cliente
  useEffect(() => {
    const loadContratos = async () => {
      if (!clienteId || !open) return

      setLoading(true)
      setError(null)
      setSelectedContrato(null)

      try {
        const { data, error: queryError } = await supabase
          .from('financeiro_contratos_honorarios')
          .select('id, numero_contrato, forma_cobranca, data_inicio, data_fim, valor_total')
          .eq('cliente_id', clienteId)
          .eq('ativo', true)
          .order('created_at', { ascending: false })

        if (queryError) throw queryError

        setContratos(data || [])
      } catch (err) {
        console.error('Erro ao carregar contratos:', err)
        setError('Erro ao carregar contratos do cliente')
      } finally {
        setLoading(false)
      }
    }

    loadContratos()
  }, [clienteId, open, supabase, reloadKey])

  const handleVincular = async () => {
    if (!selectedContrato) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('consultivo_consultas')
        .update({ contrato_id: selectedContrato })
        .eq('id', consultaId)

      if (updateError) throw updateError

      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao vincular contrato:', err)
      setError(err?.message || 'Erro ao vincular contrato')
    } finally {
      setSaving(false)
    }
  }

  // Handler para criar contrato inline
  const handleSaveContrato = async (data: ContratoFormData): Promise<string | null | boolean> => {
    try {
      const contratoId = await createContrato(data)
      if (contratoId) {
        setReloadKey(prev => prev + 1)
        setSelectedContrato(contratoId)
        toast.success('Contrato criado com sucesso!')
        setContratoModalOpen(false)
        return contratoId
      }
      return null
    } catch (error) {
      console.error('Erro ao criar contrato:', error)
      toast.error('Erro ao criar contrato')
      return null
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            <FileText className="h-5 w-5 text-[#89bcbe]" />
            Vincular Contrato
          </DialogTitle>
          <DialogDescription>
            Selecione o contrato de honorarios para vincular a esta consulta
            {clienteNome && (
              <span className="block mt-1 font-medium text-[#34495e]">
                Cliente: {clienteNome}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#89bcbe] mx-auto mb-2" />
              <p className="text-sm text-slate-600">Carregando contratos...</p>
            </div>
          ) : !clienteId ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                Esta consulta nao tem um cliente vinculado.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Vincule um cliente a consulta primeiro.
              </p>
            </div>
          ) : contratos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                Nenhum contrato ativo encontrado para este cliente.
              </p>
              <p className="text-xs text-slate-500 mt-2 mb-4">
                Crie um contrato de honorarios para vincular a esta consulta.
              </p>
              <Button
                onClick={() => setContratoModalOpen(true)}
                className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Criar Novo Contrato
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <RadioGroup
                value={selectedContrato || ''}
                onValueChange={setSelectedContrato}
                className="space-y-2"
              >
                {contratos.map((contrato) => {
                  const isSelected = selectedContrato === contrato.id
                  return (
                    <div
                      key={contrato.id}
                      className={cn(
                        'relative flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                        isSelected
                          ? 'border-[#89bcbe] bg-[#f0f9f9]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                      onClick={() => setSelectedContrato(contrato.id)}
                    >
                      <RadioGroupItem value={contrato.id} id={contrato.id} className="mt-0.5" />
                      <Label htmlFor={contrato.id} className="flex-1 cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#34495e]">
                              {contrato.numero_contrato}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {formatBrazilDate(parseDateInBrazil(contrato.data_inicio))}
                                {contrato.data_fim && ` até ${formatBrazilDate(parseDateInBrazil(contrato.data_fim))}`}
                              </span>
                            </div>
                          </div>
                          <Badge className={cn('text-[9px] px-1.5 py-0', FORMA_COLORS[contrato.forma_cobranca])}>
                            {FORMA_LABELS[contrato.forma_cobranca]}
                          </Badge>
                        </div>

                        {contrato.valor_total && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                            <DollarSign className="w-3 h-3" />
                            <span>{formatCurrency(contrato.valor_total)}</span>
                          </div>
                        )}
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>

              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-700">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleVincular}
            disabled={!selectedContrato || saving}
            className="bg-gradient-to-r from-[#89bcbe] to-[#aacfd0] hover:from-[#aacfd0] hover:to-[#89bcbe] text-white"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal inline para criar contrato */}
    <ContratoModal
      open={contratoModalOpen}
      onOpenChange={setContratoModalOpen}
      defaultClienteId={clienteId}
      onSave={handleSaveContrato}
    />
    </>
  )
}
