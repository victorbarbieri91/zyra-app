'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  FileText,
  Loader2,
  Link as LinkIcon,
  Clock,
  Receipt,
  Banknote,
  ChevronRight,
} from 'lucide-react'
import { cn, formatCurrency, formatHoras } from '@/lib/utils'
import { useProcessoFinanceiro, type Despesa } from '@/hooks/useProcessoFinanceiro'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import VincularContratoModal from './VincularContratoModal'
import FinanceiroDetalhesModal from './FinanceiroDetalhesModal'
import DespesaModal, { type DespesaEditData } from '@/components/financeiro/DespesaModal'

interface ProcessoFinanceiroCardProps {
  processoId: string
  onLancarHoras?: () => void
  onLancarDespesa?: () => void
  onLancarHonorario?: () => void
  onEditTimesheet?: (entry: import('@/hooks/useProcessoFinanceiro').TimesheetEntry) => void
  refreshTrigger?: number
}

const MODALIDADE_LABELS: Record<string, string> = {
  fixo: 'Honorários Fixos',
  por_hora: 'Por Hora',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
  por_pasta: 'Por Pasta',
  por_ato: 'Por Ato',
  por_cargo: 'Por Cargo',
}

export default function ProcessoFinanceiroCard({
  processoId,
  onLancarHoras,
  onLancarDespesa,
  onLancarHonorario,
  onEditTimesheet,
  refreshTrigger,
}: ProcessoFinanceiroCardProps) {
  const {
    contratoInfo,
    processoInfo,
    resumo,
    honorarios,
    despesas,
    timesheet,
    loading,
    podelancarHoras,
    loadDados,
  } = useProcessoFinanceiro(processoId)

  const supabase = createClient()

  const [vincularModalOpen, setVincularModalOpen] = useState(false)
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false)
  const [detalhesModalTipo, setDetalhesModalTipo] = useState<
    'honorarios' | 'timesheet' | 'despesas'
  >('honorarios')
  const [editDespesa, setEditDespesa] = useState<DespesaEditData | null>(null)

  const handleEditDespesa = (despesa: Despesa) => {
    setDetalhesModalOpen(false)
    setEditDespesa({
      id: despesa.id,
      categoria: despesa.categoria,
      descricao: despesa.descricao,
      valor: despesa.valor,
      data_vencimento: despesa.data_vencimento,
      reembolsavel: despesa.reembolsavel,
      processo_id: despesa.processo_id,
      fornecedor: despesa.fornecedor,
      status: despesa.status,
      data_pagamento: despesa.data_pagamento,
      forma_pagamento: despesa.forma_pagamento,
    })
  }

  const handleDeleteDespesa = async (id: string) => {
    const { error } = await supabase
      .from('financeiro_despesas')
      .delete()
      .eq('id', id)
    if (error) {
      toast.error('Erro ao excluir despesa')
    } else {
      toast.success('Despesa excluída')
      loadDados()
    }
  }

  useEffect(() => {
    if (processoId) {
      loadDados()
    }
  }, [processoId, loadDados, refreshTrigger])

  const openDetalhesModal = (tipo: 'honorarios' | 'timesheet' | 'despesas') => {
    setDetalhesModalTipo(tipo)
    setDetalhesModalOpen(true)
  }

  // ========================================
  // LOADING STATE
  // ========================================
  if (loading) {
    return (
      <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#89bcbe]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // ========================================
  // SEM CONTRATO VINCULADO
  // ========================================
  if (!contratoInfo) {
    return (
      <>
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#34495e] dark:text-slate-200 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#89bcbe]" />
              Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg bg-slate-50 dark:bg-surface-2 border border-dashed border-slate-200 dark:border-slate-700 px-4 py-5 text-center">
              <FileText className="w-5 h-5 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Vincule um contrato para gerenciar o financeiro deste processo
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-[#89bcbe] text-[#34495e] dark:text-slate-200 hover:bg-[#89bcbe]/10"
                onClick={() => setVincularModalOpen(true)}
              >
                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                Vincular Contrato
              </Button>
            </div>
          </CardContent>
        </Card>

        <VincularContratoModal
          open={vincularModalOpen}
          onOpenChange={setVincularModalOpen}
          processoId={processoId}
          clienteId={processoInfo?.cliente_id || null}
          clienteNome={processoInfo?.cliente_nome}
          onSuccess={() => loadDados()}
        />
      </>
    )
  }

  // ========================================
  // CARD PRINCIPAL — HERO DINÂMICO
  // ========================================
  const totalHonorarios = resumo.totalHonorarios || 0
  const totalDespesas = resumo.totalDespesas || 0
  const horasTrab = resumo.horasTrabalhadas || 0

  // Define qual métrica é o "hero" (maior destaque).
  // Critério: métrica com maior valor absoluto/entradas
  //   - Honorários: total em R$
  //   - Despesas: total em R$
  //   - Timesheet: aproxima por horas (hora × 100 apenas para ranking relativo)
  type MetricKey = 'honorarios' | 'timesheet' | 'despesas'

  const metricas: Record<MetricKey, {
    label: string
    displayValue: string
    count: number
    rank: number
  }> = {
    honorarios: {
      label: 'Honorários',
      displayValue: formatCurrency(totalHonorarios),
      count: honorarios.length,
      rank: totalHonorarios,
    },
    timesheet: {
      label: 'Timesheet',
      displayValue: formatHoras(horasTrab, 'curto'),
      count: timesheet.length,
      // horas ranqueiam junto com valores em R$ — fator aproximado R$100/h
      rank: horasTrab * 100,
    },
    despesas: {
      label: 'Despesas',
      displayValue: formatCurrency(totalDespesas),
      count: despesas.length,
      rank: totalDespesas,
    },
  }

  // Ordem dinâmica: maior rank primeiro. Empate em zero → ordem padrão honorários > timesheet > despesas
  const defaultOrder: MetricKey[] = ['honorarios', 'timesheet', 'despesas']
  const allZero =
    metricas.honorarios.rank === 0 &&
    metricas.timesheet.rank === 0 &&
    metricas.despesas.rank === 0
  const ordered: MetricKey[] = allZero
    ? defaultOrder
    : ([...defaultOrder].sort(
        (a, b) => metricas[b].rank - metricas[a].rank
      ) as MetricKey[])

  const heroKey = ordered[0]
  const hero = metricas[heroKey]
  const secondaries = ordered.slice(1)

  const formatCountLabel = (count: number, key: MetricKey) => {
    if (count === 0) {
      if (key === 'timesheet') return 'Nenhuma entrada'
      if (key === 'despesas') return 'Nenhum item'
      return 'Nenhum lançamento'
    }
    if (key === 'timesheet') return count === 1 ? '1 entrada' : `${count} entradas`
    if (key === 'despesas') return count === 1 ? '1 item' : `${count} itens`
    return count === 1 ? '1 lançamento' : `${count} lançamentos`
  }

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-3 bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] dark:from-teal-500/5 dark:to-teal-500/10 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-[#34495e] dark:text-slate-200 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white dark:bg-surface-0 border border-[#89bcbe]/30 flex items-center justify-center shadow-sm">
                <DollarSign className="w-3.5 h-3.5 text-[#89bcbe]" />
              </div>
              Financeiro
            </CardTitle>
          </div>

          {/* Info do Contrato */}
          <div className="flex items-center gap-2 mt-2">
            <FileText className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400">
              {contratoInfo.numero_contrato}
            </span>
            <span className="text-[11px] text-slate-400">•</span>
            <Badge
              variant="outline"
              className="text-[10px] h-4 px-1.5 font-medium bg-white dark:bg-surface-0 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
            >
              {MODALIDADE_LABELS[contratoInfo.forma_cobranca || ''] || 'Padrão'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Hero: Métrica com maior destaque (dinâmica) */}
          <button
            type="button"
            onClick={() => openDetalhesModal(heroKey)}
            className="w-full text-left group px-5 pt-5 pb-4 hover:bg-slate-50 dark:hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {hero.label}
                </p>
                <p className="text-2xl font-bold text-[#34495e] dark:text-slate-100 leading-tight">
                  {hero.displayValue}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatCountLabel(hero.count, heroKey)}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#89bcbe] transition-colors mt-1 flex-shrink-0" />
            </div>
          </button>

          {/* Métricas secundárias (compactas, ordenadas pelo rank) */}
          {secondaries.map((key) => {
            const m = metricas[key]
            return (
              <div key={key}>
                <div className="border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => openDetalhesModal(key)}
                  className="w-full text-left group px-5 py-3 hover:bg-slate-50 dark:hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {m.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatCountLabel(m.count, key)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-sm font-semibold text-[#34495e] dark:text-slate-200">
                        {m.displayValue}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-[#89bcbe] transition-colors" />
                    </div>
                  </div>
                </button>
              </div>
            )
          })}

          {/* Rodapé: Ações rápidas com gradientes coloridos */}
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-2/50 px-3 py-3">
            <div
              className={cn(
                'grid gap-2',
                podelancarHoras ? 'grid-cols-3' : 'grid-cols-2'
              )}
            >
              {podelancarHoras && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onLancarHoras?.()}
                  className="h-9 text-[11px] font-semibold text-white border-0 shadow-sm bg-gradient-to-br from-[#5a898c] to-[#73a3a5] hover:from-[#4e7b7e] hover:to-[#659697] hover:shadow-md transition-all"
                >
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Horas
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => onLancarDespesa?.()}
                className="h-9 text-[11px] font-semibold text-white border-0 shadow-sm bg-gradient-to-br from-[#7c5c46] to-[#9d7558] hover:from-[#6e5140] hover:to-[#8c6a4f] hover:shadow-md transition-all"
              >
                <Receipt className="w-3.5 h-3.5 mr-1" />
                Despesa
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onLancarHonorario?.()}
                className="h-9 text-[11px] font-semibold text-white border-0 shadow-sm bg-gradient-to-br from-[#34654e] to-[#458768] hover:from-[#2c5a44] hover:to-[#3a785b] hover:shadow-md transition-all"
              >
                <Banknote className="w-3.5 h-3.5 mr-1" />
                Honorário
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <FinanceiroDetalhesModal
        open={detalhesModalOpen}
        onOpenChange={setDetalhesModalOpen}
        tipo={detalhesModalTipo}
        processoId={processoId}
        honorarios={honorarios}
        timesheet={timesheet}
        despesas={despesas}
        resumo={resumo}
        contratoInfo={contratoInfo}
        onLancarHonorario={onLancarHonorario}
        onLancarHoras={onLancarHoras}
        onLancarDespesa={onLancarDespesa}
        onEditTimesheet={onEditTimesheet}
        onEditDespesa={handleEditDespesa}
        onDeleteDespesa={handleDeleteDespesa}
        onRefresh={loadDados}
      />

      {/* Modal Editar Despesa */}
      {editDespesa && (
        <DespesaModal
          open={!!editDespesa}
          onOpenChange={(open) => !open && setEditDespesa(null)}
          editData={editDespesa}
          processoId={processoId}
          onSuccess={() => {
            setEditDespesa(null)
            loadDados()
          }}
        />
      )}
    </>
  )
}
