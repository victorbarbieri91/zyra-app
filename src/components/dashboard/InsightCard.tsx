import { Lightbulb, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface InsightCardProps {
  type: 'oportunidade' | 'alerta' | 'destaque' | 'sugestao'
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

const insightConfig = {
  oportunidade: {
    icon: TrendingUp,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'Oportunidade',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  alerta: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'Atenção',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  destaque: {
    icon: Sparkles,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    badge: 'Destaque',
    badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  sugestao: {
    icon: Lightbulb,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badge: 'Sugestão',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
  },
}

export default function InsightCard({ type, title, description, action }: InsightCardProps) {
  const config = insightConfig[type]
  const Icon = config.icon

  return (
    <Card className="border-slate-200 hover:shadow-md transition-all">
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', config.iconBg)}>
            <Icon className={cn('w-3.5 h-3.5', config.iconColor)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border', config.badgeColor)}>
                {config.badge}
              </Badge>
            </div>

            <h4 className="font-semibold text-slate-900 text-xs mb-0.5 leading-tight">{title}</h4>
            <p className="text-[11px] text-slate-600 leading-snug">{description}</p>

            {action && (
              <Button
                variant="ghost"
                size="sm"
                onClick={action.onClick}
                className="mt-2 text-[10px] text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-0 h-auto font-medium"
              >
                {action.label} →
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
