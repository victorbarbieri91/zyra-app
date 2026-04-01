'use client'

import { useState, useMemo, useEffect } from 'react'
import { FileText, Plus, FolderOpen, Trash2, DollarSign, Clock, ChevronDown, Building2, AlertTriangle, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatHoras } from '@/lib/utils'
import { LancamentoSelectableItem } from './LancamentoSelectableItem'
import type { LancamentoProntoFaturar, ProcessoFechamento, ContractLimits } from '@/hooks/useFaturamento'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PastaData {
  fechamento_id: string
  competencia: string
  qtd_processos: number
  valor_unitario: number
  valor_total: number
  processos_lista: ProcessoFechamento[]
}

interface ContratoGroup {
  contrato_id: string | null
  key: string
  label: string
  numero_contrato: string | null
  contrato_titulo: string | null
  honorarios: LancamentoProntoFaturar[]
  timesheet: LancamentoProntoFaturar[]
  pastas: LancamentoProntoFaturar[]
}

interface PreviewCollapsibleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteNome: string
  lancamentos: LancamentoProntoFaturar[]
  selectedIds: string[]
  onToggleLancamento: (id: string) => void
  onSetSelectedIds: (ids: string[]) => void
  onGerarFatura: () => void
  pastas?: PastaData[]
  onRemoverProcessoPasta?: (fechamentoId: string, processoId: string) => void
  onExcluirPasta?: (fechamentoId: string) => void
  contractLimits?: Record<string, ContractLimits>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value)

