'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
}

export interface WizardState {
  currentStep: number;
  steps: WizardStep[];
  template: string | null;
  templateDocument: any;
  dataJson: any;
  docxDocument: any;
  pdfDocument: any;
  isLoading: boolean;
  error: string | null;
}

type WizardAction =
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_TEMPLATE'; payload: string }
  | { type: 'SET_TEMPLATE_DOCUMENT'; payload: any }
  | { type: 'SET_DATA_JSON'; payload: any }
  | { type: 'SET_DOCX_DOCUMENT'; payload: any }
  | { type: 'SET_PDF_DOCUMENT'; payload: any }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'COMPLETE_STEP'; payload: number }
  | { type: 'RESET_WIZARD' };

// Initial state
const initialSteps: WizardStep[] = [
  {
    id: 'template',
    title: 'Choose Template',
    description: 'Select a document template to get started',
    isComplete: false,
    isActive: true,
  },
  {
    id: 'customize',
    title: 'Customize Template',
    description: 'Edit your template design and layout',
    isComplete: false,
    isActive: false,
  },
  {
    id: 'data',
    title: 'Add Data',
    description: 'Provide the data to populate your document',
    isComplete: false,
    isActive: false,
  },
  {
    id: 'preview',
    title: 'Preview & Edit',
    description: 'Review and make final adjustments',
    isComplete: false,
    isActive: false,
  },
  {
    id: 'download',
    title: 'Download',
    description: 'Get your finished document',
    isComplete: false,
    isActive: false,
  },
];

const initialState: WizardState = {
  currentStep: 0,
  steps: initialSteps,
  template: null,
  templateDocument: null,
  dataJson: null,
  docxDocument: null,
  pdfDocument: null,
  isLoading: false,
  error: null,
};

// Reducer
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
        steps: state.steps.map((step, index) => ({
          ...step,
          isActive: index === action.payload,
        })),
      };

    case 'SET_TEMPLATE':
      return { ...state, template: action.payload };

    case 'SET_TEMPLATE_DOCUMENT':
      return { ...state, templateDocument: action.payload };

    case 'SET_DATA_JSON':
      return { ...state, dataJson: action.payload };

    case 'SET_DOCX_DOCUMENT':
      return { ...state, docxDocument: action.payload };

    case 'SET_PDF_DOCUMENT':
      return { ...state, pdfDocument: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'COMPLETE_STEP':
      return {
        ...state,
        steps: state.steps.map((step, index) => ({
          ...step,
          isComplete: index === action.payload ? true : step.isComplete,
        })),
      };

    case 'RESET_WIZARD':
      return initialState;

    default:
      return state;
  }
}

// Context
interface WizardContextType {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  completeCurrentStep: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

// Provider
export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const nextStep = () => {
    if (state.currentStep < state.steps.length - 1) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep + 1 });
    }
  };

  const prevStep = () => {
    if (state.currentStep > 0) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep - 1 });
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < state.steps.length) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: step });
    }
  };

  const completeCurrentStep = () => {
    dispatch({ type: 'COMPLETE_STEP', payload: state.currentStep });
  };

  const value = {
    state,
    dispatch,
    nextStep,
    prevStep,
    goToStep,
    completeCurrentStep,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

// Hook
export function useWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}