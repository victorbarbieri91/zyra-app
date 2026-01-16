'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  ExternalLink,
  Plus,
  Clock,
  FileText,
  AlertCircle,
  Check,
  X,
  Loader2,
  Receipt,
  Scale,
  Users,
  Calendar,
  CheckCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useProcessoFinanceiro } from '@/hooks/useProcessoFinanceiro'

interface Processo {
  id: string
  valor_causa?: number
  valor_acordo?: number
  valor_condenacao?: number
  provisao_sugerida?: number
  contrato_id?: string
  area?: string
}

interface ContratoInfo {
  id: string
  titulo: string
  forma_cobranca: string
  valor_fixo: number | null
  percentual_exito: number | null
  valor_hora: number | null
  valor_por_processo: number | null
  dia_cobranca: number | null
}

interface ValorPorCargo {
  cargo_id: string
  cargo_nome: string
  valor_padrao: number | null
  valor_negociado: number | null
}

interface AlertaCobranca {
  id: string
  ato_codigo: string
  ato_nome: string
  valor_sugerido: number | null
  data_detectado: string
  movimentacao_id: string
}

interface ProcessoFinanceiroProps {
  processo: Processo
}

const FORMA_COBRANCA_LABELS: Record<string, string> = {
  fixo: 'Valor Fixo',
  por_hora: 'Por Hora',
  por_etapa: 'Por Etapa',
  misto: 'Misto',
  por_pasta: 'Por Pasta (Mensal)',
  por_ato: 'Por Ato Processual',
  por_cargo: 'Por Cargo/Timesheet',
}

