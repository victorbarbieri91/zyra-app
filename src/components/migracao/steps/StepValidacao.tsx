// ============================================
// STEP 3: VALIDAÇÃO (PROCESSAMENTO)
// ============================================

'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { MigracaoState, StepMigracao, MigracaoJob } from '@/types/migracao'
import { useMigracaoJob } from '@/hooks/useMigracaoJob'
import { createClient } from '@/lib/supabase/client'

interface Props {
  state: MigracaoState
  updateState: (updates: Partial<MigracaoState>) => void
  goToStep: (step: StepMigracao) => void
  setJob: (job: MigracaoJob) => void
}

/**
 * Sanitiza o nome do arquivo para evitar erros no Storage
 * Remove acentos, caracteres especiais e substitui espaços por underscore
 */
function sanitizeFileName(name: string): string {
  return name
    // Remover acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Substituir espaços e caracteres especiais por underscore
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Remover underscores múltiplos
    .replace(/_+/g, '_')
    // Remover underscore no início/fim
    .replace(/^_|_$/g, '')
}

export function StepValidacao({ state, updateState, goToStep, setJob }: Props) {
  const [jobId, setJobId] = useState<string | null>(state.jobId)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<'upload' | 'processing'>('upload')

  const { job } = useMigracaoJob(jobId)

  // Criar job e fazer upload quando entrar no step
  useEffect(() => {
    if (!jobId && state.arquivo) {
      criarJobEProcessar()
    }
  }, [])

  // Monitorar mudanças no job
  useEffect(() => {
    if (job) {
      setJob(job)
      updateState({ job })

      // Navegar baseado no status
      if (job.status === 'aguardando_revisao') {
        if (job.linhas_com_erro > 0 || job.linhas_duplicadas > 0) {
          goToStep('revisao')
        } else {
          goToStep('confirmacao')
        }
      } else if (job.status === 'importando' || job.status === 'concluido') {
        // Se está importando ou concluído, ir para tela de conclusão
        goToStep('conclusao')
      } else if (job.status === 'erro') {
        // Tratar erro - poderia voltar ao step anterior
      }
    }
  }, [job])

  const criarJobEProcessar = async () => {
    if (!state.arquivo) return

    try {
      const supabase = createClient()

      // 1. Obter dados do usuário
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: profile } = await supabase
        .from('profiles')
        .select('escritorio_id')
        .eq('id', user.id)
        .single()

      if (!profile?.escritorio_id) throw new Error('Escritório não encontrado')

      // 2. Upload do arquivo para storage
      setUploadProgress(10)
      const sanitizedName = sanitizeFileName(state.arquivo.name)
      const fileName = `${Date.now()}_${sanitizedName}`
      const storagePath = `${profile.escritorio_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('migracao-temp')
        .upload(storagePath, state.arquivo)

      if (uploadError) throw uploadError
      setUploadProgress(50)

      // 3. Criar job no banco
      const { data: newJob, error: jobError } = await supabase
        .from('migracao_jobs')
        .insert({
          escritorio_id: profile.escritorio_id,
          modulo: state.modulo,
          arquivo_nome: state.arquivo.name,
          arquivo_storage_path: storagePath,
          mapeamento: state.mapeamento,
          total_linhas: state.totalLinhas,
          criado_por: user.id,
          status: 'pendente'
        })
        .select()
        .single()

      if (jobError) throw jobError
      setUploadProgress(70)

      setJobId(newJob.id)
      updateState({ jobId: newJob.id })

      // 4. Disparar Edge Function para processar
      setCurrentPhase('processing')
      setUploadProgress(100)

      const { error: fnError } = await supabase.functions.invoke('migracao-processar', {
        body: { job_id: newJob.id, acao: 'processar' }
      })

      if (fnError) {
        console.error('Erro ao invocar função:', fnError)
        // Não lançar erro aqui pois a função pode ser assíncrona
      }

    } catch (error) {
      console.error('Erro ao criar job:', error)
      // TODO: Mostrar erro e permitir retry
    }
  }

  const progresso = job
    ? Math.round((job.linhas_processadas / Math.max(job.total_linhas, 1)) * 100)
    : uploadProgress

  const getStatusText = () => {
    if (currentPhase === 'upload') {
      if (uploadProgress < 50) return 'Enviando arquivo...'
      if (uploadProgress < 70) return 'Criando job de migração...'
      return 'Iniciando processamento...'
    }

    if (!job) return 'Aguardando processamento...'

    switch (job.status) {
      case 'pendente':
        return 'Aguardando início...'
      case 'processando':
        return job.etapa_atual || 'Processando arquivo...'
      case 'validando':
        return 'Validando dados...'
      default:
        return 'Processando...'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
      {/* Ícone animado */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      </div>

      {/* Status */}
      <div className="text-center">
        <p className="text-xl font-medium text-slate-700">
          {getStatusText()}
        </p>
        {job && (
          <p className="text-sm text-slate-500 mt-2">
            {job.linhas_processadas} de {job.total_linhas} linhas
          </p>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="w-full max-w-md">
        <Progress value={progresso} className="h-3" />
        <p className="text-xs text-slate-400 text-center mt-2">
          {progresso}% concluído
        </p>
      </div>

      {/* Estatísticas parciais */}
      {job && job.linhas_processadas > 0 && (
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-slate-600">{job.linhas_validas} válidas</span>
          </div>

          {job.linhas_com_erro > 0 && (
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-slate-600">{job.linhas_com_erro} com erro</span>
            </div>
          )}

          {job.linhas_duplicadas > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-slate-600">{job.linhas_duplicadas} duplicatas</span>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-slate-400 text-center max-w-md">
        Estamos validando cada linha do seu arquivo, verificando CPFs, CNPJs,
        e-mails e buscando possíveis duplicatas no sistema.
      </p>
    </div>
  )
}
