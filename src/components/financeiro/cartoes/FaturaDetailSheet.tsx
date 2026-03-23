'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  Plus,
  Lock,
  DollarSign,
  Trash2,
  MoreHorizontal,
  Pencil,
  Calendar,
  CheckCircle2,
  Repeat,
  XCircle,
  RotateCcw,
  Eraser,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCartoesCredito,
  CartaoCredito,
  LancamentoCartao,
  FaturaCartao,
  CATEGORIAS_DESPESA_CARTAO,
} from '@/hooks/useCartoesCredito'
import { cn } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import { toast } from 'sonner'
import DespesaCartaoModal from '@/components/financeiro/cartoes/DespesaCartaoModal'
import EditarLancamentoCartaoModal from '@/components/financeiro/cartoes/EditarLancamentoCartaoModal'

interface FaturaDetailSheetProps {
  cartao: CartaoCredito | null
  mesReferencia: string // YYYY-MM (mês de vencimento selecionado na tela)
  faturaExistente?: FaturaCartao | null // fatura já encontrada na página principal
  open: boolean
  onOpenChange: (open: boolean) => void
  escritorioIds: string[]
  onDataChange?: () => void
}

const MESES_ABREV: Record<number, string> = {
  0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun',
  6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez',
}

const MESES_COMPLETO: Record<number, string> = {
  0: 'Janeiro', 1: 'Fevereiro', 2: 'Março', 3: 'Abril', 4: 'Maio', 5: 'Junho',
  6: 'Julho', 7: 'Agosto', 8: 'Setembro', 9: 'Outubro', 10: 'Novembro', 11: 'Dezembro',
}

function formatMesAno(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split('-').map(Number)
  return `${MESES_COMPLETO[mes - 1]}/${ano}`
}

function formatMesAbrev(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split('-').map(Number)
  return `${MESES_ABREV[mes - 1]}/${ano}`
}

