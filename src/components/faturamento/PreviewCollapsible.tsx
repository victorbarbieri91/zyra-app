'use client'

import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp, Plus, FolderOpen, X, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LancamentoSelectableItem } from './LancamentoSelectableItem'
import type { LancamentoProntoFaturar, ProcessoFechamento } from '@/hooks/useFaturamento'

interface PastaData {
  fechamento_id: string
  competencia: string
  qtd_processos: number
  valor_unitario: number
  valor_total: number
  processos_lista: ProcessoFechamento[]
}

interface PreviewCollapsibleProps {
  clienteNome: string
  lancamentos: LancamentoProntoFaturar[]
  selectedIds: string[]
  onToggleLancamento: (id: string) => void
  onGerarFatura: () => void
  onCancelar: () => void
  pastas?: PastaData[]
  onRemoverProcessoPasta?: (fechamentoId: string, processoId: string) => void
}

export function PreviewCollapsible({
  clienteNome,
  lancamentos,
  selectedIds,
  onToggleLancamento,
  onGerarFatura,
  onCancelar,
  pastas = [],
  onRemoverProcessoPasta,
}: PreviewCollapsibleProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showProcessosModal, setShowProcessosModal] = useState(false)
  const [selectedPasta, setSelectedPasta] = useState<PastaData | null>(null)

  const honorarios = lancamentos.filter((l) => l.tipo_lancamento === 'honorario')
  const timesheet = lancamentos.filter((l) => l.tipo_lancamento === 'timesheet')
  const pastaLancamentos = lancamentos.filter((l) => l.tipo_lancamento === 'pasta')

  const selectedHonorarios = honorarios.filter((h) =>
    selectedIds.includes(h.lancamento_id)
  )
  const selectedTimesheet = timesheet.filter((t) =>
    selectedIds.includes(t.lancamento_id)
  )
  const selectedPastas = pastaLancamentos.filter((p) =>
    selectedIds.includes(p.lancamento_id)
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatCompetencia = (competencia: string) => {
    const date = new Date(competencia + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  const calcularTotal = () => {
    let total = 0

    selectedHonorarios.forEach((h) => {
      total += h.valor || 0
    })

    selectedTimesheet.forEach((t) => {
      // Usar valor já calculado pela view (inclui valor_hora do contrato)
      total += t.valor || 0
    })

    selectedPastas.forEach((p) => {
      total += p.valor || 0
    })

    return total
  }

  const handleVerProcessos = (pasta: LancamentoProntoFaturar) => {
    const pastaData: PastaData = {
      fechamento_id: pasta.fechamento_id || '',
      competencia: pasta.competencia || '',
      qtd_processos: pasta.qtd_processos || 0,
      valor_unitario: pasta.valor_unitario || 0,
      valor_total: pasta.valor || 0,
      processos_lista: pasta.processos_lista || [],
    }
    setSelectedPasta(pastaData)
    setShowProcessosModal(true)
  }

  const totalSelecionados = selectedIds.length

  // Determinar aba padrão: priorizar pastas se só tiver pastas, senão honorários
  const getDefaultTab = () => {
    if (pastaLancamentos.length > 0 && honorarios.length === 0 && timesheet.length === 0) return 'pastas'
    if (honorarios.length > 0 && timesheet.length === 0 && pastaLancamentos.length === 0) return 'honorarios'
    if (timesheet.length > 0 && honorarios.length === 0 && pastaLancamentos.length === 0) return 'horas'
    return 'honorarios' // Se tiver múltiplos tipos, mostrar honorários primeiro
  }

  // Calcular quantas colunas/tabs mostrar
  const tiposDisponiveis = [
    honorarios.length > 0 ? 'honorarios' : null,
    timesheet.length > 0 ? 'horas' : null,
    pastaLancamentos.length > 0 ? 'pastas' : null,
  ].filter(Boolean)

  const qtdTabs = tiposDisponiveis.length

  return (
    <Card className="border-[#1E3A8A] shadow-lg">
      {/* Header */}
      <CardHeader
        className="pb-2 pt-3 bg-gradient-to-br from-[#34495e] to-[#46627f] text-white rounded-t-lg cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pré-visualização da Fatura
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 h-7 w-7 p-0"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Content */}
      {!collapsed && (
        <CardContent className="pt-3 pb-2 px-3">
          {/* Cabeçalho */}
          <div className="mb-2.5">
            <h3 className="text-xs font-semibold text-[#34495e] leading-tight">{clienteNome}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Fatura: FAT-2025-XXX • Emissão: {new Date().toLocaleDateString('pt-BR')}
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
              {totalSelecionados} {totalSelecionados === 1 ? 'item selecionado' : 'itens selecionados'}
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue={getDefaultTab()} className="mb-2.5">
            {/* Mostrar TabsList apenas se houver mais de um tipo */}
            {qtdTabs > 1 && (
              <TabsList className={`grid w-full grid-cols-${qtdTabs} h-7`}>
                {honorarios.length > 0 && (
                  <TabsTrigger value="honorarios" className="text-[10px] py-1">
                    Honorários ({selectedHonorarios.length}/{honorarios.length})
                  </TabsTrigger>
                )}
                {timesheet.length > 0 && (
                  <TabsTrigger value="horas" className="text-[10px] py-1">
                    Horas ({selectedTimesheet.length}/{timesheet.length})
                  </TabsTrigger>
                )}
                {pastaLancamentos.length > 0 && (
                  <TabsTrigger value="pastas" className="text-[10px] py-1">
                    Pastas ({selectedPastas.length}/{pastaLancamentos.length})
                  </TabsTrigger>
                )}
              </TabsList>
            )}

            {/* Tab Honorários */}
            <TabsContent value="honorarios" className="mt-2">
              {honorarios.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[10px] text-slate-500">
                    Nenhum honorário disponível
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[260px] pr-2">
                  <div className="space-y-1.5">
                    {honorarios.map((honorario) => (
                      <LancamentoSelectableItem
                        key={honorario.lancamento_id}
                        lancamento={honorario}
                        selected={selectedIds.includes(honorario.lancamento_id)}
                        onToggle={onToggleLancamento}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Tab Horas */}
            <TabsContent value="horas" className="mt-2">
              {timesheet.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[10px] text-slate-500">
                    Nenhuma hora disponível
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[260px] pr-2">
                  <div className="space-y-1.5">
                    {timesheet.map((hora) => (
                      <LancamentoSelectableItem
                        key={hora.lancamento_id}
                        lancamento={hora}
                        selected={selectedIds.includes(hora.lancamento_id)}
                        onToggle={onToggleLancamento}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Tab Pastas (Fechamento Mensal) */}
            <TabsContent value="pastas" className="mt-2">
              {pastaLancamentos.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[10px] text-slate-500">
                    Nenhum fechamento de pasta disponível
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[260px] pr-2">
                  <div className="space-y-1.5">
                    {pastaLancamentos.map((pasta) => (
                      <div
                        key={pasta.lancamento_id}
                        className={`p-2 rounded-md border transition-colors cursor-pointer ${
                          selectedIds.includes(pasta.lancamento_id)
                            ? 'border-[#1E3A8A] bg-[#1E3A8A]/5'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                        onClick={() => onToggleLancamento(pasta.lancamento_id)}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(pasta.lancamento_id)}
                              onChange={() => onToggleLancamento(pasta.lancamento_id)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A] h-3.5 w-3.5"
                            />
                            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                              <FolderOpen className="w-2.5 h-2.5 text-amber-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-slate-800">
                              Fechamento Mensal
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {pasta.competencia ? formatCompetencia(pasta.competencia) : 'Competência não definida'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[9px] bg-slate-50 px-1 py-0 h-4">
                                {pasta.qtd_processos || 0} processos
                              </Badge>
                              <Badge variant="outline" className="text-[9px] bg-slate-50 px-1 py-0 h-4">
                                {formatCurrency(pasta.valor_unitario || 0)}/pasta
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-semibold text-emerald-600">
                              {formatCurrency(pasta.valor || 0)}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[9px] text-[#1E3A8A] h-5 px-1.5 mt-0.5"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleVerProcessos(pasta)
                              }}
                            >
                              Ver processos
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          {/* Total */}
          {totalSelecionados > 0 && (
            <div className="pt-2 border-t border-slate-200 mb-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Valor Total:</span>
                <span className="text-base font-bold text-emerald-600">
                  {formatCurrency(calcularTotal())}
                </span>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="space-y-1.5">
            <Button
              onClick={onGerarFatura}
              disabled={totalSelecionados === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Gerar Fatura ({totalSelecionados}{' '}
              {totalSelecionados === 1 ? 'item' : 'itens'})
            </Button>
            <Button
              variant="outline"
              className="w-full border-slate-200 h-7 text-xs"
              onClick={onCancelar}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      )}

      {/* Modal para ver processos da pasta */}
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
              {/* Resumo do fechamento */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Competência: {formatCompetencia(selectedPasta.competencia)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedPasta.qtd_processos} processos × {formatCurrency(selectedPasta.valor_unitario)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      {formatCurrency(selectedPasta.valor_total)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de processos */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Processos incluídos:</p>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {selectedPasta.processos_lista.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Nenhum processo encontrado
                      </p>
                    ) : (
                      selectedPasta.processos_lista.map((processo) => (
                        <div
                          key={processo.id}
                          className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {processo.numero_pasta || 'Sem pasta'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {processo.numero_cnj || processo.titulo || 'Sem identificação'}
                            </p>
                            {processo.cliente_nome && (
                              <p className="text-[10px] text-slate-400 truncate">
                                {processo.cliente_nome}
                              </p>
                            )}
                          </div>
                          {onRemoverProcessoPasta && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                onRemoverProcessoPasta(selectedPasta.fechamento_id, processo.id)
                                // Atualizar lista local
                                setSelectedPasta((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        processos_lista: prev.processos_lista.filter(
                                          (p) => p.id !== processo.id
                                        ),
                                        qtd_processos: prev.qtd_processos - 1,
                                        valor_total:
                                          (prev.qtd_processos - 1) * prev.valor_unitario,
                                      }
                                    : null
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

              {/* Botão fechar */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowProcessosModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
