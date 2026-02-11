'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface PrazoResult {
  data_limite: Date
  dias_corridos: number
  dias_uteis_contados: number
  dias_feriados: number
  dias_fins_semana: number
  timeline: Array<{
    data: Date
    tipo: 'util' | 'feriado' | 'fim_semana'
    dia_semana: string
  }>
}

interface PrazoCalculatorProps {
  onCalculate?: (dataLimite: string) => void
  escritorioId?: string
}

export default function PrazoCalculator({ onCalculate, escritorioId }: PrazoCalculatorProps) {
  const supabase = createClient()
  const [dataInicio, setDataInicio] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [quantidadeDias, setQuantidadeDias] = useState<string>('15')
  const [tipoDias, setTipoDias] = useState<boolean>(true) // true = úteis, false = corridos
  const [resultado, setResultado] = useState<PrazoResult | null>(null)
  const [calculando, setCalculando] = useState(false)

  const calcularPrazo = async () => {
    setCalculando(true)

    try {
      const dias = parseInt(quantidadeDias)

      if (!dias || dias < 1) {
        alert('Quantidade de dias deve ser maior que zero')
        setCalculando(false)
        return
      }

      // Chamar função do Supabase
      const { data, error } = await supabase.rpc('calcular_data_limite_prazo', {
        p_data_intimacao: dataInicio,
        p_quantidade_dias: dias,
        p_dias_uteis: tipoDias,
        p_escritorio_id: escritorioId || null
      })

      if (error) {
        console.error('Erro ao calcular prazo:', error)
        alert('Erro ao calcular prazo: ' + error.message)
        setCalculando(false)
        return
      }

      // Buscar estatísticas da timeline
      const dataLimite = new Date(data)
      const inicio = new Date(dataInicio)

      // Buscar feriados no intervalo para mostrar timeline
      const { data: feriados } = await supabase
        .from('agenda_feriados')
        .select('data')
        .gte('data', dataInicio)
        .lte('data', data)
        .eq('escritorio_id', escritorioId || null)

      const feriadosDatas = new Set(feriados?.map((f: { data: string }) => f.data) || [])

      // Gerar timeline
      const timeline: PrazoResult['timeline'] = []
      let diasCorridos = 0
      let diasFeriados = 0
      let diasFinsSemana = 0
      let diasUteisContados = 0

      let currentDate = new Date(inicio)
      currentDate.setDate(currentDate.getDate() + 1)

      while (currentDate <= dataLimite) {
        const dataStr = format(currentDate, 'yyyy-MM-dd')
        const isHoliday = feriadosDatas.has(dataStr)
        const isWeekendDay = currentDate.getDay() === 0 || currentDate.getDay() === 6

        diasCorridos++
        if (isHoliday) diasFeriados++
        if (isWeekendDay) diasFinsSemana++
        if (!isHoliday && !isWeekendDay) diasUteisContados++

        timeline.push({
          data: new Date(currentDate),
          tipo: isHoliday ? 'feriado' : isWeekendDay ? 'fim_semana' : 'util',
          dia_semana: format(currentDate, 'EEEE', { locale: ptBR })
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      const result: PrazoResult = {
        data_limite: dataLimite,
        dias_corridos: diasCorridos,
        dias_uteis_contados: diasUteisContados,
        dias_feriados: diasFeriados,
        dias_fins_semana: diasFinsSemana,
        timeline
      }

      setResultado(result)

      if (onCalculate) {
        onCalculate(data) // Retorna string ISO da data limite
      }

    } catch (error) {
      console.error('Erro ao calcular prazo:', error)
      alert('Erro ao calcular prazo. Verifique os dados.')
    } finally {
      setCalculando(false)
    }
  }

  const limparCalculo = () => {
    setResultado(null)
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-base font-medium text-[#34495e] flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[#89bcbe]" />
          Calculadora de Prazos Processuais
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Formulário */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_inicio" className="text-xs font-semibold text-[#46627f]">
              Data de Início (Intimação) *
            </Label>
            <Input
              id="data_inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantidade_dias" className="text-xs font-semibold text-[#46627f]">
                Quantidade de Dias *
              </Label>
              <Input
                id="quantidade_dias"
                type="number"
                min="1"
                value={quantidadeDias}
                onChange={(e) => setQuantidadeDias(e.target.value)}
                placeholder="15"
                className="border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_dias" className="text-xs font-semibold text-[#46627f]">
                Tipo de Dias *
              </Label>
              <Select value={tipoDias ? 'uteis' : 'corridos'} onValueChange={(value) => setTipoDias(value === 'uteis')}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uteis">Dias Úteis</SelectItem>
                  <SelectItem value="corridos">Dias Corridos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={calcularPrazo}
              disabled={calculando}
              className="flex-1 bg-gradient-to-br from-[#34495e] to-[#46627f] hover:from-[#2c3e50] hover:to-[#34495e] text-white text-xs"
            >
              <Calculator className="w-3.5 h-3.5 mr-1.5" />
              {calculando ? 'Calculando...' : 'Calcular Prazo'}
            </Button>
            {resultado && (
              <Button
                onClick={limparCalculo}
                variant="outline"
                className="text-xs border-slate-200"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            {/* Data Limite */}
            <div className="p-4 bg-gradient-to-br from-[#89bcbe]/10 to-[#aacfd0]/10 border-2 border-[#89bcbe] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#46627f]">Data Limite Calculada:</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-[#34495e]">
                {format(resultado.data_limite, "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <p className="text-xs text-[#6c757d] mt-1">
                {format(resultado.data_limite, "EEEE", { locale: ptBR })}
              </p>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[10px] text-[#6c757d] font-medium mb-1">Dias Corridos</p>
                <p className="text-xl font-bold text-[#34495e]">{resultado.dias_corridos}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[10px] text-[#6c757d] font-medium mb-1">Dias Úteis</p>
                <p className="text-xl font-bold text-[#34495e]">{resultado.dias_uteis_contados}</p>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-[10px] text-amber-700 font-medium mb-1">Feriados</p>
                <p className="text-xl font-bold text-amber-900">{resultado.dias_feriados}</p>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-[10px] text-purple-700 font-medium mb-1">Fins de Semana</p>
                <p className="text-xl font-bold text-purple-900">{resultado.dias_fins_semana}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#46627f]">Timeline de Dias</h4>
                <span className="text-[10px] text-[#6c757d]">
                  {resultado.timeline.length} dias no total
                </span>
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {resultado.timeline.map((dia, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center justify-between p-2 rounded text-xs',
                      dia.tipo === 'util' && 'bg-emerald-50 border border-emerald-200',
                      dia.tipo === 'feriado' && 'bg-amber-50 border border-amber-200',
                      dia.tipo === 'fim_semana' && 'bg-purple-50 border border-purple-200'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">
                        {format(dia.data, 'dd/MM')}
                      </span>
                      <span className="text-[10px] text-[#6c757d] capitalize">
                        {dia.dia_semana}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-2 py-0.5 rounded',
                        dia.tipo === 'util' && 'bg-emerald-100 text-emerald-700',
                        dia.tipo === 'feriado' && 'bg-amber-100 text-amber-700',
                        dia.tipo === 'fim_semana' && 'bg-purple-100 text-purple-700'
                      )}
                    >
                      {dia.tipo === 'util' && 'Dia Útil'}
                      {dia.tipo === 'feriado' && 'Feriado'}
                      {dia.tipo === 'fim_semana' && 'Fim de Semana'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-900 leading-relaxed">
                <strong>Importante:</strong> Este cálculo considera feriados cadastrados no sistema.
                Feriados municipais e recessos forenses específicos podem alterar o prazo final.
                Sempre verifique com o calendário oficial do tribunal.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
