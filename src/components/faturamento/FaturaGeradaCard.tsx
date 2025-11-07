'use client'

import { FileText, Clock, DollarSign, AlertCircle, CheckCircle, Trash2, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FaturaGerada } from '@/hooks/useFaturamento'

interface FaturaGeradaCardProps {
  fatura: FaturaGerada
  onDesmontar: (faturaId: string) => void
  onVisualizarItens: (faturaId: string) => void
}

export function FaturaGeradaCard({
  fatura,
  onDesmontar,
  onVisualizarItens,
}: FaturaGeradaCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }

  const getStatusBadge = () => {
    switch (fatura.status) {
      case 'rascunho':
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px]">
            Rascunho
          </Badge>
        )
      case 'emitida':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]">
            <CheckCircle className="h-3 w-3 mr-1" />
            Emitida
          </Badge>
        )
      case 'enviada':
        return (
          <Badge variant="secondary" className="bg-teal-100 text-teal-700 text-[10px]">
            <CheckCircle className="h-3 w-3 mr-1" />
            Enviada
          </Badge>
        )
      case 'paga':
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px]">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paga
          </Badge>
        )
      case 'atrasada':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">
            <AlertCircle className="h-3 w-3 mr-1" />
            Atrasada
          </Badge>
        )
      case 'cancelada':
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px]">
            Cancelada
          </Badge>
        )
      default:
        return null
    }
  }

  const podeDesmontar = ['rascunho', 'emitida', 'enviada'].includes(fatura.status)

  return (
    <Card className="border-slate-200 shadow-sm hover:border-[#46627f] hover:shadow-md transition-all">
      <CardContent className="p-0">
        {/* Header - Estilo Nota Fiscal */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#46627f]" />
              <div>
                <h3 className="text-sm font-bold text-[#34495e] leading-tight">
                  {fatura.numero_fatura}
                </h3>
                <p className="text-[10px] text-slate-500">Fatura</p>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </div>

        {/* Corpo da Fatura */}
        <div className="px-4 py-3">
          {/* Cliente */}
          <div className="mb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Cliente</p>
            <p className="text-sm font-semibold text-[#34495e]">{fatura.cliente_nome}</p>
          </div>

          {/* Discriminação de Serviços - Estilo Tabela */}
          <div className="mb-3 pb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Discriminação</p>
            <div className="space-y-1.5">
              {fatura.qtd_honorarios > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-700">
                      Honorários ({fatura.qtd_honorarios} {fatura.qtd_honorarios === 1 ? 'item' : 'itens'})
                    </span>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(fatura.total_honorarios)}
                  </span>
                </div>
              )}

              {fatura.qtd_horas > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-700">
                      Horas trabalhadas ({fatura.soma_horas.toFixed(1)}h)
                    </span>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(fatura.total_horas)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Valor Total - Destaque */}
          <div className="mb-3 pt-3 border-t border-slate-200">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Valor Total</p>
              <p className="text-2xl font-bold text-[#34495e]">
                {formatCurrency(fatura.valor_total)}
              </p>
            </div>
          </div>

          {/* Informações de Datas */}
          <div className="mb-3 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Emissão:</span>
              <span className="font-medium">{formatDate(fatura.data_emissao)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vencimento:</span>
              <span className="font-medium">{formatDate(fatura.data_vencimento)}</span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-8"
              onClick={() => onVisualizarItens(fatura.fatura_id)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Ver Detalhes
            </Button>
            {podeDesmontar && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 text-xs h-8 px-2"
                onClick={() => onDesmontar(fatura.fatura_id)}
                title="Desmontar fatura"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
