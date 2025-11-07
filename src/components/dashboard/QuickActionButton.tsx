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
          'h-auto py-2.5 px-3 flex items-center gap-1.5 justify-center bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white shadow-lg hover:shadow-xl transition-all',
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
        'h-auto py-2.5 px-3 flex items-center gap-1.5 justify-center border-slate-200 hover:border-[#89bcbe] hover:bg-[#f0f9f9] transition-all',
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 text-[#6c757d] flex-shrink-0" />
      <span className="text-[11px] font-medium text-[#34495e] whitespace-nowrap">{label}</span>
    </Button>
  )
}