export default function ProcessoFinanceiro({ processo }: ProcessoFinanceiroProps) {
  const [contrato, setContrato] = useState<ContratoInfo | null>(null)
  const [valoresPorCargo, setValoresPorCargo] = useState<ValorPorCargo[]>([])
  const [alertas, setAlertas] = useState<AlertaCobranca[]>([])
  const [loadingContrato, setLoadingContrato] = useState(false)
  const [loadingAlertas, setLoadingAlertas] = useState(false)

  // Hook para dados financeiros do processo
  const {
    honorarios,
    despesas,
    resumo,
    loading: loadingFinanceiro,
    loadDados,
    lancarTimesheet,
    podelancarHoras,
  } = useProcessoFinanceiro(processo.id)

  // Estado para timesheet inline
  const [showTimesheetForm, setShowTimesheetForm] = useState(false)
  const [timesheetData, setTimesheetData] = useState({
    cargo_id: '',
    horas: '',
    minutos: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
  })
  const [salvandoTimesheet, setSalvandoTimesheet] = useState(false)

  const supabase = createClient()

  // Carregar dados do contrato
  useEffect(() => {
    const loadContratoData = async () => {
      if (!processo.contrato_id) {
        setContrato(null)
        return
      }

      setLoadingContrato(true)
      try {
        // Buscar contrato com config
        const { data: contratoData, error: contratoError } = await supabase
          .from('financeiro_contratos_honorarios')
          .select(`
            id,
            titulo,
            config:financeiro_contratos_honorarios_config(
              forma_cobranca,
              valor_fixo,
              percentual_exito,
              valor_hora,
              valor_por_processo,
              dia_cobranca
            )
          `)
          .eq('id', processo.contrato_id)
          .single()

        if (contratoError) throw contratoError

        if (contratoData) {
          setContrato({
            id: contratoData.id,
            titulo: contratoData.titulo,
            forma_cobranca: contratoData.config?.[0]?.forma_cobranca || 'fixo',
            valor_fixo: contratoData.config?.[0]?.valor_fixo || null,
            percentual_exito: contratoData.config?.[0]?.percentual_exito || null,
            valor_hora: contratoData.config?.[0]?.valor_hora || null,
            valor_por_processo: contratoData.config?.[0]?.valor_por_processo || null,
            dia_cobranca: contratoData.config?.[0]?.dia_cobranca || null,
          })

          // Se for por_cargo, buscar valores negociados
          if (contratoData.config?.[0]?.forma_cobranca === 'por_cargo') {
            const { data: valoresCargo } = await supabase
              .from('financeiro_contratos_valores_cargo')
              .select(`
                cargo_id,
                valor_hora_negociado,
                cargo:escritorios_cargos(nome_display, valor_hora_padrao)
              `)
              .eq('contrato_id', processo.contrato_id)

            if (valoresCargo) {
              setValoresPorCargo(valoresCargo.map(v => ({
                cargo_id: v.cargo_id,
                cargo_nome: v.cargo?.nome_display || 'Cargo',
                valor_padrao: v.cargo?.valor_hora_padrao || null,
                valor_negociado: v.valor_hora_negociado,
              })))
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar contrato:', error)
      } finally {
        setLoadingContrato(false)
      }
    }

    loadContratoData()
  }, [processo.contrato_id, supabase])

  // Carregar alertas de cobrança (atos pendentes)
  useEffect(() => {
    const loadAlertas = async () => {
      if (!processo.id || !contrato || contrato.forma_cobranca !== 'por_ato') {
        setAlertas([])
        return
      }

      setLoadingAlertas(true)
      try {
        const { data, error } = await supabase
          .from('financeiro_alertas_cobranca')
          .select(`
            id,
            valor_sugerido,
            created_at,
            movimentacao_id,
            ato_tipo:financeiro_atos_processuais_tipos(codigo, nome)
          `)
          .eq('processo_id', processo.id)
          .eq('status', 'pendente')
          .order('created_at', { ascending: false })

        if (error) throw error

        setAlertas((data || []).map(a => ({
          id: a.id,
          ato_codigo: a.ato_tipo?.codigo || '',
          ato_nome: a.ato_tipo?.nome || '',
          valor_sugerido: a.valor_sugerido,
          data_detectado: a.created_at,
          movimentacao_id: a.movimentacao_id,
        })))
      } catch (error) {
        console.error('Erro ao carregar alertas:', error)
      } finally {
        setLoadingAlertas(false)
      }
    }

    loadAlertas()
  }, [processo.id, contrato, supabase])

  // Dados financeiros agora vêm do hook useProcessoFinanceiro

  const getStatusBadge = (status: string) => {
    const styles = {
      pago: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      faturado: 'bg-blue-100 text-blue-700 border-blue-200',
      pendente: 'bg-amber-100 text-amber-700 border-amber-200',
      aprovado: 'bg-blue-100 text-blue-700 border-blue-200',
      cancelado: 'bg-slate-100 text-slate-500 border-slate-200',
    }
    return styles[status as keyof typeof styles] || styles.pendente
  }

  const STATUS_LABELS: Record<string, string> = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    faturado: 'Faturado',
    pago: 'Pago',
    cancelado: 'Cancelado',
  }

  // Handler para salvar timesheet
  const handleSalvarTimesheet = async () => {
    if (!timesheetData.descricao || (!timesheetData.horas && !timesheetData.minutos)) {
      toast.error('Preencha a descrição e o tempo trabalhado')
      return
    }

    // Verificar se modalidade permite lançar horas
    if (!podelancarHoras) {
      toast.error('Este processo não permite lançamento de horas')
      return
    }

    setSalvandoTimesheet(true)
    try {
      // Calcular horas totais
      const totalHoras = (parseInt(timesheetData.horas) || 0) + (parseInt(timesheetData.minutos) || 0) / 60

      // Usar o hook para salvar no banco
      const success = await lancarTimesheet({
        data_trabalho: timesheetData.data,
        horas: totalHoras,
        atividade: timesheetData.descricao,
        faturavel: true,
      })

      if (success) {
        toast.success('Horas registradas com sucesso!')
        setShowTimesheetForm(false)
        setTimesheetData({
          cargo_id: '',
          horas: '',
          minutos: '',
          descricao: '',
          data: new Date().toISOString().split('T')[0],
        })
      }
    } catch (error) {
      console.error('Erro ao salvar timesheet:', error)
      toast.error('Erro ao registrar horas')
    } finally {
      setSalvandoTimesheet(false)
    }
  }

  // Handler para cobrar alerta
  const handleCobrarAlerta = async (alerta: AlertaCobranca) => {
    toast.info(`Abrindo cobrança para: ${alerta.ato_nome}`)
    // TODO: Abrir modal de honorário pré-preenchido
  }

  // Handler para ignorar alerta
  const handleIgnorarAlerta = async (alertaId: string) => {
    try {
      const { error } = await supabase
        .from('financeiro_alertas_cobranca')
        .update({ status: 'ignorado', updated_at: new Date().toISOString() })
        .eq('id', alertaId)

      if (error) throw error

      setAlertas(prev => prev.filter(a => a.id !== alertaId))
      toast.success('Alerta ignorado')
    } catch (error) {
      console.error('Erro ao ignorar alerta:', error)
      toast.error('Erro ao ignorar alerta')
    }
  }

  return (
    <div className="space-y-6">
      {/* Card de Regras do Contrato */}
      {processo.contrato_id && (
        <Card className="border-[#89bcbe]/40 shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#89bcbe] to-[#6ba9ab] flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-base font-medium text-[#34495e]">
                  Regras do Contrato
                </CardTitle>
              </div>
              {loadingContrato ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : contrato && (
                <Badge variant="outline" className="text-xs">
                  {FORMA_COBRANCA_LABELS[contrato.forma_cobranca]}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingContrato ? (
              <div className="text-center py-4 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-sm">Carregando contrato...</p>
              </div>
            ) : contrato ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#34495e]">{contrato.titulo}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {contrato.valor_fixo && (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-0.5">Valor Fixo</p>
                      <p className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(contrato.valor_fixo)}
                      </p>
                    </div>
                  )}
                  {contrato.valor_hora && (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-0.5">Valor/Hora</p>
                      <p className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(contrato.valor_hora)}
                      </p>
                    </div>
                  )}
                  {contrato.percentual_exito && (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-0.5">Êxito</p>
                      <p className="text-sm font-semibold text-emerald-600">
                        {contrato.percentual_exito}%
                      </p>
                    </div>
                  )}
                  {contrato.valor_por_processo && (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-0.5">Valor/Processo</p>
                      <p className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(contrato.valor_por_processo)}
                      </p>
                    </div>
                  )}
                  {contrato.dia_cobranca && (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-0.5">Dia Cobrança</p>
                      <p className="text-sm font-semibold text-[#34495e]">
                        Dia {contrato.dia_cobranca}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tabela de valores por cargo */}
                {contrato.forma_cobranca === 'por_cargo' && valoresPorCargo.length > 0 && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <p className="text-xs font-medium text-slate-600">Valores por Cargo</p>
                    </div>
                    <div className="space-y-1.5">
                      {valoresPorCargo.map(vc => (
                        <div key={vc.cargo_id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{vc.cargo_nome}</span>
                          <span className="font-medium text-emerald-600">
                            {formatCurrency(vc.valor_negociado || vc.valor_padrao || 0)}/h
                            {vc.valor_negociado && vc.valor_negociado !== vc.valor_padrao && (
                              <span className="text-slate-400 line-through ml-1">
                                {formatCurrency(vc.valor_padrao || 0)}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Contrato não encontrado</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulário Inline de Timesheet */}
      {contrato && (contrato.forma_cobranca === 'por_cargo' || contrato.forma_cobranca === 'por_hora') && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-base font-medium text-[#34495e]">
                  Lançar Horas
                </CardTitle>
              </div>
              {!showTimesheetForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTimesheetForm(true)}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Registrar Horas
                </Button>
              )}
            </div>
          </CardHeader>
          {showTimesheetForm && (
            <CardContent>
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={timesheetData.data}
                      onChange={e => setTimesheetData(prev => ({ ...prev, data: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  {contrato.forma_cobranca === 'por_cargo' && valoresPorCargo.length > 0 && (
                    <div>
                      <Label className="text-xs">Cargo</Label>
                      <Select
                        value={timesheetData.cargo_id}
                        onValueChange={v => setTimesheetData(prev => ({ ...prev, cargo_id: v }))}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {valoresPorCargo.map(vc => (
                            <SelectItem key={vc.cargo_id} value={vc.cargo_id}>
                              {vc.cargo_nome} ({formatCurrency(vc.valor_negociado || vc.valor_padrao || 0)}/h)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Horas</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="0"
                      value={timesheetData.horas}
                      onChange={e => setTimesheetData(prev => ({ ...prev, horas: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Minutos</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      step="15"
                      placeholder="0"
                      value={timesheetData.minutos}
                      onChange={e => setTimesheetData(prev => ({ ...prev, minutos: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Descrição do Trabalho</Label>
                  <Textarea
                    placeholder="Descreva as atividades realizadas..."
                    value={timesheetData.descricao}
                    onChange={e => setTimesheetData(prev => ({ ...prev, descricao: e.target.value }))}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                {/* Preview do valor */}
                {(timesheetData.horas || timesheetData.minutos) && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Valor estimado:</span>
                      <span className="text-sm font-semibold text-emerald-600">
                        {(() => {
                          const cargoInfo = valoresPorCargo.find(v => v.cargo_id === timesheetData.cargo_id)
                          const valorHora = cargoInfo?.valor_negociado || cargoInfo?.valor_padrao || contrato?.valor_hora || 0
                          const totalHoras = (parseInt(timesheetData.horas) || 0) + (parseInt(timesheetData.minutos) || 0) / 60
                          return formatCurrency(valorHora * totalHoras)
                        })()}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTimesheetForm(false)}
                    disabled={salvandoTimesheet}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSalvarTimesheet}
                    disabled={salvandoTimesheet}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                  >
                    {salvandoTimesheet ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 mr-1" />
                    )}
                    Salvar
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Alertas de Atos Pendentes */}
      {contrato?.forma_cobranca === 'por_ato' && (
        <Card className="border-amber-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-base font-medium text-[#34495e]">
                  Atos Pendentes de Cobrança
                </CardTitle>
                {alertas.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    {alertas.length}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAlertas ? (
              <div className="text-center py-4 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-sm">Carregando alertas...</p>
              </div>
            ) : alertas.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum ato pendente de cobrança</p>
                <p className="text-xs mt-1">Atos serão detectados automaticamente a partir das movimentações</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alertas.map(alerta => (
                  <div
                    key={alerta.id}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-white">
                          {alerta.ato_codigo}
                        </Badge>
                        <p className="text-sm font-medium text-[#34495e]">{alerta.ato_nome}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(alerta.data_detectado).toLocaleDateString('pt-BR')}
                        </span>
                        {alerta.valor_sugerido && (
                          <span className="text-xs font-medium text-emerald-600">
                            Sugerido: {formatCurrency(alerta.valor_sugerido)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleIgnorarAlerta(alerta.id)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Ignorar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCobrarAlerta(alerta)}
                        className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1" />
                        Cobrar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          {loadingFinanceiro ? (
            <div className="text-center py-6 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Carregando honorários...</p>
            </div>
          ) : honorarios.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum honorário registrado</p>
              <p className="text-xs mt-1">Honorários serão exibidos aqui após lançamento</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-[#46627f]">Data</th>
                    <th className="text-left p-3 text-xs font-semibold text-[#46627f]">Tipo</th>
                    <th className="text-left p-3 text-xs font-semibold text-[#46627f]">Descrição</th>
                    <th className="text-right p-3 text-xs font-semibold text-[#46627f]">Valor</th>
                    <th className="text-center p-3 text-xs font-semibold text-[#46627f]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {honorarios.map(h => (
                    <tr key={h.id} className="border-b border-slate-100">
                      <td className="p-3 text-xs text-slate-600">
                        {formatBrazilDate(new Date(h.created_at))}
                      </td>
                      <td className="p-3 text-xs text-slate-600 capitalize">{h.tipo_honorario}</td>
                      <td className="p-3 text-sm text-slate-700">{h.descricao}</td>
                      <td className="p-3 text-sm text-right font-semibold text-[#34495e]">
                        {formatCurrency(h.valor_total)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] border ${getStatusBadge(h.status)}`}>
                          {STATUS_LABELS[h.status] || h.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={3} className="p-3 text-sm text-[#34495e]">Total</td>
                    <td className="p-3 text-sm text-right text-[#34495e]">
                      {formatCurrency(resumo.totalHonorarios)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
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
          {loadingFinanceiro ? (
            <div className="text-center py-6 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Carregando despesas...</p>
            </div>
          ) : despesas.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma despesa registrada</p>
              <p className="text-xs mt-1">Despesas serão exibidas aqui após lançamento</p>
            </div>
          ) : (
            <div className="space-y-2">
              {despesas.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#34495e]">{d.descricao}</p>
                      {d.reembolsavel && (
                        <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                          Reembolsável
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500">{d.categoria}</p>
                      <span className="text-slate-300">•</span>
                      <p className="text-xs text-slate-500">
                        {formatBrazilDate(new Date(d.data_vencimento))}
                      </p>
                      {d.status === 'pago' && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center text-xs text-emerald-600">
                            <CheckCircle className="w-3 h-3 mr-0.5" />
                            Pago
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${d.status === 'pago' ? 'text-slate-500' : 'text-red-600'}`}>
                    {formatCurrency(d.valor)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg font-semibold">
                <div>
                  <p className="text-sm text-[#34495e]">Total de Despesas</p>
                  {resumo.totalDespesasReembolsaveis > 0 && (
                    <p className="text-xs text-amber-600 font-normal">
                      {formatCurrency(resumo.totalDespesasReembolsaveis)} reembolsáveis pendentes
                    </p>
                  )}
                </div>
                <p className="text-sm text-red-700">{formatCurrency(resumo.totalDespesas)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
