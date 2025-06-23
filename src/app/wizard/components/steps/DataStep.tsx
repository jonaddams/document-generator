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
      // Only show the model data, ignore config
      return data.model || {};
    } catch {
      return null;
    }
  };

  // Simple data preview component - just shows values, no labels
  const DataPreview = ({ data, level = 0 }: { data: any; level?: number }) => {
    const [isExpanded, setIsExpanded] = useState(level < 3); // Auto-expand first 3 levels
    const indent = level * 12;

    // Skip null/undefined
    if (data === null || data === undefined) {
      return null;
    }

    // For simple values, just show them
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="text-sm py-1">
          <span className="text-gray-900">{String(data)}</span>
        </div>
      );
    }

    // For arrays, show each item
    if (Array.isArray(data)) {
      if (data.length === 0) return null;
      
      return (
        <div style={{ marginLeft: `${indent}px` }} className="py-1">
          {data.map((item, index) => (
            <DataPreview 
              key={index} 
              data={item} 
              level={level}
            />
          ))}
        </div>
      );
    }

    // For objects, find the best value to show as preview
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) return null;

      // Find the most meaningful value to display
      const getDisplayValue = () => {
        // Try common display fields first
        const displayFields = ['name', 'title', 'label', 'text', 'description'];
        for (const field of displayFields) {
          if (data[field] && typeof data[field] === 'string') {
            return data[field];
          }
        }
        
        // If only one field and it's a simple value, use it
        if (keys.length === 1) {
          const value = data[keys[0]];
          if (typeof value === 'string' || typeof value === 'number') {
            return String(value);
          }
        }
        
        // Otherwise, no good display value
        return null;
      };

      const displayValue = getDisplayValue();
      
      // If we have nested data, show with dropdown
      const hasNestedData = keys.some(key => {
        const value = data[key];
        return Array.isArray(value) || (typeof value === 'object' && value !== null);
      });

      if (displayValue && hasNestedData) {
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
              <span className="text-gray-900">{displayValue}</span>
            </div>
            {isExpanded && (
              <div className="mt-1 border-l-2 border-gray-200 ml-2">
                {keys.map(key => {
                  const value = data[key];
                  // Skip the field we used for display and non-nested data
                  if (key === getDisplayField(data) || (!Array.isArray(value) && typeof value !== 'object')) {
                    return null;
                  }
                  return (
                    <DataPreview 
                      key={key} 
                      data={value} 
                      level={level + 1}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      }
      
      // If we have a display value but no nested data, just show it
      if (displayValue) {
        return (
          <div style={{ marginLeft: `${indent}px` }} className="text-sm py-1">
            <span className="text-gray-900">{displayValue}</span>
          </div>
        );
      }
      
      // If no display value, show all nested data directly
      return (
        <div style={{ marginLeft: `${indent}px` }} className="py-1">
          {keys.map(key => (
            <DataPreview 
              key={key} 
              data={data[key]} 
              level={level}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  // Helper function to get which field was used for display
  const getDisplayField = (obj: any) => {
    const displayFields = ['name', 'title', 'label', 'text', 'description'];
    for (const field of displayFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        return field;
      }
    }
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      const value = obj[keys[0]];
      if (typeof value === 'string' || typeof value === 'number') {
        return keys[0];
      }
    }
    return null;
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