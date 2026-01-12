'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Gavel,
  FileText,
  Calendar,
  Clock,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'

interface ProcessoMovimentacao {
  id: string
  data_movimento: string
  tipo_codigo?: string
  tipo_descricao?: string
  descricao?: string
  importante?: boolean
  lida?: boolean
}

interface ProcessoTimelineHorizontalProps {
  movimentacoes: ProcessoMovimentacao[]
  onItemClick?: (movimentacaoId: string) => void
  className?: string
}

// Mapeamento de tipos para ícones e cores (sutis, compatíveis com design system)
const tipoConfig: Record<string, { icon: any; bg: string; iconColor: string; textColor: string }> = {
  sentenca: {
    icon: Gavel,
    bg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    textColor: 'text-[#34495e]',
  },
  despacho: {
    icon: FileText,
    bg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    textColor: 'text-[#34495e]',
  },
  juntada: {
    icon: Upload,
    bg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    textColor: 'text-[#34495e]',
  },
  audiencia: {
    icon: Calendar,
    bg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    textColor: 'text-[#34495e]',
  },
  intimacao: {
    icon: AlertCircle,
    bg: 'bg-red-100',
    iconColor: 'text-red-600',
    textColor: 'text-[#34495e]',
  },
  peticao: {
    icon: Download,
    bg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    textColor: 'text-[#34495e]',
  },
  conclusao: {
    icon: CheckCircle,
    bg: 'bg-green-100',
    iconColor: 'text-green-600',
    textColor: 'text-[#34495e]',
  },
  baixa: {
    icon: XCircle,
    bg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    textColor: 'text-[#34495e]',
  },
  default: {
    icon: Circle,
    bg: 'bg-slate-100',
    iconColor: 'text-[#89bcbe]',
    textColor: 'text-[#34495e]',
  },
}

// Função para determinar o tipo baseado na descrição
const getTipoFromDescricao = (descricao: string): string => {
  const lower = descricao.toLowerCase()

  if (lower.includes('sentença')) return 'sentenca'
  if (lower.includes('despacho')) return 'despacho'
  if (lower.includes('juntada')) return 'juntada'
  if (lower.includes('audiência')) return 'audiencia'
  if (lower.includes('intimação')) return 'intimacao'
  if (lower.includes('petição')) return 'peticao'
  if (lower.includes('conclusão')) return 'conclusao'
  if (lower.includes('baixa')) return 'baixa'

  return 'default'
}

export default function ProcessoTimelineHorizontal({
  movimentacoes,
  onItemClick,
  className,
}: ProcessoTimelineHorizontalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Verificar se pode fazer scroll
  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)

    // Calcular progresso do scroll
    const maxScroll = scrollWidth - clientWidth
    const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0
    setScrollProgress(progress)
  }

  useEffect(() => {
    updateScrollButtons()
    window.addEventListener('resize', updateScrollButtons)
    return () => window.removeEventListener('resize', updateScrollButtons)
  }, [movimentacoes])

  // Scroll suave
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return

    const scrollAmount = 400
    const newScrollLeft =
      scrollContainerRef.current.scrollLeft +
      (direction === 'left' ? -scrollAmount : scrollAmount)

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    })
  }

  // Limitar movimentações para performance (últimas 20)
  const movimentacoesLimitadas = movimentacoes.slice(0, 20)

  if (movimentacoesLimitadas.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-500">Timeline Visual</h3>
        <span className="text-[10px] text-slate-400">
          {movimentacoesLimitadas.length} {movimentacoesLimitadas.length === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Botão Scroll Esquerda */}
        {canScrollLeft && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-7 w-7 p-0 rounded-full shadow-sm bg-white border-slate-200 hover:bg-slate-50 hover:border-[#89bcbe]"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
          </Button>
        )}

        {/* Botão Scroll Direita */}
        {canScrollRight && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-7 w-7 p-0 rounded-full shadow-sm bg-white border-slate-200 hover:bg-slate-50 hover:border-[#89bcbe]"
          >
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </Button>
        )}

        {/* Timeline Scrollable */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollButtons}
          className="overflow-x-auto scrollbar-hide scroll-smooth px-1 py-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="flex gap-3 min-w-max">
            {movimentacoesLimitadas.map((mov, index) => {
              const tipo = getTipoFromDescricao(mov.tipo_descricao || mov.descricao || '')
              const config = tipoConfig[tipo] || tipoConfig.default
              const Icon = config.icon

              return (
                <div key={mov.id} className="flex items-center gap-2.5">
                  {/* Card do Evento */}
                  <Card
                    onClick={() => onItemClick?.(mov.id)}
                    className={cn(
                      'w-[200px] flex-shrink-0 border border-slate-200 hover:border-[#89bcbe] transition-all cursor-pointer',
                      'bg-white shadow-sm hover:shadow-md',
                      mov.importante && 'border-red-200 bg-red-50/50',
                      !mov.lida && 'border-blue-200 bg-blue-50/30'
                    )}
                  >
                    <CardContent className="p-2.5">
                      {/* Header com Ícone */}
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className={cn('rounded flex items-center justify-center flex-shrink-0 w-6 h-6', config.bg)}>
                          <Icon className={cn('w-3 h-3', config.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className={cn('text-[11px] font-semibold leading-tight line-clamp-2', config.textColor)}>
                              {mov.tipo_descricao || 'Movimentação'}
                            </h4>
                            {mov.importante && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 flex-shrink-0 bg-red-50 text-red-600 border-red-200">
                                !
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Descrição */}
                      {mov.descricao && (
                        <p className="text-[10px] text-slate-600 line-clamp-2 mb-1.5 leading-relaxed">
                          {mov.descricao}
                        </p>
                      )}

                      {/* Data */}
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-[#89bcbe]" />
                        <span className="text-[10px] text-slate-500 font-medium">
                          {formatBrazilDate(mov.data_movimento)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Linha Conectora (exceto no último) */}
                  {index < movimentacoesLimitadas.length - 1 && (
                    <div className="w-8 h-px bg-slate-200 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Indicadores de Posição (dots) */}
        {movimentacoesLimitadas.length > 3 && (
          <div className="flex items-center justify-center gap-1 mt-2.5">
            {Array.from({ length: Math.min(5, Math.ceil(movimentacoesLimitadas.length / 3)) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  Math.floor(scrollProgress * 5) === i ? 'w-5 bg-[#89bcbe]' : 'w-1 bg-slate-300'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
