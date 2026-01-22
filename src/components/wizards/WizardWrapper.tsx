'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
  optional?: boolean;
  validate?: () => boolean | Promise<boolean>;
}

interface WizardWrapperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void | Promise<void>;
  onCancel?: () => void;
  title: string;
  description?: string;
  className?: string;
}

export function WizardWrapper({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  title,
  description,
  className,
}: WizardWrapperProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = async () => {
    if (step.validate) {
      setIsValidating(true);
      try {
        const isValid = await step.validate();
        if (!isValid) {
          setIsValidating(false);
          return;
        }
      } catch (error) {
        console.error('Validation error:', error);
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    if (isLastStep) {
      setIsCompleting(true);
      try {
        await onComplete();
      } catch (error) {
        console.error('Completion error:', error);
      }
      setIsCompleting(false);
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (step.optional && !isLastStep) {
      onStepChange(currentStep + 1);
    }
  };

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4', className)}>
      <Card className="w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#34495e]">{title}</h2>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="ml-2 h-7 w-7 hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5">
            {steps.map((s, index) => (
              <React.Fragment key={s.id}>
                <div
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-medium transition-colors',
                    index < currentStep && 'bg-emerald-500 text-white',
                    index === currentStep && 'bg-[#34495e] text-white',
                    index > currentStep && 'bg-slate-200 text-slate-500'
                  )}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 rounded transition-colors',
                      index < currentStep && 'bg-emerald-500',
                      index >= currentStep && 'bg-slate-200'
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-2">
            <h3 className="text-xs font-medium text-[#34495e]">
              {step.title}
            </h3>
            {step.description && (
              <p className="text-[11px] text-slate-500">{step.description}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {step.component}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <div>
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isValidating || isCompleting}
                className="h-8 text-xs hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step.optional && !isLastStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={isValidating || isCompleting}
                className="h-8 text-xs hover:bg-slate-50"
              >
                Pular
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              disabled={isValidating || isCompleting}
              className="h-8 text-xs bg-gradient-to-r from-[#34495e] to-[#46627f] hover:opacity-90"
            >
              {isCompleting ? (
                'Finalizando...'
              ) : isValidating ? (
                'Validando...'
              ) : isLastStep ? (
                'Concluir'
              ) : (
                <>
                  Avancar
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
