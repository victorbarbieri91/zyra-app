'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  ExternalLink,
  Landmark,
  ArrowRightLeft,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import { cn } from '@/lib/utils'

// ── Interfaces ──────────────────────────────────────────────────

interface ContaBancaria {
  id: string
  escritorio_id: string
  banco: string
  agencia: string
  numero_conta: string
  tipo_conta: 'corrente' | 'poupanca' | 'investimento' | 'caixa'
  titular: string
  saldo_atual: number
  saldo_inicial?: number
  ativa: boolean
  created_at: string
  updated_at: string
  escritorio_nome?: string
}

interface ExtratoItem {
  id: string
  escritorio_id: string
  tipo_movimento: 'receita' | 'despesa' | 'transferencia_saida' | 'transferencia_entrada'
  status: 'pendente' | 'efetivado' | 'vencido' | 'cancelado' | 'previsto' | 'parcial'
  origem: string
  categoria: string
  descricao: string
  valor: number
  valor_pago: number | null
  data_referencia: string
  data_vencimento: string | null
  data_efetivacao: string | null
  entidade: string | null
  conta_bancaria_id: string | null
  conta_bancaria_nome: string | null
  origem_id: string | null
  processo_id: string | null
  cliente_id: string | null
  virtual?: boolean
  origem_pai_id?: string | null
}

interface ExtratoContaSheetProps {
  conta: ContaBancaria | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Constantes ──────────────────────────────────────────────────

const TIPO_CONTA_LABELS: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  investimento: 'Investimento',
  caixa: 'Caixa',
}

