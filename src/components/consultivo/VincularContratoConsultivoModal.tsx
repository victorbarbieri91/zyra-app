'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  FileText,
  Loader2,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Info,
  Plus,
  Repeat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { formatBrazilDate, parseDateInBrazil } from '@/lib/timezone'
import { formatCurrency } from '@/lib/utils'
import { ContratoModal } from '@/components/financeiro/ContratoModal'
import { useContratosHonorarios, ContratoFormData } from '@/hooks/useContratosHonorarios'
import { toast } from 'sonner'

type FormaCobranca = 'fixo' | 'por_hora' | 'misto' | 'por_pasta' | 'por_ato' | 'por_cargo' | 'por_etapa' | 'pro_bono'

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
  /** Quando informado, o modal entra em modo "trocar" (já existe contrato vinculado). */
  contratoAtualId?: string | null
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
  pro_bono: 'Pró-Bono',
}

const FORMA_COLORS: Record<FormaCobranca, string> = {
  fixo: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  por_hora: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
  por_cargo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  por_pasta: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
  por_ato: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  por_etapa: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  misto: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  pro_bono: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400',
}

export default function VincularContratoConsultivoModal({
  open,
  onOpenChange,
  consultaId,
  clienteId,
  clienteNome,
  contratoAtualId,
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
  const [horasPendentes, setHorasPendentes] = useState(0)

  const isTrocar = !!contratoAtualId

  // Carregar contratos do cliente
  useEffect(() => {
    const loadContratos = async () => {
      if (!clienteId || !open) return

      setLoading(true)
      setError(null)
      // Em modo trocar, deixa o contrato atual pré-selecionado
      setSelectedContrato(contratoAtualId ?? null)

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
  }, [clienteId, open, supabase, reloadKey, contratoAtualId])

  // Em modo trocar, verificar se há horas faturáveis pendentes na pasta
  useEffect(() => {
    const checarHoras = async () => {
      if (!open || !isTrocar || !consultaId) {
        setHorasPendentes(0)
        return
      }
      const { count } = await supabase
        .from('financeiro_timesheet')
        .select('id', { count: 'exact', head: true })
        .eq('consulta_id', consultaId)
        .eq('faturavel', true)
        .eq('faturado', false)
      setHorasPendentes(count || 0)
    }
    checarHoras()
  }, [open, isTrocar, consultaId, supabase])

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

      toast.success(isTrocar ? 'Contrato trocado com sucesso!' : 'Contrato vinculado com sucesso!')
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

  const semContratos = !loading && clienteId && contratos.length === 0
  const semCliente = !loading && !clienteId
  const podeSalvar = !!selectedContrato && (!isTrocar || selectedContrato !== contratoAtualId)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg !p-0 gap-0 max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-700 space-y-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f0f9f9] dark:bg-teal-500/10 flex items-center justify-center shrink-0">
              {isTrocar ? (
                <Repeat className="w-5 h-5 text-[#89bcbe]" />
              ) : (
                <FileText className="w-5 h-5 text-[#89bcbe]" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-[#34495e] dark:text-slate-200">
                {isTrocar ? 'Trocar contrato de honorários' : 'Vincular contrato'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {clienteNome
                  ? `Cliente: ${clienteNome}`
                  : 'Selecione o contrato de honorários para esta pasta'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="text-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#89bcbe] mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Carregando contratos...</p>
            </div>
          ) : semCliente ? (
            <div className="text-center py-10">
              <AlertTriangle className="w-8 h-8 text-[#89bcbe] mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Esta pasta não tem um cliente vinculado.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Vincule um cliente à pasta primeiro.
              </p>
            </div>
          ) : semContratos ? (
            <div className="text-center py-10">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Nenhum contrato ativo encontrado para este cliente.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-4">
                Crie um contrato de honorários para vincular a esta pasta.
              </p>
              <Button
                onClick={() => setContratoModalOpen(true)}
                className="bg-[#34495e] hover:bg-[#46627f] text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Criar novo contrato
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Aviso de horas pendentes (modo trocar) */}
              {isTrocar && horasPendentes > 0 && (
                <div className="flex items-start gap-2.5 px-4 py-2.5 rounded-lg bg-[#f0f9f9] border border-[#89bcbe]/40 dark:bg-teal-500/10 dark:border-teal-500/30">
                  <Info className="w-4 h-4 text-[#89bcbe] mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-[#46627f] dark:text-slate-300">
                    Há <strong className="text-[#34495e] dark:text-slate-200">{horasPendentes} hora(s) faturável(is)</strong> ainda não faturada(s) nesta pasta. Ao trocar, elas passarão a seguir o novo contrato. Se quiser cobrá-las pelo contrato atual, fature-as antes de trocar.
                  </div>
                </div>
              )}

              <RadioGroup
                value={selectedContrato || ''}
                onValueChange={setSelectedContrato}
                className="space-y-2"
              >
                {contratos.map((contrato) => {
                  const isSelected = selectedContrato === contrato.id
                  const isAtual = contrato.id === contratoAtualId
                  return (
                    <div
                      key={contrato.id}
                      className={cn(
                        'relative flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                        isSelected
                          ? 'border-[#89bcbe] bg-[#f0f9f9] dark:bg-teal-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-surface-1'
                      )}
                      onClick={() => setSelectedContrato(contrato.id)}
                    >
                      <RadioGroupItem value={contrato.id} id={contrato.id} className="mt-0.5" />
                      <Label htmlFor={contrato.id} className="flex-1 cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                                {contrato.numero_contrato}
                              </p>
                              {isAtual && (
                                <Badge className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-600 border-slate-200 dark:bg-surface-2 dark:text-slate-400">
                                  Atual
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {formatBrazilDate(parseDateInBrazil(contrato.data_inicio))}
                                {contrato.data_fim && ` até ${formatBrazilDate(parseDateInBrazil(contrato.data_fim))}`}
                              </span>
                            </div>
                          </div>
                          <Badge className={cn('text-[9px] px-1.5 py-0 shrink-0', FORMA_COLORS[contrato.forma_cobranca])}>
                            {FORMA_LABELS[contrato.forma_cobranca]}
                          </Badge>
                        </div>

                        {contrato.valor_total && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
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
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-700">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs text-red-700 dark:text-red-400">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!semContratos && !semCliente && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-surface-2/40 flex items-center justify-end gap-2.5">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleVincular}
              disabled={!podeSalvar || saving}
              className="bg-[#34495e] hover:bg-[#46627f] text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
              {isTrocar ? 'Salvar troca' : 'Vincular'}
            </Button>
          </div>
        )}
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
