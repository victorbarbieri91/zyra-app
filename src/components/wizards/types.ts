// Wizard Types for Multi-Step Forms

export interface WizardStep {
  id: string
  title: string
  subtitle?: string
  isOptional?: boolean
  validate?: () => boolean | Promise<boolean>
  canSkip?: boolean
}

export interface WizardProps {
  steps: WizardStep[]
  currentStep: number
  onStepChange: (step: number) => void
  children: React.ReactNode
  title: string
  onClose: () => void
  onComplete: () => void | Promise<void>
  isSubmitting?: boolean
}

export interface StepIndicatorProps {
  steps: WizardStep[]
  currentStep: number
}

export interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  onPrevious: () => void
  onNext: () => void
  onComplete: () => void
  isFirstStep: boolean
  isLastStep: boolean
  canProceed: boolean
  isSubmitting?: boolean
  nextLabel?: string
  completeLabel?: string
}

export interface ReviewCardProps {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
}
