'use client'

// Ranking horizontal da equipe — substitui o bloco "Performance da Equipe" inline.
// Sem toggle Lista/Barras. Sem avatars. Sem podium colorido.
// Container "warm" — não usar <Card> shadcn dentro.

import { Loader2 } from 'lucide-react'
import { cn, formatHoras } from '@/lib/utils'
import type { EquipeMember } from '@/hooks/useDashboardPerformance'

interface RankingEquipeCardProps {
  className?: string
  equipe: EquipeMember[]
  totalHorasEquipe: number
  currentUserId: string | null
  metaIndividual: number // horas/mês
  loading?: boolean
  mesNome: string // ex: "abril"
}

export default function RankingEquipeCard({
  className,
  equipe,
  totalHorasEquipe,
  currentUserId,
  metaIndividual,
  loading,
  mesNome,
}: RankingEquipeCardProps) {
  return (
    <div
      className={cn(
        'bg-card-warm border border-warm rounded-[14px]',
        'px-[22px] pt-[18px] pb-4 flex flex-col min-h-0',
        className,
      )}
    >
      <div className="flex justify-between items-baseline mb-3.5">
        <div>
          <h3
            className="text-warm-primary m-0 font-semibold"
            style={{ fontSize: 14, letterSpacing: '-0.01em' }}
          >
            Ranking da equipe
          </h3>
          <div className="text-[11px] text-warm-secondary mt-0.5">
            Horas cobráveis · {mesNome} ·{' '}
            <span className="text-warm-primary font-semibold">
              {formatHoras(totalHorasEquipe, 'curto')}
            </span>{' '}
            totais
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-teal-300" />
        </div>
      ) : equipe.length === 0 ? (
        <p className="text-[11px] text-warm-secondary text-center py-6">
          Nenhum lançamento de horas no período.
        </p>
      ) : (
        <div className="flex-1 flex flex-col">
          {equipe.map((m, i) => {
            const isYou = m.id === currentUserId
            // Proporção INTERNA do membro (cobrável vs não-cobrável). Sempre soma 100%.
            const billablePct = m.horas > 0 ? (m.horasCobraveis / m.horas) * 100 : 0
            const nonBillablePct = 100 - billablePct
            const cobravelPercent = Math.round(billablePct)

            return (
              <div
                key={m.id}
                className={cn(
                  'flex items-center gap-3.5 py-3',
                  i < equipe.length - 1 && 'border-b border-warm-subtle',
                )}
              >
                <div
                  className={cn(
                    'w-[22px] text-center flex-shrink-0 font-mono font-bold',
                    i === 0 ? 'text-warm-primary' : 'text-warm-muted',
                  )}
                  style={{ fontSize: 12 }}
                >
                  {i + 1}º
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'font-sans text-warm-primary truncate text-[13.5px]',
                          isYou ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {m.nome}
                      </span>
                      {isYou && (
                        <span
                          className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-teal-300/20 text-teal-500 tracking-[0.06em]"
                        >
                          VOCÊ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="text-[10.5px] font-semibold inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        {cobravelPercent}% cobrável
                      </span>
                      <span
                        className="text-warm-primary font-semibold font-mono w-[42px] text-right"
                        style={{ fontSize: 12.5 }}
                      >
                        {formatHoras(m.horas, 'curto')}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-2 rounded-[3px] bg-rail overflow-hidden">
                    {/* Cobrável: emerald-500 (verde vivo sólido). */}
                    <div
                      className="bg-emerald-500 dark:bg-emerald-400"
                      style={{ width: `${billablePct}%` }}
                    />
                    {/* Não-cobrável: slate-blue escuro do sistema (#34495e). */}
                    <div
                      className="bg-[#34495e] dark:bg-[#8a97a8]"
                      style={{ width: `${nonBillablePct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-warm-subtle">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
          <span className="text-[10.5px] text-warm-secondary">Horas cobráveis</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1.5 rounded-sm bg-[#34495e] dark:bg-[#8a97a8]" />
          <span className="text-[10.5px] text-warm-secondary">Não-cobráveis</span>
        </div>
        <div className="flex-1" />
        <span className="text-[10.5px] text-warm-muted">
          Meta individual: {formatHoras(metaIndividual, 'curto')}/mês
        </span>
      </div>
    </div>
  )
}
