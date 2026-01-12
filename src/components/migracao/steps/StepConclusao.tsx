// ============================================
// STEP 6: CONCLUSÃO / IMPORTANDO
// ============================================

'use client'

import { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle,
  Loader2,
  Download,
  ArrowRight,
  PartyPopper,
  AlertTriangle,
  XCircle
} from 'lucide-react'
import { MigracaoState, MigracaoJob } from '@/types/migracao'
import { useMigracaoJob } from '@/hooks/useMigracaoJob'
import { getModuloConfig, PROXIMO_MODULO } from '@/lib/migracao/constants'
import Link from 'next/link'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  setJob: (job: MigracaoJob) => void
}

export function StepConclusao({ state, updateState, setJob }: Props) {
  const { job } = useMigracaoJob(state.jobId)

  // Atualizar job quando mudar
  useEffect(() => {
    if (job) {
      setJob(job)
      updateState({ job, step: job.status === 'concluido' ? 'conclusao' : 'importando' })
    }
  }, [job])

  const moduloConfig = getModuloConfig(state.modulo)
  const proximoModulo = PROXIMO_MODULO[state.modulo]
  const proximoModuloConfig = proximoModulo ? getModuloConfig(proximoModulo) : null

  const isImporting = job?.status === 'importando'
  const isConcluido = job?.status === 'concluido'
  const isErro = job?.status === 'erro'

  const progresso = job
    ? Math.round((job.linhas_importadas / Math.max(job.linhas_validas, 1)) * 100)
    : 0

  // Estado de importação
  if (isImporting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-8">
        {/* Ícone animado */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          <p className="text-xl font-medium text-slate-700">
            Importando registros...
          </p>
          <p className="text-sm text-slate-500 mt-2">
            {job?.linhas_importadas || 0} de {job?.linhas_validas || 0} registros
          </p>
        </div>

        {/* Barra de progresso */}
        <div className="w-full max-w-md">
          <Progress value={progresso} className="h-3" />
          <p className="text-xs text-slate-400 text-center mt-2">
            {progresso}% concluído
          </p>
        </div>

        {/* Info */}
        <p className="text-xs text-slate-400 text-center">
          Por favor, não feche esta página até a importação ser concluída.
        </p>
      </div>
    )
  }

  // Estado de erro
  if (isErro) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">
            Erro na Importação
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md">
            {job?.resultado_final?.erro || 'Ocorreu um erro durante a importação. Por favor, tente novamente.'}
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/dashboard/migracao">
            <Button variant="outline">
              Voltar ao Hub
            </Button>
          </Link>
          <Link href={`/dashboard/migracao/${state.modulo}`}>
            <Button>
              Tentar Novamente
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Estado concluído
  return (
    <div className="space-y-6">
      {/* Header de sucesso */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div className="absolute -top-2 -right-2">
            <PartyPopper className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-slate-800 mt-6">
          Migração Concluída!
        </h2>
        <p className="text-slate-500 mt-2">
          {moduloConfig?.nome} importado com sucesso
        </p>
      </div>

      {/* Estatísticas */}
      <Card className="p-6">
        <h3 className="font-medium text-slate-700 mb-4">Estatísticas da Importação</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {job?.linhas_importadas || 0}
            </p>
            <p className="text-sm text-green-700">Importados</p>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">
              {job?.linhas_duplicadas || 0}
            </p>
            <p className="text-sm text-amber-700">Duplicatas</p>
          </div>

          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-600">
              {job?.linhas_com_erro || 0}
            </p>
            <p className="text-sm text-red-700">Erros</p>
          </div>
        </div>
      </Card>

      {/* Detalhes adicionais */}
      {job?.campos_extras && job.campos_extras.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="text-blue-700">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Os seguintes campos foram adicionados às observações:
            <strong className="ml-1">{job.campos_extras.join(', ')}</strong>
          </p>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-between items-center">
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Baixar Relatório
        </Button>

        <div className="flex gap-3">
          <Link href="/dashboard/migracao">
            <Button variant="outline">
              Voltar ao Hub
            </Button>
          </Link>

          {proximoModuloConfig && (
            <Link href={`/dashboard/migracao/${proximoModulo}`}>
              <Button>
                Migrar {proximoModuloConfig.nome}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}

          {!proximoModuloConfig && (
            <Link href="/dashboard">
              <Button>
                Ir para Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
