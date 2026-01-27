'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DollarSign,
  FileText,
  Loader2,
  Link as LinkIcon,
  Plus,
  ChevronRight,
  Banknote,
  Clock,
  Receipt,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useProcessoFinanceiro } from '@/hooks/useProcessoFinanceiro'
import VincularContratoModal from './VincularContratoModal'
import FinanceiroDetalhesModal from './FinanceiroDetalhesModal'

interface ProcessoFinanceiroCardProps {
  processoId: string
  onLancarHoras?: () => void
  onLancarDespesa?: () => void
  onLancarHonorario?: () => void
}

const MODALIDADE_LABELS: Record<string, string> = {
  fixo: 'Honorários Fixos',
  por_hora: 'Por Hora',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
  por_pasta: 'Por Pasta',
  por_ato: 'Por Ato',
  por_cargo: 'Por Cargo',
}

export default function ProcessoFinanceiroCard({
  processoId,
  onLancarHoras,
  onLancarDespesa,
  onLancarHonorario,
}: ProcessoFinanceiroCardProps) {
  const {
    contratoInfo,
    processoInfo,
    resumo,
    honorarios,
    despesas,
    timesheet,
    loading,
    podelancarHoras,
    loadDados,
  } = useProcessoFinanceiro(processoId)

  // Estados para modais
  const [vincularModalOpen, setVincularModalOpen] = useState(false)
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false)
  const [detalhesModalTipo, setDetalhesModalTipo] = useState<'honorarios' | 'timesheet' | 'despesas'>('honorarios')

  useEffect(() => {
    if (processoId) {
      loadDados()
    }
  }, [processoId, loadDados])

  const openDetalhesModal = (tipo: 'honorarios' | 'timesheet' | 'despesas') => {
    setDetalhesModalTipo(tipo)
    setDetalhesModalOpen(true)
  }

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#89bcbe]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Se não tem contrato vinculado
  if (!contratoInfo) {
    return (
      <>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                Nenhum contrato vinculado
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Vincule um contrato para gerenciar o financeiro deste processo
              </p>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 border-[#89bcbe] text-[#34495e] hover:bg-[#89bcbe]/10"
                onClick={() => setVincularModalOpen(true)}
              >
                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                Vincular Contrato
              </Button>
            </div>
          </CardContent>
        </Card>

        <VincularContratoModal
          open={vincularModalOpen}
          onOpenChange={setVincularModalOpen}
          processoId={processoId}
          clienteId={processoInfo?.cliente_id || null}
          clienteNome={processoInfo?.cliente_nome}
          onSuccess={() => loadDados()}
        />
      </>
    )
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        {/* Header - igual às demais seções */}
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#89bcbe]" />
              Financeiro
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2.5 text-xs text-slate-500 hover:text-[#34495e] hover:bg-slate-100"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Novo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => onLancarHonorario?.()}
                  className="text-xs cursor-pointer py-2.5"
                >
                  <Banknote className="w-4 h-4 mr-2.5 text-slate-500" />
                  Honorário
                </DropdownMenuItem>
                {podelancarHoras && (
                  <DropdownMenuItem
                    onClick={() => onLancarHoras?.()}
                    className="text-xs cursor-pointer py-2.5"
                  >
                    <Clock className="w-4 h-4 mr-2.5 text-slate-500" />
                    Timesheet
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onLancarDespesa?.()}
                  className="text-xs cursor-pointer py-2.5"
                >
                  <Receipt className="w-4 h-4 mr-2.5 text-slate-500" />
                  Despesa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* Info do Contrato - Seção separada */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-600">
              {contratoInfo.numero_contrato}
            </span>
            <Badge variant="outline" className="text-[10px] font-medium h-5 bg-slate-50 text-slate-600 border-slate-200">
              {MODALIDADE_LABELS[contratoInfo.forma_cobranca || ''] || 'Padrão'}
            </Badge>
          </div>
        </div>

        {/* Categorias Financeiras */}
        <CardContent className="p-5 space-y-4">
          {/* Honorários */}
          <div
            className="group flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-3 px-3 py-3 rounded-lg transition-colors"
            onClick={() => openDetalhesModal('honorarios')}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Honorários</p>
                {honorarios.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    ({honorarios.length})
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[#34495e] mt-1">
                {formatCurrency(resumo.totalHonorarios)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#89bcbe] transition-colors" />
          </div>

          {/* Timesheet */}
          <div
            className="group flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-3 px-3 py-3 rounded-lg transition-colors"
            onClick={() => openDetalhesModal('timesheet')}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Timesheet</p>
                {timesheet.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    ({timesheet.length})
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[#34495e] mt-1">
                {resumo.horasTrabalhadas}h
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#89bcbe] transition-colors" />
          </div>

          {/* Despesas */}
          <div
            className="group flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-3 px-3 py-3 rounded-lg transition-colors"
            onClick={() => openDetalhesModal('despesas')}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Despesas</p>
                {despesas.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    ({despesas.length})
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[#34495e] mt-1">
                {formatCurrency(resumo.totalDespesas)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#89bcbe] transition-colors" />
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <FinanceiroDetalhesModal
        open={detalhesModalOpen}
        onOpenChange={setDetalhesModalOpen}
        tipo={detalhesModalTipo}
        processoId={processoId}
        honorarios={honorarios}
        timesheet={timesheet}
        despesas={despesas}
        resumo={resumo}
        contratoInfo={contratoInfo}
        onLancarHonorario={onLancarHonorario}
        onLancarHoras={onLancarHoras}
        onLancarDespesa={onLancarDespesa}
        onRefresh={loadDados}
      />
    </>
  )
}
