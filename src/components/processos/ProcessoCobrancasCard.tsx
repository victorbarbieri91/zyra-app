'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Receipt,
  Loader2,
  DollarSign,
  Check,
  X,
  AlertCircle,
  Scale,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useCobrancaAtos, AtoDisponivel } from '@/hooks/useCobrancaAtos'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { createClient } from '@/lib/supabase/client'

interface ProcessoCobrancasCardProps {
  processoId: string
  valorCausa?: number
}

export default function ProcessoCobrancasCard({
  processoId,
  valorCausa,
}: ProcessoCobrancasCardProps) {
  const { escritorioAtivo } = useEscritorioAtivo()
  const { loadAtosDisponiveis, cobrarAto } = useCobrancaAtos(escritorioAtivo)
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [atosDisponiveis, setAtosDisponiveis] = useState<AtoDisponivel[]>([])
  const [contratoForma, setContratoForma] = useState<string | null>(null)

  // Modal de cobrança
  const [modalCobrar, setModalCobrar] = useState<AtoDisponivel | null>(null)
  const [valorCobrar, setValorCobrar] = useState('')
  const [cobrando, setCobrando] = useState(false)

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!processoId || !escritorioAtivo) return

    setLoading(true)
    try {
      // Verificar se processo tem contrato e qual a forma de cobrança
      const { data: processo } = await supabase
        .from('processos_processos')
        .select('contrato_id')
        .eq('id', processoId)
        .single()

      if (!processo?.contrato_id) {
        setLoading(false)
        return
      }

      const { data: contrato } = await supabase
        .from('financeiro_contratos_honorarios')
        .select('forma_cobranca')
        .eq('id', processo.contrato_id)
        .single()

      if (!contrato) {
        setLoading(false)
        return
      }

      setContratoForma(contrato.forma_cobranca)

      // Apenas carregar atos se for por_ato
      if (contrato.forma_cobranca === 'por_ato') {
        const atos = await loadAtosDisponiveis(processoId)
        setAtosDisponiveis(atos)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de cobrança:', error)
    } finally {
      setLoading(false)
    }
  }, [processoId, escritorioAtivo, supabase, loadAtosDisponiveis])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handler para abrir modal
  const handleAbrirCobrar = (ato: AtoDisponivel) => {
    setModalCobrar(ato)
    setValorCobrar(
      ato.valor_calculado?.toString() ||
        ato.valor_minimo_contrato?.toString() ||
        ato.valor_fixo_padrao?.toString() ||
        ''
    )
  }

  // Handler para cobrar
  const handleCobrar = async () => {
    if (!modalCobrar) return

    if (!valorCobrar || parseFloat(valorCobrar) <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setCobrando(true)
    try {
      await cobrarAto(
        processoId,
        modalCobrar.id,
        parseFloat(valorCobrar),
        modalCobrar.nome
      )
      toast.success('Ato cobrado com sucesso!')
      setModalCobrar(null)
      setValorCobrar('')
      loadData()
    } catch (error) {
      console.error('Erro ao cobrar ato:', error)
      toast.error('Erro ao cobrar ato')
    } finally {
      setCobrando(false)
    }
  }

  // Não mostrar se estiver carregando
  if (loading) {
    return null
  }

  // Não mostrar se não for contrato por_ato ou se não tiver atos configurados
  if (contratoForma !== 'por_ato' || atosDisponiveis.length === 0) {
    return null
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#89bcbe]" />
            Cobrança de Atos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="space-y-2">
            {atosDisponiveis.map(ato => (
              <div
                key={ato.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-[#89bcbe]/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                      {ato.codigo}
                    </Badge>
                    <p className="text-xs font-medium text-[#34495e] truncate">
                      {ato.nome}
                    </p>
                  </div>
                  {ato.valor_calculado && ato.valor_calculado > 0 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] font-medium text-emerald-600">
                        {formatCurrency(ato.valor_calculado)}
                      </p>
                      {ato.usou_minimo ? (
                        <Badge
                          variant="outline"
                          className="text-[8px] px-1 py-0 h-3.5 bg-amber-50 text-amber-600 border-amber-200"
                        >
                          mín.
                        </Badge>
                      ) : ato.percentual_contrato ? (
                        <span className="text-[9px] text-slate-400">
                          ({ato.percentual_contrato}%)
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAbrirCobrar(ato)}
                  className="h-7 px-2.5 text-xs text-[#89bcbe] hover:text-[#6ba9ab] hover:bg-[#89bcbe]/10"
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1" />
                  Cobrar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Cobrança */}
      <Dialog open={!!modalCobrar} onOpenChange={() => setModalCobrar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Cobrar Ato Processual</DialogTitle>
            <DialogDescription>
              Registre a cobrança deste ato processual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {modalCobrar?.codigo}
                </Badge>
                <p className="text-sm font-medium text-[#34495e]">
                  {modalCobrar?.nome}
                </p>
              </div>
            </div>

            {/* Detalhes do Cálculo */}
            {(modalCobrar?.valor_percentual || modalCobrar?.valor_minimo) && (
              <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Cálculo
                </p>
                <div className="space-y-1.5">
                  {modalCobrar?.percentual_contrato && valorCausa && valorCausa > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">
                        {modalCobrar.percentual_contrato}% de {formatCurrency(valorCausa)}
                      </span>
                      <span className={`text-xs font-medium ${!modalCobrar.usou_minimo ? 'text-emerald-600' : 'text-slate-400 line-through'}`}>
                        {formatCurrency(modalCobrar.valor_percentual || 0)}
                      </span>
                    </div>
                  )}
                  {modalCobrar?.valor_minimo && modalCobrar.valor_minimo > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Valor mínimo</span>
                      <span className={`text-xs font-medium ${modalCobrar.usou_minimo ? 'text-amber-600' : 'text-slate-400'}`}>
                        {formatCurrency(modalCobrar.valor_minimo)}
                      </span>
                    </div>
                  )}
                  {modalCobrar?.usou_minimo && (
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200 mt-1.5">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] text-amber-600">
                        Aplicado valor mínimo (maior que o percentual)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm">Valor da Cobrança</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorCobrar}
                onChange={e => setValorCobrar(e.target.value)}
                placeholder="0,00"
                className="mt-1"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Você pode ajustar o valor se necessário
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalCobrar(null)}
              disabled={cobrando}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCobrar}
              disabled={cobrando}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {cobrando ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
