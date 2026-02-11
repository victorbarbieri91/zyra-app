'use client'

import { useState } from 'react'
import { Repeat, Pin } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DateInput } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { getRecorrenciaSummary } from '@/lib/recorrencia-utils'

export { getRecorrenciaSummary }

export interface RecorrenciaData {
  ativa: boolean
  isFixa?: boolean
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual'
  intervalo: number
  diasSemana?: number[]
  diaMes?: number
  mes?: number
  dataInicio: string
  terminoTipo: 'permanente' | 'data' | 'ocorrencias'
  dataFim?: string
  numeroOcorrencias?: number
  horaPadrao: string
  apenasUteis?: boolean
}

interface RecorrenciaConfigProps {
  value: RecorrenciaData | null
  onChange: (data: RecorrenciaData | null) => void
  tipo: 'tarefa' | 'evento'
}

const DIAS_SEMANA = [
  { label: 'D', value: 0, nome: 'Domingo' },
  { label: 'S', value: 1, nome: 'Segunda' },
  { label: 'T', value: 2, nome: 'Terça' },
  { label: 'Q', value: 3, nome: 'Quarta' },
  { label: 'Q', value: 4, nome: 'Quinta' },
  { label: 'S', value: 5, nome: 'Sexta' },
  { label: 'S', value: 6, nome: 'Sábado' },
]

