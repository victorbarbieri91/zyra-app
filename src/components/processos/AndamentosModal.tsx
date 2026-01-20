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
import { Loader2, AlertTriangle, Check, X, RefreshCw, FileText, Info } from 'lucide-react'

interface AndamentosModalProps {
  open: boolean
  onClose: () => void
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
  movimentacoes_novas?: number
  mensagem?: string
}

export function AndamentosModal({
  open,
  onClose,
  selectedProcessos,
  onSuccess,
}: AndamentosModalProps) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultados, setResultados] = useState<ResultadoItem[]>([])
  const [concluido, setConcluido] = useState(false)

  const processosComCNJ = selectedProcessos.filter(p => p.numero_cnj)
  const processosSemCNJ = selectedProcessos.filter(p => !p.numero_cnj)

  const handleExecute = async () => {
    setLoading(true)
    setProgress(0)
    setResultados([])
    setConcluido(false)

    const results: ResultadoItem[] = []

    // Processos sem CNJ não podem ser atualizados
    for (const p of processosSemCNJ) {
      results.push({
        processo_id: p.id,
        numero_pasta: p.numero_pasta,
        status: 'sem_cnj',
        mensagem: 'Processo sem número CNJ',
      })
    }

    // Atualizar progresso inicial (processos sem CNJ já "processados")
    if (processosSemCNJ.length > 0) {
      setProgress((processosSemCNJ.length / selectedProcessos.length) * 100)
      setResultados([...results])
    }

    // Processar em lotes de até 20 (limite da API)
    const batchSize = 20
    for (let i = 0; i < processosComCNJ.length; i += batchSize) {
      const batch = processosComCNJ.slice(i, i + batchSize)
      const batchIds = batch.map(p => p.id)

      try {
        const response = await fetch('/api/processos/andamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ processo_ids: batchIds }),
        })

        const data = await response.json()

        if (data.sucesso && data.resultados) {
          for (const resultado of data.resultados) {
            const processo = batch.find(p => p.id === resultado.processo_id)
            results.push({
              processo_id: resultado.processo_id,
              numero_pasta: processo?.numero_pasta || resultado.numero_pasta || '',
              status: resultado.status,
              movimentacoes_novas: resultado.movimentacoes_novas,
              mensagem: resultado.erro,
            })
          }
        } else {
          // Erro no lote inteiro
          for (const processo of batch) {
            results.push({
              processo_id: processo.id,
              numero_pasta: processo.numero_pasta,
              status: 'erro',
              mensagem: data.erro || 'Erro ao processar lote',
            })
          }
        }
      } catch (error) {
        // Erro de conexão
        for (const processo of batch) {
          results.push({
            processo_id: processo.id,
            numero_pasta: processo.numero_pasta,
            status: 'erro',
            mensagem: error instanceof Error ? error.message : 'Erro de conexão',
          })
        }
      }

      // Atualizar progresso
      const processados = processosSemCNJ.length + Math.min(i + batchSize, processosComCNJ.length)
      setProgress((processados / selectedProcessos.length) * 100)
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

  const sucessos = resultados.filter(r => r.status === 'sucesso')
  const erros = resultados.filter(r => r.status === 'erro').length
  const semCnj = resultados.filter(r => r.status === 'sem_cnj').length
  const totalMovimentacoesNovas = sucessos.reduce((acc, r) => acc + (r.movimentacoes_novas || 0), 0)

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !loading && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            Atualizar Andamentos
          </DialogTitle>
          <DialogDescription>
            Buscar e salvar movimentações recentes dos processos selecionados via Escavador.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Aviso inicial */}
          {!loading && !concluido && (
            <>
              {/* Contagem */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-slate-700">
                  {processosComCNJ.length} {processosComCNJ.length === 1 ? 'processo será' : 'processos serão'}{' '}
                  atualizados
                </span>
              </div>

              {/* Processos sem CNJ */}
              {processosSemCNJ.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <X className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700">
                    {processosSemCNJ.length} {processosSemCNJ.length === 1 ? 'processo não possui' : 'processos não possuem'}{' '}
                    número CNJ e {processosSemCNJ.length === 1 ? 'será ignorado' : 'serão ignorados'}
                  </span>
                </div>
              )}

              {/* Aviso de tempo */}
              {processosComCNJ.length > 5 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    A atualização de muitos processos pode demorar. Aguarde a conclusão.
                  </span>
                </div>
              )}
            </>
          )}

          {/* Progresso */}
          {(loading || concluido) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {loading ? 'Atualizando andamentos...' : 'Concluído'}
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
              {sucessos.length > 0 && totalMovimentacoesNovas > 0 && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded text-sm text-emerald-700">
                  <Check className="w-4 h-4" />
                  {sucessos.length} {sucessos.length === 1 ? 'processo atualizado' : 'processos atualizados'}
                  <span className="ml-1">
                    ({totalMovimentacoesNovas} {totalMovimentacoesNovas === 1 ? 'nova movimentação' : 'novas movimentações'})
                  </span>
                </div>
              )}

              {/* Sucesso mas sem movimentações novas */}
              {sucessos.length > 0 && totalMovimentacoesNovas === 0 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded text-sm text-blue-700 border border-blue-200">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">
                      {sucessos.length} {sucessos.length === 1 ? 'processo consultado' : 'processos consultados'} - nenhuma movimentação nova encontrada
                    </p>
                    <p className="text-xs mt-1 text-blue-600">
                      O Escavador pode não ter histórico para processos recentes (2025).
                      Tente novamente em alguns dias ou com processos mais antigos.
                    </p>
                  </div>
                </div>
              )}

              {erros > 0 && (
                <div className="p-2 bg-red-50 rounded border border-red-200">
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <X className="w-4 h-4" />
                    {erros} {erros === 1 ? 'processo falhou' : 'processos falharam'}
                  </div>
                  {/* Mostrar detalhes dos erros */}
                  <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                    {resultados
                      .filter(r => r.status === 'erro')
                      .map(r => (
                        <div key={r.processo_id} className="text-xs text-red-600 flex justify-between gap-2">
                          <span className="truncate font-medium">{r.numero_pasta}</span>
                          <span className="truncate text-red-500">{r.mensagem}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {semCnj > 0 && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  {semCnj} {semCnj === 1 ? 'processo ignorado' : 'processos ignorados'} (sem CNJ)
                </div>
              )}

              {/* Lista detalhada se houver novas movimentações */}
              {totalMovimentacoesNovas > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">Detalhes:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {sucessos
                      .filter(r => (r.movimentacoes_novas || 0) > 0)
                      .map(r => (
                        <div key={r.processo_id} className="text-xs text-slate-600 flex justify-between">
                          <span className="truncate">{r.numero_pasta}</span>
                          <span className="text-emerald-600 ml-2">+{r.movimentacoes_novas}</span>
                        </div>
                      ))}
                  </div>
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar Andamentos
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
