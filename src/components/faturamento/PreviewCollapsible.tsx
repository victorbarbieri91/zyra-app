'use client'

import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LancamentoSelectableItem } from './LancamentoSelectableItem'
import type { LancamentoProntoFaturar } from '@/hooks/useFaturamento'

interface PreviewCollapsibleProps {
  clienteNome: string
  lancamentos: LancamentoProntoFaturar[]
  selectedIds: string[]
  onToggleLancamento: (id: string) => void
  onGerarFatura: () => void
  onCancelar: () => void
}

export function PreviewCollapsible({
  clienteNome,
  lancamentos,
  selectedIds,
  onToggleLancamento,
  onGerarFatura,
  onCancelar,
}: PreviewCollapsibleProps) {
  const [collapsed, setCollapsed] = useState(false)

  const honorarios = lancamentos.filter((l) => l.tipo_lancamento === 'honorario')
  const timesheet = lancamentos.filter((l) => l.tipo_lancamento === 'timesheet')

  const selectedHonorarios = honorarios.filter((h) =>
    selectedIds.includes(h.lancamento_id)
  )
  const selectedTimesheet = timesheet.filter((t) =>
    selectedIds.includes(t.lancamento_id)
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const calcularTotal = () => {
    let total = 0

    selectedHonorarios.forEach((h) => {
      total += h.valor || 0
    })

    selectedTimesheet.forEach((t) => {
      const valorHora = 400 // TODO: buscar do contrato
      total += (t.horas || 0) * valorHora
    })

    return total
  }

  const totalSelecionados = selectedIds.length

  // Determinar aba padrão: se só tiver um tipo, mostrar ele; senão, mostrar honorários
  const getDefaultTab = () => {
    if (honorarios.length > 0 && timesheet.length === 0) return 'honorarios'
    if (timesheet.length > 0 && honorarios.length === 0) return 'horas'
    return 'honorarios' // Se tiver ambos ou nenhum, mostrar honorários
  }

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
        <CardContent className="pt-4 pb-3">
          {/* Cabeçalho */}
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#34495e]">{clienteNome}</h3>
            <p className="text-xs text-slate-600 mt-1">
              Fatura: FAT-2025-XXX • Emissão: {new Date().toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              {totalSelecionados} {totalSelecionados === 1 ? 'item selecionado' : 'itens selecionados'}
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue={getDefaultTab()} className="mb-4">
            {/* Mostrar TabsList apenas se houver ambos os tipos */}
            {honorarios.length > 0 && timesheet.length > 0 ? (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="honorarios" className="text-xs">
                  Honorários ({selectedHonorarios.length}/{honorarios.length})
                </TabsTrigger>
                <TabsTrigger value="horas" className="text-xs">
                  Horas ({selectedTimesheet.length}/{timesheet.length})
                </TabsTrigger>
              </TabsList>
            ) : null}

            {/* Tab Honorários */}
            <TabsContent value="honorarios" className="mt-3">
              {honorarios.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500">
                    Nenhum honorário disponível
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-2">
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
            <TabsContent value="horas" className="mt-3">
              {timesheet.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500">
                    Nenhuma hora disponível
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-2">
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
          </Tabs>

          {/* Total */}
          {totalSelecionados > 0 && (
            <div className="pt-3 border-t border-slate-200 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Valor Total:</span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(calcularTotal())}
                </span>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="space-y-2">
            <Button
              onClick={onGerarFatura}
              disabled={totalSelecionados === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Gerar Fatura ({totalSelecionados}{' '}
              {totalSelecionados === 1 ? 'item' : 'itens'})
            </Button>
            <Button
              variant="outline"
              className="w-full border-slate-200"
              onClick={onCancelar}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
