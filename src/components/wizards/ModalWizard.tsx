'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import StepIndicator from './StepIndicator'
import WizardNavigation from './WizardNavigation'
import type { WizardProps } from './types'

export default function ModalWizard({
  steps,
  currentStep,
  onStepChange,
  children,
  title,
  onClose,
  onComplete,
  isSubmitting = false,
}: WizardProps) {
  const [canProceed, setCanProceed] = useState(false)

  // Validate current step
  useEffect(() => {
    const validateStep = async () => {
      const step = steps[currentStep]
      if (step.validate) {
        const isValid = await step.validate()
        setCanProceed(isValid)
      } else {
        // No validation = always can proceed
        setCanProceed(true)
      }
    }

    validateStep()
  }, [currentStep, steps])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1)
    }
  }

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        {/* Hidden DialogTitle for accessibility */}
        <VisuallyHidden>
          <DialogTitle>{title}</DialogTitle>
        </VisuallyHidden>

        {/* Header with Title */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-[#34495e]">{title}</h2>
        </div>

        {/* Step Indicator */}
        <div className="px-5 pt-2 pb-1">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 px-5 pb-3 overflow-y-auto max-h-[500px]">
          {children}
        </div>

        {/* Navigation Footer */}
        <div className="px-6 pb-6">
          <WizardNavigation
            currentStep={currentStep}
            totalSteps={steps.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onComplete={onComplete}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            canProceed={canProceed}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
