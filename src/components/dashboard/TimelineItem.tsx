import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineItemProps {
  icon: LucideIcon
  title: string
  description: string
  time: string
  colorScheme?: 'teal' | 'blue' | 'purple' | 'emerald' | 'amber'
  action?: {
    label: string
    onClick: () => void
  }
}

const colorSchemes = {
  teal: {
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    dot: 'bg-teal-500',
  },
  blue: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    dot: 'bg-blue-500',
  },
  purple: {
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    dot: 'bg-purple-500',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    dot: 'bg-amber-500',
  },
}

export default function TimelineItem({
  icon: Icon,
  title,
  description,
  time,
  colorScheme = 'teal',
  action,
}: TimelineItemProps) {
  const colors = colorSchemes[colorScheme]

  return (
    <div className="relative flex items-start gap-3 p-2.5 hover:bg-slate-50 rounded-lg transition-colors group">
      {/* Icon */}
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', colors.iconBg)}>
        <Icon className={cn('w-3.5 h-3.5', colors.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h4 className="font-semibold text-xs text-slate-900">{title}</h4>
          <span className="text-[10px] text-slate-500 whitespace-nowrap">{time}</span>
        </div>
        <p className="text-xs text-slate-600 leading-tight">{description}</p>

        {action && (
          <button
            onClick={action.onClick}
            className="text-[10px] text-teal-600 hover:text-teal-700 font-medium mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {action.label} →
          </button>
        )}
      </div>
    </div>
  )
}
