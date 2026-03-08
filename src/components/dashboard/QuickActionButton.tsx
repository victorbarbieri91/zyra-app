import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuickActionButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'highlight'
  className?: string
}

export default function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  className,
}: QuickActionButtonProps) {
  if (variant === 'highlight') {
    return (
      <Button
        onClick={onClick}
        className={cn(
          'h-auto py-2.5 px-3 flex items-center gap-1.5 justify-center bg-gradient-to-br from-[#34495e] to-[#46627f] dark:from-[#89bcbe] dark:to-[#6ba9ab] hover:from-[#2c3e50] hover:to-[#34495e] dark:hover:from-[#7aafb1] dark:hover:to-[#5a9799] text-white dark:text-surface-0 shadow-lg hover:shadow-xl transition-all',
          className
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
      </Button>
    )
  }

  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={cn(
        'h-auto py-2.5 px-3 flex items-center gap-1.5 justify-center border-slate-200 dark:border-slate-700 hover:border-[#89bcbe] hover:bg-[#f0f9f9] dark:hover:bg-teal-900/20 transition-all',
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 text-[#6c757d] dark:text-slate-400 flex-shrink-0" />
      <span className="text-[11px] font-medium text-[#34495e] dark:text-slate-200 whitespace-nowrap">{label}</span>
    </Button>
  )
}
