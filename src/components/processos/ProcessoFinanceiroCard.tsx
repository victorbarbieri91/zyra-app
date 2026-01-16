'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DollarSign,
  Clock,
  Receipt,
  AlertTriangle,
  Plus,
  ArrowRight,
  FileText,
  Loader2,
  Link as LinkIcon,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useProcessoFinanceiro } from '@/hooks/useProcessoFinanceiro'
import { useRouter } from 'next/navigation'

interface ProcessoFinanceiroCardProps {
  processoId: string
  onLancarHoras?: () => void
  onLancarDespesa?: () => void
  onVerDetalhes?: () => void
}

const MODALIDADE_LABELS: Record<string, string> = {
  fixo: 'Fixo',
  por_hora: 'Por Hora',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
  por_pasta: 'Por Pasta',
  por_ato: 'Por Ato',
  por_cargo: 'Por Cargo',
}

const MODALIDADE_COLORS: Record<string, string> = {
  fixo: 'bg-blue-100 text-blue-700 border-blue-200',
  por_hora: 'bg-amber-100 text-amber-700 border-amber-200',
  por_etapa: 'bg-purple-100 text-purple-700 border-purple-200',
  misto: 'bg-slate-100 text-slate-700 border-slate-200',
  por_pasta: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  por_ato: 'bg-rose-100 text-rose-700 border-rose-200',
  por_cargo: 'bg-cyan-100 text-cyan-700 border-cyan-200',
}

export default function ProcessoFinanceiroCard({
  processoId,
  onLancarHoras,
  onLancarDespesa,
  onVerDetalhes,
}: ProcessoFinanceiroCardProps) {
  const router = useRouter()
  const {
    contratoInfo,
    resumo,
    despesasReembolsaveisPendentes,
    loading,
    podelancarHoras,
    loadDados,
  } = useProcessoFinanceiro(processoId)

  useEffect(() => {
    if (processoId) {
      loadDados()
    }
  }, [processoId, loadDados])

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
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#89bcbe]" />
            Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-600 mb-3">
              Nenhum contrato vinculado
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => router.push('/dashboard/financeiro?tab=contratos')}
            >
              <LinkIcon className="w-3 h-3 mr-1.5" />
              Vincular Contrato
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-[#34495e] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#89bcbe]" />
            Financeiro
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contrato e Modalidade */}
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5] border border-[#aacfd0]/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Contrato</span>
            <span className="text-xs font-semibold text-[#34495e]">
              {contratoInfo.numero_contrato}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Modalidade</span>
            <Badge
              variant="outline"
              className={`text-[10px] h-5 ${
                MODALIDADE_COLORS[contratoInfo.modalidade_cobranca || ''] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {MODALIDADE_LABELS[contratoInfo.modalidade_cobranca || ''] || 'Não definida'}
            </Badge>
          </div>
        </div>

        {/* Aviso se não pode lançar horas */}
        {contratoInfo.modalidade_cobranca && !podelancarHoras && (
          <div className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 leading-relaxed">
              Modalidade <strong>{MODALIDADE_LABELS[contratoInfo.modalidade_cobranca]}</strong> não permite lançamento de horas.
            </p>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded bg-slate-50">
            <p className="text-[10px] text-slate-500 mb-0.5">Honorários</p>
            <p className="text-sm font-bold text-[#34495e]">
              {formatCurrency(resumo.totalHonorarios)}
            </p>
          </div>
          <div className="text-center p-2 rounded bg-slate-50">
            <p className="text-[10px] text-slate-500 mb-0.5">Despesas</p>
            <p className="text-sm font-bold text-slate-600">
              {formatCurrency(resumo.totalDespesas)}
            </p>
          </div>
          <div className="text-center p-2 rounded bg-emerald-50">
            <p className="text-[10px] text-emerald-600 mb-0.5">Saldo</p>
            <p className="text-sm font-bold text-emerald-700">
              {formatCurrency(resumo.saldo)}
            </p>
          </div>
        </div>

        {/* Horas trabalhadas (se aplicável) */}
        {podelancarHoras && resumo.horasTrabalhadas > 0 && (
          <div className="flex items-center justify-between p-2 rounded bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs text-amber-700">
                {resumo.horasTrabalhadas}h trabalhadas
              </span>
            </div>
            {contratoInfo.config?.valor_hora && (
              <span className="text-xs font-semibold text-amber-700">
                {formatCurrency(resumo.horasTrabalhadas * contratoInfo.config.valor_hora)}
              </span>
            )}
          </div>
        )}

        {/* Alerta de despesas reembolsáveis */}
        {despesasReembolsaveisPendentes.length > 0 && (
          <div className="flex items-center justify-between p-2 rounded bg-rose-50 border border-rose-200">
            <div className="flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-xs text-rose-700">
                {despesasReembolsaveisPendentes.length} despesa{despesasReembolsaveisPendentes.length > 1 ? 's' : ''} reembolsável{despesasReembolsaveisPendentes.length > 1 ? 'is' : ''} pendente{despesasReembolsaveisPendentes.length > 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-xs font-semibold text-rose-700">
              {formatCurrency(resumo.totalDespesasReembolsaveis)}
            </span>
          </div>
        )}

        <Separator />

        {/* Botões de ação */}
        <div className="flex gap-2">
          {podelancarHoras && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-7 hover:bg-[#89bcbe]/10 hover:border-[#89bcbe]"
              onClick={onLancarHoras}
            >
              <Clock className="w-3 h-3 mr-1" />
              + Horas
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-7 hover:bg-[#89bcbe]/10 hover:border-[#89bcbe]"
            onClick={onLancarDespesa}
          >
            <Receipt className="w-3 h-3 mr-1" />
            + Despesa
          </Button>
        </div>

        {/* Ver detalhes */}
        <Button
          variant="link"
          className="text-xs text-[#89bcbe] hover:text-[#6ba9ab] p-0 h-auto w-full"
          onClick={onVerDetalhes || (() => router.push(`/dashboard/financeiro?processo_id=${processoId}`))}
        >
          Ver financeiro completo <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
