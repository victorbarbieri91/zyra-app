'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Banknote,
  Clock,
  Receipt,
  Plus,
  Calendar,
  User,
  FileText,
} from 'lucide-react'
import { formatCurrency, formatHoras } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Honorario, Despesa, TimesheetEntry, ResumoFinanceiro, ContratoInfo } from '@/hooks/useProcessoFinanceiro'

interface FinanceiroDetalhesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: 'honorarios' | 'timesheet' | 'despesas'
  processoId: string
  honorarios: Honorario[]
  timesheet: TimesheetEntry[]
  despesas: Despesa[]
  resumo: ResumoFinanceiro
  contratoInfo: ContratoInfo | null
  onLancarHonorario?: () => void
  onLancarHoras?: () => void
  onLancarDespesa?: () => void
  onRefresh?: () => void
}

// Status configs
const HONORARIO_STATUS: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  proposta: { label: 'Proposta', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  aprovado: { label: 'Aprovado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  em_aberto: { label: 'Faturado', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  faturado: { label: 'Faturado', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  pago: { label: 'Pago', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-700 border-red-200' },
}

const DESPESA_STATUS: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  pago: { label: 'Pago', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-700 border-red-200' },
}

export default function FinanceiroDetalhesModal({
  open,
  onOpenChange,
  tipo,
  honorarios,
  timesheet,
  despesas,
  resumo,
  contratoInfo,
  onLancarHonorario,
  onLancarHoras,
  onLancarDespesa,
}: FinanceiroDetalhesModalProps) {

  const getTitulo = () => {
    switch (tipo) {
      case 'honorarios':
        return 'Honorários do Processo'
      case 'timesheet':
        return 'Timesheet do Processo'
      case 'despesas':
        return 'Despesas do Processo'
    }
  }

  const getIcon = () => {
    switch (tipo) {
      case 'honorarios':
        return <Banknote className="w-4 h-4 text-emerald-600" />
      case 'timesheet':
        return <Clock className="w-4 h-4 text-amber-600" />
      case 'despesas':
        return <Receipt className="w-4 h-4 text-rose-600" />
    }
  }

  const getTotal = () => {
    switch (tipo) {
      case 'honorarios':
        return formatCurrency(resumo.totalHonorarios)
      case 'timesheet':
        return `${formatHoras(resumo.horasTrabalhadas)}${resumo.totalTimesheet > 0 ? ` • ${formatCurrency(resumo.totalTimesheet)}` : ''}`
      case 'despesas':
        return formatCurrency(resumo.totalDespesas)
    }
  }

  const getOnLancar = () => {
    switch (tipo) {
      case 'honorarios':
        return onLancarHonorario
      case 'timesheet':
        return onLancarHoras
      case 'despesas':
        return onLancarDespesa
    }
  }

  const getLancarLabel = () => {
    switch (tipo) {
      case 'honorarios':
        return 'Novo Honorário'
      case 'timesheet':
        return 'Novo Lançamento'
      case 'despesas':
        return 'Nova Despesa'
    }
  }

  const getTimesheetStatus = (entry: TimesheetEntry) => {
    if (entry.reprovado) {
      return { label: 'Reprovado', className: 'bg-red-100 text-red-700 border-red-200' }
    }
    if (entry.faturado) {
      return { label: 'Faturado', className: 'bg-amber-100 text-amber-700 border-amber-200' }
    }
    if (entry.aprovado) {
      return { label: 'Aprovado', className: 'bg-blue-100 text-blue-700 border-blue-200' }
    }
    return { label: 'Pendente', className: 'bg-slate-100 text-slate-700 border-slate-200' }
  }

  const renderHonorarios = () => (
    <div className="space-y-3">
      {honorarios.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum honorário lançado</p>
        </div>
      ) : (
        honorarios.map((hon) => {
          const statusConfig = HONORARIO_STATUS[hon.status] || HONORARIO_STATUS.pendente
          return (
            <div
              key={hon.id}
              className="border border-slate-200 rounded-lg p-3 hover:border-[#89bcbe]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-[#34495e]">{hon.numero_interno}</p>
                  <p className="text-sm text-slate-700 mt-0.5">{hon.descricao}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] h-5 ${statusConfig.className}`}>
                  {statusConfig.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  {hon.responsavel_nome && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {hon.responsavel_nome}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(hon.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm font-bold text-[#34495e]">
                  {formatCurrency(hon.valor_total)}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  const renderTimesheet = () => (
    <div className="space-y-3">
      {timesheet.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhuma hora lançada</p>
        </div>
      ) : (
        timesheet.map((entry) => {
          const statusConfig = getTimesheetStatus(entry)
          return (
            <div
              key={entry.id}
              className="border border-slate-200 rounded-lg p-3 hover:border-[#89bcbe]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm text-slate-700">{entry.atividade}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] h-5 ${statusConfig.className}`}>
                  {statusConfig.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  {entry.user_nome && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.user_nome}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(entry.data_trabalho), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#34495e]">
                    {formatHoras(entry.horas)}
                  </p>
                  {contratoInfo?.config?.valor_hora && (
                    <span className="text-xs text-slate-500">
                      ({formatCurrency(entry.horas * contratoInfo.config.valor_hora)})
                    </span>
                  )}
                </div>
              </div>

              {!entry.faturavel && (
                <Badge variant="outline" className="text-[9px] h-4 mt-2 bg-slate-50 text-slate-500 border-slate-200">
                  Não faturável
                </Badge>
              )}
            </div>
          )
        })
      )}
    </div>
  )

  const renderDespesas = () => (
    <div className="space-y-3">
      {despesas.length === 0 ? (
        <div className="text-center py-8">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhuma despesa lançada</p>
        </div>
      ) : (
        despesas.map((desp) => {
          const statusConfig = DESPESA_STATUS[desp.status] || DESPESA_STATUS.pendente
          return (
            <div
              key={desp.id}
              className="border border-slate-200 rounded-lg p-3 hover:border-[#89bcbe]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-[#34495e] uppercase">{desp.categoria}</p>
                  <p className="text-sm text-slate-700 mt-0.5">{desp.descricao}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={`text-[10px] h-5 ${statusConfig.className}`}>
                    {statusConfig.label}
                  </Badge>
                  {desp.reembolsavel && (
                    <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200">
                      Reembolsável
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  {desp.fornecedor && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {desp.fornecedor}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Venc: {format(new Date(desp.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm font-bold text-[#34495e]">
                  {formatCurrency(desp.valor)}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  const renderContent = () => {
    switch (tipo) {
      case 'honorarios':
        return renderHonorarios()
      case 'timesheet':
        return renderTimesheet()
      case 'despesas':
        return renderDespesas()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-[#34495e]">
            {getIcon()}
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="py-4">
            {renderContent()}
          </div>
        </ScrollArea>

        {/* Footer com total e botão de ação */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-bold text-[#34495e]">{getTotal()}</p>
          </div>

          <div className="flex gap-2">
            {getOnLancar() && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
                onClick={() => {
                  const onLancar = getOnLancar()
                  if (onLancar) {
                    onLancar()
                    onOpenChange(false)
                  }
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {getLancarLabel()}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
