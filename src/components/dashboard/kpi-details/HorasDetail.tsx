'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { formatHoras } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, Minus, Clock, History } from 'lucide-react'
import type { HorasDetailData } from '@/hooks/useKpiDetails'

interface Props {
  data: HorasDetailData | null
  loading: boolean
}

const MESES_CURTO = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

export default function HorasDetail({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const { totalEsteMes, totalMesPassado, diaAtual, profissionais } = data
  const diferenca = totalEsteMes - totalMesPassado
  const diferencaPercent = totalMesPassado > 0
    ? ((diferenca / totalMesPassado) * 100)
    : (totalEsteMes > 0 ? 100 : 0)

  const hoje = new Date()
  const mesAtual = MESES_CURTO[hoje.getMonth()]
  const mesAnterior = MESES_CURTO[hoje.getMonth() - 1] || MESES_CURTO[11]

  // Máximo para normalizar barras
  const maxHoras = Math.max(
    ...profissionais.map(p => Math.max(p.horasEsteMes, p.horasMesPassado)),
    1
  )

  return (
    <div className="p-5">
      {/* ── Resumo Comparativo ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#f0f9f9] rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-[#46627f]" />
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Este mês</span>
          </div>
          <div className="text-2xl font-bold text-[#34495e]">
            {formatHoras(totalEsteMes, 'curto')}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">até dia {diaAtual} de {mesAtual}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Mês passado</span>
          </div>
          <div className="text-2xl font-bold text-slate-500">
            {formatHoras(totalMesPassado, 'curto')}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">até dia {diaAtual} de {mesAnterior}</p>
        </div>
      </div>

      {/* Diferença */}
      <div className="flex items-center justify-center gap-2 mb-5 py-2 px-3 bg-slate-50 rounded-lg">
        {diferenca > 0 ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : diferenca < 0 ? (
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        ) : (
          <Minus className="w-3.5 h-3.5 text-slate-400" />
        )}
        <span className={cn(
          'text-sm font-semibold',
          diferenca > 0 ? 'text-emerald-600' : diferenca < 0 ? 'text-red-600' : 'text-slate-500'
        )}>
          {diferenca > 0 ? '+' : ''}{formatHoras(diferenca, 'curto')}
        </span>
        <span className={cn(
          'text-xs',
          diferenca > 0 ? 'text-emerald-500' : diferenca < 0 ? 'text-red-500' : 'text-slate-400'
        )}>
          ({diferenca > 0 ? '+' : ''}{Math.round(diferencaPercent)}%)
        </span>
      </div>

      {/* ── Por Profissional ── */}
      {profissionais.length > 0 && (
        <>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3">
            Por profissional
          </div>

          <div className="space-y-3">
            {profissionais.map((p) => {
              const barEsteMes = (p.horasEsteMes / maxHoras) * 100
              const barMesPassado = (p.horasMesPassado / maxHoras) * 100

              return (
                <div key={p.userId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-700 truncate">{p.nome}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {p.variacao !== 0 && (
                        <span className={cn(
                          'text-[10px] font-medium',
                          p.variacao > 0 ? 'text-emerald-500' : 'text-red-500'
                        )}>
                          {p.variacao > 0 ? '+' : ''}{Math.round(p.variacaoPercent)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barras */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#34495e] rounded-full transition-all duration-500"
                          style={{ width: `${barEsteMes}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-[#34495e] w-12 text-right">
                        {formatHoras(p.horasEsteMes, 'curto')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#aacfd0] rounded-full transition-all duration-500"
                          style={{ width: `${barMesPassado}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-12 text-right">
                        {formatHoras(p.horasMesPassado, 'curto')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#34495e]" />
              <span className="text-[10px] text-slate-500">{mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)} (até dia {diaAtual})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#aacfd0]" />
              <span className="text-[10px] text-slate-500">{mesAnterior.charAt(0).toUpperCase() + mesAnterior.slice(1)} (até dia {diaAtual})</span>
            </div>
          </div>
        </>
      )}

      {profissionais.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-400">Nenhum registro de horas este mês</p>
        </div>
      )}
    </div>
  )
}
