'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcessoRecente } from '@/hooks/useProcessosRecentes'
import {
  areaLabel, areaChipClass, statusLabel, statusDot, statusFgClass,
  getInitials, avatarColor, vistoHa,
} from './processos-ui'

export default function ProcessoRecentCard({ p }: { p: ProcessoRecente }) {
  const [copiado, setCopiado] = useState(false)

  return (
    <Link
      href={`/dashboard/processos/${p.id}`}
      className="group bg-[#ffffff] dark:bg-[#151e2b] border border-[#e6e3da] dark:border-[#253345] rounded-[13px] p-[15px] flex flex-col gap-[11px] shadow-[0_1px_2px_rgba(52,73,94,0.04)] dark:shadow-none hover:shadow-[0_8px_20px_-12px_rgba(15,23,42,0.25)] hover:border-[#d4cfc2] dark:hover:border-[#34465c] transition-shadow"
    >
      {/* topo: pasta + status */}
      <div className="flex items-center gap-2">
        <span className="text-[13.5px] font-bold text-[#2c3e50] dark:text-[#d8e2ef] font-mono tracking-[-0.01em]">
          {p.numero_pasta || '—'}
        </span>
        <div className="flex-1" />
        <span className={cn('inline-flex items-center gap-1.5 text-[10.5px] font-semibold', statusFgClass(p.status))}>
          <span className="w-[6px] h-[6px] rounded-full" style={{ background: statusDot(p.status) }} />
          {statusLabel(p.status)}
        </span>
      </div>

      {/* título + CNJ */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[14.5px] font-semibold text-[#2c3e50] dark:text-[#d8e2ef] tracking-[-0.015em] leading-[1.3] line-clamp-2">
          {p.cliente_nome || '—'}
          {p.parte_contraria && (
            <>
              {' '}<span className="italic font-normal text-[#9aa1a8] dark:text-[#5a6675]">v.</span>{' '}
              {p.parte_contraria}
            </>
          )}
        </div>
        {p.numero_cnj && (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] text-[#9aa1a8] dark:text-[#5a6675] font-mono truncate">{p.numero_cnj}</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); try { navigator.clipboard?.writeText(p.numero_cnj || '') } catch {} ; setCopiado(true); setTimeout(() => setCopiado(false), 1400) }}
              title={copiado ? 'Copiado' : 'Copiar número CNJ'}
              className={cn(
                'inline-flex items-center justify-center w-[18px] h-[18px] rounded flex-shrink-0 transition-colors',
                copiado ? 'text-[#3f7376] dark:text-[#9fc7c9]' : 'text-[#c4c0b4] dark:text-[#5a6675] hover:text-[#5a6775] dark:hover:text-[#8a97a8]'
              )}
            >
              {copiado ? <Check className="w-[11px] h-[11px]" /> : <Copy className="w-[11px] h-[11px]" />}
            </button>
          </div>
        )}
      </div>

      {/* rodapé: área + visto + responsável */}
      <div className="flex items-center gap-2 pt-[11px] border-t border-[#f0ede3] dark:border-[#1d2a3c]">
        {p.area && (
          <span className={cn('text-[10px] font-semibold px-2 py-[3px] rounded-[5px]', areaChipClass(p.area))}>
            {areaLabel(p.area)}
          </span>
        )}
        <span className="text-[10.5px] text-[#9aa1a8] dark:text-[#5a6675]">{vistoHa(p.acessado_em)}</span>
        <div className="flex-1" />
        {p.responsavel_nome && (
          <div
            className="w-[23px] h-[23px] rounded-full text-white text-[9px] font-semibold flex items-center justify-center"
            style={{ background: avatarColor(p.responsavel_nome) }}
            title={p.responsavel_nome}
          >
            {getInitials(p.responsavel_nome)}
          </div>
        )}
      </div>
    </Link>
  )
}
