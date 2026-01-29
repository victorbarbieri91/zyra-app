'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  FolderOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  FileText,
  Receipt,
  RefreshCw,
  Calendar,
  Building2,
  X,
  RotateCcw,
  Ban,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn, formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useFechamentosPasta,
  type FechamentoPasta,
  type AlertaLimiteContrato,
  type ProcessoFechamento,
} from '@/hooks/useFechamentosPasta'

interface FechamentosPastaTabProps {
  escritorioIds: string[]
  onFaturaGerada?: () => void
}

export function FechamentosPastaTab({
  escritorioIds,
  onFaturaGerada,
}: FechamentosPastaTabProps) {
  const {
    loading,
    error,
    loadFechamentos,
    loadAlertasLimite,
    loadResumo,
    removerProcesso,
    aprovarFechamento,
    gerarFatura,
    cancelarFechamento,
    renovarContrato,
    encerrarContrato,
    executarFechamentoManual,
  } = useFechamentosPasta(escritorioIds)

  const [fechamentos, setFechamentos] = useState<FechamentoPasta[]>([])
  const [alertas, setAlertas] = useState<AlertaLimiteContrato[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'aprovar' | 'faturar' | 'cancelar' | 'renovar' | 'encerrar' | 'remover'
    id: string
    processoId?: string
    contratoId?: string
  } | null>(null)

  // Carregar dados ao montar
  useEffect(() => {
    loadData()
  }, [escritorioIds])

  const loadData = async () => {
    const [fechData, alertasData] = await Promise.all([
      loadFechamentos(),
      loadAlertasLimite(),
    ])
    setFechamentos(fechData)
    setAlertas(alertasData)
  }

  // Agrupar fechamentos por status
  const { pendentes, aprovados } = useMemo(() => ({
    pendentes: fechamentos.filter(f => f.status === 'pendente'),
    aprovados: fechamentos.filter(f => f.status === 'aprovado'),
  }), [fechamentos])

  // Handlers
  const handleAprovar = async (id: string) => {
    const success = await aprovarFechamento(id)
    if (success) {
      loadData()
    }
    setConfirmDialog(null)
  }

  const handleGerarFatura = async (id: string) => {
    const faturaId = await gerarFatura(id)
    if (faturaId) {
      loadData()
      onFaturaGerada?.()
    }
    setConfirmDialog(null)
  }

  const handleCancelar = async (id: string) => {
    const success = await cancelarFechamento(id)
    if (success) {
      loadData()
    }
    setConfirmDialog(null)
  }

  const handleRemoverProcesso = async (fechamentoId: string, processoId: string) => {
    const success = await removerProcesso(fechamentoId, processoId)
    if (success) {
      loadData()
    }
    setConfirmDialog(null)
  }

  const handleRenovarContrato = async (contratoId: string) => {
    const success = await renovarContrato(contratoId)
    if (success) {
      loadData()
    }
    setConfirmDialog(null)
  }

  const handleEncerrarContrato = async (contratoId: string) => {
    const success = await encerrarContrato(contratoId)
    if (success) {
      loadData()
    }
    setConfirmDialog(null)
  }

  const handleExecutarFechamento = async () => {
    const result = await executarFechamentoManual()
    if (result.success) {
      loadData()
    }
  }

  const formatCompetencia = (date: string) => {
    return format(new Date(date), 'MMMM/yyyy', { locale: ptBR })
  }

  // Renderizar card de fechamento
  const renderFechamentoCard = (fechamento: FechamentoPasta) => {
    const isExpanded = expandedId === fechamento.id
    const isPendente = fechamento.status === 'pendente'

    return (
      <Card
        key={fechamento.id}
        className={cn(
          'border transition-all',
          isPendente
            ? 'border-amber-200 bg-amber-50/30'
            : 'border-blue-200 bg-blue-50/30'
        )}
      >
        <Collapsible open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : fechamento.id)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 pt-3 cursor-pointer hover:bg-white/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    isPendente ? 'bg-amber-100' : 'bg-blue-100'
                  )}>
                    <FolderOpen className={cn(
                      'w-4 h-4',
                      isPendente ? 'text-amber-600' : 'text-blue-600'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#34495e]">
                      {fechamento.cliente_nome}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">
                      {formatCompetencia(fechamento.competencia)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] h-5',
                      isPendente
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                    )}
                  >
                    {isPendente ? 'Pendente' : 'Aprovado'}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Resumo */}
              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">
                    {fechamento.qtd_processos} {fechamento.qtd_processos === 1 ? 'processo' : 'processos'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">
                    {formatCurrency(fechamento.valor_unitario)}/processo
                  </span>
                </div>
                <div className="ml-auto">
                  <span className="text-sm font-bold text-[#34495e]">
                    {formatCurrency(fechamento.valor_total)}
                  </span>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-3">
              {/* Lista de processos */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Processos incluídos:
                </p>
                <ScrollArea className="max-h-48">
                  <div className="space-y-1.5">
                    {fechamento.processos.map((processo: ProcessoFechamento) => (
                      <div
                        key={processo.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#34495e] truncate">
                            {processo.numero_pasta || processo.numero_cnj || 'Sem número'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {processo.titulo}
                          </p>
                        </div>
                        {isPendente && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDialog({
                                type: 'remover',
                                id: fechamento.id,
                                processoId: processo.id,
                              })
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                {isPendente && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => setConfirmDialog({ type: 'cancelar', id: fechamento.id })}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
                      onClick={() => setConfirmDialog({ type: 'aprovar', id: fechamento.id })}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Aprovar
                    </Button>
                  </>
                )}
                {fechamento.status === 'aprovado' && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                    onClick={() => setConfirmDialog({ type: 'faturar', id: fechamento.id })}
                  >
                    <Receipt className="w-3 h-3 mr-1" />
                    Gerar Fatura
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }

  // Renderizar alerta de limite
  const renderAlertaCard = (alerta: AlertaLimiteContrato) => (
    <Card
      key={alerta.id}
      className="border-red-200 bg-red-50/30"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#34495e]">
              {alerta.cliente_nome}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Contrato {alerta.numero_contrato || 'sem número'}
            </p>
            <p className="text-xs text-red-600 mt-2">
              Limite de {alerta.limite_meses} meses atingido ({alerta.meses_cobrados} meses cobrados)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-red-100">
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
            onClick={() => setConfirmDialog({
              type: 'encerrar',
              id: alerta.id,
              contratoId: alerta.contrato_id,
            })}
          >
            <Ban className="w-3 h-3 mr-1" />
            Encerrar Contrato
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:from-[#46627f] hover:to-[#34495e]"
            onClick={() => setConfirmDialog({
              type: 'renovar',
              id: alerta.id,
              contratoId: alerta.contrato_id,
            })}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Renovar Período
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {aprovados.length} aprovado{aprovados.length !== 1 ? 's' : ''}
          </Badge>
          {alertas.length > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              {alertas.length} alerta{alertas.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExecutarFechamento}
            disabled={loading}
            className="border-slate-200"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Executar Fechamento
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="border-slate-200"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Alertas de limite */}
      {alertas.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Contratos com Limite Atingido
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertas.map(renderAlertaCard)}
          </div>
        </div>
      )}

      {/* Fechamentos pendentes */}
      {pendentes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Aguardando Aprovação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendentes.map(renderFechamentoCard)}
          </div>
        </div>
      )}

      {/* Fechamentos aprovados */}
      {aprovados.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            Aprovados - Prontos para Faturar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aprovados.map(renderFechamentoCard)}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {fechamentos.length === 0 && alertas.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              Nenhum fechamento pendente
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Os fechamentos são gerados automaticamente no primeiro dia de cada mês
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleExecutarFechamento}
              disabled={loading}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Executar Fechamento Manual
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && fechamentos.length === 0 && (
        <div className="py-12 text-center">
          <RefreshCw className="w-8 h-8 mx-auto text-slate-400 animate-spin" />
          <p className="text-sm text-slate-500 mt-2">Carregando...</p>
        </div>
      )}

      {/* Dialog de confirmação */}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={() => setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.type === 'aprovar' && 'Aprovar Fechamento'}
              {confirmDialog?.type === 'faturar' && 'Gerar Fatura'}
              {confirmDialog?.type === 'cancelar' && 'Cancelar Fechamento'}
              {confirmDialog?.type === 'remover' && 'Remover Processo'}
              {confirmDialog?.type === 'renovar' && 'Renovar Contrato'}
              {confirmDialog?.type === 'encerrar' && 'Encerrar Contrato'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === 'aprovar' &&
                'Confirma a aprovação deste fechamento? Após aprovado, ele poderá ser convertido em fatura.'}
              {confirmDialog?.type === 'faturar' &&
                'Confirma a geração da fatura? Uma nova fatura será criada com os processos deste fechamento.'}
              {confirmDialog?.type === 'cancelar' &&
                'Confirma o cancelamento deste fechamento? Esta ação não pode ser desfeita.'}
              {confirmDialog?.type === 'remover' &&
                'Confirma a remoção deste processo do fechamento? O valor total será recalculado.'}
              {confirmDialog?.type === 'renovar' &&
                'Confirma a renovação do contrato? O contador de meses será zerado e o contrato continuará gerando fechamentos.'}
              {confirmDialog?.type === 'encerrar' &&
                'Confirma o encerramento do contrato? O contrato será inativado e não gerará mais fechamentos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDialog) return
                switch (confirmDialog.type) {
                  case 'aprovar':
                    handleAprovar(confirmDialog.id)
                    break
                  case 'faturar':
                    handleGerarFatura(confirmDialog.id)
                    break
                  case 'cancelar':
                    handleCancelar(confirmDialog.id)
                    break
                  case 'remover':
                    if (confirmDialog.processoId) {
                      handleRemoverProcesso(confirmDialog.id, confirmDialog.processoId)
                    }
                    break
                  case 'renovar':
                    if (confirmDialog.contratoId) {
                      handleRenovarContrato(confirmDialog.contratoId)
                    }
                    break
                  case 'encerrar':
                    if (confirmDialog.contratoId) {
                      handleEncerrarContrato(confirmDialog.contratoId)
                    }
                    break
                }
              }}
              className={cn(
                confirmDialog?.type === 'cancelar' || confirmDialog?.type === 'encerrar'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
              )}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
