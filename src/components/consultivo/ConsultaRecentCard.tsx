'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ConsultaRecente } from '@/hooks/useConsultasRecentes'
import {
  areaLabel, areaChipClass, tipoLabel, tipoChipClass, statusLabel, statusDot, statusFgClass,
  getInitials, avatarColor,
} from './consultivo-ui'

export default function ConsultaRecentCard({ c }: { c: ConsultaRecente }) {
  return (
    <Link
      href={`/dashboard/consultivo/${c.id}`}
      className="group bg-[#ffffff] dark:bg-[#151e2b] border border-[#e6e3da] dark:border-[#253345] rounded-[13px] p-[15px] flex flex-col gap-[11px] shadow-[0_1px_2px_rgba(52,73,94,0.04)] dark:shadow-none hover:shadow-[0_8px_20px_-12px_rgba(15,23,42,0.25)] hover:border-[#d4cfc2] dark:hover:border-[#34465c] transition-shadow"
    >
      {/* topo: nº + status */}
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] font-bold text-[#5a6775] dark:text-[#8a97a8] font-mono tracking-[-0.01em]">{c.numero || '—'}</span>
        <div className="flex-1" />
        <span className={cn('inline-flex items-center gap-1.5 text-[10.5px] font-semibold', statusFgClass(c.status))}>
          <span className="w-[6px] h-[6px] rounded-full" style={{ background: statusDot(c.status) }} />
          {statusLabel(c.status)}
        </span>
      </div>

      {/* título + cliente */}
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-[#2c3e50] dark:text-[#d8e2ef] tracking-[-0.015em] leading-[1.3] line-clamp-2">{c.titulo || '—'}</div>
        <div className="text-[11.5px] text-[#5a6775] dark:text-[#8a97a8] truncate mt-0.5">{c.cliente_nome || '—'}</div>
      </div>

      {/* rodapé: área + tipo + responsável */}
      <div className="flex items-center gap-1.5 pt-[11px] border-t border-[#f0ede3] dark:border-[#1d2a3c]">
        {c.area && <span className={cn('text-[10px] font-semibold px-2 py-[3px] rounded-[5px] flex-shrink-0', areaChipClass(c.area))}>{areaLabel(c.area)}</span>}
        {c.tipo && <span className={cn('text-[10px] font-semibold px-2 py-[3px] rounded-[5px] truncate', tipoChipClass(c.tipo))}>{tipoLabel(c.tipo)}</span>}
        <div className="flex-1" />
        {c.responsavel_nome && (
          <span className="w-[23px] h-[23px] rounded-full text-white text-[9px] font-semibold flex items-center justify-center flex-shrink-0" style={{ background: avatarColor(c.responsavel_nome) }} title={c.responsavel_nome}>
            {getInitials(c.responsavel_nome)}
          </span>
        )}
      </div>
    </Link>
  )
}
