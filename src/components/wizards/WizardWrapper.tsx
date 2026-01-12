'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { typography } from '@/lib/design-system';

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
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div className="flex-1">
            <h2 className={cn(typography.pageHeader, 'text-[#34495e]')}>{title}</h2>
            {description && (
              <p className={cn(typography.content, 'text-slate-600 mt-1')}>{description}</p>
            )}
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="ml-4 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {steps.map((s, index) => (
              <React.Fragment key={s.id}>
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors',
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
                      'flex-1 h-1 rounded transition-colors',
                      index < currentStep && 'bg-emerald-500',
                      index >= currentStep && 'bg-slate-200'
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-3">
            <h3 className={cn(typography.cardTitle, 'text-[#34495e]')}>
              {step.title}
            </h3>
            {step.description && (
              <p className={cn(typography.content, 'text-slate-600 mt-1')}>{step.description}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step.component}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200">
          <div>
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isValidating || isCompleting}
                className="hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step.optional && !isLastStep && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isValidating || isCompleting}
                className="hover:bg-slate-50"
              >
                Pular
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={isValidating || isCompleting}
              className="bg-gradient-to-r from-[#34495e] to-[#46627f] hover:opacity-90"
            >
              {isCompleting ? (
                'Finalizando...'
              ) : isValidating ? (
                'Validando...'
              ) : isLastStep ? (
                'Concluir'
              ) : (
                <>
                  Avançar
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
