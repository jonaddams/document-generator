'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useWizard } from '../../context/WizardContext';
import StepNavigation from '../StepNavigation';

export default function PreviewStep() {
  const { state, dispatch, completeCurrentStep, nextStep } = useWizard();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const isInitializing = useRef(false);

  // Add global error handler for SDK IntersectionObserver errors
  useEffect(() => {
    const handleSDKError = (event: ErrorEvent) => {
      const error = event.error;
      const message = event.message || '';
      
      // Check if this is the known IntersectionObserver SDK error
      if (message.includes('docauth-impl') || 
          (error && error.stack && error.stack.includes('IntersectionObserver'))) {
        console.warn('⚠️ Document Authoring SDK IntersectionObserver error caught and handled:', error);
        event.preventDefault(); // Prevent the error from propagating
        return true;
      }
    };

    window.addEventListener('error', handleSDKError);
    return () => {
      window.removeEventListener('error', handleSDKError);
    };
  }, []);

  const initializeDocxEditor = useCallback(async () => {
    console.log('🔄 PreviewStep: Initializing DOCX editor');

    if (isInitializing.current) {
      console.log('⏸️ Initialization already in progress, skipping');
      return;
    }

    // Wait for ref to be available
    let attempts = 0;
    const maxAttempts = 20;
    while (!editorRef.current && attempts < maxAttempts) {
      console.log(`🔄 Waiting for DOCX editor ref (attempt ${attempts + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!editorRef.current) {
      console.warn('❌ No DOCX editor ref available after waiting');
      return;
    }

    // Validate DOM connection and dimensions
    if (!editorRef.current.isConnected) {
      console.warn('❌ DOCX editor ref element is not connected to DOM');
      return;
    }

    const rect = editorRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('❌ DOCX editor ref element has zero dimensions:', rect);
      await new Promise(resolve => setTimeout(resolve, 200));
      const newRect = editorRef.current.getBoundingClientRect();
      if (newRect.width === 0 || newRect.height === 0) {
        console.warn('❌ DOCX editor ref element still has zero dimensions after waiting:', newRect);
        return;
      }
    }
    
    if (!state.templateDocument) {
      console.warn('❌ No template document available');
      return;
    }
    
    if (!state.dataJson) {
      console.warn('❌ No data JSON available');
      return;
    }

    isInitializing.current = true;
    setIsLoading(true);
    
    try {
      // Generate DOCX from template and data if not already done
      let docxDocument = state.docxDocument;
      let docAuthSystem = state.docAuthSystem;
      
      if (!docxDocument) {
        console.log('📄 Generating DOCX document from template and data...');
        
        if (!docAuthSystem) {
          console.error('❌ Document Authoring system not available');
          throw new Error('Document Authoring system not available');
        }
        
        if (!window.PSPDFKit) {
          console.error('❌ PSPDFKit not available - SDK may not be loaded');
          throw new Error('PSPDFKit not loaded');
        }

        console.log('🔧 Exporting template to DOCX buffer...');
        const templateBuffer = await state.templateDocument.exportDOCX();
        console.log('✅ Template exported to buffer, size:', templateBuffer.byteLength);
        
        console.log('🔧 Populating template with data...');
        console.log('Data to populate:', state.dataJson);
        const docxBuffer = await window.PSPDFKit.populateDocumentTemplate(
          { document: templateBuffer },
          state.dataJson
        );
        console.log('✅ Template populated, result size:', docxBuffer.byteLength);
        
        console.log('🔧 Importing populated DOCX into Document Authoring...');
        docxDocument = await docAuthSystem.importDOCX(docxBuffer);
        console.log('✅ DOCX document imported:', docxDocument);
        
        dispatch({ type: 'SET_DOCX_DOCUMENT', payload: docxDocument });
      } else {
        console.log('✅ DOCX document already exists');
      }

      // Initialize editor
      console.log('🖊️ Creating Document Authoring editor for DOCX...');
      
      const container = editorRef.current;
      if (!container) {
        console.warn('❌ Container became null during initialization');
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
      
      console.log('📝 Container cleared, creating DOCX editor with dimensions:', {
        width: container.getBoundingClientRect().width,
        height: container.getBoundingClientRect().height
      });
      
      // Ensure container is still valid
      if (!container.isConnected) {
        console.warn('❌ Container lost DOM connection before editor creation');
        return;
      }
      
      // Add stable ID and styling
      if (!container.id) {
        container.id = `docx-editor-${Date.now()}`;
      }
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      container.style.minHeight = '500px';
      container.style.minWidth = '100%';
      
      // Wait multiple frames to ensure DOM is completely settled
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Final validation
      if (!container.isConnected || !container.parentElement) {
        console.warn('❌ Container became disconnected before editor creation');
        return;
      }
      
      try {
        // Wrap SDK creation in additional error handling
        const createEditorSafely = async () => {
          try {
            return await docAuthSystem!.createEditor(container, {
              document: docxDocument!,
            });
          } catch (error) {
            // Check if this is an IntersectionObserver error
            if (error instanceof Error && 
                (error.message.includes('IntersectionObserver') || 
                 error.stack?.includes('IntersectionObserver'))) {
              console.warn('⚠️ IntersectionObserver error during editor creation, retrying...');
              // Wait longer and retry
              await new Promise(resolve => setTimeout(resolve, 1000));
              return await docAuthSystem!.createEditor(container, {
                document: docxDocument!,
              });
            }
            throw error;
          }
        };

        const editor = await createEditorSafely();
        console.log('✅ DOCX editor created successfully');
        dispatch({ type: 'SET_DOCX_EDITOR', payload: editor });
      } catch (sdkError) {
        console.error('❌ Document Authoring SDK error:', sdkError);
        
        // Only retry if container is still valid and error is not IntersectionObserver related
        const isIntersectionError = sdkError instanceof Error && 
          (sdkError.message.includes('IntersectionObserver') || 
           sdkError.stack?.includes('IntersectionObserver'));
           
        if (!isIntersectionError && container.isConnected && container.parentElement) {
          console.log('🔄 Retrying SDK initialization...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const editor = await docAuthSystem!.createEditor(container, {
              document: docxDocument!,
            });
            console.log('✅ DOCX editor created on retry');
            dispatch({ type: 'SET_DOCX_EDITOR', payload: editor });
          } catch (retryError) {
            console.error('❌ Document Authoring SDK retry failed:', retryError);
            throw retryError;
          }
        } else {
          console.error('❌ Container no longer available for retry or IntersectionObserver error');
          if (isIntersectionError) {
            // For IntersectionObserver errors, don't fail completely
            console.warn('⚠️ Continuing despite IntersectionObserver error');
            return;
          }
          throw sdkError;
        }
      }
    } catch (error) {
      console.error('❌ Error initializing DOCX editor:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'DOCX editor initialization failed' });
    } finally {
      setIsLoading(false);
      isInitializing.current = false;
    }
  }, [state.templateDocument, state.dataJson, state.docAuthSystem, state.docxDocument, dispatch]);

  useEffect(() => {
    console.log('📍 PreviewStep useEffect triggered with:', {
      templateDocument: !!state.templateDocument,
      dataJson: !!state.dataJson,
      docxEditor: !!state.docxEditor
    });
    
    // Always clean up existing editor and downstream state first
    if (state.docxEditor) {
      console.log('🧹 Cleaning up existing DOCX editor');
      try {
        state.docxEditor.destroy();
      } catch (error) {
        console.warn('⚠️ DOCX editor cleanup error:', error);
      }
      dispatch({ type: 'SET_DOCX_EDITOR', payload: null });
      dispatch({ type: 'SET_DOCX_DOCUMENT', payload: null });
      dispatch({ type: 'SET_PDF_DOCUMENT', payload: null });
    }
    
    // Initialize if we have required data
    if (state.templateDocument && state.dataJson && !isInitializing.current) {
      console.log('🎆 Initializing DOCX editor for preview');
      // Wrap initialization in try-catch to handle any SDK errors
      try {
        initializeDocxEditor();
      } catch (error) {
        console.warn('⚠️ Error in initializeDocxEditor:', error);
        // Don't let this error break the component
      }
    }

    // Cleanup function
    return () => {
      if (state.docxEditor) {
        console.log('🧹 Cleaning up DOCX editor on unmount');
        try {
          state.docxEditor.destroy();
        } catch (error) {
          console.warn('⚠️ DOCX editor cleanup error:', error);
        }
        dispatch({ type: 'SET_DOCX_EDITOR', payload: null });
      }
    };
  }, [state.templateDocument, state.dataJson]); // Only depend on input data to force reinit when they change

  const handleGenerateDocument = useCallback(async () => {
    if (!state.docxDocument) {
      console.warn('❌ No DOCX document available for generation');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('📄 Generating PDF from DOCX document...');
      const pdfBuffer = await state.docxDocument.exportPDF();
      console.log('✅ PDF generated, size:', pdfBuffer.byteLength);
      
      // Create a copy of the ArrayBuffer to prevent detachment
      const pdfBufferCopy = pdfBuffer.slice();
      console.log('📋 Created PDF buffer copy, size:', pdfBufferCopy.byteLength);
      
      // Store the PDF buffer copy for the download step
      dispatch({ type: 'SET_PDF_DOCUMENT', payload: pdfBufferCopy });
      
      // Mark step as complete and proceed
      completeCurrentStep();
      nextStep();
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'PDF generation failed' });
    } finally {
      setIsGenerating(false);
    }
  }, [state.docxDocument, dispatch, completeCurrentStep, nextStep]);

  const handleNext = () => {
    if (state.docxDocument) {
      handleGenerateDocument();
    } else {
      // If no document, just proceed (shouldn't happen with proper navigation)
      completeCurrentStep();
      nextStep();
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Preview & Edit
        </h2>
        <p className="text-lg text-gray-600">
          Review your generated document and make final adjustments
        </p>
      </div>

      {/* Document Editor */}
      <div className="bg-white border border-gray-200 rounded-xl min-h-[500px] relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-75">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Generating document...</p>
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
        {!state.templateDocument && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5l7-7 7 7M9 20h6" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Document Preview</h3>
              <p className="mt-2 text-sm text-gray-500">
                Complete the previous steps to generate your document
              </p>
            </div>
          </div>
        )}
        <div 
          ref={editorRef}
          className="w-full h-full min-h-[500px]"
          style={{ minHeight: '500px' }}
        />
      </div>


      <StepNavigation
        canProceed={!!state.docxDocument && !!state.docxEditor && !isLoading && !isGenerating}
        onNext={handleNext}
      />
    </div>
  );
}