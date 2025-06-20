'use client';

import { useWizard } from '../../context/WizardContext';
import StepNavigation from '../StepNavigation';

export default function PreviewStep() {
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
          Preview & Edit
        </h2>
        <p className="text-lg text-gray-600">
          Review your document and make final adjustments
        </p>
      </div>

      {/* Document Preview */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5l7-7 7 7M9 20h6" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Document Preview</h3>
          <p className="mt-2 text-sm text-gray-500">
            Your generated document will appear here for final review
          </p>
          <div className="mt-4 text-xs text-gray-400">
            Template: {state.template || 'None selected'}<br />
            Data: {state.dataJson ? 'Loaded' : 'No data'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2h-5m-4 0V3a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-4 0h8" />
          </svg>
          Edit Document
        </button>
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Generate Document
        </button>
      </div>

      <StepNavigation
        canProceed={!!state.template && !!state.dataJson}
        onNext={handleNext}
      />
    </div>
  );
}