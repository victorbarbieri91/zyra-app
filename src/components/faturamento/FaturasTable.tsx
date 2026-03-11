'use client'

import { FileText, Calendar, Trash2, Eye, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatHoras } from '@/lib/utils'
import type { FaturaGerada } from '@/hooks/useFaturamento'

interface FaturasTableProps {
  faturas: FaturaGerada[]
  selectedFatura: FaturaGerada | null
  onSelectFatura: (fatura: FaturaGerada) => void
  onDesmontar: (faturaId: string) => void
  loading?: boolean
  showEscritorio?: boolean
  escritoriosMap?: Map<string, string>
}

export function FaturasTable({
  faturas,
  selectedFatura,
  onSelectFatura,
  onDesmontar,
  loading = false,
  showEscritorio = false,
  escritoriosMap,
}: FaturasTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (date: string) => {
    const d = date.length === 10 ? new Date(date + 'T12:00:00') : new Date(date)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rascunho':
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 text-[10px]">
            Rascunho
          </Badge>
        )
      case 'emitida':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
            Emitida
          </Badge>
        )
      case 'enviada':
        return (
          <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 text-[10px]">
            Enviada
          </Badge>
        )
      case 'parcialmente_paga':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
            Parcial
          </Badge>
        )
      case 'paga':
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
            Paga
          </Badge>
        )
      case 'atrasada':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]">
            Atrasada
          </Badge>
        )
      case 'cancelada':
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px]">
            Cancelada
          </Badge>
        )
      default:
        return null
    }
  }

  const podeDesmontar = (status: string) => ['rascunho', 'emitida', 'enviada'].includes(status)

  if (loading) {
    return (
      <div className="border rounded-lg bg-white dark:bg-surface-1 dark:border-slate-700">
        <div className="p-12 text-center">
          <FileText className="h-8 w-8 mx-auto text-slate-400 animate-pulse" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Carregando faturas...</p>
        </div>
      </div>
    )
  }

  if (faturas.length === 0) {
    return (
      <div className="border rounded-lg bg-white dark:bg-surface-1 dark:border-slate-700">
        <div className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Nenhuma fatura encontrada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg bg-white dark:bg-surface-1 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-surface-2 border-b border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          <div className={showEscritorio ? "col-span-2" : "col-span-3"}>FATURA</div>
          <div className={showEscritorio ? "col-span-2" : "col-span-3"}>CLIENTE</div>
          {showEscritorio && (
            <div className="col-span-2">ESCRITÓRIO</div>
          )}
          <div className="col-span-2 text-center">EMISSÃO</div>
          <div className="col-span-2 text-right">VALOR</div>
          <div className="col-span-2 text-right">AÇÕES</div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {faturas.map((fatura) => (
          <div
            key={fatura.fatura_id}
            className={cn(
              'grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-surface-2 transition-colors cursor-pointer',
              selectedFatura?.fatura_id === fatura.fatura_id && 'bg-blue-50 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/30'
            )}
            onClick={() => onSelectFatura(fatura)}
          >
            {/* Número da Fatura */}
            <div className={showEscritorio ? "col-span-2" : "col-span-3"}>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#46627f] dark:text-teal-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#34495e] dark:text-slate-200 truncate">
                    {fatura.numero_fatura}
                  </p>
                  <div className="mt-0.5">{getStatusBadge(fatura.status)}</div>
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className={showEscritorio ? "col-span-2" : "col-span-3"}>
              <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{fatura.cliente_nome}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {fatura.qtd_honorarios > 0 && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {fatura.qtd_honorarios} hon.
                  </span>
                )}
                {fatura.qtd_horas > 0 && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {formatHoras(fatura.soma_horas, 'curto')}
                  </span>
                )}
              </div>
            </div>

            {/* Escritório */}
            {showEscritorio && (
              <div className="col-span-2 flex items-center">
                <Badge variant="outline" className="text-[10px] font-normal text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 truncate max-w-full">
                  {escritoriosMap?.get(fatura.escritorio_id) || '-'}
                </Badge>
              </div>
            )}

            {/* Data de Emissão */}
            <div className="col-span-2 text-center">
              <p className="text-sm text-slate-700 dark:text-slate-300">{formatDate(fatura.data_emissao)}</p>
            </div>

            {/* Valor Total */}
            <div className="col-span-2 text-right">
              <p className="text-sm font-bold text-[#34495e] dark:text-slate-200">
                {formatCurrency(fatura.valor_total)}
              </p>
            </div>

            {/* Ações */}
            <div className="col-span-2 flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectFatura(fatura)
                }}
              >
                <Eye className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              </Button>
              {podeDesmontar(fatura.status) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDesmontar(fatura.fatura_id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
