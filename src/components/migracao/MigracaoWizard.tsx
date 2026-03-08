// ============================================
// WIZARD DE MIGRAÇÃO
// ============================================

'use client'

import { useMigracao } from '@/hooks/useMigracao'
import { ModuloMigracao, StepMigracao } from '@/types/migracao'
import { STEP_TITLES, getModuloConfig } from '@/lib/migracao/constants'
import { StepUpload } from './steps/StepUpload'
import { StepMapeamento } from './steps/StepMapeamento'
import { StepValidacao } from './steps/StepValidacao'
import { StepRevisao } from './steps/StepRevisao'
import { StepConfirmacao } from './steps/StepConfirmacao'
import { StepConclusao } from './steps/StepConclusao'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  modulo: ModuloMigracao
}

const STEPS: StepMigracao[] = [
  'upload',
  'mapeamento',
  'validacao',
  'revisao',
  'confirmacao',
  'conclusao'
]

export function MigracaoWizard({ modulo }: Props) {
  const {
    state,
    isLoading,
    error,
    setIsLoading,
    setError,
    updateState,
    goToStep,
    reset,
    setMapeamentoCampo,
    setJob
  } = useMigracao(modulo)

  const moduloConfig = getModuloConfig(modulo)
  const currentStepIndex = STEPS.indexOf(state.step)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/migracao">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-[#34495e] dark:text-slate-200">
              Migrar {moduloConfig?.nome || modulo}
            </h1>
            <p className="text-sm text-[#46627f] dark:text-slate-400">
              {moduloConfig?.descricao}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between px-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isUpcoming = index > currentStepIndex

          return (
            <div key={step} className="flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${isCompleted ? 'bg-green-500 text-white' :
                      isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-500/30' :
                      'bg-slate-200 dark:bg-surface-3 text-slate-500 dark:text-slate-400'}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`
                    text-xs mt-2 font-medium
                    ${isCurrent ? 'text-blue-600 dark:text-blue-400' :
                      isCompleted ? 'text-green-600 dark:text-emerald-400' :
                      'text-slate-400 dark:text-slate-500'}
                  `}
                >
                  {STEP_TITLES[step]}
                </span>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    w-16 h-1 mx-2 rounded-full
                    ${index < currentStepIndex ? 'bg-green-500' : 'bg-slate-200 dark:bg-surface-3'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
          <Button
            variant="link"
            className="ml-2 p-0 h-auto text-red-700 dark:text-red-400 underline"
            onClick={() => setError(null)}
          >
            Fechar
          </Button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white dark:bg-surface-1 rounded-lg border dark:border-slate-700 p-6">
        {state.step === 'upload' && (
          <StepUpload
            state={state}
            updateState={updateState}
            goToStep={goToStep}
            setError={setError}
            setIsLoading={setIsLoading}
            isLoading={isLoading}
          />
        )}

        {state.step === 'mapeamento' && (
          <StepMapeamento
            state={state}
            updateState={updateState}
            goToStep={goToStep}
            setMapeamentoCampo={setMapeamentoCampo}
            setError={setError}
            setIsLoading={setIsLoading}
            isLoading={isLoading}
          />
        )}

        {state.step === 'validacao' && (
          <StepValidacao
            state={state}
            updateState={updateState}
            goToStep={goToStep}
            setJob={setJob}
          />
        )}

        {state.step === 'revisao' && (
          <StepRevisao
            state={state}
            updateState={updateState}
            goToStep={goToStep}
          />
        )}

        {state.step === 'confirmacao' && (
          <StepConfirmacao
            state={state}
            updateState={updateState}
            goToStep={goToStep}
          />
        )}

        {(state.step === 'importando' || state.step === 'conclusao') && (
          <StepConclusao
            state={state}
            updateState={updateState}
            setJob={setJob}
          />
        )}
      </div>
    </div>
  )
}
