'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface FluxoCaixaItem {
  mes: string
  entradas: number
  saidas: number
  saldo: number
}

interface FluxoCaixaChartProps {
  data: FluxoCaixaItem[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function FluxoCaixaChart({ data }: FluxoCaixaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#89bcbe" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#89bcbe" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#46627f" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#46627f" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="mes"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const entradas = payload.find(p => p.dataKey === 'entradas')?.value || 0
              const saidas = payload.find(p => p.dataKey === 'saidas')?.value || 0
              const saldo = Number(entradas) - Number(saidas)
              return (
                <div className="bg-white dark:bg-surface-1 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
                  <p className="text-xs font-semibold text-[#34495e] dark:text-slate-200 mb-2">{label}</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#89bcbe]" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Entradas:</span>
                      <span className="text-xs font-semibold text-[#34495e] dark:text-slate-200">{formatCurrency(Number(entradas))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#46627f]" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Saídas:</span>
                      <span className="text-xs font-semibold text-[#34495e] dark:text-slate-200">{formatCurrency(Number(saidas))}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A]" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Saldo:</span>
                      <span className={`text-xs font-bold ${saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(saldo)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          iconType="circle"
          formatter={(value) => {
            const labels: Record<string, string> = { entradas: 'Entradas', saidas: 'Saídas' }
            return labels[value] || value
          }}
        />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="entradas"
          stroke="#89bcbe"
          strokeWidth={2}
          fill="url(#gradEntradas)"
        />
        <Area
          type="monotone"
          dataKey="saidas"
          stroke="#46627f"
          strokeWidth={2}
          fill="url(#gradSaidas)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
