'use client'

import { useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Repeat, CreditCard, Zap } from 'lucide-react'
import type { ConfigRecorrencia, FrequenciaRecorrencia } from '@/hooks/useReceitas'

export type LancamentoModalidade = 'unica' | 'parcelada' | 'recorrente'

interface LancamentoModalidadeSelectorProps {
  modalidade: LancamentoModalidade
  onModalidadeChange: (m: LancamentoModalidade) => void
  // Parcelamento
  numeroParcelas: number
  onNumeroParcelasChange: (n: number) => void
  supportsParcelamento?: boolean
  valor?: number
  // Recorrência
  configRecorrencia: ConfigRecorrencia
  onConfigRecorrenciaChange: (c: ConfigRecorrencia) => void
  dataVencimento?: string
  disabled?: boolean
}

const DEFAULT_CONFIG_RECORRENCIA: ConfigRecorrencia = {
  frequencia: 'mensal',
  dia_vencimento: 10,
  data_inicio: new Date().toISOString().split('T')[0],
  data_fim: null,
  gerar_automatico: true,
}

const FREQUENCIAS: { value: FrequenciaRecorrencia; label: string }[] = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]

const fmtCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function LancamentoModalidadeSelector({
  modalidade,
  onModalidadeChange,
  numeroParcelas,
  onNumeroParcelasChange,
  supportsParcelamento = true,
  valor = 0,
  configRecorrencia,
  onConfigRecorrenciaChange,
  dataVencimento,
  disabled = false,
}: LancamentoModalidadeSelectorProps) {

  // Derivar dia_vencimento da data de vencimento quando mudar
  useEffect(() => {
    if (dataVencimento && modalidade === 'recorrente') {
      const day = parseInt(dataVencimento.split('-')[2], 10)
      if (day && day !== configRecorrencia.dia_vencimento) {
        onConfigRecorrenciaChange({
          ...configRecorrencia,
          dia_vencimento: day,
        })
      }
    }
  }, [dataVencimento, modalidade])

  const options: { value: LancamentoModalidade; label: string; icon: React.ReactElement }[] = [
    { value: 'unica', label: 'Única', icon: <Zap className="w-3.5 h-3.5" /> },
    ...(supportsParcelamento
      ? [{ value: 'parcelada' as LancamentoModalidade, label: 'Parcelada', icon: <CreditCard className="w-3.5 h-3.5" /> }]
      : []),
    { value: 'recorrente', label: 'Fixa / Recorrente', icon: <Repeat className="w-3.5 h-3.5" /> },
  ]

  const valorParcela = numeroParcelas > 0 ? valor / numeroParcelas : 0

  return (
    <div className="space-y-3">
      {/* Seletor de modalidade */}
      <div>
        <Label className="text-xs text-slate-600 dark:text-slate-400">Modalidade</Label>
        <div className="flex gap-1 mt-1 p-1 bg-slate-100 dark:bg-surface-1 rounded-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onModalidadeChange(opt.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
                modalidade === opt.value
                  ? 'bg-[#1E3A8A] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-2',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campos de Parcelamento */}
      {modalidade === 'parcelada' && (
        <div className="p-3 bg-[#f0f9f9] dark:bg-teal-950/30 border border-[#aacfd0] dark:border-teal-800 rounded-lg space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-[#34495e] dark:text-teal-300">Número de parcelas</Label>
              <Input
                type="number"
                min={2}
                max={60}
                value={numeroParcelas}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v >= 1 && v <= 60) {
                    onNumeroParcelasChange(v)
                  }
                }}
                className="h-8 mt-1 text-sm w-24"
                disabled={disabled}
              />
            </div>
            {valor > 0 && numeroParcelas >= 2 && (
              <div className="text-right">
                <p className="text-[11px] text-[#46627f] dark:text-teal-400">Valor por parcela</p>
                <p className="text-sm font-semibold text-[#34495e] dark:text-teal-200">
                  {fmtCurrency(valorParcela)}
                </p>
              </div>
            )}
          </div>
          {numeroParcelas >= 2 && valor > 0 && (
            <p className="text-[11px] text-[#46627f] dark:text-teal-400">
              {numeroParcelas}x de {fmtCurrency(valorParcela)} = {fmtCurrency(valor)}
            </p>
          )}
        </div>
      )}

      {/* Campos de Recorrência */}
      {modalidade === 'recorrente' && (
        <div className="p-3 bg-[#f0f9f9] dark:bg-teal-950/30 border border-[#aacfd0] dark:border-teal-800 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#34495e] dark:text-teal-300">Frequência</Label>
              <Select
                value={configRecorrencia.frequencia}
                onValueChange={(v) =>
                  onConfigRecorrenciaChange({
                    ...configRecorrencia,
                    frequencia: v as FrequenciaRecorrencia,
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger className="h-8 mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIAS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-[#34495e] dark:text-teal-300">Dia do vencimento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={configRecorrencia.dia_vencimento}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v >= 1 && v <= 31) {
                    onConfigRecorrenciaChange({
                      ...configRecorrencia,
                      dia_vencimento: v,
                    })
                  }
                }}
                className="h-8 mt-1 text-sm"
                disabled={disabled}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#34495e] dark:text-teal-300">
              Data fim (opcional — deixe vazio para indefinido)
            </Label>
            <Input
              type="date"
              value={configRecorrencia.data_fim || ''}
              onChange={(e) =>
                onConfigRecorrenciaChange({
                  ...configRecorrencia,
                  data_fim: e.target.value || null,
                })
              }
              className="h-8 mt-1 text-sm"
              disabled={disabled}
            />
          </div>
          <p className="text-[11px] text-[#46627f] dark:text-teal-400">
            Lançamentos futuros serão gerados automaticamente a cada período.
          </p>
        </div>
      )}
    </div>
  )
}

export { DEFAULT_CONFIG_RECORRENCIA }
