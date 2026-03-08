import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { tw } from '@/lib/design-tokens'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number | string
    label: string
    positive?: boolean
  }
  gradient?: 'kpi1' | 'kpi2' | 'kpi3' | 'kpi4'
  className?: string
  compact?: boolean
}

const gradientSchemes = {
  kpi1: {
    cardBg: 'bg-gradient-to-br from-[#34495e] to-[#46627f] dark:from-[#1e3148] dark:to-[#2a4a6b]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textColor: 'text-white',
    trendColor: 'text-white/90',
  },
  kpi2: {
    cardBg: 'bg-gradient-to-br from-[#46627f] to-[#6c757d] dark:from-[#2a4a6b] dark:to-[#4a5568]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textColor: 'text-white',
    trendColor: 'text-white/90',
  },
  kpi3: {
    cardBg: 'bg-gradient-to-br from-[#89bcbe] to-[#aacfd0] dark:from-[#2d6a6d] dark:to-[#3d8a8d]',
    iconBg: 'bg-white/30 dark:bg-white/10',
    iconColor: 'text-[#34495e] dark:text-white',
    textColor: 'text-[#34495e] dark:text-white',
    trendColor: 'text-[#34495e]/80 dark:text-white/80',
  },
  kpi4: {
    cardBg: 'bg-gradient-to-br from-[#aacfd0] to-[#cbe2e2] dark:from-[#1f5154] dark:to-[#2d6a6d]',
    iconBg: 'bg-white/40 dark:bg-white/10',
    iconColor: 'text-[#34495e] dark:text-white',
    textColor: 'text-[#34495e] dark:text-white',
    trendColor: 'text-[#34495e]/80 dark:text-white/80',
  },
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient = 'kpi1',
  className,
  compact = false,
}: MetricCardProps) {
  const scheme = gradientSchemes[gradient]

  if (compact) {
    return (
      <Card className={cn(
        'hover:shadow-lg transition-all duration-300 border-0',
        scheme.cardBg,
        className
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className={cn('text-[10px] font-medium', scheme.textColor)}>{title}</span>
            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', scheme.iconBg)}>
              <Icon className={cn('h-3 w-3', scheme.iconColor)} />
            </div>
          </div>
          <div className={cn('text-xl font-bold', scheme.textColor)}>{value}</div>
          {trend && (
            <div className={cn('text-[9px] mt-0.5', scheme.trendColor)}>
              {trend.value} {trend.label}
            </div>
          )}
          {subtitle && !trend && (
            <p className={cn('text-[9px] mt-0.5', scheme.trendColor)}>{subtitle}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'hover:shadow-xl transition-all duration-300 border-0',
      scheme.cardBg,
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn('text-xs font-medium', scheme.textColor)}>{title}</CardTitle>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', scheme.iconBg)}>
          <Icon className={cn('h-4 w-4', scheme.iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-semibold', scheme.textColor)}>{value}</div>
        {trend && (
          <div className="flex items-center mt-1.5 text-xs">
            <div className={cn('flex items-center font-medium', scheme.trendColor)}>
              {trend.value}
            </div>
            <span className={cn('ml-1.5', scheme.trendColor)}>{trend.label}</span>
          </div>
        )}
        {subtitle && !trend && (
          <p className={cn('text-xs mt-1.5', scheme.trendColor)}>{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
