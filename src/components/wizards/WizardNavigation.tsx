'use client'

import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WizardNavigationProps } from './types'

export default function WizardNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onComplete,
  isFirstStep,
  isLastStep,
  canProceed,
  isSubmitting = false,
  nextLabel = 'Próximo',
  completeLabel = 'Criar',
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
      {/* Previous Button */}
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep || isSubmitting}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Anterior
      </Button>

      {/* Step Counter */}
      <div className="text-xs text-slate-500">
        Etapa {currentStep + 1} de {totalSteps}
      </div>

      {/* Next/Complete Button */}
      {isLastStep ? (
        <Button
          type="button"
          onClick={onComplete}
          disabled={!canProceed || isSubmitting}
          className="gap-2 bg-[#34495e] hover:bg-[#46627f]"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {completeLabel}
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
          className="gap-2 bg-[#34495e] hover:bg-[#46627f]"
        >
          {nextLabel}
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
