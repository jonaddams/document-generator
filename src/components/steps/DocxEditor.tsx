'use client';

import React, { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { AppState } from '@/types';
import { STEP_TITLES } from '@/lib/constants';

interface DocxEditorProps {
  isActive: boolean;
  onNext: () => void;
  onPrevious: () => void;
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  navigateToStep: (step: 'data-editor' | 'pdf-viewer') => Promise<void>;
}

export default function DocxEditor({ 
  appState, 
  updateAppState, 
  navigateToStep 
}: DocxEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const initializeDocxEditor = useCallback(async () => {
    console.log('🔄 DocxEditor: initializeDocxEditor called');
    console.log('📋 Current state:', {
      hasEditorRef: !!editorRef.current,
      hasTemplateDocument: !!appState.templateDocument,
      hasDataJson: !!appState.dataJson,
      hasDocAuthSystem: !!appState.docAuthSystem,
      hasDocxDocument: !!appState.docxDocument,
      hasDocxEditor: !!appState.docxEditor,
      windowPSPDFKit: !!window.PSPDFKit,
      isInitialized
    });

    if (isInitialized) {
      console.log('✅ DocxEditor already initialized, skipping');
      return;
    }

    if (!editorRef.current) {
      console.warn('❌ No editor ref available');
      return;
    }
    
    if (!appState.templateDocument) {
      console.warn('❌ No template document available');
      return;
    }
    
    if (!appState.dataJson) {
      console.warn('❌ No data JSON available');
      return;
    }

    setIsLoading(true);
    try {
      // Generate DOCX from template and data if not already done
      let docxDocument = appState.docxDocument;
      let docAuthSystem = appState.docAuthSystem;
      
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
        const templateBuffer = await appState.templateDocument.exportDOCX();
        console.log('✅ Template exported to buffer, size:', templateBuffer.byteLength);
        
        console.log('🔧 Populating template with data...');
        console.log('Data to populate:', appState.dataJson);
        const docxBuffer = await window.PSPDFKit.populateDocumentTemplate(
          { document: templateBuffer },
          appState.dataJson
        );
        console.log('✅ Template populated, result size:', docxBuffer.byteLength);
        
        console.log('🔧 Importing populated DOCX into Document Authoring...');
        docxDocument = await docAuthSystem.importDOCX(docxBuffer);
        console.log('✅ DOCX document imported:', docxDocument);
        
        updateAppState({ docxDocument });
      } else {
        console.log('✅ DOCX document already exists');
      }

      // Initialize editor - re-check ref since it might have changed during async operations
      const currentEditorRef = editorRef.current;
      console.log('🔍 Re-checking editor ref before creation:', !!currentEditorRef);
      
      if (docAuthSystem && docxDocument && currentEditorRef) {
        console.log('🖊️ Creating Document Authoring editor for DOCX...');
        console.log('Editor container:', currentEditorRef);
        
        const editor = await docAuthSystem.createEditor(currentEditorRef, {
          document: docxDocument,
        });
        console.log('✅ DOCX editor created successfully:', editor);
        updateAppState({ docxEditor: editor });
        setIsInitialized(true);
      } else {
        console.warn('❌ Cannot create DOCX editor - missing requirements:', {
          hasDocAuthSystem: !!docAuthSystem,
          hasDocxDocument: !!docxDocument,
          hasEditorRef: !!currentEditorRef
        });
        
        // If ref is missing, try again after a short delay
        if (!currentEditorRef && docAuthSystem && docxDocument) {
          console.log('🔄 Ref missing, retrying in 200ms...');
          setTimeout(() => {
            const retryRef = editorRef.current;
            console.log('🔄 Retry attempt - ref available:', !!retryRef);
            if (retryRef && !appState.docxEditor) {
              console.log('🖊️ Retrying editor creation...');
              docAuthSystem.createEditor(retryRef, {
                document: docxDocument,
              }).then(editor => {
                console.log('✅ DOCX editor created on retry:', editor);
                updateAppState({ docxEditor: editor });
                setIsInitialized(true);
              }).catch(retryError => {
                console.error('❌ Retry failed:', retryError);
              });
            }
          }, 200);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing DOCX editor:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        appState: {
          hasTemplateDocument: !!appState.templateDocument,
          hasDataJson: !!appState.dataJson,
          hasDocAuthSystem: !!appState.docAuthSystem,
          hasDocxDocument: !!appState.docxDocument
        }
      });
    } finally {
      setIsLoading(false);
      console.log('🏁 DocxEditor initialization finished');
    }
  }, [appState, updateAppState, isInitialized]);

  useEffect(() => {
    console.log('🔄 DocxEditor useEffect mounted');
    
    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      console.log('⏰ Timer triggered, checking DOM ref:', !!editorRef.current);
      if (editorRef.current && !isInitialized && !isLoading) {
        console.log('🚀 Starting DOCX editor initialization');
        initializeDocxEditor();
      }
    }, 50);

    // Cleanup function
    return () => {
      console.log('🧹 DocxEditor cleanup called');
      clearTimeout(timer);
      if (appState.docxEditor) {
        console.log('🗑️ Destroying existing DOCX editor');
        appState.docxEditor.destroy();
        updateAppState({ docxEditor: null });
      }
      setIsInitialized(false);
    };
  }, []);

  const handleBackToData = useCallback(async () => {
    console.log('⬅️ Navigating back to data editor');
    if (appState.docxEditor) {
      console.log('🗑️ Destroying DOCX editor before navigation');
      appState.docxEditor.destroy();
    }
    updateAppState({ 
      docxEditor: null,
      docxDocument: null 
    });
    await navigateToStep('data-editor');
  }, [appState.docxEditor, updateAppState, navigateToStep]);

  const handleGeneratePdf = useCallback(async () => {
    console.log('➡️ Proceeding to PDF viewer');
    await navigateToStep('pdf-viewer');
  }, [navigateToStep]);

  return (
    <div className="nutri-card flex flex-col h-screen">
      <div className="nutri-card-header flex-shrink-0">
        <h2 className="text-2xl font-bold">{STEP_TITLES['docx-editor']}</h2>
      </div>
      
      <div className="nutri-card-content flex-1 min-h-0 p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nutrient-primary mx-auto mb-2"></div>
              <p className="text-gray-600">Loading DOCX editor...</p>
            </div>
          </div>
        ) : (
          <div 
            ref={editorRef}
            className="nutri-editor h-full m-6"
          />
        )}
      </div>
      
      <div className="nutri-card-footer flex-shrink-0 relative z-10">
        <div className="flex justify-between">
          <button
            onClick={handleBackToData}
            className="nutri-button-secondary"
            disabled={isLoading}
          >
            ← Edit Data
          </button>
          <button
            onClick={handleGeneratePdf}
            className="nutri-button-primary"
            disabled={isLoading}
          >
            Generate PDF →
          </button>
        </div>
      </div>
    </div>
  );
}