function formatDiaMes(dateStr: string): string {
  const [, mes, dia] = dateStr.split('-').map(Number)
  return `${dia}/${MESES_ABREV[mes - 1]}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

function getCategoriaLabel(value: string): string {
  return CATEGORIAS_DESPESA_CARTAO.find(c => c.value === value)?.label || value
}

export default function FaturaDetailSheet({
  cartao,
  mesReferencia,
  faturaExistente,
  open,
  onOpenChange,
  escritorioIds,
  onDataChange,
}: FaturaDetailSheetProps) {
  const [lancamentos, setLancamentos] = useState<LancamentoCartao[]>([])
  const [fatura, setFatura] = useState<FaturaCartao | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Navegação interna de meses (inicializa com prop)
  const [mesAtual, setMesAtual] = useState(mesReferencia)
  useEffect(() => { setMesAtual(mesReferencia) }, [mesReferencia])

  const navegarMes = (direcao: -1 | 1) => {
    const [ano, mes] = mesAtual.split('-').map(Number)
    const d = new Date(ano, mes - 1 + direcao, 1)
    setMesAtual(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setSelectedIds(new Set())
  }

  // Modais
  const [despesaModalOpen, setDespesaModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [lancamentoParaEditar, setLancamentoParaEditar] = useState<LancamentoCartao | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [fecharFaturaConfirm, setFecharFaturaConfirm] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkCategoriaOpen, setBulkCategoriaOpen] = useState(false)
  const [limparFaturaConfirm, setLimparFaturaConfirm] = useState(false)

  const {
    loadLancamentosMes,
    loadFaturas,
    updateLancamento,
    deleteLancamento,
    cancelarRecorrente,
    reativarRecorrente,
    fecharFatura,
    pagarFatura,
    deleteLancamentosEmMassa,
    atualizarCategoriaEmMassa,
    limparFatura,
  } = useCartoesCredito(escritorioIds)

  // Carregar dados quando abrir
  const loadData = useCallback(async () => {
    if (!cartao || !open) return

    setLoadingData(true)
    try {
      // Se navegamos para outro mês internamente, ignorar faturaExistente (é do mês original)
      let faturaAtual: FaturaCartao | null = null

      if (mesAtual === mesReferencia && faturaExistente) {
        faturaAtual = faturaExistente
      } else {
        const faturas = await loadFaturas(cartao.id)
        faturaAtual = faturas.find(f => {
          const vencMes = f.data_vencimento?.substring(0, 7)
          return vencMes === mesAtual
        }) || null
      }
      setFatura(faturaAtual)

      // Buscar lançamentos pelo mes_referencia (agora = mês de vencimento, direto)
      let mesRefLancamentos: string
      if (faturaAtual) {
        mesRefLancamentos = faturaAtual.mes_referencia.substring(0, 7) + '-01'
      } else {
        mesRefLancamentos = mesAtual + '-01'
      }

      const lancs = await loadLancamentosMes(cartao.id, mesRefLancamentos)
      setLancamentos(lancs)
    } catch (error) {
      console.error('Erro ao carregar dados da fatura:', error)
    } finally {
      setLoadingData(false)
    }
  }, [cartao, mesAtual, faturaExistente, open, loadLancamentosMes, loadFaturas])

  useEffect(() => {
    if (open) {
      loadData()
      setSelectedIds(new Set())
    }
  }, [open, loadData])

  if (!cartao) return null

  // Cálculos
  const totalValor = lancamentos.reduce((acc, l) => acc + l.valor, 0)
  const allSelected = lancamentos.length > 0 && selectedIds.size === lancamentos.length

  // Calcular vencimento do mês
  const [anoRef, mesRef] = mesAtual.split('-').map(Number)
  const mesVencimento = mesRef // mês seguinte ao de referência
  const anoVencimento = mesVencimento > 12 ? anoRef + 1 : anoRef
  const mesVencReal = mesVencimento > 12 ? 1 : mesVencimento
  const dataVencimento = fatura?.data_vencimento
    ? formatDiaMes(fatura.data_vencimento)
    : `${cartao.dia_vencimento}/${MESES_ABREV[mesVencReal - 1]}`
  const dataFechamento = fatura?.data_fechamento
    ? formatDiaMes(fatura.data_fechamento)
    : null

  // Calcular se o fechamento é antecipado (para aviso no dialog)
  const calcularDataFechamentoReal = (): { date: Date; formatted: string } | null => {
    const [ano, mes] = mesAtual.split('-').map(Number)
    const ultimoDiaMes = new Date(ano, mes, 0).getDate()
    const diaVcto = Math.min(cartao.dia_vencimento, ultimoDiaMes)
    const dataVcto = new Date(ano, mes - 1, diaVcto)
    const diasAntes = (cartao as any).dias_antes_fechamento || 7
    const dataFech = new Date(dataVcto.getTime() - diasAntes * 86400000)
    return {
      date: dataFech,
      formatted: `${String(dataFech.getDate()).padStart(2, '0')}/${MESES_ABREV[dataFech.getMonth()]}`
    }
  }
  const dataFechamentoReal = calcularDataFechamentoReal()
  const isFechamentoAntecipado = dataFechamentoReal ? new Date() < dataFechamentoReal.date : false

  // Handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(lancamentos.map(l => l.id)))
    }
  }

  const handleDeleteLancamento = async () => {
    if (!deleteConfirmId) return
    const success = await deleteLancamento(deleteConfirmId)
    if (success) {
      toast.success('Lançamento excluído')
      loadData()
      onDataChange?.()
    } else {
      toast.error('Erro ao excluir lançamento')
    }
    setDeleteConfirmId(null)
  }

  const handleFecharFatura = async () => {
    if (!cartao) return
    const faturaId = await fecharFatura(cartao.id, `${mesAtual}-01`)
    if (faturaId) {
      toast.success('Fatura fechada com sucesso')
      loadData()
      onDataChange?.()
    } else {
      toast.error('Erro ao fechar fatura')
    }
    setFecharFaturaConfirm(false)
  }

  const handlePagarFatura = async () => {
    if (!fatura) return
    const success = await pagarFatura(fatura.id, 'debito_automatico')
    if (success) {
      toast.success('Fatura marcada como paga')
      loadData()
      onDataChange?.()
    } else {
      toast.error('Erro ao pagar fatura')
    }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    const excluidos = await deleteLancamentosEmMassa(ids)
    if (excluidos > 0) {
      toast.success(`${excluidos} lançamentos excluídos`)
      setSelectedIds(new Set())
      loadData()
      onDataChange?.()
    }
    setBulkDeleteConfirm(false)
  }

  const handleBulkCategoria = async (categoria: string) => {
    const ids = Array.from(selectedIds)
    const atualizados = await atualizarCategoriaEmMassa(ids, categoria)
    if (atualizados > 0) {
      toast.success(`${atualizados} lançamentos atualizados`)
      setSelectedIds(new Set())
      loadData()
    }
    setBulkCategoriaOpen(false)
  }

  const statusBadge = (status: string | undefined) => {
    if (!status) return null
    const styles: Record<string, string> = {
      aberta: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
      fechada: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
      paga: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    }
    const labels: Record<string, string> = {
      aberta: 'Aberta',
      fechada: 'Fechada',
      paga: 'Paga',
    }
    return (
      <Badge variant="secondary" className={cn('text-[10px]', styles[status])}>
        {labels[status] || status}
      </Badge>
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-surface-0 border-b border-slate-200 dark:border-slate-700 p-5">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: cartao.cor }}
                >
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-base text-[#34495e] dark:text-slate-200">
                      Fatura {cartao.nome}
                    </SheetTitle>
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => navegarMes(-1)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-2 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                      </button>
                      <span className="text-sm font-medium text-[#34495e] dark:text-slate-200 min-w-[90px] text-center">
                        {formatMesAbrev(mesAtual)}
                      </span>
                      <button
                        onClick={() => navegarMes(1)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-surface-2 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </div>
                  <SheetDescription className="text-xs mt-0.5">
                    vence {dataVencimento}
                    {dataFechamento && ` • fecha ${dataFechamento}`}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* Resumo */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 bg-slate-50 dark:bg-surface-1 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</p>
                <p className="text-lg font-bold text-[#34495e] dark:text-slate-200">
                  {formatCurrency(fatura?.valor_total ?? totalValor)}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-surface-1 rounded-lg p-3 text-center min-w-[80px]">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Lanç.</p>
                <p className="text-lg font-bold text-[#34495e] dark:text-slate-200">
                  {lancamentos.length}
                </p>
              </div>
              <div className="flex items-center">
                {statusBadge(fatura?.status)}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={() => setDespesaModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Novo Lançamento
              </Button>
              {(!fatura || fatura.status === 'aberta') && lancamentos.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  onClick={() => setFecharFaturaConfirm(true)}
                >
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  Fechar Fatura
                </Button>
              )}
              {fatura?.status === 'fechada' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  onClick={handlePagarFatura}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Pagar
                </Button>
              )}
              {(fatura || lancamentos.length > 0) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-500/10"
                  onClick={() => setLimparFaturaConfirm(true)}
                >
                  <Eraser className="w-3.5 h-3.5 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Barra de seleção em massa */}
          {selectedIds.size > 0 && (
            <div className="sticky top-[180px] z-10 bg-blue-50 dark:bg-blue-500/10 border-b border-blue-200 dark:border-blue-800 px-5 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                <button onClick={() => setSelectedIds(new Set())} className="ml-2 underline text-blue-500">
                  Limpar
                </button>
              </span>
              <div className="flex items-center gap-2">
                <DropdownMenu open={bulkCategoriaOpen} onOpenChange={setBulkCategoriaOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      Categoria
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-60 overflow-y-auto">
                    {CATEGORIAS_DESPESA_CARTAO.map(cat => (
                      <DropdownMenuItem key={cat.value} onClick={() => handleBulkCategoria(cat.value)}>
                        {cat.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setBulkDeleteConfirm(true)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          )}

          {/* Lista de lançamentos */}
          <div className="p-5">
            {loadingData ? (
              <div className="py-8 text-center">
                <div className="h-6 w-6 mx-auto border-2 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin" />
                <p className="text-xs text-slate-400 mt-2">Carregando...</p>
              </div>
            ) : lancamentos.length === 0 ? (
              <div className="py-8 text-center">
                <DollarSign className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Nenhum lançamento em {formatMesAno(mesAtual)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-xs"
                  onClick={() => setDespesaModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Lançamento
                </Button>
              </div>
            ) : (
              <div className="space-y-0">
                {/* Header da lista */}
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    className="ml-1"
                  />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex-1">
                    {lancamentos.length} lançamento{lancamentos.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Valor
                  </span>
                </div>

                {/* Itens */}
                {lancamentos.map(lanc => (
                  <div
                    key={lanc.id}
                    className={cn(
                      'flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-surface-1 transition-colors group',
                      selectedIds.has(lanc.id) && 'bg-blue-50/50 dark:bg-blue-500/5'
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(lanc.id)}
                      onCheckedChange={() => toggleSelect(lanc.id)}
                      className="ml-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                          {lanc.data_compra ? formatDiaMes(lanc.data_compra) : '-'}
                        </span>
                        <span className="text-sm text-[#34495e] dark:text-slate-200 truncate">
                          {lanc.descricao}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-slate-100 dark:bg-surface-2 text-slate-500 dark:text-slate-400">
                          {getCategoriaLabel(lanc.categoria)}
                        </Badge>
                        {lanc.tipo === 'parcelada' && (
                          <span className="text-[9px] text-blue-600 dark:text-blue-400">
                            {lanc.parcela_numero}/{lanc.parcela_total}
                          </span>
                        )}
                        {lanc.tipo === 'recorrente' && (
                          <span className="text-[9px] text-purple-600 dark:text-purple-400">
                            Recorrente
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#34495e] dark:text-slate-200 tabular-nums shrink-0">
                      {formatCurrency(lanc.valor)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setLancamentoParaEditar(lanc)
                          setEditModalOpen(true)
                        }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {lanc.tipo === 'unica' && (
                          <DropdownMenuItem onClick={async () => {
                            const success = await updateLancamento(lanc.id, {
                              tipo: 'recorrente',
                              recorrente_ativo: true,
                            })
                            if (success) {
                              toast.success('Marcado como recorrente')
                              loadData()
                              onDataChange?.()
                            }
                          }}>
                            <Repeat className="h-3.5 w-3.5 mr-2 text-purple-600" />
                            Marcar como Recorrente
                          </DropdownMenuItem>
                        )}
                        {lanc.tipo === 'recorrente' && lanc.recorrente_ativo && (
                          <DropdownMenuItem onClick={async () => {
                            await cancelarRecorrente(lanc.compra_id)
                            toast.success('Recorrência cancelada')
                            loadData()
                            onDataChange?.()
                          }}>
                            <XCircle className="h-3.5 w-3.5 mr-2 text-amber-600" />
                            Cancelar Recorrência
                          </DropdownMenuItem>
                        )}
                        {lanc.tipo === 'recorrente' && !lanc.recorrente_ativo && (
                          <DropdownMenuItem onClick={async () => {
                            await reativarRecorrente(lanc.compra_id)
                            toast.success('Recorrência reativada')
                            loadData()
                            onDataChange?.()
                          }}>
                            <RotateCcw className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            Reativar Recorrência
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteConfirmId(lanc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {/* Total */}
                <div className="flex items-center justify-between pt-3 mt-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total</span>
                  <span className="text-base font-bold text-[#34495e] dark:text-slate-200">
                    {formatCurrency(totalValor)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal Nova Despesa */}
      {cartao && (
        <DespesaCartaoModal
          open={despesaModalOpen}
          onOpenChange={setDespesaModalOpen}
          cartaoId={cartao.id}
          escritorioId={cartao.escritorio_id}
          onSuccess={() => {
            loadData()
            onDataChange?.()
          }}
        />
      )}

      {/* Modal Editar Lançamento */}
      {lancamentoParaEditar && cartao && (
        <EditarLancamentoCartaoModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          escritorioId={cartao.escritorio_id}
          lancamento={lancamentoParaEditar}
          onSuccess={() => {
            loadData()
            onDataChange?.()
          }}
        />
      )}

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLancamento} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação fechar fatura */}
      <AlertDialog open={fecharFaturaConfirm} onOpenChange={setFecharFaturaConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Fatura</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Deseja fechar a fatura de {formatMesAno(mesAtual)}? Novos lançamentos não poderão ser adicionados.</p>
                {isFechamentoAntecipado && dataFechamentoReal && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      A data de fechamento desta fatura é <strong>{dataFechamentoReal.formatted}</strong>. Fechar antes pode excluir lançamentos que ainda seriam incluídos neste período.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFecharFatura} className="bg-amber-600 hover:bg-amber-700">
              {isFechamentoAntecipado ? 'Fechar Mesmo Assim' : 'Fechar Fatura'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação exclusão em massa */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} Lançamentos</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} lançamento{selectedIds.size > 1 ? 's' : ''}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              Excluir Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação limpar fatura */}
      <AlertDialog open={limparFaturaConfirm} onOpenChange={setLimparFaturaConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Limpar Fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai excluir <strong>todos os lançamentos</strong>, a fatura e a despesa vinculada
              de {formatMesAno(mesAtual)} do cartão {cartao?.nome}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!cartao) return
                // Buscar mes_referencia da fatura (competência) para limpar corretamente
                const mesRef = fatura?.mes_referencia
                  ? fatura.mes_referencia.substring(0, 10)
                  : mesAtual + '-01'

                const success = await limparFatura(cartao.id, mesRef)
                if (success) {
                  toast.success('Fatura limpa com sucesso')
                  setLimparFaturaConfirm(false)
                  onOpenChange(false)
                  onDataChange?.()
                } else {
                  toast.error('Erro ao limpar fatura')
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
