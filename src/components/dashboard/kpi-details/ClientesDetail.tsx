'use client'

import React from 'react'
import { formatBrazilDateOnly } from '@/lib/timezone'
import { Loader2, User, Building2 } from 'lucide-react'
import type { ClientesDetailData } from '@/hooks/useKpiDetails'

interface Props {
  data: ClientesDetailData | null
  loading: boolean
}

export default function ClientesDetail({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-[#89bcbe] animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const { novos } = data

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          Novos clientes
          <span className="font-semibold">{novos.length}</span>
        </span>
      </div>

      {/* List */}
      {novos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400">Nenhum novo cliente este mês</p>
        </div>
      ) : (
        <div className="space-y-1">
          {novos.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-surface-2 transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-surface-2 flex items-center justify-center flex-shrink-0">
                {c.tipo_pessoa === 'pj' ? (
                  <Building2 className="w-3.5 h-3.5 text-[#46627f] dark:text-slate-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-[#46627f] dark:text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {c.nome_completo || 'Sem nome'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 dark:bg-surface-2 dark:text-slate-500 flex-shrink-0">
                    {c.tipo_pessoa === 'pj' ? 'PJ' : 'PF'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.email && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{c.email}</span>
                  )}
                  {c.email && c.telefone && (
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                  )}
                  {c.telefone && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{c.telefone}</span>
                  )}
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 ml-auto flex-shrink-0">
                    {formatBrazilDateOnly(c.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
