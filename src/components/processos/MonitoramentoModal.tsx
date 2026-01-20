'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, AlertTriangle, Check, X, Eye, EyeOff, CreditCard, Calendar, Clock } from 'lucide-react'

type FrequenciaMonitoramento = 'DIARIO' | 'SEMANAL'

interface MonitoramentoModalProps {
  open: boolean
  onClose: () => void
  action: 'ativar' | 'desativar'
  selectedProcessos: Array<{
    id: string
    numero_cnj: string | null
    numero_pasta: string
  }>
  onSuccess: () => void
}

interface ResultadoItem {
  processo_id: string
  numero_pasta: string
  status: 'sucesso' | 'erro' | 'sem_cnj'
  mensagem?: string
}

export function MonitoramentoModal({
  open,
  onClose,
  action,
  selectedProcessos,
  onSuccess,
}: MonitoramentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultados, setResultados] = useState<ResultadoItem[]>([])
  const [concluido, setConcluido] = useState(false)
  const [frequencia, setFrequencia] = useState<FrequenciaMonitoramento>('SEMANAL')

  const processosComCNJ = selectedProcessos.filter(p => p.numero_cnj)
  const processosSemCNJ = selectedProcessos.filter(p => !p.numero_cnj)

  const handleExecute = async () => {
    setLoading(true)
    setProgress(0)
    setResultados([])
    setConcluido(false)

    const results: ResultadoItem[] = []

    // Processos sem CNJ nao podem ser monitorados
    for (const p of processosSemCNJ) {
      results.push({
        processo_id: p.id,
        numero_pasta: p.numero_pasta,
        status: 'sem_cnj',
        mensagem: 'Processo sem numero CNJ',
      })
    }

    // Processar cada processo com CNJ
    for (let i = 0; i < processosComCNJ.length; i++) {
      const processo = processosComCNJ[i]

      try {
        const response = await fetch('/api/processos/monitoramento', {
          method: action === 'ativar' ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            processo_ids: [processo.id],
            frequencia: action === 'ativar' ? frequencia : undefined,
          }),
        })

        const data = await response.json()

        if (data.sucesso) {
          results.push({
            processo_id: processo.id,
            numero_pasta: processo.numero_pasta,
            status: 'sucesso',
          })
        } else {
          results.push({
            processo_id: processo.id,
            numero_pasta: processo.numero_pasta,
            status: 'erro',
            mensagem: data.erro || 'Erro desconhecido',
          })
        }
      } catch (error) {
        results.push({
          processo_id: processo.id,
          numero_pasta: processo.numero_pasta,
          status: 'erro',
          mensagem: error instanceof Error ? error.message : 'Erro de conexao',
        })
      }

      // Atualizar progresso
      setProgress(((i + 1 + processosSemCNJ.length) / selectedProcessos.length) * 100)
      setResultados([...results])
    }

    setLoading(false)
    setConcluido(true)

    // Se teve sucesso, notificar
    const sucessos = results.filter(r => r.status === 'sucesso')
    if (sucessos.length > 0) {
      setTimeout(() => {
        onSuccess()
      }, 1500)
    }
  }

  const handleClose = () => {
    setResultados([])
    setProgress(0)
    setConcluido(false)
    onClose()
  }

  const sucessos = resultados.filter(r => r.status === 'sucesso').length
  const erros = resultados.filter(r => r.status === 'erro').length
  const semCnj = resultados.filter(r => r.status === 'sem_cnj').length

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !loading && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'ativar' ? (
              <>
                <Eye className="w-5 h-5 text-emerald-600" />
                Ativar Monitoramento
              </>
            ) : (
              <>
                <EyeOff className="w-5 h-5 text-slate-500" />
                Desativar Monitoramento
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === 'ativar'
              ? 'Ativar monitoramento via Escavador para acompanhar movimentacoes automaticamente.'
              : 'Desativar monitoramento dos processos selecionados.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Aviso inicial */}
          {!loading && !concluido && (
            <>
              {/* Contagem */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-slate-700">
                  {processosComCNJ.length} {processosComCNJ.length === 1 ? 'processo sera' : 'processos serao'}{' '}
                  {action === 'ativar' ? 'monitorados' : 'desativados'}
                </span>
              </div>

              {/* Processos sem CNJ */}
              {processosSemCNJ.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <X className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700">
                    {processosSemCNJ.length} {processosSemCNJ.length === 1 ? 'processo nao possui' : 'processos nao possuem'}{' '}
                    numero CNJ e {processosSemCNJ.length === 1 ? 'sera ignorado' : 'serao ignorados'}
                  </span>
                </div>
              )}

              {/* Aviso de creditos */}
              {action === 'ativar' && processosComCNJ.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    O monitoramento consome creditos da API Escavador mensalmente.
                  </span>
                </div>
              )}

              {/* Frequencia de monitoramento */}
              {action === 'ativar' && processosComCNJ.length > 0 && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                  <Label className="text-sm font-medium text-slate-700">
                    Frequencia de verificacao
                  </Label>
                  <RadioGroup
                    value={frequencia}
                    onValueChange={(value) => setFrequencia(value as FrequenciaMonitoramento)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SEMANAL" id="semanal" />
                      <Label htmlFor="semanal" className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        Semanal
                        <span className="text-xs text-slate-400">(recomendado)</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="DIARIO" id="diario" />
                      <Label htmlFor="diario" className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Clock className="w-4 h-4 text-slate-500" />
                        Diario
                        <span className="text-xs text-amber-500">(mais creditos)</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </>
          )}

          {/* Progresso */}
          {(loading || concluido) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {loading ? 'Processando...' : 'Concluido'}
                </span>
                <span className="font-medium">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Resultados */}
          {concluido && (
            <div className="space-y-2">
              {sucessos > 0 && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded text-sm text-emerald-700">
                  <Check className="w-4 h-4" />
                  {sucessos} {sucessos === 1 ? 'processo' : 'processos'}{' '}
                  {action === 'ativar' ? 'monitorado' : 'desativado'} com sucesso
                </div>
              )}
              {erros > 0 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm text-red-700">
                  <X className="w-4 h-4" />
                  {erros} {erros === 1 ? 'processo falhou' : 'processos falharam'}
                </div>
              )}
              {semCnj > 0 && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  {semCnj} {semCnj === 1 ? 'processo ignorado' : 'processos ignorados'} (sem CNJ)
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!loading && !concluido && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleExecute}
                disabled={processosComCNJ.length === 0}
                className={
                  action === 'ativar'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-600 hover:bg-slate-700 text-white'
                }
              >
                {action === 'ativar' ? 'Ativar' : 'Desativar'} Monitoramento
              </Button>
            </>
          )}

          {loading && (
            <Button disabled className="bg-slate-400">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </Button>
          )}

          {concluido && (
            <Button onClick={handleClose} className="bg-[#34495e] hover:bg-[#2c3e50] text-white">
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
