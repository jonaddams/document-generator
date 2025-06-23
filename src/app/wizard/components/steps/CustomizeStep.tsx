'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useWizard } from '../../context/WizardContext';
import StepNavigation from '../StepNavigation';
import { fetchTemplateJson } from '@/lib/utils';

export default function CustomizeStep() {
  const { state, dispatch, completeCurrentStep, nextStep } = useWizard();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const isInitializing = useRef(false);
  
  console.log('🎨 CustomizeStep render:', {
    template: state.template,
    hasTemplateEditor: !!state.templateEditor,
    hasTemplateDocument: !!state.templateDocument,
    currentStep: state.currentStep,
    isLoading,
    isInitializing: isInitializing.current
  });

  // Add global error handler for SDK errors
  useEffect(() => {
    const handleSDKError = (event: ErrorEvent) => {
      const error = event.error;
      const message = event.message || '';
      const stack = error?.stack || '';
      
      // Check for various SDK errors that we want to suppress
      if (message.includes('docauth-impl') || 
          message.includes('nutrient-viewer.js') ||
          stack.includes('IntersectionObserver') ||
          stack.includes('nutrient-viewer.js') ||
          message.includes('Cannot read properties of null')) {
        console.warn('⚠️ SDK error caught and handled:', { message, stack: stack.substring(0, 200) });
        event.preventDefault(); // Prevent the error from propagating
        return true;
      }
    };

    window.addEventListener('error', handleSDKError);
    return () => {
      window.removeEventListener('error', handleSDKError);
    };
  }, []);

  const initializeEditor = useCallback(async () => {
    console.log('🚀 INITIALIZEEDITOR CALLED with state:', {
      template: state.template,
      hasDocAuthSystem: !!state.docAuthSystem,
      hasTemplateDocument: !!state.templateDocument,
      hasTemplateEditor: !!state.templateEditor,
      isInitializing: isInitializing.current
    });

    if (isInitializing.current) {
      console.log('⏸️ Initialization already in progress, skipping');
      return;
    }

    // Wait for ref to be available
    let attempts = 0;
    const maxAttempts = 20;
    while (!editorRef.current && attempts < maxAttempts) {
      console.log(`🔄 Waiting for editor ref (attempt ${attempts + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!editorRef.current) {
      console.warn('❌ No editor ref available after waiting');
      return;
    }

    // Validate DOM connection and dimensions
    if (!editorRef.current.isConnected) {
      console.warn('❌ Editor ref element is not connected to DOM');
      return;
    }

    const rect = editorRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('❌ Editor ref element has zero dimensions:', rect);
      await new Promise(resolve => setTimeout(resolve, 200));
      const newRect = editorRef.current.getBoundingClientRect();
      if (newRect.width === 0 || newRect.height === 0) {
        console.warn('❌ Editor ref element still has zero dimensions after waiting:', newRect);
        return;
      }
    }

    if (!state.template) {
      console.warn('❌ No template selected');
      return;
    }

    isInitializing.current = true;
    setIsLoading(true);
    
    try {
      // Initialize Document Authoring system if not already done
      let docAuthSystem = state.docAuthSystem;
      if (!docAuthSystem) {
        if (!window.DocAuth) {
          console.error('❌ Document Authoring SDK not loaded');
          throw new Error('Document Authoring SDK not loaded');
        }

        docAuthSystem = await window.DocAuth.createDocAuthSystem();
        console.log('✅ Document Authoring system created');
        dispatch({ type: 'SET_DOC_AUTH_SYSTEM', payload: docAuthSystem });
      }

      // Always load the template document for the current template
      console.log('📄 Loading template document for:', state.template);
      let templateDocument;

      if (state.template === 'custom' && state.customTemplateBinary) {
        templateDocument = await docAuthSystem.importDOCX(state.customTemplateBinary);
        console.log('✅ Custom DOCX template imported');
      } else {
        try {
          const templateJson = await fetchTemplateJson(state.template as any);
          templateDocument = await docAuthSystem.loadDocument(templateJson);
          console.log('✅ DocJSON template loaded for:', state.template);
        } catch (fetchError) {
          console.error('❌ Error fetching template JSON:', fetchError);
          throw fetchError;
        }
      }

      dispatch({ type: 'SET_TEMPLATE_DOCUMENT', payload: templateDocument });

      // Initialize editor
      console.log('🖊️ Creating template editor...');
      
      const container = editorRef.current;
      if (!container) {
        console.warn('❌ Container became null during template editor initialization');
        return;
      }
      
      // Clear any existing content
      while (container.firstChild) {
        const child = container.firstChild;
        if (child.parentNode === container) {
          container.removeChild(child);
        } else {
          break;
        }
      }
      
      // Ensure container is properly styled and sized
      if (!container.id) {
        container.id = `template-editor-${Date.now()}`;
      }
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      container.style.minHeight = '500px';
      container.style.width = '100%';
      
      // Wait multiple frames to ensure DOM is completely settled
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Final validation
      if (!container.isConnected || !container.parentElement) {
        console.warn('❌ Template container became disconnected before editor creation');
        return;
      }
      
      console.log('📝 Container ready, creating editor with dimensions:', {
        width: container.getBoundingClientRect().width,
        height: container.getBoundingClientRect().height
      });
      
      try {
        const editor = await docAuthSystem.createEditor(container, {
          document: templateDocument,
        });
        console.log('✅ Template editor ready');
        dispatch({ type: 'SET_TEMPLATE_EDITOR', payload: editor });
      } catch (sdkError) {
        console.error('❌ Document Authoring SDK error in template editor:', sdkError);
        // Retry after delay
        console.log('🔄 Retrying template SDK initialization...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (container.isConnected && container.parentElement) {
          try {
            const editor = await docAuthSystem.createEditor(container, {
              document: templateDocument,
            });
            console.log('✅ Template editor created on retry');
            dispatch({ type: 'SET_TEMPLATE_EDITOR', payload: editor });
          } catch (retryError) {
            console.error('❌ Template SDK retry failed:', retryError);
            throw retryError;
          }
        } else {
          console.error('❌ Template container no longer available for retry');
          throw sdkError;
        }
      }
    } catch (error) {
      console.error('❌ Error initializing template editor:', error);
      
      // Check if it's the specific null properties error we're seeing
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Cannot read properties of null')) {
        console.warn('⚠️ Detected null properties error, this might be a timing or SDK conflict issue');
        dispatch({ type: 'SET_ERROR', payload: 'Template editor initialization failed - please try selecting a different template or refreshing the page' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    } finally {
      setIsLoading(false);
      isInitializing.current = false;
    }
  }, [state, dispatch]);

  useEffect(() => {
    console.log('📍 CustomizeStep useEffect triggered with:', {
      template: state.template,
      editorExists: !!state.templateEditor,
      documentExists: !!state.templateDocument,
      isInitializing: isInitializing.current,
      currentStep: state.currentStep
    });
    
    // Always clean up existing editor first when template changes
    if (state.templateEditor) {
      console.log('🧹 Cleaning up existing template editor');
      try {
        state.templateEditor.destroy();
        console.log('✅ Template editor destroyed successfully');
      } catch (error) {
        console.warn('⚠️ Template editor cleanup error:', error);
      }
      dispatch({ type: 'SET_TEMPLATE_EDITOR', payload: null });
      dispatch({ type: 'SET_TEMPLATE_DOCUMENT', payload: null });
    }
    
    // Initialize editor if we have a template
    if (state.template && !isInitializing.current) {
      console.log('🎆 About to initialize editor for template:', state.template);
      initializeEditor();
    } else {
      console.log('🚫 Not initializing editor:', {
        hasTemplate: !!state.template,
        isInitializing: isInitializing.current
      });
    }

    // Cleanup function
    return () => {
      if (state.templateEditor) {
        console.log('🧹 Cleaning up template editor on unmount');
        try {
          state.templateEditor.destroy();
        } catch (error) {
          console.warn('⚠️ Template editor cleanup error:', error);
        }
        dispatch({ type: 'SET_TEMPLATE_EDITOR', payload: null });
      }
    };
  }, [state.template]); // Only depend on template to force reinit when template changes

  const handleNext = () => {
    completeCurrentStep();
    nextStep();
  };

  return (
    <div className="h-full flex flex-col space-y-6">
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
      <div className="bg-white border border-gray-200 rounded-xl flex-1 relative overflow-hidden" style={{ minHeight: '500px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-75">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading template editor...</p>
            </div>
          </div>
        )}
        {state.error && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{state.error}</span>
            </div>
          </div>
        )}
        {!state.template && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2h-5m-4 0V3a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-4 0h8" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Template Editor</h3>
              <p className="mt-1 text-sm text-gray-500">Select a template first</p>
            </div>
          </div>
        )}
        <div 
          ref={editorRef} 
          className="w-full h-full"
          style={{ 
            minHeight: '500px',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}
        />
      </div>

      <StepNavigation
        canProceed={!!state.template && !!state.templateEditor && !isLoading}
        onNext={handleNext}
      />
    </div>
  );
}