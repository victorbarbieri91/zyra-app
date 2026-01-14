import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  variant?: 'default' | 'compact' | 'card'
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const isCompact = variant === 'compact'
  const isCard = variant === 'card'

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      isCompact ? 'py-4 px-3' : 'py-8 px-6',
      isCard && 'bg-slate-50/50 rounded-lg border border-dashed border-slate-200',
      className
    )}>
      <div className={cn(
        'rounded-full flex items-center justify-center mb-3',
        isCompact
          ? 'w-10 h-10 bg-slate-100'
          : 'w-14 h-14 bg-gradient-to-br from-[#89bcbe]/20 to-[#aacfd0]/20'
      )}>
        <Icon className={cn(
          'text-[#89bcbe]',
          isCompact ? 'w-5 h-5' : 'w-7 h-7'
        )} />
      </div>

      <h3 className={cn(
        'font-medium text-[#34495e]',
        isCompact ? 'text-xs' : 'text-sm'
      )}>
        {title}
      </h3>

      <p className={cn(
        'text-[#6c757d] mt-1 max-w-[200px]',
        isCompact ? 'text-[10px]' : 'text-xs'
      )}>
        {description}
      </p>

      {(actionLabel && (actionHref || onAction)) && (
        actionHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(
              'mt-3 text-[#89bcbe] border-[#89bcbe] hover:bg-[#89bcbe]/10 hover:text-[#6ba9ab]',
              isCompact ? 'h-7 text-[10px] px-2' : 'h-8 text-xs px-3'
            )}
          >
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            className={cn(
              'mt-3 text-[#89bcbe] border-[#89bcbe] hover:bg-[#89bcbe]/10 hover:text-[#6ba9ab]',
              isCompact ? 'h-7 text-[10px] px-2' : 'h-8 text-xs px-3'
            )}
          >
            {actionLabel}
          </Button>
        )
      )}
    </div>
  )

  return content
}
