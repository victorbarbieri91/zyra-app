'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  Check,
  X,
  Loader2,
  Receipt,
  Scale,
  Calendar,
  Plus,
  History,
  DollarSign,
  FileText,
  Ban,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/timezone'
import { toast } from 'sonner'
import {
  useCobrancaAtos,
  AlertaCobranca,
  AtoDisponivel,
  ReceitaHonorario,
} from '@/hooks/useCobrancaAtos'

interface Processo {
  id: string
  contrato_id?: string | null
  valor_causa?: number
  numero_cnj?: string
}

interface CobrancasTabProps {
  processo: Processo
  escritorioId: string
}

type TipoAlertaLabel = {
  [key in AlertaCobranca['tipo_alerta']]: string
}

const TIPO_ALERTA_LABELS: TipoAlertaLabel = {
  ato_processual: 'Ato Processual',
  prazo_vencido: 'Prazo Vencido',
  mensal: 'Mensal',
  manual: 'Manual',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

export default function CobrancasTab({ processo, escritorioId }: CobrancasTabProps) {
  const {
    loading,
    error,
    loadAlertasPendentes,
    confirmarAlerta,
    ignorarAlerta,
    loadAtosDisponiveis,
    cobrarAto,
    loadHistoricoCobrancas,
  } = useCobrancaAtos(escritorioId)

  const [alertas, setAlertas] = useState<AlertaCobranca[]>([])
  const [atosDisponiveis, setAtosDisponiveis] = useState<AtoDisponivel[]>([])
  const [historico, setHistorico] = useState<ReceitaHonorario[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Modal de confirmação de alerta
  const [modalConfirmar, setModalConfirmar] = useState<AlertaCobranca | null>(null)
  const [valorConfirmar, setValorConfirmar] = useState('')
  const [descricaoConfirmar, setDescricaoConfirmar] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  // Modal de ignorar alerta
  const [modalIgnorar, setModalIgnorar] = useState<AlertaCobranca | null>(null)
  const [justificativaIgnorar, setJustificativaIgnorar] = useState('')
  const [ignorando, setIgnorando] = useState(false)

  // Modal de cobrança manual
  const [modalCobrarAto, setModalCobrarAto] = useState<AtoDisponivel | null>(null)
  const [valorCobrarAto, setValorCobrarAto] = useState('')
  const [descricaoCobrarAto, setDescricaoCobrarAto] = useState('')
  const [cobrandoAto, setCobrandoAto] = useState(false)

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!processo.id) return

    setLoadingData(true)
    try {
      const [alertasData, atosData, historicoData] = await Promise.all([
        loadAlertasPendentes(processo.id),
        processo.contrato_id ? loadAtosDisponiveis(processo.id) : Promise.resolve([]),
        loadHistoricoCobrancas(processo.id),
      ])

      setAlertas(alertasData)
      setAtosDisponiveis(atosData)
      setHistorico(historicoData)
    } catch (err) {
      console.error('Erro ao carregar dados de cobrança:', err)
      toast.error('Erro ao carregar dados de cobrança')
    } finally {
      setLoadingData(false)
    }
  }, [processo.id, processo.contrato_id, loadAlertasPendentes, loadAtosDisponiveis, loadHistoricoCobrancas])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handler para abrir modal de confirmação
  const handleAbrirConfirmar = (alerta: AlertaCobranca) => {
    setModalConfirmar(alerta)
    setValorConfirmar(alerta.valor_sugerido?.toString() || '')
    setDescricaoConfirmar(alerta.descricao || '')
  }

  // Handler para confirmar alerta
  const handleConfirmarAlerta = async () => {
    if (!modalConfirmar) return

    if (!valorConfirmar || parseFloat(valorConfirmar) <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setConfirmando(true)
    try {
      await confirmarAlerta(
        modalConfirmar.id,
        parseFloat(valorConfirmar),
        descricaoConfirmar || undefined
      )
      toast.success('Cobrança confirmada com sucesso!')
      setModalConfirmar(null)
      setValorConfirmar('')
      setDescricaoConfirmar('')
      loadData()
    } catch (err) {
      console.error('Erro ao confirmar alerta:', err)
      toast.error('Erro ao confirmar cobrança')
    } finally {
      setConfirmando(false)
    }
  }

  // Handler para abrir modal de ignorar
  const handleAbrirIgnorar = (alerta: AlertaCobranca) => {
    setModalIgnorar(alerta)
    setJustificativaIgnorar('')
  }

  // Handler para ignorar alerta
  const handleIgnorarAlerta = async () => {
    if (!modalIgnorar) return

    setIgnorando(true)
    try {
      await ignorarAlerta(modalIgnorar.id, justificativaIgnorar || undefined)
      toast.success('Alerta ignorado')
      setModalIgnorar(null)
      setJustificativaIgnorar('')
      loadData()
    } catch (err) {
      console.error('Erro ao ignorar alerta:', err)
      toast.error('Erro ao ignorar alerta')
    } finally {
      setIgnorando(false)
    }
  }

  // Handler para abrir modal de cobrança manual
  const handleAbrirCobrarAto = (ato: AtoDisponivel) => {
    setModalCobrarAto(ato)
    setValorCobrarAto(ato.valor_calculado?.toString() || ato.valor_minimo_contrato?.toString() || ato.valor_fixo_padrao?.toString() || '')
    setDescricaoCobrarAto('')
  }

  // Handler para cobrar ato manualmente
  const handleCobrarAto = async () => {
    if (!modalCobrarAto) return

    if (!valorCobrarAto || parseFloat(valorCobrarAto) <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setCobrandoAto(true)
    try {
      await cobrarAto(
        processo.id,
        modalCobrarAto.id,
        parseFloat(valorCobrarAto),
        modalCobrarAto.nome,
        descricaoCobrarAto || undefined
      )
      toast.success('Ato cobrado com sucesso!')
      setModalCobrarAto(null)
      setValorCobrarAto('')
      setDescricaoCobrarAto('')
      loadData()
    } catch (err) {
      console.error('Erro ao cobrar ato:', err)
      toast.error('Erro ao cobrar ato')
    } finally {
      setCobrandoAto(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pago: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      pendente: 'bg-amber-100 text-amber-700 border-amber-200',
      atrasado: 'bg-red-100 text-red-700 border-red-200',
      cancelado: 'bg-slate-100 text-slate-500 border-slate-200',
    }
    return styles[status as keyof typeof styles] || styles.pendente
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Carregando cobranças...</span>
      </div>
    )
  }

  if (!processo.contrato_id) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-8">
          <div className="text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-amber-500" />
            <h3 className="text-base font-medium text-amber-800 mb-1">
              Processo sem Contrato Vinculado
            </h3>
            <p className="text-sm text-amber-700">
              Para gerenciar cobranças, vincule um contrato de honorários a este processo.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alertas Pendentes */}
      <Card className="border-amber-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-base font-medium text-[#34495e]">
                Alertas Pendentes de Cobrança
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
          {alertas.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum alerta pendente</p>
              <p className="text-xs mt-1">
                Alertas são gerados automaticamente a partir das movimentações ou manualmente
              </p>
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
                        {TIPO_ALERTA_LABELS[alerta.tipo_alerta]}
                      </Badge>
                      {alerta.ato_codigo && (
                        <Badge variant="outline" className="text-[10px] bg-white">
                          {alerta.ato_codigo}
                        </Badge>
                      )}
                      <p className="text-sm font-medium text-[#34495e]">{alerta.titulo}</p>
                    </div>
                    {alerta.descricao && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{alerta.descricao}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {formatBrazilDate(new Date(alerta.created_at))}
                      </span>
                      {alerta.valor_sugerido && alerta.valor_sugerido > 0 && (
                        <span className="text-xs font-medium text-emerald-600">
                          Sugerido: {formatCurrency(alerta.valor_sugerido)}
                        </span>
                      )}
                      {alerta.ato_nome && (
                        <span className="text-xs text-slate-500">{alerta.ato_nome}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAbrirIgnorar(alerta)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      <Ban className="w-3.5 h-3.5 mr-1" />
                      Ignorar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAbrirConfirmar(alerta)}
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

      {/* Atos Disponíveis para Cobrança Manual */}
      {atosDisponiveis.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-base font-medium text-[#34495e]">
                  Atos Disponíveis para Cobrança
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {atosDisponiveis.map(ato => (
                <div
                  key={ato.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {ato.codigo}
                      </Badge>
                      <p className="text-sm font-medium text-[#34495e]">{ato.nome}</p>
                    </div>
                    {ato.valor_calculado && ato.valor_calculado > 0 && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Valor: {formatCurrency(ato.valor_calculado)}
                        {ato.percentual_contrato && (
                          <span className="text-slate-400 ml-1">
                            ({ato.percentual_contrato}% da causa)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAbrirCobrarAto(ato)}
                    className="text-xs"
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1" />
                    Cobrar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Cobranças */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
                <History className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-base font-medium text-[#34495e]">
                Histórico de Cobranças
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma cobrança registrada</p>
              <p className="text-xs mt-1">
                Cobranças confirmadas aparecerão aqui
              </p>
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
                  {historico.map(item => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="p-3 text-xs text-slate-600">
                        {formatBrazilDate(new Date(item.created_at))}
                      </td>
                      <td className="p-3 text-xs text-slate-600 capitalize">{item.categoria}</td>
                      <td className="p-3 text-sm text-slate-700">{item.descricao}</td>
                      <td className="p-3 text-sm text-right font-semibold text-[#34495e]">
                        {formatCurrency(item.valor)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] border ${getStatusBadge(item.status)}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {historico.length > 0 && (
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={3} className="p-3 text-sm text-[#34495e]">Total</td>
                      <td className="p-3 text-sm text-right text-[#34495e]">
                        {formatCurrency(historico.reduce((sum, h) => sum + h.valor, 0))}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Alerta */}
      <Dialog open={!!modalConfirmar} onOpenChange={() => setModalConfirmar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cobrança</DialogTitle>
            <DialogDescription>
              Confirme os detalhes da cobrança para criar a receita de honorário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-[#34495e]">{modalConfirmar?.titulo}</p>
              {modalConfirmar?.ato_nome && (
                <p className="text-xs text-slate-500 mt-1">{modalConfirmar.ato_nome}</p>
              )}
            </div>
            <div>
              <Label className="text-sm">Valor da Cobrança</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorConfirmar}
                onChange={e => setValorConfirmar(e.target.value)}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Descrição (opcional)</Label>
              <Textarea
                value={descricaoConfirmar}
                onChange={e => setDescricaoConfirmar(e.target.value)}
                placeholder="Descrição adicional para a cobrança..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setModalConfirmar(null)}
              disabled={confirmando}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarAlerta}
              disabled={confirmando}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {confirmando ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Confirmar Cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ignorar Alerta */}
      <Dialog open={!!modalIgnorar} onOpenChange={() => setModalIgnorar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignorar Alerta</DialogTitle>
            <DialogDescription>
              Informe uma justificativa para ignorar este alerta de cobrança.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-[#34495e]">{modalIgnorar?.titulo}</p>
            </div>
            <div>
              <Label className="text-sm">Justificativa (opcional)</Label>
              <Textarea
                value={justificativaIgnorar}
                onChange={e => setJustificativaIgnorar(e.target.value)}
                placeholder="Por que este alerta está sendo ignorado?"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setModalIgnorar(null)}
              disabled={ignorando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleIgnorarAlerta}
              disabled={ignorando}
            >
              {ignorando ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Ban className="w-4 h-4 mr-1" />
              )}
              Ignorar Alerta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cobrança Manual de Ato */}
      <Dialog open={!!modalCobrarAto} onOpenChange={() => setModalCobrarAto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobrar Ato Processual</DialogTitle>
            <DialogDescription>
              Registre a cobrança deste ato processual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {modalCobrarAto?.codigo}
                </Badge>
                <p className="text-sm font-medium text-[#34495e]">{modalCobrarAto?.nome}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm">Valor da Cobrança</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorCobrarAto}
                onChange={e => setValorCobrarAto(e.target.value)}
                placeholder="0,00"
                className="mt-1"
              />
              {modalCobrarAto?.percentual_contrato && processo.valor_causa && (
                <p className="text-xs text-slate-500 mt-1">
                  {modalCobrarAto.percentual_contrato}% de {formatCurrency(processo.valor_causa)} = {formatCurrency((modalCobrarAto.percentual_contrato / 100) * processo.valor_causa)}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm">Observação (opcional)</Label>
              <Textarea
                value={descricaoCobrarAto}
                onChange={e => setDescricaoCobrarAto(e.target.value)}
                placeholder="Observações sobre esta cobrança..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setModalCobrarAto(null)}
              disabled={cobrandoAto}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={handleCobrarAto}
              disabled={cobrandoAto}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {cobrandoAto ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4 mr-1" />
              )}
              Cobrar Ato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
