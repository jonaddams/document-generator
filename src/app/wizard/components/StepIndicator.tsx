'use client';

import { useWizard } from '../context/WizardContext';

export default function StepIndicator() {
  const { state, goToStep } = useWizard();

  return (
    <div className="px-8 py-6 border-b border-gray-200">
      <nav aria-label="Progress">
        {/* Step circles with connectors */}
        <div className="flex items-center justify-between mb-8">
          {state.steps.map((step, stepIdx) => (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <button
                onClick={() => goToStep(stepIdx)}
                className={`group relative w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200 ${
                  step.isComplete
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : step.isActive
                    ? 'border-2 border-indigo-600 bg-white'
                    : 'border-2 border-gray-300 bg-white hover:border-gray-400'
                }`}
                disabled={!step.isComplete && !step.isActive}
              >
                <span className="sr-only">{step.title}</span>
                {step.isComplete ? (
                  <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : step.isActive ? (
                  <span className="w-3 h-3 bg-indigo-600 rounded-full" />
                ) : (
                  <span className="w-3 h-3 bg-gray-300 rounded-full" />
                )}
              </button>
              
              {/* Step Connector */}
              {stepIdx !== state.steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${step.isComplete ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step labels */}
        <div className="grid grid-cols-5 gap-4">
          {state.steps.map((step, stepIdx) => (
            <div key={`label-${step.id}`} className="text-center">
              <div className={`text-sm font-medium mb-1 ${
                step.isActive ? 'text-indigo-600' : step.isComplete ? 'text-indigo-600' : 'text-gray-500'
              }`}>
                {step.title}
              </div>
              <div className="text-xs text-gray-500 leading-tight">
                {step.description}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}