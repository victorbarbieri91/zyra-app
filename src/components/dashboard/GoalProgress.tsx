import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface GoalProgressProps {
  label: string
  current: number
  target: number
  colorScheme?: 'teal' | 'blue' | 'purple' | 'emerald'
  showPercentage?: boolean
}

const colorSchemes = {
  teal: {
    bg: 'from-teal-50 to-teal-50/50 border-teal-100 dark:from-teal-500/10 dark:to-teal-500/5 dark:border-teal-500/20',
    progressBg: 'bg-teal-100 dark:bg-teal-900/30',
    progress: 'from-teal-400 to-teal-500',
  },
  blue: {
    bg: 'from-blue-50 to-blue-50/50 border-blue-100 dark:from-blue-500/10 dark:to-blue-500/5 dark:border-blue-500/20',
    progressBg: 'bg-blue-100 dark:bg-blue-900/30',
    progress: 'from-blue-400 to-blue-500',
  },
  purple: {
    bg: 'from-purple-50 to-purple-50/50 border-purple-100 dark:from-purple-500/10 dark:to-purple-500/5 dark:border-purple-500/20',
    progressBg: 'bg-purple-100 dark:bg-purple-900/30',
    progress: 'from-purple-400 to-purple-500',
  },
  emerald: {
    bg: 'from-emerald-50 to-emerald-50/50 border-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/5 dark:border-emerald-500/20',
    progressBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    progress: 'from-emerald-400 to-emerald-500',
  },
}

export default function GoalProgress({
  label,
  current,
  target,
  colorScheme = 'teal',
  showPercentage = true,
}: GoalProgressProps) {
  const colors = colorSchemes[colorScheme]
  const percentage = Math.round((current / target) * 100)

  return (
    <div className={cn('p-4 bg-gradient-to-br rounded-xl border', colors.bg)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        {showPercentage ? (
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{percentage}%</span>
        ) : (
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {current} / {target}
          </span>
        )}
      </div>
      <div className={cn('w-full h-2 rounded-full overflow-hidden', colors.progressBg)}>
        <div
          className={cn('h-full bg-gradient-to-r rounded-full transition-all duration-1000', colors.progress)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
