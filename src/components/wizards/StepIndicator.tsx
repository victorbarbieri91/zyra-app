'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepIndicatorProps } from './types'

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isPending = index > currentStep

        return (
          <div key={step.id} className="flex items-center gap-2">
            {/* Step with Circle and Label */}
            <div className="flex flex-col items-center gap-1 min-w-[70px]">
              <div
                className={cn(
                  'flex items-center justify-center rounded-full transition-all duration-200',
                  'w-6 h-6 text-[10px] font-medium',
                  isCompleted && 'bg-[#89bcbe] text-white',
                  isCurrent && 'bg-[#34495e] text-white ring-2 ring-[#89bcbe] ring-offset-1',
                  isPending && 'bg-slate-200 text-slate-500'
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-[9px] font-medium text-center w-full leading-tight',
                  isCurrent && 'text-[#34495e]',
                  isCompleted && 'text-[#89bcbe]',
                  isPending && 'text-slate-400'
                )}
              >
                {step.title}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-6 transition-all duration-200 -mt-4',
                  isCompleted ? 'bg-[#89bcbe]' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