const MESES = [
  { label: 'Janeiro', value: 1 },
  { label: 'Fevereiro', value: 2 },
  { label: 'Março', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Maio', value: 5 },
  { label: 'Junho', value: 6 },
  { label: 'Julho', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Setembro', value: 9 },
  { label: 'Outubro', value: 10 },
  { label: 'Novembro', value: 11 },
  { label: 'Dezembro', value: 12 },
]

type Modo = 'nenhum' | 'fixa' | 'recorrente'

export default function RecorrenciaConfig({ value, onChange, tipo }: RecorrenciaConfigProps) {
  const getModoInicial = (): Modo => {
    if (value?.isFixa) return 'fixa'
    if (value?.ativa) return 'recorrente'
    return 'nenhum'
  }

  const [modo, setModo] = useState<Modo>(getModoInicial)

  const handleModoChange = (novoModo: Modo) => {
    if (novoModo === modo) {
      // Click no mesmo = desativar
      setModo('nenhum')
      onChange(null)
      return
    }

    setModo(novoModo)

    if (novoModo === 'fixa') {
      onChange({
        ativa: false,
        isFixa: true,
        frequencia: 'diaria',
        intervalo: 1,
        dataInicio: new Date().toISOString().split('T')[0],
        terminoTipo: 'permanente',
        horaPadrao: '09:00',
      })
    } else if (novoModo === 'recorrente') {
      onChange({
        ativa: true,
        isFixa: false,
        frequencia: 'semanal',
        intervalo: 1,
        diasSemana: [1, 2, 3, 4, 5],
        dataInicio: new Date().toISOString().split('T')[0],
        terminoTipo: 'permanente',
        horaPadrao: '09:00',
      })
    } else {
      onChange(null)
    }
  }

  const handleFieldChange = (field: keyof RecorrenciaData, newValue: any) => {
    if (!value) return

    let updates: Partial<RecorrenciaData> = { [field]: newValue }

    if (field === 'frequencia') {
      switch (newValue) {
        case 'diaria':
          updates.diasSemana = undefined
          updates.diaMes = undefined
          updates.mes = undefined
          break
        case 'semanal':
          updates.diaMes = undefined
          updates.mes = undefined
          updates.apenasUteis = undefined
          if (!value.diasSemana || value.diasSemana.length === 0) {
            updates.diasSemana = [1, 2, 3, 4, 5]
          }
          break
        case 'mensal':
          updates.diasSemana = undefined
          updates.mes = undefined
          updates.apenasUteis = undefined
          if (!value.diaMes) updates.diaMes = 1
          break
        case 'anual':
          updates.diasSemana = undefined
          updates.apenasUteis = undefined
          if (!value.diaMes) updates.diaMes = 1
          if (!value.mes) updates.mes = 1
          break
      }
    }

    onChange({ ...value, ...updates })
  }

  const toggleDiaSemana = (dia: number) => {
    if (!value) return
    const diasAtuais = value.diasSemana || []
    const novos = diasAtuais.includes(dia)
      ? diasAtuais.filter(d => d !== dia)
      : [...diasAtuais, dia].sort()
    handleFieldChange('diasSemana', novos)
  }

  const unidadeLabel = () => {
    switch (value?.frequencia) {
      case 'diaria': return 'dia(s)'
      case 'semanal': return 'semana(s)'
      case 'mensal': return 'mês(es)'
      case 'anual': return 'ano(s)'
      default: return ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle cards: Fixa / Recorrente */}
      <div className={cn('grid gap-3', tipo === 'tarefa' ? 'grid-cols-2' : 'grid-cols-1')}>
        {/* Tarefa Fixa — só para tarefas */}
        {tipo === 'tarefa' && (
          <button
            type="button"
            onClick={() => handleModoChange('fixa')}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
              modo === 'fixa'
                ? 'border-teal-400 bg-teal-50'
                : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0',
              modo === 'fixa' ? 'bg-teal-100' : 'bg-slate-100'
            )}>
              <Pin className={cn('w-4 h-4', modo === 'fixa' ? 'text-teal-600' : 'text-slate-400')} />
            </div>
            <div className="min-w-0">
              <div className={cn('text-sm font-medium', modo === 'fixa' ? 'text-teal-700' : 'text-slate-600')}>
                Tarefa Fixa
              </div>
              <div className={cn('text-[11px] mt-0.5', modo === 'fixa' ? 'text-teal-600' : 'text-slate-400')}>
                Todo dia, sem acumular
              </div>
            </div>
          </button>
        )}

        {/* Recorrente */}
        <button
          type="button"
          onClick={() => handleModoChange('recorrente')}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
            modo === 'recorrente'
              ? 'border-[#89bcbe] bg-[#aacfd0]/10'
              : 'border-slate-200 bg-white hover:border-[#89bcbe]/60 hover:bg-[#aacfd0]/5'
          )}
        >
          <div className={cn(
            'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0',
            modo === 'recorrente' ? 'bg-[#aacfd0]/30' : 'bg-slate-100'
          )}>
            <Repeat className={cn('w-4 h-4', modo === 'recorrente' ? 'text-[#34495e]' : 'text-slate-400')} />
          </div>
          <div className="min-w-0">
            <div className={cn('text-sm font-medium', modo === 'recorrente' ? 'text-[#34495e]' : 'text-slate-600')}>
              Recorrente
            </div>
            <div className={cn('text-[11px] mt-0.5', modo === 'recorrente' ? 'text-[#46627f]' : 'text-slate-400')}>
              Personalizar frequência
            </div>
          </div>
        </button>
      </div>

      {/* Config de recorrência (expandido quando modo === 'recorrente') */}
      {modo === 'recorrente' && value && (
        <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
          {/* Frequência + Intervalo na mesma linha */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={value.frequencia}
              onValueChange={(v) => handleFieldChange('frequencia', v)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-500">a cada</span>
            <Input
              type="number"
              min="1"
              value={value.intervalo || 1}
              onChange={(e) => handleFieldChange('intervalo', parseInt(e.target.value) || 1)}
              className="w-16 text-center"
            />
            <span className="text-sm text-slate-500">{unidadeLabel()}</span>
          </div>

          {/* Condicional: dias úteis (diária) */}
          {value.frequencia === 'diaria' && (
            <div className="flex items-center gap-2 pl-1">
              <Checkbox
                id="apenas-uteis"
                checked={value.apenasUteis || false}
                onCheckedChange={(checked) => handleFieldChange('apenasUteis', checked)}
              />
              <Label htmlFor="apenas-uteis" className="text-sm cursor-pointer text-slate-600">
                Apenas dias úteis
              </Label>
            </div>
          )}

          {/* Condicional: dias da semana (semanal) */}
          {value.frequencia === 'semanal' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Dias</Label>
              <div className="grid grid-cols-7 gap-1.5">
                {DIAS_SEMANA.map((dia) => (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => toggleDiaSemana(dia.value)}
                    className={cn(
                      'h-9 rounded-md border transition-all text-sm font-medium',
                      value.diasSemana?.includes(dia.value)
                        ? 'bg-[#89bcbe] border-[#89bcbe] text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-[#89bcbe]'
                    )}
                    title={dia.nome}
                  >
                    {dia.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Condicional: dia do mês (mensal) */}
          {value.frequencia === 'mensal' && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-500">No dia</Label>
              <Select
                value={value.diaMes?.toString() || '1'}
                onValueChange={(v) => handleFieldChange('diaMes', parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                    <SelectItem key={dia} value={dia.toString()}>
                      Dia {dia}
                    </SelectItem>
                  ))}
                  <SelectItem value="99">Último dia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Condicional: dia + mês (anual) */}
          {value.frequencia === 'anual' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-sm text-slate-500">No dia</Label>
              <Select
                value={value.diaMes?.toString() || '1'}
                onValueChange={(v) => handleFieldChange('diaMes', parseInt(v))}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                    <SelectItem key={dia} value={dia.toString()}>
                      {dia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-sm text-slate-500">de</Label>
              <Select
                value={value.mes?.toString() || '1'}
                onValueChange={(v) => handleFieldChange('mes', parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value.toString()}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Horário padrão — apenas para eventos */}
          {tipo === 'evento' && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-500">Horário</Label>
              <Input
                type="time"
                value={value.horaPadrao || '09:00'}
                onChange={(e) => handleFieldChange('horaPadrao', e.target.value)}
                className="w-[120px]"
              />
            </div>
          )}

          {/* Separador fino */}
          <div className="border-t border-slate-200" />

          {/* Período: início + término lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Início</Label>
              <DateInput
                value={value.dataInicio || ''}
                onChange={(date) => handleFieldChange('dataInicio', date)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Término</Label>
              <Select
                value={value.terminoTipo || 'permanente'}
                onValueChange={(v) => handleFieldChange('terminoTipo', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanente">Nunca</SelectItem>
                  <SelectItem value="data">Em data específica</SelectItem>
                  <SelectItem value="ocorrencias">Após N ocorrências</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sub-campo condicional para término */}
          {value.terminoTipo === 'data' && (
            <div className="pl-[calc(50%+0.375rem)]">
              <DateInput
                value={value.dataFim || ''}
                onChange={(date) => handleFieldChange('dataFim', date)}
              />
            </div>
          )}
          {value.terminoTipo === 'ocorrencias' && (
            <div className="flex items-center gap-2 pl-[calc(50%+0.375rem)]">
              <Input
                type="number"
                min="1"
                value={value.numeroOcorrencias || 10}
                onChange={(e) => handleFieldChange('numeroOcorrencias', parseInt(e.target.value) || 10)}
                className="w-20"
              />
              <span className="text-sm text-slate-500">vezes</span>
            </div>
          )}

          {/* Resumo compacto */}
          <div className="bg-[#aacfd0]/20 border border-[#89bcbe]/40 rounded-md px-3 py-2">
            <p className="text-xs text-[#34495e] font-medium flex items-center gap-2">
              <Repeat className="w-3.5 h-3.5 flex-shrink-0 text-[#89bcbe]" />
              <span>{getRecorrenciaSummary(value)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Info compacta para Tarefa Fixa */}
      {modo === 'fixa' && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
          <p className="text-xs text-teal-700 flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Aparece todo dia automaticamente. Nunca acumula atrasos. Vínculo com processo/consultivo obrigatório.</span>
          </p>
        </div>
      )}
    </div>
  )
}
