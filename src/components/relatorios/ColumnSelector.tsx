'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react'
import { COLUNAS_DISPONIVEIS, ColunaRelatorio } from '@/types/relatorios'
import { cn } from '@/lib/utils'

interface ColumnSelectorProps {
  selectedColumns: string[]
  onColumnsChange: (columns: string[]) => void
}

export function ColumnSelector({ selectedColumns, onColumnsChange }: ColumnSelectorProps) {
  const [showOrderPanel, setShowOrderPanel] = useState(false)

  const toggleColumn = (field: string) => {
    if (selectedColumns.includes(field)) {
      onColumnsChange(selectedColumns.filter(c => c !== field))
    } else {
      onColumnsChange([...selectedColumns, field])
    }
  }

  const selectAll = () => {
    onColumnsChange(COLUNAS_DISPONIVEIS.map(c => c.field))
  }

  const selectNone = () => {
    onColumnsChange([])
  }

  const moveColumn = (field: string, direction: 'up' | 'down') => {
    const index = selectedColumns.indexOf(field)
    if (index === -1) return

    const newColumns = [...selectedColumns]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex < 0 || newIndex >= newColumns.length) return

    // Swap
    ;[newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]]
    onColumnsChange(newColumns)
  }

  const removeColumn = (field: string) => {
    onColumnsChange(selectedColumns.filter(c => c !== field))
  }

  const getColumnLabel = (field: string) => {
    return COLUNAS_DISPONIVEIS.find(c => c.field === field)?.label || field
  }

  const isSpecialColumn = (field: string) => {
    return COLUNAS_DISPONIVEIS.find(c => c.field === field)?.special
  }

  // Agrupar colunas por categoria
  const colunasIdentificacao = COLUNAS_DISPONIVEIS.filter(c =>
    ['numero_pasta', 'numero_cnj'].includes(c.field)
  )
  const colunasProcessuais = COLUNAS_DISPONIVEIS.filter(c =>
    ['area', 'fase', 'instancia', 'tribunal', 'vara', 'comarca', 'status'].includes(c.field)
  )
  const colunasPartes = COLUNAS_DISPONIVEIS.filter(c =>
    ['autor', 'reu', 'parte_contraria', 'polo_cliente'].includes(c.field)
  )
  const colunasValores = COLUNAS_DISPONIVEIS.filter(c =>
    ['valor_causa', 'valor_atualizado', 'data_distribuicao'].includes(c.field)
  )
  const colunasOutras = COLUNAS_DISPONIVEIS.filter(c =>
    ['objeto_acao', 'responsavel_nome', 'resumo_ia'].includes(c.field)
  )

  const renderColumnGroup = (title: string, columns: ColunaRelatorio[]) => (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</h4>
      <div className="space-y-1.5">
        {columns.map(coluna => (
          <div
            key={coluna.field}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer",
              selectedColumns.includes(coluna.field)
                ? "border-[#89bcbe] bg-[#f0f9f9]"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            )}
            onClick={() => toggleColumn(coluna.field)}
          >
            <Checkbox
              id={coluna.field}
              checked={selectedColumns.includes(coluna.field)}
              onCheckedChange={() => toggleColumn(coluna.field)}
              className="pointer-events-none"
            />
            <Label
              htmlFor={coluna.field}
              className="flex-1 text-sm text-slate-700 cursor-pointer"
            >
              {coluna.label}
            </Label>
            {coluna.special && (
              <Badge className="bg-[#89bcbe] text-white text-[10px] px-1.5 py-0.5">
                <Sparkles className="w-3 h-3 mr-1" />
                IA
              </Badge>
            )}
            {coluna.format === 'currency' && (
              <Badge variant="outline" className="text-[10px] text-slate-500">
                R$
              </Badge>
            )}
            {coluna.format === 'date' && (
              <Badge variant="outline" className="text-[10px] text-slate-500">
                Data
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700">
              Colunas do Relatorio
            </CardTitle>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-[#34495e] hover:underline"
              >
                Selecionar todas
              </button>
              <span className="text-xs text-slate-300">|</span>
              <button
                onClick={selectNone}
                className="text-xs text-slate-500 hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {selectedColumns.length} coluna{selectedColumns.length !== 1 ? 's' : ''} selecionada{selectedColumns.length !== 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              {renderColumnGroup('Identificacao', colunasIdentificacao)}
              {renderColumnGroup('Valores', colunasValores)}
            </div>
            <div className="space-y-4">
              {renderColumnGroup('Dados Processuais', colunasProcessuais)}
            </div>
            <div className="space-y-4">
              {renderColumnGroup('Partes', colunasPartes)}
              {renderColumnGroup('Outras Informacoes', colunasOutras)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Painel de ordenacao */}
      {selectedColumns.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">
                Ordem das Colunas no Relatorio
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOrderPanel(!showOrderPanel)}
                className="h-7 text-xs text-[#34495e]"
              >
                {showOrderPanel ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
            {!showOrderPanel && (
              <p className="text-xs text-slate-500 mt-1">
                {selectedColumns.map(f => getColumnLabel(f)).join(' → ')}
              </p>
            )}
          </CardHeader>
          {showOrderPanel && (
            <CardContent className="pt-0 pb-4">
              <div className="space-y-1.5">
                {selectedColumns.map((field, index) => (
                  <div
                    key={field}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 w-6">
                      {index + 1}.
                    </span>
                    <span className="flex-1 text-sm text-slate-700">
                      {getColumnLabel(field)}
                    </span>
                    {isSpecialColumn(field) && (
                      <Badge className="bg-[#89bcbe] text-white text-[10px] px-1.5 py-0.5">
                        IA
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveColumn(field, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveColumn(field, 'down')}
                        disabled={index === selectedColumns.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => removeColumn(field)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
