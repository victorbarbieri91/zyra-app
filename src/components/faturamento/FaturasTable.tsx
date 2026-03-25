'use client'

import { FileText, Banknote, MoreVertical, CheckCircle, Clock, AlertCircle, Calendar, ExternalLink, Unlink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatHoras } from '@/lib/utils'
import type { FaturaGerada } from '@/hooks/useFaturamento'

interface FaturasTableProps {
  faturas: FaturaGerada[]
  onDesmontar: (faturaId: string) => void
  onReceber?: (fatura: FaturaGerada) => void
  loading?: boolean
  showEscritorio?: boolean
  escritoriosMap?: Map<string, string>
  escritorioColorMap?: Map<string, string>
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatDate = (date: string) => {
  const d = date.length === 10 ? new Date(date + 'T12:00:00') : new Date(date)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const formatDateShort = (date: string) => {
  const d = date.length === 10 ? new Date(date + 'T12:00:00') : new Date(date)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function getDiasAteVencimento(dataVencimento: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const venc = new Date(dataVencimento + 'T12:00:00')
  venc.setHours(0, 0, 0, 0)
  return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

function getSituacao(fatura: FaturaGerada): {
  label: string
  color: string
  textColor: string
  icon: React.ReactElement | null
} {
  const { status, data_vencimento, data_vencimento_saldo } = fatura

  if (status === 'cancelada') {
    return { label: 'Cancelada', color: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', textColor: 'text-slate-500 dark:text-slate-400', icon: null }
  }
  if (status === 'rascunho') {
    return { label: 'Rascunho', color: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700', textColor: 'text-slate-500 dark:text-slate-400', icon: null }
  }
  if (status === 'paga') {
    return { label: 'Quitada', color: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30', textColor: 'text-emerald-700 dark:text-emerald-400', icon: <CheckCircle className="w-3 h-3" /> }
  }

  if (status === 'parcialmente_paga') {
    const vencSaldo = data_vencimento_saldo || data_vencimento
    const dias = getDiasAteVencimento(vencSaldo)
    if (dias < 0) {
      return { label: 'Saldo vencido', color: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30', textColor: 'text-red-600 dark:text-red-400', icon: <AlertCircle className="w-3 h-3" /> }
    }
    return { label: 'Parcial', color: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30', textColor: 'text-amber-700 dark:text-amber-400', icon: <Clock className="w-3 h-3" /> }
  }

  // emitida, enviada, atrasada
  const dias = getDiasAteVencimento(data_vencimento)
  if (dias < 0) {
    return { label: 'Vencida', color: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30', textColor: 'text-red-600 dark:text-red-400', icon: <AlertCircle className="w-3 h-3" /> }
  }
  if (dias === 0) {
    return { label: 'Vence hoje', color: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30', textColor: 'text-amber-700 dark:text-amber-400', icon: <Clock className="w-3 h-3" /> }
  }
  return { label: 'Em dia', color: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30', textColor: 'text-emerald-700 dark:text-emerald-400', icon: <CheckCircle className="w-3 h-3" /> }
}

function getVencimentoInfo(fatura: FaturaGerada): { text: string; color: string } {
  const { status, data_vencimento, data_vencimento_saldo } = fatura

  if (status === 'paga' || status === 'cancelada' || status === 'rascunho') {
    return { text: formatDate(data_vencimento), color: 'text-slate-500 dark:text-slate-400' }
  }

  const dataRef = (status === 'parcialmente_paga' && data_vencimento_saldo) ? data_vencimento_saldo : data_vencimento
  const dias = getDiasAteVencimento(dataRef)

  if (dias < 0) {
    return { text: formatDate(dataRef), color: 'text-red-600 dark:text-red-400 font-semibold' }
  }
  return { text: formatDate(dataRef), color: 'text-slate-700 dark:text-slate-300' }
}

const podeDesmontar = (status: string) => ['rascunho', 'emitida', 'enviada'].includes(status)
const podeReceber = (status: string) => !['paga', 'cancelada', 'rascunho'].includes(status)
// PDF como botão icon (faturas estáveis ou concluídas)
const pdfComoIcon = (status: string) => ['emitida', 'enviada', 'paga'].includes(status)
// PDF no dropdown (quando Receber é o icon principal)
const pdfNoDropdown = (status: string) => ['parcialmente_paga', 'atrasada'].includes(status)
// Mostra dropdown? (apenas quando PDF vai no dropdown — parcialmente_paga, atrasada)
const temDropdown = (status: string) => pdfNoDropdown(status)

function handleVerPDF(faturaId: string) {
  window.open(`/imprimir/fatura/${faturaId}`, '_blank')
}

export function FaturasTable({
  faturas,
  onDesmontar,
  onReceber,
  loading = false,
  showEscritorio = false,
  escritoriosMap,
  escritorioColorMap,
}: FaturasTableProps) {
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
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="text-[10px] font-semibold text-[#46627f] dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-surface-2 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2.5 px-3 w-[110px]">Fatura</th>
              <th className="text-left py-2.5 px-2" style={{ width: showEscritorio ? '22%' : '28%' }}>Cliente</th>
              {showEscritorio && <th className="text-left py-2.5 px-2 w-[10%]">Escritorio</th>}
              <th className="text-center py-2.5 px-2 w-[72px]">Emissao</th>
              <th className="text-center py-2.5 px-2 w-[80px]">Vencimento</th>
              <th className="text-right py-2.5 px-2 w-[120px]">Valor</th>
              <th className="text-center py-2.5 px-2 w-[90px]">Situacao</th>
              <th className="text-right py-2.5 px-3 w-[80px]">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {faturas.map((fatura) => {
              const situacao = getSituacao(fatura)
              const vencInfo = getVencimentoInfo(fatura)
              const isParcial = fatura.status === 'parcialmente_paga' && fatura.valor_pago > 0
              const percentPago = isParcial ? Math.min(100, (fatura.valor_pago / fatura.valor_total) * 100) : 0

              return (
                <tr
                  key={fatura.fatura_id}
                  className="hover:bg-slate-50 dark:hover:bg-surface-2 transition-colors group"
                >
                  {/* Fatura */}
                  <td className="py-2 px-3 w-[110px]">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-[#46627f] dark:text-teal-400 shrink-0" />
                      <span className="text-xs font-semibold text-[#34495e] dark:text-slate-200 truncate">
                        {fatura.numero_fatura}
                      </span>
                    </div>
                  </td>

                  {/* Cliente */}
                  <td className="py-2 px-2" style={{ width: showEscritorio ? '22%' : '28%' }}>
                    <p className="text-xs text-slate-700 dark:text-slate-300 truncate" title={fatura.cliente_nome}>
                      {fatura.cliente_nome}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {fatura.qtd_honorarios > 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {fatura.qtd_honorarios} hon.
                        </span>
                      )}
                      {fatura.qtd_horas > 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {formatHoras(fatura.soma_horas, 'curto')}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Escritorio */}
                  {showEscritorio && (
                    <td className="py-2 px-2 w-[10%]">
                      <span
                        className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap truncate max-w-[80px]", escritorioColorMap?.get(fatura.escritorio_id) || 'bg-slate-100 text-slate-600 border-slate-200')}
                        title={escritoriosMap?.get(fatura.escritorio_id) || ''}
                      >
                        {escritoriosMap?.get(fatura.escritorio_id) || '-'}
                      </span>
                    </td>
                  )}

                  {/* Emissao */}
                  <td className="py-2 px-2 w-[72px] text-center">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateShort(fatura.data_emissao)}</span>
                  </td>

                  {/* Vencimento */}
                  <td className="py-2 px-2 w-[80px] text-center">
                    <span className={cn('text-[11px]', vencInfo.color)}>{vencInfo.text}</span>
                    {fatura.status === 'parcialmente_paga' && fatura.data_vencimento_saldo && (
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">saldo</p>
                    )}
                  </td>

                  {/* Valor */}
                  <td className="py-2 px-2 w-[120px] text-right">
                    <p className="text-xs font-bold text-[#34495e] dark:text-slate-200">
                      {formatCurrency(fatura.valor_total)}
                    </p>
                    {isParcial && (
                      <div className="mt-0.5 flex items-center gap-1 justify-end">
                        <div className="w-12 bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                          <div
                            className="bg-emerald-500 h-1 rounded-full transition-all"
                            style={{ width: `${percentPago}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                          {formatCurrency(fatura.valor_pago)}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Situacao */}
                  <td className="py-2 px-2 w-[90px] text-center">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap',
                      situacao.color, situacao.textColor
                    )}>
                      {situacao.icon}
                      {situacao.label}
                    </span>
                  </td>

                  {/* Acoes */}
                  <td className="py-2 px-3 w-[80px] text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {pdfComoIcon(fatura.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          title="Ver PDF"
                          onClick={() => handleVerPDF(fatura.fatura_id)}
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </Button>
                      )}
                      {podeReceber(fatura.status) && onReceber && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          title="Receber"
                          onClick={() => onReceber(fatura)}
                        >
                          <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </Button>
                      )}
                      {podeDesmontar(fatura.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Desmontar Fatura"
                          onClick={() => onDesmontar(fatura.fatura_id)}
                        >
                          <Unlink className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                        </Button>
                      )}
                      {temDropdown(fatura.status) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleVerPDF(fatura.fatura_id)}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
        {faturas.map((fatura) => {
          const situacao = getSituacao(fatura)
          const vencInfo = getVencimentoInfo(fatura)
          const isParcial = fatura.status === 'parcialmente_paga' && fatura.valor_pago > 0

          return (
            <div
              key={`mobile-${fatura.fatura_id}`}
              className="px-4 py-3 space-y-2"
            >
              {/* Row 1: Fatura + Situacao + Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-3.5 w-3.5 text-[#46627f] dark:text-teal-400 shrink-0" />
                  <span className="text-xs font-semibold text-[#34495e] dark:text-slate-200 truncate">
                    {fatura.numero_fatura}
                  </span>
                  <span className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap shrink-0',
                    situacao.color, situacao.textColor
                  )}>
                    {situacao.icon}
                    {situacao.label}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {pdfComoIcon(fatura.status) && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => handleVerPDF(fatura.fatura_id)}>
                      <ExternalLink className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </Button>
                  )}
                  {podeReceber(fatura.status) && onReceber && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => onReceber(fatura)}>
                      <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </Button>
                  )}
                  {podeDesmontar(fatura.status) && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-950/30" title="Desmontar Fatura" onClick={() => onDesmontar(fatura.fatura_id)}>
                      <Unlink className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                    </Button>
                  )}
                  {temDropdown(fatura.status) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => handleVerPDF(fatura.fatura_id)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Row 2: Cliente */}
              <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{fatura.cliente_nome}</p>

              {/* Row 3: Dates + Value */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Em. {formatDateShort(fatura.data_emissao)}</span>
                  <span className={cn(vencInfo.color)}>
                    <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
                    {vencInfo.text}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#34495e] dark:text-slate-200">
                    {formatCurrency(fatura.valor_total)}
                  </span>
                  {isParcial && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Pago: {formatCurrency(fatura.valor_pago)}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress bar (partial) */}
              {isParcial && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                  <div
                    className="bg-emerald-500 h-1 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (fatura.valor_pago / fatura.valor_total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
