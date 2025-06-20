'use client';

import React, { useState, useCallback } from 'react';
import { AppState, StepType, AppError } from '@/types';
import { TRANSITION_MESSAGES } from '@/lib/constants';

// Import step components
import TemplateSelection from './steps/TemplateSelection';
import TemplateEditor from './steps/TemplateEditor';
import DataEditor from './steps/DataEditor';
import DocxEditor from './steps/DocxEditor';
import PdfViewer from './steps/PdfViewer';
import Transition from './Transition';
import ErrorBoundary from './ErrorBoundary';

const initialAppState: AppState = {
  docAuthSystem: null,
  template: null,
  customTemplateBinary: null,
  templateDocument: null,
  templateEditor: null,
  dataJson: null,
  dataEditor: null,
  docxDocument: null,
  docxEditor: null,
  pdfViewer: null,
};

export default function DocumentGenerator() {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [currentStep, setCurrentStep] = useState<StepType>('template-selection');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');
  const [error, setError] = useState<AppError | null>(null);

  const updateAppState = useCallback((updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  const startTransition = useCallback((step: StepType, message?: string) => {
    setIsTransitioning(true);
    setTransitionMessage(message || TRANSITION_MESSAGES[step]);
  }, []);

  const endTransition = useCallback((step: StepType) => {
    setCurrentStep(step);
    setIsTransitioning(false);
    setTransitionMessage('');
  }, []);

  const navigateToStep = useCallback(async (step: StepType, message?: string) => {
    try {
      setError(null);
      startTransition(step, message);
      
      // Add a small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 300));
      
      endTransition(step);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        step,
        details: err,
      });
      setIsTransitioning(false);
    }
  }, [startTransition, endTransition]);

  const handleNext = useCallback(() => {
    const stepOrder: StepType[] = [
      'template-selection',
      'template-editor', 
      'data-editor',
      'docx-editor',
      'pdf-viewer'
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      navigateToStep(stepOrder[currentIndex + 1]);
    }
  }, [currentStep, navigateToStep]);

  const handlePrevious = useCallback(() => {
    const stepOrder: StepType[] = [
      'template-selection',
      'template-editor',
      'data-editor', 
      'docx-editor',
      'pdf-viewer'
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      navigateToStep(stepOrder[currentIndex - 1]);
    }
  }, [currentStep, navigateToStep]);

  const handleReset = useCallback(() => {
    // Clean up editors and viewers
    if (appState.templateEditor) {
      appState.templateEditor.destroy();
    }
    if (appState.docxEditor) {
      appState.docxEditor.destroy();
    }
    if (appState.pdfViewer && window.PSPDFKit) {
      window.PSPDFKit.unload(appState.pdfViewer);
    }
    if (appState.dataEditor) {
      appState.dataEditor.toTextArea();
    }

    setAppState(initialAppState);
    navigateToStep('template-selection');
    setError(null);
  }, [appState, navigateToStep]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="nutri-card">
          <div className="nutri-card-header">
            <h2 className="text-xl font-semibold">Error</h2>
          </div>
          <div className="nutri-card-content">
            <p className="text-red-600 mb-4">{error.message}</p>
            <button 
              onClick={handleReset}
              className="nutri-button-primary"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onReset={handleReset}>
      <div className="max-w-6xl mx-auto relative">
        {isTransitioning && (
          <Transition 
            isVisible={isTransitioning} 
            message={transitionMessage} 
          />
        )}
        
        {!isTransitioning && (
          <>
            {currentStep === 'template-selection' && (
              <TemplateSelection
                isActive={true}
                onNext={handleNext}
                onPrevious={handlePrevious}
                appState={appState}
                updateAppState={updateAppState}
                navigateToStep={(step: 'template-editor') => navigateToStep(step)}
              />
            )}
            
            {currentStep === 'template-editor' && (
              <TemplateEditor
                isActive={true}
                onNext={handleNext}
                onPrevious={handlePrevious}
                appState={appState}
                updateAppState={updateAppState}
                navigateToStep={(step: 'template-selection' | 'data-editor') => navigateToStep(step)}
              />
            )}
            
            {currentStep === 'data-editor' && (
              <DataEditor
                isActive={true}
                onNext={handleNext}
                onPrevious={handlePrevious}
                appState={appState}
                updateAppState={updateAppState}
                navigateToStep={(step: 'template-editor' | 'docx-editor') => navigateToStep(step)}
              />
            )}
            
            {currentStep === 'docx-editor' && (
              <DocxEditor
                isActive={true}
                onNext={handleNext}
                onPrevious={handlePrevious}
                appState={appState}
                updateAppState={updateAppState}
                navigateToStep={(step: 'data-editor' | 'pdf-viewer') => navigateToStep(step)}
              />
            )}
            
            {currentStep === 'pdf-viewer' && (
              <PdfViewer
                isActive={true}
                onNext={handleNext}
                onPrevious={handlePrevious}
                appState={appState}
                updateAppState={updateAppState}
                navigateToStep={(step: 'docx-editor') => navigateToStep(step)}
              />
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}