const formatCompetencia = (competencia: string) => {
  const date = new Date(competencia + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PreviewCollapsible({
  open,
  onOpenChange,
  clienteNome,
  lancamentos,
  selectedIds,
  onToggleLancamento,
  onSetSelectedIds,
  onGerarFatura,
  onRemoverProcessoPasta,
  onExcluirPasta,
  contractLimits = {},
}: PreviewCollapsibleProps) {
  const [activeContratoKey, setActiveContratoKey] = useState<string>('__all__')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showProcessosModal, setShowProcessosModal] = useState(false)
  const [selectedPasta, setSelectedPasta] = useState<PastaData | null>(null)

  // ── Agrupar por contrato ─────────────────────────────────────────────────
  const contratoGroups = useMemo((): ContratoGroup[] => {
    const map = new Map<string, ContratoGroup>()

    for (const l of lancamentos) {
      const key = l.contrato_id ?? '__avulso__'
      if (!map.has(key)) {
        map.set(key, {
          contrato_id: l.contrato_id ?? null,
          key,
          label: l.contrato_titulo || l.numero_contrato || 'Lançamentos Avulsos',
          numero_contrato: l.numero_contrato ?? null,
          contrato_titulo: l.contrato_titulo ?? null,
          honorarios: [],
          timesheet: [],
          pastas: [],
        })
      }
      const group = map.get(key)!
      if (l.tipo_lancamento === 'honorario') group.honorarios.push(l)
      else if (l.tipo_lancamento === 'timesheet') group.timesheet.push(l)
      else if (l.tipo_lancamento === 'pasta') group.pastas.push(l)
    }

    return Array.from(map.values()).sort((a, b) =>
      a.contrato_id === null ? 1 : b.contrato_id === null ? -1 : a.label.localeCompare(b.label)
    )
  }, [lancamentos])

  // Inicializar contrato ativo ao abrir
  useEffect(() => {
    if (open && contratoGroups.length > 0) {
      setActiveContratoKey(contratoGroups[0].key)
      setCollapsed({})
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Contrato ativo ────────────────────────────────────────────────────────
  const activeGroup = contratoGroups.find(g => g.key === activeContratoKey) ?? contratoGroups[0]

  // ── Totais globais ────────────────────────────────────────────────────────
  const totalSelecionados = selectedIds.length
  const totalValor = lancamentos
    .filter(l => selectedIds.includes(l.lancamento_id))
    .reduce((sum, l) => sum + (l.valor || 0), 0)

  // ── Helpers por seção ────────────────────────────────────────────────────
  const getGroupSelectedCount = (group: ContratoGroup) => {
    const all = [...group.honorarios, ...group.timesheet, ...group.pastas]
    return all.filter(l => selectedIds.includes(l.lancamento_id)).length
  }

  const getGroupTotal = (group: ContratoGroup) => {
    const all = [...group.honorarios, ...group.timesheet, ...group.pastas]
    return all
      .filter(l => selectedIds.includes(l.lancamento_id))
      .reduce((sum, l) => sum + (l.valor || 0), 0)
  }

  // Calcular ajuste contratual para um grupo (min/max mensal)
  // Considera timesheet + pasta do mesmo contrato para o cálculo
  const getGroupAdjustment = (group: ContratoGroup): { ajuste: number; subtotal: number; subtotalHoras: number; subtotalPastas: number; limite: number; tipo: 'min' | 'max' } | null => {
    if (!group.contrato_id || !contractLimits[group.contrato_id]) return null
    const { min, max } = contractLimits[group.contrato_id]
    const subtotalHoras = group.timesheet
      .filter(l => selectedIds.includes(l.lancamento_id))
      .reduce((sum, l) => sum + (l.valor || 0), 0)
    const subtotalPastas = group.pastas
      .filter(l => selectedIds.includes(l.lancamento_id))
      .reduce((sum, l) => sum + (l.valor || 0), 0)
    const subtotalCombinado = subtotalHoras + subtotalPastas
    if (subtotalHoras === 0 && subtotalPastas === 0) return null
    if (min !== null && subtotalCombinado < min) {
      return { ajuste: min - subtotalCombinado, subtotal: subtotalCombinado, subtotalHoras, subtotalPastas, limite: min, tipo: 'min' }
    }
    if (max !== null && subtotalCombinado > max) {
      return { ajuste: max - subtotalCombinado, subtotal: subtotalCombinado, subtotalHoras, subtotalPastas, limite: max, tipo: 'max' }
    }
    return null
  }

  // Total de ajustes contratuais — minimo: total vira o limite (proporcional, sem linha extra),
  // maximo: desconto negativo visivel
  const totalAjustes = useMemo(() => {
    let ajuste = 0
    for (const group of contratoGroups) {
      const adj = getGroupAdjustment(group)
      if (!adj) continue
      if (adj.tipo === 'min') {
        // Minimo: o total sera o limite (valor_hora inflado proporcionalmente)
        ajuste += adj.ajuste
      } else {
        // Maximo: desconto negativo
        ajuste += adj.ajuste
      }
    }
    return ajuste
  }, [contratoGroups, selectedIds, contractLimits]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSection = (sectionKey: string) =>
    setCollapsed(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))

  const toggleAllInSection = (items: LancamentoProntoFaturar[]) => {
    const ids = items.map(l => l.lancamento_id)
    const allSelected = ids.every(id => selectedIds.includes(id))
    if (allSelected) {
      onSetSelectedIds(selectedIds.filter(id => !ids.includes(id)))
    } else {
      const merged = [...selectedIds, ...ids.filter(id => !selectedIds.includes(id))]
      onSetSelectedIds(merged)
    }
  }

  // ── Sub-Dialog: Ver processos da pasta ────────────────────────────────────
  const handleVerProcessos = (pasta: LancamentoProntoFaturar) => {
    setSelectedPasta({
      fechamento_id: pasta.fechamento_id || '',
      competencia: pasta.competencia || '',
      qtd_processos: pasta.qtd_processos || 0,
      valor_unitario: pasta.valor_unitario || 0,
      valor_total: pasta.valor || 0,
      processos_lista: pasta.processos_lista || [],
    })
    setShowProcessosModal(true)
  }

  if (!open && !showProcessosModal) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-5xl w-full p-0 gap-0 flex flex-col overflow-hidden h-[90vh] sm:h-[88vh] lg:h-[85vh]"
        >
          {/* ── HEADER ──────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-[#34495e] to-[#46627f] text-white px-6 py-4 flex-shrink-0 rounded-t-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-semibold">Pré-visualização da Fatura</span>
                </div>
                <p className="text-sm font-medium text-white/90 mt-0.5 truncate">{clienteNome}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <span className="text-[10px] text-white/60">
                  {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} · {contratoGroups.length} contrato{contratoGroups.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* ── BODY: sidebar + content ──────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* Sidebar — apenas se 2+ contratos */}
            {contratoGroups.length > 1 && (
              <div className="w-52 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[hsl(var(--surface-1))] overflow-y-auto">
                <div className="py-2">
                  {contratoGroups.map(group => {
                    const total = [...group.honorarios, ...group.timesheet, ...group.pastas]
                    const selCount = getGroupSelectedCount(group)
                    const isActive = activeContratoKey === group.key
                    const hasAdj = getGroupAdjustment(group) !== null
                    return (
                      <button
                        key={group.key}
                        onClick={() => setActiveContratoKey(group.key)}
                        className={cn(
                          'w-full text-left px-4 py-3 transition-colors border-l-2 flex items-start gap-2',
                          isActive
                            ? 'bg-white dark:bg-[hsl(var(--surface-3))] border-l-[#1E3A8A] dark:border-l-blue-400 text-[#1E3A8A] dark:text-blue-300'
                            : 'border-l-transparent text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-[hsl(var(--surface-2))] hover:text-slate-800 dark:hover:text-slate-200'
                        )}
                      >
                        <Building2 className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', isActive ? 'text-[#1E3A8A] dark:text-blue-300' : 'text-slate-400')} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={cn('text-xs font-medium truncate', isActive ? 'text-[#1E3A8A] dark:text-blue-300' : 'text-slate-700 dark:text-slate-300')}>
                              {group.label}
                            </p>
                            {hasAdj && <Scale className="h-3 w-3 shrink-0 text-amber-500" />}
                          </div>
                          {group.numero_contrato && group.contrato_titulo && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{group.numero_contrato}</p>
                          )}
                          <p className={cn('text-[10px] mt-0.5', isActive ? 'text-[#1E3A8A]/70 dark:text-blue-300/70' : 'text-slate-400')}>
                            {selCount}/{total.length} selecionado{selCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Content area */}
            <ScrollArea className="flex-1 min-w-0">
              <div className="p-6 space-y-4">
                {activeGroup && (
                  <>
                    {/* Cabeçalho do contrato ativo */}
                    {contratoGroups.length > 1 && (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[#34495e] dark:text-slate-100">{activeGroup.label}</h3>
                          {activeGroup.numero_contrato && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeGroup.numero_contrato}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Selecionado neste contrato</p>
                          <p className="text-sm font-bold text-emerald-600">{formatCurrency(getGroupTotal(activeGroup))}</p>
                        </div>
                      </div>
                    )}

                    {/* Banner de ajuste contratual (min/max mensal) */}
                    {(() => {
                      const adj = getGroupAdjustment(activeGroup)
                      if (!adj) return null
                      const isMin = adj.tipo === 'min'
                      return (
                        <div className={cn(
                          'flex items-center justify-between px-4 py-2.5 rounded-lg border text-xs',
                          isMin
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-300'
                            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-700/50 text-blue-800 dark:text-blue-300'
                        )}>
                          <div className="flex items-center gap-2">
                            <Scale className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {isMin
                                ? `Subtotal ${formatCurrency(adj.subtotal)}${adj.subtotalPastas > 0 ? ` (horas ${formatCurrency(adj.subtotalHoras)} + pastas ${formatCurrency(adj.subtotalPastas)})` : ''} — Mínimo ${formatCurrency(adj.limite)}`
                                : `Subtotal ${formatCurrency(adj.subtotal)}${adj.subtotalPastas > 0 ? ` (horas ${formatCurrency(adj.subtotalHoras)} + pastas ${formatCurrency(adj.subtotalPastas)})` : ''} — Máximo ${formatCurrency(adj.limite)}`
                              }
                            </span>
                          </div>
                          <span className="font-semibold whitespace-nowrap ml-3">
                            {isMin
                              ? `Total: ${formatCurrency(adj.limite)}`
                              : `Redução: ${formatCurrency(adj.ajuste)}`
                            }
                          </span>
                        </div>
                      )
                    })()}

                    {/* Seção: Honorários */}
                    {activeGroup.honorarios.length > 0 && (
                      <CollapsibleSection
                        sectionKey={`${activeGroup.key}-honorarios`}
                        icon={<DollarSign className="h-4 w-4 text-[#1E3A8A]" />}
                        label="Honorários"
                        items={activeGroup.honorarios}
                        selectedIds={selectedIds}
                        collapsed={collapsed[`${activeGroup.key}-honorarios`] ?? false}
                        onToggleCollapse={() => toggleSection(`${activeGroup.key}-honorarios`)}
                        onToggleAll={() => toggleAllInSection(activeGroup.honorarios)}
                        renderItem={(h) => (
                          <LancamentoSelectableItem
                            key={h.lancamento_id}
                            lancamento={h}
                            selected={selectedIds.includes(h.lancamento_id)}
                            onToggle={onToggleLancamento}
                          />
                        )}
                      />
                    )}

                    {/* Seção: Horas */}
                    {activeGroup.timesheet.length > 0 && (
                      <CollapsibleSection
                        sectionKey={`${activeGroup.key}-horas`}
                        icon={<Clock className="h-4 w-4 text-[#89bcbe]" />}
                        label="Horas"
                        items={activeGroup.timesheet}
                        selectedIds={selectedIds}
                        collapsed={collapsed[`${activeGroup.key}-horas`] ?? false}
                        onToggleCollapse={() => toggleSection(`${activeGroup.key}-horas`)}
                        onToggleAll={() => toggleAllInSection(activeGroup.timesheet)}
                        renderItem={(t) => (
                          <LancamentoSelectableItem
                            key={t.lancamento_id}
                            lancamento={t}
                            selected={selectedIds.includes(t.lancamento_id)}
                            onToggle={onToggleLancamento}
                          />
                        )}
                      />
                    )}

                    {/* Seção: Pastas */}
                    {activeGroup.pastas.length > 0 && (
                      <CollapsibleSection
                        sectionKey={`${activeGroup.key}-pastas`}
                        icon={<FolderOpen className="h-4 w-4 text-amber-600" />}
                        label="Pastas"
                        items={activeGroup.pastas}
                        selectedIds={selectedIds}
                        collapsed={collapsed[`${activeGroup.key}-pastas`] ?? false}
                        onToggleCollapse={() => toggleSection(`${activeGroup.key}-pastas`)}
                        onToggleAll={() => toggleAllInSection(activeGroup.pastas)}
                        renderItem={(pasta) => (
                          <PastaItem
                            key={pasta.lancamento_id}
                            pasta={pasta}
                            selected={selectedIds.includes(pasta.lancamento_id)}
                            onToggle={onToggleLancamento}
                            onVerProcessos={handleVerProcessos}
                            onExcluir={onExcluirPasta}
                          />
                        )}
                      />
                    )}

                    {/* Sem lançamentos neste contrato */}
                    {activeGroup.honorarios.length === 0 &&
                      activeGroup.timesheet.length === 0 &&
                      activeGroup.pastas.length === 0 && (
                        <div className="py-12 text-center">
                          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum lançamento neste contrato</p>
                        </div>
                      )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ── FOOTER ──────────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[hsl(var(--surface-1))] flex-shrink-0 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div>
                {totalSelecionados > 0 ? (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {totalSelecionados} item{totalSelecionados !== 1 ? 's' : ''} selecionado{totalSelecionados !== 1 ? 's' : ''}
                      {totalAjustes !== 0 && (
                        <span className={cn('ml-2', totalAjustes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400')}>
                          ({totalAjustes > 0 ? '+' : ''}{formatCurrency(totalAjustes)} ajuste contratual)
                        </span>
                      )}
                    </p>
                    <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(totalValor + totalAjustes)}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">Selecione itens para gerar a fatura</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-slate-200 dark:border-slate-600 text-sm h-9"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={onGerarFatura}
                  disabled={totalSelecionados === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar Fatura ({totalSelecionados} {totalSelecionados === 1 ? 'item' : 'itens'})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog: Ver processos da pasta */}
      <Dialog open={showProcessosModal} onOpenChange={setShowProcessosModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-600" />
              Processos do Fechamento
            </DialogTitle>
          </DialogHeader>
          {selectedPasta && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-[hsl(var(--surface-2))] rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Competência: {formatCompetencia(selectedPasta.competencia)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {selectedPasta.qtd_processos} processos × {formatCurrency(selectedPasta.valor_unitario)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(selectedPasta.valor_total)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Processos incluídos:</p>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {selectedPasta.processos_lista.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhum processo encontrado</p>
                    ) : (
                      selectedPasta.processos_lista.map((processo) => (
                        <div key={processo.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-[hsl(var(--surface-2))] border border-slate-200 dark:border-slate-700 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {processo.numero_pasta || 'Sem pasta'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {processo.numero_cnj || processo.titulo || 'Sem identificação'}
                            </p>
                            {processo.cliente_nome && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{processo.cliente_nome}</p>
                            )}
                          </div>
                          {onRemoverProcessoPasta && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => {
                                onRemoverProcessoPasta(selectedPasta.fechamento_id, processo.id)
                                setSelectedPasta(prev =>
                                  prev ? {
                                    ...prev,
                                    processos_lista: prev.processos_lista.filter(p => p.id !== processo.id),
                                    qtd_processos: prev.qtd_processos - 1,
                                    valor_total: (prev.qtd_processos - 1) * prev.valor_unitario,
                                  } : null
                                )
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowProcessosModal(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── CollapsibleSection ───────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  sectionKey: string
  icon: React.ReactNode
  label: string
  items: LancamentoProntoFaturar[]
  selectedIds: string[]
  collapsed: boolean
  onToggleCollapse: () => void
  onToggleAll: () => void
  renderItem: (item: LancamentoProntoFaturar) => React.ReactNode
}

function CollapsibleSection({
  icon,
  label,
  items,
  selectedIds,
  collapsed,
  onToggleCollapse,
  onToggleAll,
  renderItem,
}: CollapsibleSectionProps) {
  const selectedCount = items.filter(l => selectedIds.includes(l.lancamento_id)).length
  const totalValue = items
    .filter(l => selectedIds.includes(l.lancamento_id))
    .reduce((sum, l) => sum + (l.valor || 0), 0)
  const allSelected = items.length > 0 && items.every(l => selectedIds.includes(l.lancamento_id))

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Header colapsável */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[hsl(var(--surface-2))] hover:bg-slate-50 dark:hover:bg-[hsl(var(--surface-3))] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-[10px] font-medium h-5 px-1.5">
            {selectedCount}/{items.length}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {totalValue > 0 && (
            <span className="text-sm font-semibold text-emerald-600">{formatCurrency(totalValue)}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 h-6 px-2"
            onClick={(e) => { e.stopPropagation(); onToggleAll() }}
          >
            {allSelected ? 'Desmarcar' : 'Selecionar todos'}
          </Button>
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform duration-150', !collapsed && 'rotate-180')}
          />
        </div>
      </button>

      {/* Body — expandido por padrão (collapsed = false → visível) */}
      {!collapsed && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 border-t border-slate-100 dark:border-slate-700/50">
          {items.map(item => renderItem(item))}
        </div>
      )}
    </div>
  )
}

// ─── PastaItem ────────────────────────────────────────────────────────────────

interface PastaItemProps {
  pasta: LancamentoProntoFaturar
  selected: boolean
  onToggle: (id: string) => void
  onVerProcessos: (pasta: LancamentoProntoFaturar) => void
  onExcluir?: (fechamentoId: string) => void
}

function PastaItem({ pasta, selected, onToggle, onVerProcessos, onExcluir }: PastaItemProps) {
  const formatComp = (c: string) => {
    const d = new Date(c + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
        selected ? 'bg-[#1E3A8A]/5 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-[hsl(var(--surface-3))]'
      )}
      onClick={() => onToggle(pasta.lancamento_id)}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(pasta.lancamento_id)}
        onClick={(e) => e.stopPropagation()}
        className="rounded border-slate-300 dark:border-slate-600 text-[#1E3A8A] focus:ring-[#1E3A8A] h-4 w-4 mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">Fechamento Mensal</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {pasta.competencia ? formatComp(pasta.competencia) : 'Competência não definida'}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-300 px-1.5 py-0 h-4">
            {pasta.qtd_processos || 0} processos
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-300 px-1.5 py-0 h-4">
            {formatCurrency(pasta.valor_unitario || 0)}/pasta
          </Badge>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <p className="text-xs font-semibold text-emerald-600">{formatCurrency(pasta.valor || 0)}</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] text-[#1E3A8A] dark:text-blue-400 h-5 px-1.5"
          onClick={(e) => { e.stopPropagation(); onVerProcessos(pasta) }}
        >
          Ver processos
        </Button>
        {onExcluir && pasta.fechamento_id && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] text-red-500 hover:text-red-700 dark:hover:text-red-400 h-5 px-1.5"
            title="Excluir fechamento (remove do disponível para faturar)"
            onClick={(e) => { e.stopPropagation(); onExcluir(pasta.fechamento_id!) }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
