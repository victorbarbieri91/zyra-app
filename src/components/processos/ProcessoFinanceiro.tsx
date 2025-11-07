'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, ExternalLink, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Processo {
  valor_causa?: number
  valor_acordo?: number
  valor_condenacao?: number
  provisao_sugerida?: number
}

interface ProcessoFinanceiroProps {
  processo: Processo
}

export default function ProcessoFinanceiro({ processo }: ProcessoFinanceiroProps) {
  const honorarios = [
    { id: '1', data: '15/01/2024', descricao: 'Elaboração petição inicial', horas: 8, valor: 4000, status: 'pago' },
    { id: '2', data: '20/02/2024', descricao: 'Audiência de conciliação', horas: 4, valor: 2000, status: 'faturado' },
    { id: '3', data: '10/12/2024', descricao: 'Análise de sentença', horas: 6, valor: 3000, status: 'pendente' }
  ]

  const despesas = [
    { id: '1', data: '15/01/2024', tipo: 'Custas iniciais', valor: 850 },
    { id: '2', data: '20/05/2024', tipo: 'Perícia médica', valor: 1500 },
  ]

  const getStatusBadge = (status: string) => {
    const styles = {
      pago: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      faturado: 'bg-blue-100 text-blue-700 border-blue-200',
      pendente: 'bg-amber-100 text-amber-700 border-amber-200'
    }
    return styles[status as keyof typeof styles] || styles.pendente
  }

  const totalHonorarios = honorarios.reduce((sum, h) => sum + h.valor, 0)
  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0)

  return (
    <div className="space-y-6">
      {/* KPIs Financeiros */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-[#89bcbe]/30 shadow-sm bg-gradient-to-br from-[#f0f9f9] to-[#e8f5f5]">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-[#46627f] mb-1">Valor da Causa</p>
            <p className="text-2xl font-bold text-[#34495e]">
              {processo.valor_causa ? formatCurrency(processo.valor_causa) : 'Não definido'}
            </p>
          </CardContent>
        </Card>

        {processo.valor_acordo && (
          <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-emerald-700 mb-1">Valor do Acordo</p>
              <p className="text-2xl font-bold text-emerald-800">
                {formatCurrency(processo.valor_acordo)}
              </p>
            </CardContent>
          </Card>
        )}

        {processo.valor_condenacao && (
          <Card className="border-amber-200 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-amber-700 mb-1">Valor da Condenação</p>
              <p className="text-2xl font-bold text-amber-800">
                {formatCurrency(processo.valor_condenacao)}
              </p>
            </CardContent>
          </Card>
        )}

        {processo.provisao_sugerida && (
          <Card className="border-[#34495e] shadow-sm bg-gradient-to-br from-[#34495e] to-[#46627f]">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-white/80 mb-1">Provisão Contábil Sugerida</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(processo.provisao_sugerida)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Honorários */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-[#34495e]">
              Honorários Relacionados
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-[#89bcbe] hover:text-[#6ba9ab]">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Ver no Financeiro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-[#46627f]">Data</th>
                  <th className="text-left p-3 text-xs font-semibold text-[#46627f]">Descrição</th>
                  <th className="text-right p-3 text-xs font-semibold text-[#46627f]">Horas</th>
                  <th className="text-right p-3 text-xs font-semibold text-[#46627f]">Valor</th>
                  <th className="text-center p-3 text-xs font-semibold text-[#46627f]">Status</th>
                </tr>
              </thead>
              <tbody>
                {honorarios.map(h => (
                  <tr key={h.id} className="border-b border-slate-100">
                    <td className="p-3 text-xs text-slate-600">{h.data}</td>
                    <td className="p-3 text-sm text-slate-700">{h.descricao}</td>
                    <td className="p-3 text-sm text-right text-slate-700">{h.horas}h</td>
                    <td className="p-3 text-sm text-right font-semibold text-[#34495e]">
                      {formatCurrency(h.valor)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={`text-[10px] border ${getStatusBadge(h.status)}`}>
                        {h.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={3} className="p-3 text-sm text-[#34495e]">Total</td>
                  <td className="p-3 text-sm text-right text-[#34495e]">
                    {formatCurrency(totalHonorarios)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Despesas */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-[#34495e]">
              Despesas do Processo
            </CardTitle>
            <Button variant="outline" size="sm" className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Lançar Despesa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {despesas.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#34495e]">{d.tipo}</p>
                  <p className="text-xs text-slate-600">{d.data}</p>
                </div>
                <p className="text-sm font-semibold text-red-600">
                  {formatCurrency(d.valor)}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg font-semibold">
              <p className="text-sm text-[#34495e]">Total de Despesas</p>
              <p className="text-sm text-red-700">{formatCurrency(totalDespesas)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
