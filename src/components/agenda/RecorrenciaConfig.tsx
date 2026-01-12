'use client'

import { useState } from 'react'
import { Repeat, Calendar, Clock } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { DateInput } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

export interface RecorrenciaData {
  ativa: boolean
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

export default function RecorrenciaConfig({ value, onChange, tipo }: RecorrenciaConfigProps) {
  const [recorrenciaAtiva, setRecorrenciaAtiva] = useState(value?.ativa || false)

  const handleCheckboxChange = (checked: boolean) => {
    setRecorrenciaAtiva(checked)

    if (checked) {
      // Inicializar com valores padrão
      onChange({
        ativa: true,
        frequencia: 'semanal',
        intervalo: 1,
        diasSemana: [1, 2, 3, 4, 5], // Seg-Sex
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

    onChange({
      ...value,
      [field]: newValue,
    })
  }

  const toggleDiaSemana = (dia: number) => {
    if (!value) return

    const diasAtuais = value.diasSemana || []
    const novos = diasAtuais.includes(dia)
      ? diasAtuais.filter(d => d !== dia)
      : [...diasAtuais, dia].sort()

    handleFieldChange('diasSemana', novos)
  }

  if (!recorrenciaAtiva) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="recorrencia-ativa"
            checked={false}
            onCheckedChange={handleCheckboxChange}
          />
          <Label htmlFor="recorrencia-ativa" className="text-sm font-medium cursor-pointer">
            Esta {tipo} se repete
          </Label>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Checkbox principal */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="recorrencia-ativa"
          checked={true}
          onCheckedChange={handleCheckboxChange}
        />
        <Label htmlFor="recorrencia-ativa" className="text-sm font-medium cursor-pointer">
          Esta {tipo} se repete
        </Label>
      </div>

      {/* Card de configuração */}
      <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
        {/* Frequência */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Frequência</Label>
          <Select
            value={value?.frequencia}
            onValueChange={(v) => handleFieldChange('frequencia', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diaria">Diária</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Intervalo */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Repetir a cada
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={value?.intervalo || 1}
              onChange={(e) => handleFieldChange('intervalo', parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <span className="text-sm text-slate-600">
              {value?.frequencia === 'diaria' && 'dia(s)'}
              {value?.frequencia === 'semanal' && 'semana(s)'}
              {value?.frequencia === 'mensal' && 'mês/meses'}
              {value?.frequencia === 'anual' && 'ano(s)'}
            </span>
          </div>
        </div>

        {/* Configurações específicas por frequência */}
        {value?.frequencia === 'diaria' && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-md border border-slate-200">
            <Checkbox
              id="apenas-uteis"
              checked={value?.apenasUteis || false}
              onCheckedChange={(checked) => handleFieldChange('apenasUteis', checked)}
            />
            <Label htmlFor="apenas-uteis" className="text-sm cursor-pointer">
              Apenas em dias úteis
            </Label>
          </div>
        )}

        {value?.frequencia === 'semanal' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Repetir nos dias</Label>
            <div className="grid grid-cols-7 gap-2">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.value}
                  type="button"
                  onClick={() => toggleDiaSemana(dia.value)}
                  className={cn(
                    'h-10 rounded-md border-2 transition-all text-sm font-medium',
                    value?.diasSemana?.includes(dia.value)
                      ? 'bg-[#89bcbe] border-[#89bcbe] text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#89bcbe]'
                  )}
                  title={dia.nome}
                >
                  {dia.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {value?.frequencia === 'mensal' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">No dia</Label>
            <Select
              value={value?.diaMes?.toString() || '1'}
              onValueChange={(v) => handleFieldChange('diaMes', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                  <SelectItem key={dia} value={dia.toString()}>
                    Dia {dia}
                  </SelectItem>
                ))}
                <SelectItem value="99">Último dia do mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {value?.frequencia === 'anual' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dia</Label>
              <Select
                value={value?.diaMes?.toString() || '1'}
                onValueChange={(v) => handleFieldChange('diaMes', parseInt(v))}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Mês</Label>
              <Select
                value={value?.mes?.toString() || '1'}
                onValueChange={(v) => handleFieldChange('mes', parseInt(v))}
              >
                <SelectTrigger>
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
          </div>
        )}

        {/* Horário padrão */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Horário padrão
          </Label>
          <Input
            type="time"
            value={value?.horaPadrao || '09:00'}
            onChange={(e) => handleFieldChange('horaPadrao', e.target.value)}
          />
        </div>

        {/* Separador */}
        <div className="border-t border-slate-200" />

        {/* Período */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Período
          </Label>

          <div className="space-y-2">
            <Label className="text-xs text-slate-600">Inicia em</Label>
            <DateInput
              value={value?.dataInicio || ''}
              onChange={(date) => handleFieldChange('dataInicio', date)}
            />
          </div>

          <div className="space-y-3 bg-white p-3 rounded-md border border-slate-200">
            <Label className="text-xs text-slate-600">Termina</Label>

            <RadioGroup
              value={value?.terminoTipo || 'permanente'}
              onValueChange={(v) => handleFieldChange('terminoTipo', v)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="permanente" id="termino-permanente" />
                <Label htmlFor="termino-permanente" className="text-sm font-normal cursor-pointer">
                  Nunca (permanente)
                </Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="data" id="termino-data" />
                  <Label htmlFor="termino-data" className="text-sm font-normal cursor-pointer">
                    Em data específica
                  </Label>
                </div>
                {value?.terminoTipo === 'data' && (
                  <div className="ml-6">
                    <DateInput
                      value={value?.dataFim || ''}
                      onChange={(date) => handleFieldChange('dataFim', date)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ocorrencias" id="termino-ocorrencias" />
                  <Label htmlFor="termino-ocorrencias" className="text-sm font-normal cursor-pointer">
                    Após número de ocorrências
                  </Label>
                </div>
                {value?.terminoTipo === 'ocorrencias' && (
                  <div className="ml-6 flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={value?.numeroOcorrencias || 10}
                      onChange={(e) => handleFieldChange('numeroOcorrencias', parseInt(e.target.value) || 10)}
                      className="w-24"
                    />
                    <span className="text-sm text-slate-600">vezes</span>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-xs text-blue-700 flex items-start gap-2">
            <Repeat className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              As ocorrências serão criadas automaticamente para os próximos 45 dias.
              Você poderá editar ou excluir ocorrências individuais no calendário.
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
