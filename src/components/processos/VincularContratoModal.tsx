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
  Users,
  CheckCircle,
  AlertTriangle,
  Folders,
  Gavel,
  TrendingUp,
  PieChart,
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
  formas_disponiveis: FormaCobranca[]
  data_inicio: string
  data_fim: string | null
  config: {
    valor_hora?: number
    valor_fixo?: number
    valor_por_processo?: number
  }
}

interface VincularContratoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processoId: string
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

const FORMA_ICONS: Record<FormaCobranca, React.ElementType> = {
  fixo: DollarSign,
  por_hora: Clock,
  por_cargo: Users,
  por_pasta: Folders,
  por_ato: Gavel,
  por_etapa: TrendingUp,
  misto: PieChart,
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

export default function VincularContratoModal({
  open,
  onOpenChange,
  processoId,
  clienteId,
  clienteNome,
  onSuccess,
}: VincularContratoModalProps) {
  const supabase = createClient()
  const { createContrato } = useContratosHonorarios()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contratos, setContratos] = useState<ContratoDisponivel[]>([])
  const [selectedContrato, setSelectedContrato] = useState<string | null>(null)
  const [selectedModalidade, setSelectedModalidade] = useState<FormaCobranca | null>(null)
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
      setSelectedModalidade(null)

      try {
        // Buscar contratos ativos do cliente (config e formas são JSONB na tabela principal)
        const { data, error: queryError } = await supabase
          .from('financeiro_contratos_honorarios')
          .select('id, numero_contrato, forma_cobranca, data_inicio, data_fim, config, formas_pagamento')
          .eq('cliente_id', clienteId)
          .eq('ativo', true)
          .order('created_at', { ascending: false })

        if (queryError) throw queryError

        // Processar dados usando colunas JSONB
        const contratosProcessados: ContratoDisponivel[] = (data || []).map((c: any) => {
          // Extrair formas de cobrança do JSONB formas_pagamento
          const formasAtivas: FormaCobranca[] = c.formas_pagamento
            ? (c.formas_pagamento as Array<{ forma: FormaCobranca }>).map((f: any) => f.forma)
            : [c.forma_cobranca]

          // Extrair config do JSONB
          const config: ContratoDisponivel['config'] = {}
          if (c.config) {
            const configData = c.config as Record<string, any>
            if (configData.valor_hora) config.valor_hora = Number(configData.valor_hora)
            if (configData.valor_fixo) config.valor_fixo = Number(configData.valor_fixo)
            if (configData.valor_por_processo) config.valor_por_processo = Number(configData.valor_por_processo)
          }

          return {
            id: c.id,
            numero_contrato: c.numero_contrato,
            forma_cobranca: c.forma_cobranca,
            formas_disponiveis: formasAtivas,
            data_inicio: c.data_inicio,
            data_fim: c.data_fim,
            config,
          }
        })

        setContratos(contratosProcessados)
      } catch (err) {
        console.error('Erro ao carregar contratos:', err)
        setError('Erro ao carregar contratos do cliente')
      } finally {
        setLoading(false)
      }
    }

    loadContratos()
  }, [clienteId, open, supabase, reloadKey])

  // Quando seleciona um contrato, preenche a modalidade se só tiver uma
  useEffect(() => {
    if (selectedContrato) {
      const contrato = contratos.find((c) => c.id === selectedContrato)
      if (contrato && contrato.formas_disponiveis.length === 1) {
        setSelectedModalidade(contrato.formas_disponiveis[0])
      } else {
        setSelectedModalidade(null)
      }
    }
  }, [selectedContrato, contratos])

  const handleVincular = async () => {
    if (!selectedContrato) return

    const contrato = contratos.find((c) => c.id === selectedContrato)
    if (!contrato) return

    // Se tem múltiplas formas, precisa selecionar modalidade
    if (contrato.formas_disponiveis.length > 1 && !selectedModalidade) {
      setError('Selecione a modalidade de cobrança para este processo')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Determinar modalidade: selecionada ou a primeira (ou a forma principal se não houver formas_disponiveis)
      const modalidade = selectedModalidade || contrato.formas_disponiveis[0] || contrato.forma_cobranca

      console.log('[VincularContrato] Iniciando vinculação:', {
        processoId,
        contratoId: selectedContrato,
        modalidade,
        contrato: contrato,
      })

      const { data, error: updateError } = await supabase
        .from('processos_processos')
        .update({
          contrato_id: selectedContrato,
          modalidade_cobranca: modalidade,
        })
        .eq('id', processoId)
        .select('id, contrato_id, modalidade_cobranca')

      console.log('[VincularContrato] Resultado UPDATE:', { data, error: updateError })

      if (updateError) {
        console.error('[VincularContrato] Erro no UPDATE:', updateError)
        throw updateError
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('[VincularContrato] Erro ao vincular contrato:', err)
      setError(err?.message || 'Erro ao vincular contrato ao processo')
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

  const contratoSelecionado = contratos.find((c) => c.id === selectedContrato)

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
            Selecione o contrato de honorários para vincular a este processo
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
                Este processo não tem um cliente vinculado.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Vincule um cliente ao processo primeiro.
              </p>
            </div>
          ) : contratos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                Nenhum contrato ativo encontrado para este cliente.
              </p>
              <p className="text-xs text-slate-500 mt-2 mb-4">
                Crie um contrato de honorários para vincular a este processo.
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
              {/* Lista de Contratos */}
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
                      <Label
                        htmlFor={contrato.id}
                        className="flex-1 cursor-pointer"
                      >
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
                          <div className="flex flex-wrap gap-1 justify-end max-w-[140px]">
                            {contrato.formas_disponiveis.slice(0, 2).map((forma) => (
                              <Badge
                                key={forma}
                                className={cn('text-[9px] px-1.5 py-0', FORMA_COLORS[forma])}
                              >
                                {FORMA_LABELS[forma]}
                              </Badge>
                            ))}
                            {contrato.formas_disponiveis.length > 2 && (
                              <Badge className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-600">
                                +{contrato.formas_disponiveis.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Info dos valores */}
                        {(contrato.config.valor_hora || contrato.config.valor_fixo || contrato.config.valor_por_processo) && (
                          <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                            {contrato.config.valor_hora && (
                              <span>
                                <Clock className="w-3 h-3 inline mr-0.5" />
                                {formatCurrency(contrato.config.valor_hora)}/h
                              </span>
                            )}
                            {contrato.config.valor_fixo && (
                              <span>
                                <DollarSign className="w-3 h-3 inline mr-0.5" />
                                {formatCurrency(contrato.config.valor_fixo)}
                              </span>
                            )}
                            {contrato.config.valor_por_processo && (
                              <span>
                                <Folders className="w-3 h-3 inline mr-0.5" />
                                {formatCurrency(contrato.config.valor_por_processo)}/processo
                              </span>
                            )}
                          </div>
                        )}
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>

              {/* Seletor de Modalidade (se múltiplas formas) */}
              {contratoSelecionado && contratoSelecionado.formas_disponiveis.length > 1 && (
                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-[#34495e] mb-2">
                    Selecione a modalidade de cobrança para este processo:
                  </p>
                  <RadioGroup
                    value={selectedModalidade || ''}
                    onValueChange={(v) => setSelectedModalidade(v as FormaCobranca)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {contratoSelecionado.formas_disponiveis.map((forma) => {
                      const Icon = FORMA_ICONS[forma]
                      return (
                        <div
                          key={forma}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all',
                            selectedModalidade === forma
                              ? 'border-[#89bcbe] bg-white'
                              : 'border-transparent hover:border-slate-300 bg-white/50'
                          )}
                          onClick={() => setSelectedModalidade(forma)}
                        >
                          <RadioGroupItem value={forma} id={`mod-${forma}`} />
                          <Label
                            htmlFor={`mod-${forma}`}
                            className="flex items-center gap-1.5 cursor-pointer text-xs"
                          >
                            <Icon className="w-3.5 h-3.5 text-[#89bcbe]" />
                            {FORMA_LABELS[forma]}
                          </Label>
                        </div>
                      )
                    })}
                  </RadioGroup>
                </div>
              )}

              {/* Aviso obrigatório */}
              {contratoSelecionado && contratoSelecionado.formas_disponiveis.length > 1 && !selectedModalidade && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-amber-700">
                    Selecione a modalidade de cobrança acima
                  </span>
                </div>
              )}

              {/* Erro */}
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleVincular}
            disabled={!selectedContrato || saving || (contratoSelecionado?.formas_disponiveis.length || 0) > 1 && !selectedModalidade}
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
