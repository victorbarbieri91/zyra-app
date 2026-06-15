'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  FileText,
  Loader2,
  Link as LinkIcon,
  Clock,
  Receipt,
  Banknote,
  Repeat,
} from 'lucide-react'
import { cn, formatCurrency, formatHoras } from '@/lib/utils'
import { useConsultivoFinanceiro, type Despesa } from '@/hooks/useConsultivoFinanceiro'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import VincularContratoConsultivoModal from './VincularContratoConsultivoModal'
import ConsultivoFinanceiroDetalhesModal from './ConsultivoFinanceiroDetalhesModal'
import DespesaModal, { type DespesaEditData } from '@/components/financeiro/DespesaModal'

interface ConsultivoFinanceiroCardProps {
  consultivoId: string
  clienteId: string | null
  clienteNome?: string
  onLancarHoras?: () => void
  onLancarDespesa?: () => void
  onLancarHonorario?: () => void
  onEditTimesheet?: (entry: import('@/hooks/useConsultivoFinanceiro').TimesheetEntry) => void
  onContratoVinculado?: () => void
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
  pro_bono: 'Pró-Bono',
}

export default function ConsultivoFinanceiroCard({
  consultivoId,
  clienteId,
  clienteNome,
  onLancarHoras,
  onLancarDespesa,
  onLancarHonorario,
  onEditTimesheet,
  onContratoVinculado,
  refreshTrigger,
}: ConsultivoFinanceiroCardProps) {
  const {
    contratoInfo,
    resumo,
    honorarios,
    despesas,
    timesheet,
    loading,
    podeLancarHoras,
    loadDados,
  } = useConsultivoFinanceiro(consultivoId)

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
      consultivo_id: despesa.consultivo_id,
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
    if (consultivoId) {
      loadDados()
    }
  }, [consultivoId, loadDados, refreshTrigger])

  const openDetalhesModal = (tipo: 'honorarios' | 'timesheet' | 'despesas') => {
    setDetalhesModalTipo(tipo)
    setDetalhesModalOpen(true)
  }

  const handleContratoVinculado = () => {
    loadDados()
    onContratoVinculado?.()
  }

  // ========================================
  // LOADING STATE
  // ========================================
  if (loading) {
    return (
      <Card className="border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] rounded-xl shadow-none">
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
        <Card className="border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] rounded-xl shadow-none">
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
                Vincule um contrato para gerenciar o financeiro deste consultivo
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

        <VincularContratoConsultivoModal
          open={vincularModalOpen}
          onOpenChange={setVincularModalOpen}
          consultaId={consultivoId}
          clienteId={clienteId}
          clienteNome={clienteNome}
          onSuccess={handleContratoVinculado}
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
    icon: React.ComponentType<{ className?: string }>
  }> = {
    honorarios: {
      label: 'Honorários',
      displayValue: formatCurrency(totalHonorarios),
      count: honorarios.length,
      rank: totalHonorarios,
      icon: Banknote,
    },
    timesheet: {
      label: 'Timesheet',
      displayValue: formatHoras(horasTrab, 'curto'),
      count: timesheet.length,
      // horas ranqueiam junto com valores em R$ — fator aproximado R$100/h
      rank: horasTrab * 100,
      icon: Clock,
    },
    despesas: {
      label: 'Despesas',
      displayValue: formatCurrency(totalDespesas),
      count: despesas.length,
      rank: totalDespesas,
      icon: Receipt,
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
  const HeroIcon = hero.icon

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
      <Card className="border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] rounded-xl shadow-none overflow-hidden">
        {/* Header — ícone + Financeiro + contrato (à direita) */}
        <div className="px-4 py-3 border-b border-[#f0ede3] dark:border-[#1d2a3c] flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-[#89bcbe] flex-shrink-0" />
          <span className="text-[13px] font-semibold text-[#2c3e50] dark:text-slate-200 flex-1">Financeiro</span>
          <span className="text-[10px] font-mono text-[#9aa1a8] dark:text-slate-500 truncate">
            {contratoInfo.numero_contrato} · {MODALIDADE_LABELS[contratoInfo.forma_cobranca || ''] || 'Padrão'}
          </span>
          <button
            type="button"
            onClick={() => setVincularModalOpen(true)}
            title="Trocar contrato"
            className="text-[#9aa1a8] hover:text-[#34495e] dark:hover:text-slate-200 transition-colors flex-shrink-0"
          >
            <Repeat className="w-3 h-3" />
          </button>
        </div>

        {/* Destaque — categoria mais movimentada (sozinha, maior, fundo sutil) */}
        <button
          type="button"
          onClick={() => openDetalhesModal(heroKey)}
          className="w-full text-left px-4 py-3.5 bg-[#faf8f2] dark:bg-[#0f141c] border-b border-[#f0ede3] dark:border-[#1d2a3c] hover:bg-[#f3f0e8] dark:hover:bg-[#141a24] transition-colors"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <HeroIcon className="w-3 h-3 text-[#9aa1a8] dark:text-slate-500" />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-slate-500">{hero.label}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="font-mono text-[26px] font-semibold text-[#2c3e50] dark:text-slate-100 tracking-[-0.025em] leading-none">{hero.displayValue}</span>
            <span className="text-[11px] text-[#9aa1a8] dark:text-slate-500">{formatCountLabel(hero.count, heroKey)}</span>
          </div>
        </button>

        {/* Secundárias — duas restantes, lado a lado */}
        <div className="grid grid-cols-2 border-b border-[#f0ede3] dark:border-[#1d2a3c]">
          {secondaries.map((key, i) => {
            const m = metricas[key]
            const SecIcon = m.icon
            return (
              <button
                key={key}
                type="button"
                onClick={() => openDetalhesModal(key)}
                className={cn(
                  'text-left px-3.5 py-2.5 hover:bg-[#faf8f2] dark:hover:bg-[#1a212c] transition-colors',
                  i > 0 && 'border-l border-[#f0ede3] dark:border-[#1d2a3c]',
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <SecIcon className="w-2.5 h-2.5 text-[#9aa1a8] dark:text-slate-500" />
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-slate-500">{m.label}</span>
                </div>
                <div className="font-mono text-[15px] font-medium text-[#2c3e50] dark:text-slate-200 tracking-[-0.02em] leading-none">{m.displayValue}</div>
                <div className="text-[10px] text-[#9aa1a8] dark:text-slate-500 mt-1">{formatCountLabel(m.count, key)}</div>
              </button>
            )
          })}
        </div>

        {/* Botões coloridos (tom suave) */}
        <div className={cn('px-3 py-2.5 grid gap-1.5', podeLancarHoras ? 'grid-cols-3' : 'grid-cols-2')}>
          {podeLancarHoras && (
            <button
              type="button"
              onClick={() => onLancarHoras?.()}
              className="h-9 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 bg-[#e8f5f5] dark:bg-teal-500/15 text-[#3f7376] dark:text-teal-300 border border-[#cfe2e3] dark:border-teal-500/25 hover:bg-[#dcefef] dark:hover:bg-teal-500/20 transition-colors"
            >
              <Clock className="w-3 h-3" />
              Horas
            </button>
          )}
          <button
            type="button"
            onClick={() => onLancarDespesa?.()}
            className="h-9 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 bg-[#f7f0e7] dark:bg-amber-500/10 text-[#8a6438] dark:text-amber-300/90 border border-[#e8d4bc] dark:border-amber-500/20 hover:bg-[#f1e6d6] dark:hover:bg-amber-500/15 transition-colors"
          >
            <Receipt className="w-3 h-3" />
            Despesa
          </button>
          <button
            type="button"
            onClick={() => onLancarHonorario?.()}
            className="h-9 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 bg-[#eef5f1] dark:bg-emerald-500/10 text-[#3f6a54] dark:text-emerald-300 border border-[#c8e0d6] dark:border-emerald-500/20 hover:bg-[#e3efe8] dark:hover:bg-emerald-500/15 transition-colors"
          >
            <Banknote className="w-3 h-3" />
            Honorário
          </button>
        </div>
      </Card>

      {/* Modal de Detalhes */}
      <ConsultivoFinanceiroDetalhesModal
        open={detalhesModalOpen}
        onOpenChange={setDetalhesModalOpen}
        tipo={detalhesModalTipo}
        consultivoId={consultivoId}
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
          consultaId={consultivoId}
          onSuccess={() => {
            setEditDespesa(null)
            loadDados()
          }}
        />
      )}

      {/* Modal Trocar Contrato (já existe contrato vinculado) */}
      <VincularContratoConsultivoModal
        open={vincularModalOpen}
        onOpenChange={setVincularModalOpen}
        consultaId={consultivoId}
        clienteId={clienteId}
        clienteNome={clienteNome}
        contratoAtualId={contratoInfo.id}
        onSuccess={handleContratoVinculado}
      />
    </>
  )
}
