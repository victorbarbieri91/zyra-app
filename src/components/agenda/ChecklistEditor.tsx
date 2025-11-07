'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, X, GripVertical, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChecklistItem {
  id?: string
  item: string
  concluido?: boolean
  ordem: number
}

interface ChecklistEditorProps {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
  editable?: boolean
  className?: string
}

export default function ChecklistEditor({
  items,
  onChange,
  editable = true,
  className,
}: ChecklistEditorProps) {
  const [newItemText, setNewItemText] = useState('')

  const handleAddItem = () => {
    if (!newItemText.trim()) return

    const novoItem: ChecklistItem = {
      item: newItemText,
      concluido: false,
      ordem: items.length,
    }

    onChange([...items, novoItem])
    setNewItemText('')
  }

  const handleToggleItem = (index: number) => {
    const novosItems = [...items]
    novosItems[index].concluido = !novosItems[index].concluido
    onChange(novosItems)
  }

  const handleRemoveItem = (index: number) => {
    const novosItems = items.filter((_, i) => i !== index)
    // Reordenar
    novosItems.forEach((item, i) => {
      item.ordem = i
    })
    onChange(novosItems)
  }

  const handleEditItem = (index: number, newText: string) => {
    const novosItems = [...items]
    novosItems[index].item = newText
    onChange(novosItems)
  }

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return
    }

    const novosItems = [...items]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    // Swap
    ;[novosItems[index], novosItems[newIndex]] = [novosItems[newIndex], novosItems[index]]

    // Atualizar ordem
    novosItems.forEach((item, i) => {
      item.ordem = i
    })

    onChange(novosItems)
  }

  const calcularProgresso = () => {
    if (items.length === 0) return 0
    const concluidos = items.filter(i => i.concluido).length
    return Math.round((concluidos / items.length) * 100)
  }

  const progresso = calcularProgresso()

  return (
    <div className={cn('space-y-3', className)}>
      {/* Barra de Progresso */}
      {items.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#46627f] font-medium">Progresso</span>
            <span className="text-[#34495e] font-semibold">{progresso}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg border bg-white transition-colors',
              item.concluido
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-slate-200 hover:border-[#89bcbe]'
            )}
          >
            {/* Checkbox */}
            <Checkbox
              checked={item.concluido || false}
              onCheckedChange={() => handleToggleItem(index)}
              className="flex-shrink-0"
            />

            {/* Item Text */}
            {editable ? (
              <Input
                value={item.item}
                onChange={(e) => handleEditItem(index, e.target.value)}
                className={cn(
                  'flex-1 border-0 bg-transparent h-8 text-sm focus-visible:ring-0 px-2',
                  item.concluido && 'line-through text-slate-500'
                )}
                placeholder="Descreva o item..."
              />
            ) : (
              <span
                className={cn(
                  'flex-1 text-sm px-2',
                  item.concluido ? 'line-through text-slate-500' : 'text-[#34495e]'
                )}
              >
                {item.item}
              </span>
            )}

            {/* Actions */}
            {editable && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Move Up/Down */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveItem(index, 'up')}
                  disabled={index === 0}
                  className="h-7 w-7 p-0"
                >
                  <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                </Button>

                {/* Remove */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Check Icon (se concluído) */}
            {item.concluido && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Item */}
      {editable && (
        <div className="flex gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddItem()
              }
            }}
            placeholder="Adicionar novo item..."
            className="flex-1 text-sm border-slate-200"
          />
          <Button
            type="button"
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            className="bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] hover:from-[#6ba9ab] hover:to-[#5a9a9c] text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
          Nenhum item no checklist
        </div>
      )}
    </div>
  )
}
