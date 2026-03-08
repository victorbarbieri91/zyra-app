'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatBrazilDateOnly } from '@/lib/timezone'
import { Loader2, Plus, XCircle, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ProcessosDetailData } from '@/hooks/useKpiDetails'

interface Props {
  data: ProcessosDetailData | null
  loading: boolean
}

const STATUS_LABELS: Record<string, string> = {
  arquivado: 'Arquivado',
  encerrado: 'Encerrado',
  baixado: 'Baixado',
}

export default function ProcessosDetail({ data, loading }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'novos' | 'encerrados'>('novos')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const novosCount = data.novos.length
  const encerradosCount = data.encerrados.length
  const items = tab === 'novos' ? data.novos : data.encerrados

  return (
    <div className="p-5">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('novos')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            tab === 'novos'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-surface-2 dark:text-slate-400 dark:hover:bg-surface-3'
          )}
        >
          <Plus className="w-3 h-3" />
          Novos
          <span className="ml-0.5 font-semibold">{novosCount}</span>
        </button>
        <button
          onClick={() => setTab('encerrados')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            tab === 'encerrados'
              ? 'bg-slate-200 text-slate-700 dark:bg-surface-3 dark:text-slate-300'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-surface-2 dark:text-slate-400 dark:hover:bg-surface-3'
          )}
        >
          <XCircle className="w-3 h-3" />
          Encerrados
          <span className="ml-0.5 font-semibold">{encerradosCount}</span>
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400">
            {tab === 'novos'
              ? 'Nenhum processo novo este mês'
              : 'Nenhum processo encerrado este mês'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/dashboard/processos/${p.id}`)}
              className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-surface-2 transition-colors group flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {p.area && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#89bcbe]/15 text-[#46627f] dark:text-slate-300">
                      {p.area}
                    </span>
                  )}
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {p.numero_pasta || p.numero_cnj || 'Sem número'}
                  </span>
                  {tab === 'encerrados' && p.status && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-surface-2 dark:text-slate-400">
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {p.autor && p.reu ? `${p.autor} x ${p.reu}` : p.autor || p.reu || '—'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {p.cliente_nome && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{p.cliente_nome}</span>
                  )}
                  {p.cliente_nome && p.responsavel_nome && (
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  )}
                  {p.responsavel_nome && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{p.responsavel_nome}</span>
                  )}
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 ml-auto flex-shrink-0">
                    {formatBrazilDateOnly(p.data)}
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
