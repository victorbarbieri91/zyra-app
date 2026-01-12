'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tag, shouldUseWhiteText } from '@/types/tags'

interface TagBadgeProps {
  tag: Tag
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5 h-4',
  md: 'text-xs px-2 py-1 h-5',
  lg: 'text-sm px-2.5 py-1.5 h-6',
}

export default function TagBadge({
  tag,
  size = 'md',
  removable = false,
  onRemove,
  onClick,
  className,
}: TagBadgeProps) {
  const useWhiteText = shouldUseWhiteText(tag.cor)

  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium transition-all',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{
        backgroundColor: tag.cor,
        color: useWhiteText ? '#ffffff' : '#1f2937',
      }}
    >
      <span className="truncate">{tag.nome}</span>

      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={cn(
            'rounded-sm transition-opacity hover:opacity-70',
            size === 'sm' && 'w-2.5 h-2.5',
            size === 'md' && 'w-3 h-3',
            size === 'lg' && 'w-3.5 h-3.5'
          )}
          aria-label={`Remover tag ${tag.nome}`}
        >
          <X className="w-full h-full" />
        </button>
      )}
    </div>
  )
}

// Componente auxiliar para exibir múltiplas tags
interface TagBadgeListProps {
  tags: Tag[]
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemoveTag?: (tagId: string) => void
  onClickTag?: (tag: Tag) => void
  maxVisible?: number
  className?: string
}

export function TagBadgeList({
  tags,
  size = 'md',
  removable = false,
  onRemoveTag,
  onClickTag,
  maxVisible,
  className,
}: TagBadgeListProps) {
  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags
  const hiddenCount = maxVisible && tags.length > maxVisible ? tags.length - maxVisible : 0

  if (tags.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          removable={removable}
          onRemove={onRemoveTag ? () => onRemoveTag(tag.id) : undefined}
          onClick={onClickTag ? () => onClickTag(tag) : undefined}
        />
      ))}

      {hiddenCount > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-600 font-medium',
            sizeClasses[size]
          )}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  )
}
