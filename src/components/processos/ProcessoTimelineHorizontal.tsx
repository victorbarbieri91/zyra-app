'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

  // Scroll inicial para o final (mais recentes à direita)
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Aguardar renderização e scrollar para o final
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
          updateScrollButtons()
        }
      }, 100)
    }
  }, [movimentacoes])

  useEffect(() => {
    updateScrollButtons()
    window.addEventListener('resize', updateScrollButtons)
    return () => window.removeEventListener('resize', updateScrollButtons)
  }, [])

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

  // Limitar movimentações para performance (últimas 20) e inverter ordem
  // A entrada vem ordenada DESC (mais recente primeiro), invertemos para ordem cronológica
  // Assim: mais antigo à esquerda, mais recente à direita
  const movimentacoesLimitadas = movimentacoes.slice(0, 20).reverse()

  if (movimentacoesLimitadas.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-500">Timeline</h3>
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
            {movimentacoesLimitadas.map((mov, index) => (
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
                      {/* Data */}
                      <p className="text-[11px] font-medium text-[#46627f] mb-1.5">
                        {formatBrazilDate(mov.data_movimento)}
                      </p>

                      {/* Tipo */}
                      <p className="text-[11px] font-medium text-[#34495e] leading-tight line-clamp-1 mb-1">
                        {mov.tipo_descricao || 'Movimentação'}
                      </p>

                      {/* Descrição */}
                      {mov.descricao && (
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                          {mov.descricao}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Linha Conectora (exceto no último) */}
                  {index < movimentacoesLimitadas.length - 1 && (
                    <div className="w-8 h-px bg-slate-200 flex-shrink-0" />
                  )}
              </div>
            ))}
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
