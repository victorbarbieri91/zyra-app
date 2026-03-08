'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatBrazilDateOnly } from '@/lib/timezone'
import { Loader2, Plus, Archive, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ConsultivosDetailData } from '@/hooks/useKpiDetails'

interface Props {
  data: ConsultivosDetailData | null
  loading: boolean
}

export default function ConsultivosDetail({ data, loading }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'novas' | 'finalizadas'>('novas')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const novasCount = data.novas.length
  const finalizadasCount = data.finalizadas.length
  const items = tab === 'novas' ? data.novas : data.finalizadas

  return (
    <div className="p-5">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('novas')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            tab === 'novas'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-surface-2 dark:text-slate-400 dark:hover:bg-surface-3'
          )}
        >
          <Plus className="w-3 h-3" />
          Novas
          <span className="ml-0.5 font-semibold">{novasCount}</span>
        </button>
        <button
          onClick={() => setTab('finalizadas')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            tab === 'finalizadas'
              ? 'bg-slate-200 text-slate-700 dark:bg-surface-3 dark:text-slate-300'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-surface-2 dark:text-slate-400 dark:hover:bg-surface-3'
          )}
        >
          <Archive className="w-3 h-3" />
          Finalizadas
          <span className="ml-0.5 font-semibold">{finalizadasCount}</span>
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400">
            {tab === 'novas'
              ? 'Nenhuma consulta nova este mês'
              : 'Nenhuma consulta finalizada este mês'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/consultivo/${c.id}`)}
              className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-surface-2 transition-colors group flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {c.area && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#89bcbe]/15 text-[#46627f] dark:text-slate-300">
                      {c.area}
                    </span>
                  )}
                  {c.numero && (
                    <span className="text-[10px] text-slate-400">#{c.numero}</span>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                  {c.titulo || 'Sem título'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.cliente_nome && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{c.cliente_nome}</span>
                  )}
                  {c.cliente_nome && c.responsavel_nome && (
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  )}
                  {c.responsavel_nome && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{c.responsavel_nome}</span>
                  )}
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 ml-auto flex-shrink-0">
                    {formatBrazilDateOnly(c.data)}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 dark:text-slate-600 dark:group-hover:text-slate-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