const CATEGORIA_CONFIG: Record<string, { label: string; color: string }> = {
  honorario: { label: 'Honorário', color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' },
  honorario_contrato: { label: 'Honorário', color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' },
  honorario_avulso: { label: 'Avulso', color: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30' },
  exito: { label: 'Êxito', color: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30' },
  fatura: { label: 'Fatura', color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' },
  parcela: { label: 'Parcela', color: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30' },
  saldo: { label: 'Saldo', color: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30' },
  avulso: { label: 'Avulso', color: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30' },
  custas: { label: 'Custas', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' },
  fornecedor: { label: 'Fornecedor', color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30' },
  folha: { label: 'Folha', color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' },
  impostos: { label: 'Impostos', color: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30' },
  aluguel: { label: 'Aluguel', color: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' },
  marketing: { label: 'Marketing', color: 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/30' },
  tecnologia: { label: 'Tecnologia', color: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30' },
  assinatura: { label: 'Assinatura', color: 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-500/30' },
  cartao_credito: { label: 'Cartão', color: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' },
  infraestrutura: { label: 'Infraestrutura', color: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30' },
  pessoal: { label: 'Pessoal', color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' },
  despesa: { label: 'Despesa', color: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30' },
  outras: { label: 'Outras', color: 'bg-gray-50 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-500/30' },
  transferencia: { label: 'Transferência', color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' },
  retirada_socios: { label: 'Retirada Sócios', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' },
  beneficios: { label: 'Benefícios', color: 'bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-200 dark:border-lime-500/30' },
  telefonia: { label: 'Telefonia', color: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30' },
  emprestimos: { label: 'Empréstimos', color: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30' },
  taxas_bancarias: { label: 'Taxas Bancárias', color: 'bg-stone-50 dark:bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-200 dark:border-stone-500/30' },
  associacoes: { label: 'Associações', color: 'bg-neutral-50 dark:bg-neutral-500/10 text-neutral-700 dark:text-neutral-400 border-neutral-200 dark:border-neutral-500/30' },
}

const getCategoriaConfig = (categoria: string) => {
  return CATEGORIA_CONFIG[categoria] || { label: categoria, color: 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30' }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  efetivado: { label: 'Pago', color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  pendente: { label: 'Pendente', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  vencido: { label: 'Vencido', color: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' },
  parcial: { label: 'Parcial', color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  cancelado: { label: 'Cancelado', color: 'bg-slate-50 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400' },
  previsto: { label: 'Previsto', color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' },
}

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status] || { label: status, color: 'bg-slate-50 text-slate-600' }
}

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ── Helpers ─────────────────────────────────────────────────────

const getInicioMes = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
}

const getFimMes = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
}

const isEntrada = (tipo: string) => tipo === 'receita' || tipo === 'transferencia_entrada'
const isSaida = (tipo: string) => tipo === 'despesa' || tipo === 'transferencia_saida'

const formatDateShort = (dateStr: string | null) => {
  if (!dateStr) return '-'
  const full = formatBrazilDate(dateStr)
  return full.substring(0, 5)
}

// ── Componente ──────────────────────────────────────────────────

export default function ExtratoContaSheet({ conta, open, onOpenChange }: ExtratoContaSheetProps) {
  const supabase = createClient()

  const [selectedMonth, setSelectedMonth] = useState(() => new Date())
  const [lancamentos, setLancamentos] = useState<ExtratoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saldoAtual, setSaldoAtual] = useState<number | null>(null)

  // Reset mês ao abrir com outra conta
  useEffect(() => {
    if (open && conta) {
      setSelectedMonth(new Date())
    }
  }, [open, conta?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar saldo dinâmico
  const loadSaldo = useCallback(async () => {
    if (!conta) return
    const { data, error } = await supabase.rpc('calcular_saldo_conta', { p_conta_id: conta.id })
    if (!error && data !== null) {
      setSaldoAtual(Number(data))
    }
  }, [conta, supabase])

  // Carregar lançamentos do mês
  const loadLancamentos = useCallback(async () => {
    if (!conta) return

    setLoading(true)
    try {
      const dataInicio = getInicioMes(selectedMonth)
      const dataFim = getFimMes(selectedMonth)

      const { data, error } = await supabase.rpc('get_extrato_com_recorrentes', {
        p_escritorio_ids: [conta.escritorio_id],
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
      })

      if (error) {
        console.error('Erro ao carregar extrato da conta:', error)
        setLancamentos([])
        return
      }

      const filtered: ExtratoItem[] = (data || [])
        .filter((item: any) => item.conta_bancaria_id === conta.id)
        .map((item: any) => ({
          id: item.id,
          escritorio_id: item.escritorio_id,
          tipo_movimento: item.tipo_movimento,
          status: item.virtual ? 'previsto' : item.status,
          origem: item.origem,
          categoria: item.categoria,
          descricao: item.descricao,
          valor: Number(item.valor) || 0,
          valor_pago: item.valor_pago ? Number(item.valor_pago) : null,
          data_referencia: item.data_referencia,
          data_vencimento: item.data_vencimento,
          data_efetivacao: item.data_efetivacao,
          entidade: item.entidade,
          conta_bancaria_id: item.conta_bancaria_id,
          conta_bancaria_nome: item.conta_bancaria_nome,
          origem_id: item.origem_id,
          processo_id: item.processo_id,
          cliente_id: item.cliente_id,
          virtual: item.virtual || false,
          origem_pai_id: item.origem_pai_id || null,
        }))

      filtered.sort((a, b) => {
        const dateA = a.data_efetivacao || a.data_vencimento || a.data_referencia
        const dateB = b.data_efetivacao || b.data_vencimento || b.data_referencia
        return dateA.localeCompare(dateB)
      })

      setLancamentos(filtered)
    } finally {
      setLoading(false)
    }
  }, [conta, selectedMonth, supabase])

  useEffect(() => {
    if (open && conta) {
      loadSaldo()
      loadLancamentos()
    }
  }, [open, conta, selectedMonth, loadSaldo, loadLancamentos])

  // Totais do período
  const { totalEntradas, totalSaidas, saldoPeriodo } = useMemo(() => {
    let entradas = 0
    let saidas = 0
    for (const item of lancamentos) {
      const valor = item.status === 'efetivado'
        ? (item.valor_pago ?? item.valor)
        : item.valor
      if (isEntrada(item.tipo_movimento)) {
        entradas += valor
      } else if (isSaida(item.tipo_movimento)) {
        saidas += valor
      }
    }
    return {
      totalEntradas: entradas,
      totalSaidas: saidas,
      saldoPeriodo: entradas - saidas,
    }
  }, [lancamentos])

  // Navegação de mês
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  const handleNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const mesLabel = `${MESES_PT[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
  const mesParam = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`

  if (!conta) return null

  const contaInfo = [
    conta.banco,
    conta.agencia && `Ag ${conta.agencia}`,
    conta.numero_conta && `C/C ${conta.numero_conta}`,
  ].filter(Boolean).join(' • ')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-3xl w-full overflow-y-auto p-0">
        {/* Header sticky */}
        <div className="sticky top-0 z-10 bg-white dark:bg-surface-0 border-b border-slate-100 dark:border-slate-800">
          <div className="px-5 pt-5 pb-4">
            {/* Título + Saldo */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold text-[#34495e] dark:text-slate-200 flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-[#89bcbe] shrink-0" />
                  Extrato da Conta
                </SheetTitle>
                <p className="text-sm text-[#46627f] dark:text-slate-400 mt-1">{contaInfo}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      conta.tipo_conta === 'corrente' && "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
                      conta.tipo_conta === 'poupanca' && "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      conta.tipo_conta === 'investimento' && "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400",
                      conta.tipo_conta === 'caixa' && "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
                    )}
                  >
                    {TIPO_CONTA_LABELS[conta.tipo_conta] || conta.tipo_conta}
                  </Badge>
                  {conta.titular && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{conta.titular}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Saldo Atual</p>
                <p className={cn(
                  "text-lg font-bold mt-0.5",
                  (saldoAtual ?? conta.saldo_atual) >= 0 ? "text-[#34495e] dark:text-slate-200" : "text-red-600 dark:text-red-400"
                )}>
                  {formatCurrency(saldoAtual ?? conta.saldo_atual)}
                </p>
              </div>
            </div>

            {/* Seletor de mês */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-[#34495e] dark:text-slate-200 min-w-[150px] text-center">
                {mesLabel}
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Resumo do período */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 dark:text-slate-500">Entradas</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatCurrency(totalEntradas)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 dark:text-slate-500">Saídas</span>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">
                  -{formatCurrency(totalSaidas)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 dark:text-slate-500">Saldo</span>
                <span className={cn(
                  "text-xs font-semibold tabular-nums",
                  saldoPeriodo >= 0 ? "text-[#34495e] dark:text-slate-200" : "text-red-600 dark:text-red-400"
                )}>
                  {formatCurrency(saldoPeriodo)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Lançamentos */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-[#89bcbe] animate-spin" />
              <span className="text-sm text-slate-400 dark:text-slate-500 ml-2">Carregando...</span>
            </div>
          ) : lancamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-10 w-10 text-slate-200 dark:text-slate-700" />
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Nenhum lançamento neste mês</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">Navegue para outro mês ou vincule lançamentos a esta conta</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {lancamentos.map((item) => {
                const catConfig = getCategoriaConfig(item.categoria)
                const statusConf = getStatusConfig(item.status)
                const entrada = isEntrada(item.tipo_movimento)
                const isTransfer = item.tipo_movimento === 'transferencia_saida' || item.tipo_movimento === 'transferencia_entrada'
                const displayDate = item.data_efetivacao || item.data_vencimento || item.data_referencia

                return (
                  <div
                    key={`${item.id}-${item.tipo_movimento}`}
                    className="flex items-center gap-2 py-2 -mx-5 px-5 hover:bg-slate-50/50 dark:hover:bg-surface-2 transition-colors"
                  >
                    {/* Data */}
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0 w-[34px]">
                      {formatDateShort(displayDate)}
                    </span>

                    {/* Transfer icon */}
                    {isTransfer && (
                      <ArrowRightLeft className="h-3 w-3 text-blue-400 dark:text-blue-500 shrink-0" />
                    )}

                    {/* Descrição + Entidade */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#34495e] dark:text-slate-200 truncate leading-tight">
                        {item.descricao || '-'}
                      </p>
                      {item.entidade && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                          {item.entidade}
                        </p>
                      )}
                    </div>

                    {/* Badges compactos */}
                    <Badge variant="outline" className={cn("text-[9px] font-medium border py-0 h-[16px] shrink-0 hidden sm:inline-flex", catConfig.color)}>
                      {catConfig.label}
                    </Badge>
                    <Badge variant="secondary" className={cn("text-[9px] py-0 h-[16px] shrink-0", statusConf.color)}>
                      {statusConf.label}
                    </Badge>

                    {/* Valor */}
                    <span className={cn(
                      "text-sm font-semibold tabular-nums shrink-0 text-right min-w-[90px]",
                      entrada
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {entrada ? '+' : '-'}{formatCurrency(item.valor_pago ?? item.valor)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer sticky */}
        <div className="sticky bottom-0 bg-white dark:bg-surface-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {lancamentos.length} {lancamentos.length === 1 ? 'lançamento' : 'lançamentos'}
          </p>
          <Link
            href={`/dashboard/financeiro/receitas-despesas?conta=${conta.id}&mes=${mesParam}`}
            className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] dark:text-teal-400 dark:hover:text-teal-300 font-medium flex items-center gap-1 transition-colors"
          >
            Receitas & Despesas
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
