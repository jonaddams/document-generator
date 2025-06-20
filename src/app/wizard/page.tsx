'use client';

import { useState } from 'react';
import { WizardProvider } from './context/WizardContext';
import WizardLayout from './components/WizardLayout';
import StepIndicator from './components/StepIndicator';
import StepContent from './components/StepContent';

export default function WizardPage() {
  return (
    <WizardProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Document Generator
              </h1>
              <p className="text-lg text-gray-600">
                Create professional documents in just a few steps
              </p>
            </div>

            {/* Main Wizard */}
            <WizardLayout>
              <StepIndicator />
              <StepContent />
            </WizardLayout>
          </div>
        </div>
      </div>
    </WizardProvider>
  );
}