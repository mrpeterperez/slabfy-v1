import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ProgressStepperProps {
  currentStep: number;
  assetType?: string;
  onStepClick?: (stepId: number) => void; // optional click handler (typically for going back)
  errorSteps?: number[]; // steps that currently have validation errors
}

const steps = [
  { id: 1, title: 'Asset Type', key: 'type' },
  { id: 2, title: 'Basic Info', key: 'basic' },
  { id: 3, title: 'Graded Info', key: 'graded' },
  { id: 4, title: 'Purchase Info', key: 'purchase' },
  { id: 5, title: 'Images & Notes', key: 'imagesNotes' },
];

export const ProgressStepper: React.FC<ProgressStepperProps> = ({ currentStep, assetType, onStepClick, errorSteps }) => {
  // Filter steps based on asset type
  const getVisibleSteps = () => {
    if (!assetType) return steps.slice(0, 1); // Only show Asset Type initially
    
    let visibleSteps = steps.filter(step => {
      if (step.key === 'graded' && assetType !== 'graded') return false;
      return true;
    });
    
    return visibleSteps;
  };

  const visibleSteps = getVisibleSteps();

  return (
    <div className="w-full mb-8">
    <div className="flex items-start">
        {visibleSteps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const canClick = !!onStepClick; // allow clicking any step
      const hasError = (errorSteps || []).includes(step.id) && !isCompleted;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle + Label */}
        <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={canClick ? () => onStepClick?.(step.id) : undefined}
          className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all border border-border ${
                    isCompleted
            ? 'bg-primary text-primary-foreground'
                      : isCurrent
            ? 'bg-primary text-primary-foreground'
                      : hasError
            ? 'bg-muted text-destructive'
            : 'bg-muted text-muted-foreground'
                  } ${canClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                  {hasError && (
                    <AlertCircle className="w-3 h-3 text-destructive absolute -top-1 -right-1 bg-background rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={canClick ? () => onStepClick?.(step.id) : undefined}
                  className={`mt-2 text-xs font-medium ${
                    isCurrent ? 'text-primary' : hasError ? 'text-destructive' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  } ${canClick ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
                >
                  {step.title}
                </button>
              </div>

              {/* Connector Line aligned to circle center */}
              {index < visibleSteps.length - 1 && (
                <div className="flex-1 h-0.5 mt-4 mx-2 bg-border" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
