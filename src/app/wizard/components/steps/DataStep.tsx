'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWizard } from '../../context/WizardContext';
import StepNavigation from '../StepNavigation';
import { fetchTemplateData, validateJsonString } from '@/lib/utils';

export default function DataStep() {
  const { state, dispatch, completeCurrentStep, nextStep } = useWizard();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const isInitializing = useRef(false);

  const initializeDataEditor = useCallback(async () => {
    console.log('🔄 DataStep: Initializing data editor for:', state.template);

    if (isInitializing.current) {
      console.log('⏸️ Initialization already in progress, skipping');
      return;
    }

    // Wait for ref to be available
    let attempts = 0;
    const maxAttempts = 20;
    while (!editorContainerRef.current && attempts < maxAttempts) {
      console.log(`🔄 Waiting for data editor container ref (attempt ${attempts + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!editorContainerRef.current) {
      console.warn('❌ No data editor container ref available after waiting');
      return;
    }

    // Validate DOM connection and dimensions
    if (!editorContainerRef.current.isConnected) {
      console.warn('❌ Data editor container ref element is not connected to DOM');
      return;
    }

    const rect = editorContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('❌ Data editor container ref element has zero dimensions:', rect);
      await new Promise(resolve => setTimeout(resolve, 200));
      const newRect = editorContainerRef.current.getBoundingClientRect();
      if (newRect.width === 0 || newRect.height === 0) {
        console.warn('❌ Data editor container ref element still has zero dimensions after waiting:', newRect);
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
      // Always fetch the template JSON data for the current template
      console.log('📄 Fetching template data for:', state.template);
      let dataJson;
      try {
        dataJson = await fetchTemplateData(state.template as any);
        console.log('✅ Template data fetched for:', state.template, dataJson);
        dispatch({ type: 'SET_DATA_JSON', payload: dataJson });
      } catch (fetchError) {
        console.error('❌ Error fetching template data:', fetchError);
        // Use default data structure if fetch fails
        dataJson = {
          config: { delimiter: ['{{', '}}'] },
          model: {
            companyName: 'Acme Corporation',
            invoiceNumber: 'INV-001',
            date: '2024-01-15',
            customerName: 'John Doe',
            amount: '$1,250.00'
          }
        };
        dispatch({ type: 'SET_DATA_JSON', payload: dataJson });
      }

      // Create CodeMirror editor
      if (!window.CodeMirror) {
        console.error('❌ CodeMirror not available - may not be loaded');
        throw new Error('CodeMirror not loaded');
      }

      console.log('🖊️ Creating CodeMirror data editor...');
      
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(dataJson, null, 2);
      
      const container = editorContainerRef.current;
      
      // Only clear if there's no active CodeMirror editor
      if (!state.dataEditor) {
        while (container.firstChild) {
          const child = container.firstChild;
          if (child.parentNode === container) {
            container.removeChild(child);
          } else {
            break;
          }
        }
      }
      
      container.appendChild(textarea);
      console.log('📝 Textarea added to container');

      // Initialize CodeMirror
      const editor = window.CodeMirror.fromTextArea(textarea, {
        mode: { name: 'javascript', json: true },
        theme: 'default',
        tabSize: 2,
        lineNumbers: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      });
      console.log('✅ CodeMirror data editor created');

      // Validate JSON on change
      editor.on('change', (instance: any) => {
        const value = instance.getValue();
        if (validateJsonString(value)) {
          setJsonError(null);
          try {
            const parsed = JSON.parse(value);
            dispatch({ type: 'SET_DATA_JSON', payload: parsed });
          } catch (error) {
            // Should not happen if validateJsonString returns true
          }
        } else {
          setJsonError('Invalid JSON format');
        }
      });

      dispatch({ type: 'SET_DATA_EDITOR', payload: editor });
      console.log('✅ Data editor ready');
    } catch (error) {
      console.error('❌ Error initializing data editor:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Data editor initialization failed' });
    } finally {
      setIsLoading(false);
      isInitializing.current = false;
    }
  }, [state.template, state.dataJson, state.dataEditor, dispatch]);

  useEffect(() => {
    console.log('📍 DataStep useEffect triggered with template:', state.template, 'editor exists:', !!state.dataEditor);
    
    // Always clean up existing editor and data first when template changes
    if (state.dataEditor) {
      console.log('🧹 Cleaning up existing data editor');
      try {
        state.dataEditor.toTextArea();
      } catch (error) {
        console.warn('⚠️ CodeMirror cleanup failed:', error);
      }
      dispatch({ type: 'SET_DATA_EDITOR', payload: null });
    }
    
    // Clear the data JSON when template changes to force reload
    if (state.template) {
      dispatch({ type: 'SET_DATA_JSON', payload: null });
    }
    
    // Initialize editor if we have a template
    if (state.template && !isInitializing.current) {
      console.log('🎆 Initializing data editor for template:', state.template);
      initializeDataEditor();
    }

    // Cleanup function
    return () => {
      if (state.dataEditor) {
        console.log('🧹 Cleaning up data editor on unmount');
        try {
          state.dataEditor.toTextArea();
        } catch (error) {
          console.warn('⚠️ CodeMirror cleanup failed:', error);
        }
        dispatch({ type: 'SET_DATA_EDITOR', payload: null });
      }
    };
  }, [state.template]); // Only depend on template to force reinit when template changes


  const handleNext = () => {
    if (state.dataEditor) {
      const jsonString = state.dataEditor.getValue();
      if (validateJsonString(jsonString)) {
        try {
          const dataJson = JSON.parse(jsonString);
          dispatch({ type: 'SET_DATA_JSON', payload: dataJson });
          completeCurrentStep();
          nextStep();
        } catch (error) {
          setJsonError('Failed to parse JSON data');
        }
      } else {
        setJsonError('Please fix JSON errors before proceeding');
      }
    }
  };

  const isValidJson = () => {
    if (!state.dataEditor) return false;
    try {
      const value = state.dataEditor.getValue();
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  };

  const getPreviewData = () => {
    if (!state.dataEditor || !isValidJson()) return null;
    try {
      const data = JSON.parse(state.dataEditor.getValue());
      return data.model || {};
    } catch {
      return null;
    }
  };

  // Component for rendering human-friendly data preview
  const DataPreview = ({ data, level = 0, keyName = '' }: { data: any; level?: number; keyName?: string }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
    const indent = level * 12; // Reduced spacing for better hierarchy

    // Helper function to make field names more human-readable
    const humanizeKey = (key: string): string => {
      return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    };

    // Helper function to get a nice preview of array contents
    const getArrayPreview = (arr: any[]): string => {
      if (arr.length === 0) return 'No items';
      
      // Try to get meaningful preview from first item
      const firstItem = arr[0];
      if (typeof firstItem === 'string') {
        return arr.slice(0, 3).join(', ') + (arr.length > 3 ? '...' : '');
      }
      
      if (typeof firstItem === 'object' && firstItem !== null) {
        // Look for common name fields
        const nameFields = ['name', 'title', 'label', 'text', 'description'];
        const nameField = nameFields.find(field => firstItem[field]);
        if (nameField) {
          const names = arr.slice(0, 3).map(item => item[nameField]).filter(Boolean);
          return names.join(', ') + (arr.length > 3 ? ` and ${arr.length - 3} more` : '');
        }
      }
      
      return `${arr.length} item${arr.length !== 1 ? 's' : ''}`;
    };

    if (data === null || data === undefined) {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="text-gray-400 text-sm py-1">
          <span className="italic">Not set</span>
        </div>
      );
    }

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="text-sm py-1">
          <span className="text-gray-900">{String(data)}</span>
        </div>
      );
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return (
          <div style={{ marginLeft: `${indent}px` }} className="text-sm py-1">
            <span className="text-gray-400 italic">No items</span>
          </div>
        );
      }

      // For arrays, show each item directly without a summary line
      return (
        <div style={{ marginLeft: `${indent}px` }} className="py-1">
          {data.map((item, index) => (
            <DataPreview 
              key={index} 
              data={item} 
              level={level} 
              keyName=""
            />
          ))}
        </div>
      );
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return (
          <div style={{ marginLeft: `${indent}px` }} className="text-sm py-1">
            <span className="text-gray-400 italic">No details</span>
          </div>
        );
      }

      // For objects, show a preview of key values and track which field we used
      const getObjectPreviewInfo = (): { preview: string; usedField: string | null } => {
        const importantFields = ['name', 'title', 'label', 'text', 'description', 'type'];
        const importantField = importantFields.find(field => data[field]);
        if (importantField) {
          return {
            preview: String(data[importantField]),
            usedField: importantField
          };
        }
        
        // If no important field found, but only one field exists, show its value
        if (keys.length === 1) {
          const singleKey = keys[0];
          const value = data[singleKey];
          if (typeof value === 'string' || typeof value === 'number') {
            return {
              preview: String(value),
              usedField: singleKey
            };
          }
        }
        
        return {
          preview: `${keys.length} detail${keys.length !== 1 ? 's' : ''}`,
          usedField: null
        };
      };

      const { preview, usedField } = getObjectPreviewInfo();

      return (
        <div style={{ marginLeft: `${indent}px` }} className="py-1">
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 transition-colors" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className={`w-4 h-4 mr-2 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
              <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-gray-600">{preview}</span>
          </div>
          {isExpanded && (
            <div className="mt-2 border-l-2 border-gray-200 ml-2">
              {keys
                .filter(key => key !== usedField) // Skip the field we already showed in preview
                .map(key => (
                  <DataPreview 
                    key={key} 
                    data={data[key]} 
                    level={level + 1} 
                    keyName={key}
                  />
                ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ marginLeft: `${indent}px` }} className="text-gray-500 text-sm py-1">
        {String(data)}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Add Your Data
        </h2>
        <p className="text-lg text-gray-600">
          Provide the data that will populate your document template
        </p>
      </div>

      {/* JSON Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            JSON Data
          </label>
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-75 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading data editor...</p>
                </div>
              </div>
            )}
            {state.error && (
              <div className="absolute top-2 left-2 right-2 z-10">
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
                  <strong className="font-bold">Error: </strong>
                  <span>{state.error}</span>
                </div>
              </div>
            )}
            <div 
              ref={editorContainerRef}
              className="w-full h-80 border border-gray-300 rounded-lg overflow-hidden"
              style={{ minHeight: '320px' }}
            />
          </div>
          {jsonError && (
            <p className="mt-2 text-sm text-red-600">
              {jsonError}
            </p>
          )}
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Preview
          </label>
          <div className="h-80 p-4 bg-gray-50 border border-gray-300 rounded-lg overflow-auto">
            {(() => {
              const previewData = getPreviewData();
              return previewData ? (
                <div className="space-y-1">
                  <DataPreview data={previewData} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {isLoading ? 'Loading...' : 'Enter valid JSON to see preview'}
                </div>
              );
            })()}
          </div>
        </div>
      </div>


      <StepNavigation
        canProceed={isValidJson() && !!state.dataEditor && !isLoading && !jsonError}
        onNext={handleNext}
      />
    </div>
  );
}