'use client'

import { useState, useMemo } from 'react'
import { Search, Settings, Plus, Tag as TagIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tag, TagContexto } from '@/types/tags'
import { useTags } from '@/hooks/useTags'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import TagBadge, { TagBadgeList } from './TagBadge'
import { Skeleton } from '@/components/ui/skeleton'

interface TagSelectorProps {
  contexto: TagContexto
  escritorioId: string
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  onOpenManager?: () => void
  maxHeight?: string
  showSelectedFirst?: boolean
  className?: string
}

export default function TagSelector({
  contexto,
  escritorioId,
  selectedTagIds,
  onChange,
  onOpenManager,
  maxHeight = '300px',
  showSelectedFirst = true,
  className,
}: TagSelectorProps) {
  const { tags, loading, createTag } = useTags(contexto, escritorioId)
  const [searchQuery, setSearchQuery] = useState('')

  // Filtrar tags baseado na busca
  const filteredTags = useMemo(() => {
    let result = tags

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((tag) =>
        tag.nome.toLowerCase().includes(query) ||
        tag.descricao?.toLowerCase().includes(query)
      )
    }

    // Ordenar: selecionadas primeiro (se habilitado), depois por ordem
    if (showSelectedFirst) {
      result = result.sort((a, b) => {
        const aSelected = selectedTagIds.includes(a.id)
        const bSelected = selectedTagIds.includes(b.id)

        if (aSelected && !bSelected) return -1
        if (!aSelected && bSelected) return 1

        return a.ordem - b.ordem
      })
    }

    return result
  }, [tags, searchQuery, selectedTagIds, showSelectedFirst])

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds]
  )

  const handleTagClick = (tag: Tag) => {
    const isSelected = selectedTagIds.includes(tag.id)

    if (isSelected) {
      // Remover
      onChange(selectedTagIds.filter((id) => id !== tag.id))
    } else {
      // Adicionar
      onChange([...selectedTagIds, tag.id])
    }
  }

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId))
  }

  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Função auxiliar para calcular contraste de cor
  const getContrastColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#FFFFFF'
  }

  // Criar nova tag
  const handleCreateTag = async () => {
    if (!searchQuery.trim() || !escritorioId || !createTag) return

    setIsCreating(true)
    try {
      // Cores padrão para novas tags
      const defaultColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280']
      const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)]

      const newTag = await createTag({
        nome: searchQuery.trim(),
        cor: randomColor,
        contexto,
      })

      // Adicionar a tag recém-criada à seleção
      if (newTag?.id) {
        onChange([...selectedTagIds, newTag.id])
      }

      setSearchQuery('')
    } catch (error) {
      console.error('Erro ao criar tag:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Tags Selecionadas - Formato Real de Etiqueta com bordas arredondadas */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shadow-sm cursor-default"
              style={{
                backgroundColor: tag.cor,
                color: getContrastColor(tag.cor)
              }}
            >
              <span>{tag.nome}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveTag(tag.id)
                }}
                className="hover:opacity-70 transition-opacity ml-0.5"
                style={{ color: getContrastColor(tag.cor) }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botão Minimalista para Adicionar Etiquetas */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-[#89bcbe] hover:text-[#89bcbe] hover:bg-[#f0f9f9]/50 transition-all"
          >
            <TagIcon className="w-3.5 h-3.5" />
            <span>Adicionar etiqueta</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          align="start"
          sideOffset={4}
        >
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar etiqueta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-3">
            {loading ? (
              <div className="space-y-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-7 w-full rounded-full" />
                ))}
              </div>
            ) : filteredTags.length === 0 && searchQuery.trim() ? (
              <div className="text-center py-6">
                <div className="text-xs text-slate-400 mb-3">
                  Nenhuma etiqueta encontrada
                </div>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={isCreating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#89bcbe] hover:bg-[#6ba9ab] rounded-full shadow-sm transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isCreating ? 'Criando...' : `Criar "${searchQuery}"`}
                </button>
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-xs text-slate-400 mb-2">
                  Nenhuma etiqueta disponível
                </div>
                {onOpenManager && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenManager()
                      setOpen(false)
                    }}
                    className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] font-medium"
                  >
                    + Criar primeira etiqueta
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {filteredTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id)

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagClick(tag)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shadow-sm',
                          isSelected && 'ring-2 ring-[#89bcbe] ring-offset-1'
                        )}
                        style={{
                          backgroundColor: tag.cor,
                          color: getContrastColor(tag.cor)
                        }}
                        title={tag.descricao || tag.nome}
                      >
                        <span>{tag.nome}</span>
                        {isSelected && <span>✓</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Botão criar nova quando há busca mas com resultados */}
                {searchQuery.trim() && !filteredTags.find(t => t.nome.toLowerCase() === searchQuery.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    disabled={isCreating}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-[#89bcbe] hover:text-[#6ba9ab] hover:bg-[#f0f9f9] rounded-lg transition-colors border border-dashed border-slate-200 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isCreating ? 'Criando...' : `Criar "${searchQuery}"`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer - Gerenciar */}
          {onOpenManager && filteredTags.length > 0 && (
            <div className="border-t border-slate-200 p-2">
              <button
                type="button"
                onClick={() => {
                  onOpenManager()
                  setOpen(false)
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#34495e] hover:text-[#89bcbe] hover:bg-[#f0f9f9] rounded transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="font-medium">Gerenciar etiquetas</span>
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
