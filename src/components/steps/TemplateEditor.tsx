'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { AppState } from '@/types';
import { STEP_TITLES } from '@/lib/constants';
import { fetchTemplateJson } from '@/lib/utils';

interface TemplateEditorProps {
  isActive: boolean;
  onNext: () => void;
  onPrevious: () => void;
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  navigateToStep: (step: 'template-selection' | 'data-editor') => Promise<void>;
}

export default function TemplateEditor({
  appState,
  updateAppState,
  navigateToStep,
}: TemplateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const isInitializing = useRef(false);

  const initializeEditor = useCallback(async () => {
    console.log('🔄 TemplateEditor: Initializing for template:', appState.template);

    if (isInitializing.current) {
      console.log('⏸️ Initialization already in progress, skipping');
      return;
    }

    if (!editorRef.current) {
      console.warn('❌ No editor ref available');
      return;
    }

    if (!appState.template) {
      console.warn('❌ No template selected');
      return;
    }

    isInitializing.current = true;
    setIsLoading(true);
    try {
      // Initialize Document Authoring system if not already done
      let docAuthSystem = appState.docAuthSystem;
      if (!docAuthSystem) {
        if (!window.DocAuth) {
          console.error('❌ Document Authoring SDK not loaded');
          throw new Error('Document Authoring SDK not loaded');
        }

        docAuthSystem = await window.DocAuth.createDocAuthSystem();
        console.log('✅ Document Authoring system created');
        updateAppState({ docAuthSystem });
      }

      // Prepare the template document
      let templateDocument = appState.templateDocument;
      if (!templateDocument) {
        console.log('📄 Loading template document for:', appState.template);

        if (appState.template === 'custom' && appState.customTemplateBinary) {
          templateDocument = await docAuthSystem.importDOCX(
            appState.customTemplateBinary
          );
          console.log('✅ Custom DOCX template imported');
        } else {
          try {
            const templateJson = await fetchTemplateJson(appState.template);
            templateDocument = await docAuthSystem.loadDocument(templateJson);
            console.log('✅ DocJSON template loaded');
          } catch (fetchError) {
            console.error('❌ Error fetching template JSON:', fetchError);
            throw fetchError;
          }
        }

        updateAppState({ templateDocument });
      }

      // Initialize editor - re-check ref since it might have changed during async operations
      const currentEditorRef = editorRef.current;
      console.log('🔍 Re-checking editor ref before creation:', !!currentEditorRef);
      
      if (docAuthSystem && templateDocument && currentEditorRef) {
        console.log('🖊️ Creating template editor...');
        const editor = await docAuthSystem.createEditor(currentEditorRef, {
          document: templateDocument,
        });
        console.log('✅ Template editor ready');
        updateAppState({ templateEditor: editor });
      } else {
        console.warn('❌ Cannot create editor - missing requirements:', {
          hasDocAuthSystem: !!docAuthSystem,
          hasTemplateDocument: !!templateDocument,
          hasEditorRef: !!currentEditorRef
        });
        
        // If ref is missing, try again after a short delay
        if (!currentEditorRef && docAuthSystem && templateDocument) {
          console.log('🔄 Ref missing, retrying in 200ms...');
          setTimeout(() => {
            const retryRef = editorRef.current;
            console.log('🔄 Retry attempt - ref available:', !!retryRef);
            if (retryRef && !appState.templateEditor) {
              console.log('🖊️ Retrying template editor creation...');
              docAuthSystem.createEditor(retryRef, {
                document: templateDocument,
              }).then(editor => {
                console.log('✅ Template editor created on retry:', editor);
                updateAppState({ templateEditor: editor });
              }).catch(retryError => {
                console.error('❌ Template editor retry failed:', retryError);
              });
            }
          }, 200);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing template editor:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        appState: {
          template: appState.template,
          hasDocAuthSystem: !!appState.docAuthSystem,
          hasTemplateDocument: !!appState.templateDocument,
        },
      });
    } finally {
      setIsLoading(false);
      isInitializing.current = false;
    }
  }, [appState, updateAppState]);

  useEffect(() => {
    initializeEditor();

    // Cleanup function
    return () => {
      if (appState.templateEditor) {
        appState.templateEditor.destroy();
        updateAppState({ templateEditor: null });
      }
    };
  }, []);

  const handleBackToSelection = useCallback(async () => {
    if (appState.templateEditor) {
      appState.templateEditor.destroy();
    }
    updateAppState({
      templateEditor: null,
      templateDocument: null,
    });
    await navigateToStep('template-selection');
  }, [appState.templateEditor, updateAppState, navigateToStep]);

  const handleProceedToData = useCallback(async () => {
    await navigateToStep('data-editor');
  }, [navigateToStep]);

  return (
    <div className="nutri-card flex flex-col h-screen">
      <div className="nutri-card-header flex-shrink-0">
        <h2 className="text-2xl font-bold">{STEP_TITLES['template-editor']}</h2>
      </div>

      <div className="nutri-card-content flex-1 min-h-0 p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nutrient-primary mx-auto mb-2"></div>
              <p className="text-gray-600">Loading template editor...</p>
            </div>
          </div>
        ) : (
          <div ref={editorRef} className="nutri-editor h-full m-6" />
        )}
      </div>

      <div className="nutri-card-footer flex-shrink-0 relative z-10">
        <div className="flex justify-between">
          <button
            onClick={handleBackToSelection}
            className="nutri-button-secondary"
            disabled={isLoading}
          >
            ← Select Template
          </button>
          <button
            onClick={handleProceedToData}
            className="nutri-button-primary"
            disabled={isLoading}
          >
            Prepare JSON Data →
          </button>
        </div>
      </div>
    </div>
  );
}
