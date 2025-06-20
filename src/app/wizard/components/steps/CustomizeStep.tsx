'use client';

import { useWizard } from '../../context/WizardContext';
import StepNavigation from '../StepNavigation';

export default function CustomizeStep() {
  const { state, completeCurrentStep, nextStep } = useWizard();

  const handleNext = () => {
    completeCurrentStep();
    nextStep();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Customize Your Template
        </h2>
        <p className="text-lg text-gray-600">
          Edit the template design and layout to match your needs
        </p>
      </div>

      {/* Template Editor Container */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2h-5m-4 0V3a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-4 0h8" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Template Editor</h3>
          <p className="mt-1 text-sm text-gray-500">
            {state.template ? `Editing ${state.template} template` : 'Select a template first'}
          </p>
        </div>
      </div>

      <StepNavigation
        canProceed={!!state.template}
        onNext={handleNext}
      />
    </div>
  );
}