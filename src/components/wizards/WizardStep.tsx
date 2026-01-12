'use client'

import { cn } from '@/lib/utils'

interface WizardStepProps {
  title: string
  subtitle?: string
  isOptional?: boolean
  children: React.ReactNode
  className?: string
}

export default function WizardStep({
  title,
  subtitle,
  isOptional = false,
  children,
  className,
}: WizardStepProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Step Content - sem header */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
