'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateOfficeForm } from '@/components/onboarding/CreateOfficeForm'
import { ProfileForm } from '@/components/onboarding/ProfileForm'
import { useOnboarding, CreateEscritorioData, UpdateProfileData } from '@/hooks/useOnboarding'
import { Loader2, Building2, User, CheckCircle2 } from 'lucide-react'
import { colors } from '@/lib/design-system'

type Step = 'escritorio' | 'perfil'

export default function OnboardingPage() {
  const router = useRouter()
  const {
    progress,
    loading,
    error,
    createEscritorio,
    completeProfile,
    finishOnboarding,
    skipProfileAndFinish,
    isComplete,
    hasEscritorio,
  } = useOnboarding()

  const [currentStep, setCurrentStep] = useState<Step>('escritorio')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Determinar step inicial baseado no progresso
  useEffect(() => {
    if (!loading) {
      if (isComplete) {
        router.push('/dashboard')
      } else if (hasEscritorio) {
        setCurrentStep('perfil')
      } else {
        setCurrentStep('escritorio')
      }
    }
  }, [loading, isComplete, hasEscritorio, router])

  // Handler para criar escritório
  const handleCreateEscritorio = async (data: CreateEscritorioData) => {
    setIsSubmitting(true)
    const result = await createEscritorio(data)
    setIsSubmitting(false)

    if (result.success) {
      setCurrentStep('perfil')
    }

    return result
  }

  // Handler para completar perfil
  const handleCompleteProfile = async (data: UpdateProfileData) => {
    setIsSubmitting(true)
    const profileResult = await completeProfile(data)

    if (profileResult.success) {
      const finishResult = await finishOnboarding()
      setIsSubmitting(false)

      if (finishResult.success) {
        router.push('/dashboard')
      }
      return finishResult
    }

    setIsSubmitting(false)
    return profileResult
  }

  // Handler para pular perfil
  const handleSkipProfile = async () => {
    setIsSubmitting(true)
    const result = await skipProfileAndFinish()
    setIsSubmitting(false)

    if (result.success) {
      router.push('/dashboard')
    }

    return result
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: colors.primary.medium }} />
          <p className="text-sm text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Erro ao carregar</h2>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  const steps = [
    { id: 'escritorio' as Step, label: 'Escritório', icon: Building2 },
    { id: 'perfil' as Step, label: 'Perfil', icon: User },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header com Logo */}
      <div className="pt-8 pb-4">
        <div className="flex items-center justify-center">
          <img
            src="/zyra.logo.png"
            alt="Zyra Legal"
            className="h-12 w-auto object-contain"
          />
        </div>
      </div>

      {/* Step Indicator */}
      <div className="max-w-md mx-auto px-4 pb-6">
        <div className="flex items-center justify-center gap-3">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = index < currentStepIndex
            const StepIcon = step.icon

            return (
              <div key={step.id} className="flex items-center">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'ring-4 ring-offset-2'
                        : ''
                    }`}
                    style={{
                      backgroundColor: isCompleted
                        ? colors.primary.medium
                        : isActive
                        ? colors.primary.darkest
                        : '#e2e8f0',
                      ringColor: isActive ? colors.primary.light : undefined,
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <StepIcon
                        className="w-5 h-5"
                        style={{ color: isActive ? 'white' : '#94a3b8' }}
                      />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium ${
                      isActive ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className="w-16 h-0.5 mx-2 mb-5"
                    style={{
                      backgroundColor: isCompleted ? colors.primary.medium : '#e2e8f0',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Counter */}
        <p className="text-center text-xs text-slate-500 mt-4">
          Passo {currentStepIndex + 1} de {steps.length}
        </p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pb-12">
        {currentStep === 'escritorio' && (
          <CreateOfficeForm
            onSubmit={handleCreateEscritorio}
            isSubmitting={isSubmitting}
          />
        )}

        {currentStep === 'perfil' && (
          <ProfileForm
            onSubmit={handleCompleteProfile}
            onSkip={handleSkipProfile}
            onBack={() => setCurrentStep('escritorio')}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-4 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none">
        <p className="text-center text-xs text-slate-400">
          © 2025 Zyra Legal. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
