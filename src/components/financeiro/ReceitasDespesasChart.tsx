'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartDataItem {
  mes: string
  receitas: number
  despesas: number
}

interface ReceitasDespesasChartProps {
  data: ChartDataItem[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function ReceitasDespesasChart({ data }: ReceitasDespesasChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{ color: '#34495e', fontWeight: 600, fontSize: '12px' }}
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const receitas = payload.find(p => p.dataKey === 'receitas')?.value || 0
              const despesas = payload.find(p => p.dataKey === 'despesas')?.value || 0
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                  <p className="text-xs font-semibold text-[#34495e] mb-2">{label}</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#89bcbe]" />
                      <span className="text-xs text-slate-600">Receitas:</span>
                      <span className="text-xs font-semibold text-[#34495e]">{formatCurrency(Number(receitas))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#46627f]" />
                      <span className="text-xs text-slate-600">Despesas:</span>
                      <span className="text-xs font-semibold text-[#34495e]">{formatCurrency(Number(despesas))}</span>
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
          formatter={(value) => value === 'despesas' ? 'Despesas' : 'Receitas'}
        />
        <Bar
          dataKey="despesas"
          fill="#46627f"
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        />
        <Bar
          dataKey="receitas"
          fill="#89bcbe"
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
