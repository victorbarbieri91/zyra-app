'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ProcessoRecente } from '@/hooks/useProcessosRecentes'
import {
  areaLabel, areaChipClass, statusLabel, statusDot, statusFgClass,
  getInitials, avatarColor, vistoHa,
} from './processos-ui'

export default function ProcessoRecentCard({ p }: { p: ProcessoRecente }) {
  return (
    <Link
      href={`/dashboard/processos/${p.id}`}
      className="group bg-[#ffffff] dark:bg-[#151e2b] border border-[#e6e3da] dark:border-[#253345] rounded-[13px] p-[15px] flex flex-col gap-[11px] shadow-[0_1px_2px_rgba(52,73,94,0.04)] dark:shadow-none hover:shadow-[0_8px_20px_-12px_rgba(15,23,42,0.25)] hover:border-[#d4cfc2] dark:hover:border-[#34465c] transition-shadow"
    >
      {/* topo: PROC + status */}
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

      {/* título: partes com v. */}
      <div className="text-[14.5px] font-semibold text-[#2c3e50] dark:text-[#d8e2ef] tracking-[-0.015em] leading-[1.3] line-clamp-2">
        {p.cliente_nome || '—'}
        {p.parte_contraria && (
          <>
            {' '}<span className="italic font-normal text-[#9aa1a8] dark:text-[#5a6675]">v.</span>{' '}
            {p.parte_contraria}
          </>
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
