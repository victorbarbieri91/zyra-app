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
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  alerta: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  destaque: {
    dot: 'bg-teal-500',
    text: 'text-teal-700',
  },
  sugestao: {
    dot: 'bg-blue-500',
    text: 'text-blue-700',
  },
}

export default function InsightCard({ type, title, description, action }: InsightCardProps) {
  const config = insightConfig[type]

  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-2">
        <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', config.dot)} />
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-medium text-xs leading-tight', config.text)}>{title}</h4>
          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="text-[10px] text-[#89bcbe] hover:text-[#6ba9ab] font-medium mt-1"
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
