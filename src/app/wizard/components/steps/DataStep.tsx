'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWizard } from '../../context/WizardContext';
import StepNavigation from '../StepNavigation';
import { fetchTemplateData, validateJsonString } from '@/lib/utils';
import { transformJsonToReadable } from '@/lib/jsonTransformer';

export default function DataStep() {
  const { state, dispatch, completeCurrentStep, nextStep } = useWizard();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'interactive' | 'simple'>('interactive');
  const [uploadedJsonFile, setUploadedJsonFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // JSON file upload functionality
  const isCustomTemplate = state.template === 'custom' && state.customTemplateBinary;

  // JSON file validation helper
  const validateJsonFile = (file: File): string | null => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    
    // Check file type
    if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
      return 'Please select a valid JSON file';
    }
    
    return null;
  };

  // Read file as text and parse JSON
  const readJsonFile = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const jsonData = JSON.parse(reader.result as string);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Invalid JSON format'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  // Handle JSON file selection
  const handleJsonFileSelect = useCallback(async (file: File) => {
    setUploadError(null);
    
    const validationError = validateJsonFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    try {
      const jsonData = await readJsonFile(file);
      
      // Update the CodeMirror editor with the uploaded JSON
      if (state.dataEditor) {
        state.dataEditor.setValue(JSON.stringify(jsonData, null, 2));
        dispatch({ type: 'SET_DATA_JSON', payload: jsonData });
      }
      
      setUploadedJsonFile(file);
      setJsonError(null);
      console.log('🎯 DataStep: JSON file uploaded successfully:', file.name);
    } catch (error) {
      console.error('Error reading JSON file:', error);
      setUploadError('Failed to parse JSON file. Please check the file format.');
    }
  }, [dispatch, state.dataEditor]);

  // Handle JSON file input change
  const handleJsonFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleJsonFileSelect(file);
    }
  }, [handleJsonFileSelect]);

  // Handle JSON file drag and drop
  const handleJsonDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleJsonDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleJsonDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleJsonFileSelect(files[0]);
    }
  }, [handleJsonFileSelect]);

  // Handle click to upload JSON
  const handleJsonUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // JSON transformer types
  interface TransformOptions {
    indentSize?: number;
    maxArrayPreview?: number;
    autoExpandLevels?: number;
  }

  interface TransformState {
    [key: string]: boolean;
  }

  // Transform JSON to human-readable hierarchical display using improved logic
  const DataPreview = ({ 
    data, 
    level = 0, 
    keyName = '', 
    options = { indentSize: 16, maxArrayPreview: 3, autoExpandLevels: 2 } 
  }: { 
    data: any; 
    level?: number; 
    keyName?: string; 
    options?: TransformOptions;
  }) => {
    const [expandedStates, setExpandedStates] = useState<TransformState>({});
    const nodeId = `${level}-${keyName}`;
    const isExpanded = expandedStates[nodeId] ?? (level < (options.autoExpandLevels || 2));

    const toggleExpansion = () => {
      setExpandedStates(prev => ({
        ...prev,
        [nodeId]: !isExpanded
      }));
    };

    // Convert key to Title Case
    const toTitleCase = (str: string): string => {
      return str
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
    };

    // Get smart preview for arrays and objects
    const getSmartPreview = (value: any): string => {
      if (Array.isArray(value)) {
        if (value.length === 0) return 'empty';
        
        // Get preview of array items
        const previews = value.slice(0, options.maxArrayPreview || 3).map(item => {
          if (typeof item === 'string' || typeof item === 'number') {
            return String(item);
          }
          if (typeof item === 'object' && item !== null) {
            // Look for a representative field
            const displayFields = ['name', 'title', 'label', 'text', 'description'];
            for (const field of displayFields) {
              if (item[field]) return String(item[field]);
            }
            return 'object';
          }
          return typeof item;
        });
        
        const remaining = value.length - (options.maxArrayPreview || 3);
        const suffix = remaining > 0 ? ` +${remaining} more` : '';
        return `${previews.join(', ')}${suffix}`;
      }

      if (typeof value === 'object' && value !== null) {
        const keys = Object.keys(value);
        if (keys.length === 0) return 'empty';
        
        // Try to find a representative value
        const displayFields = ['name', 'title', 'label', 'text', 'description'];
        for (const field of displayFields) {
          if (value[field]) return String(value[field]);
        }
        
        return `${keys.length} field${keys.length !== 1 ? 's' : ''}`;
      }

      return String(value);
    };

    const indent = level * (options.indentSize || 16);

    // Handle null/undefined
    if (data === null || data === undefined) {
      if (!keyName) return null;
      return (
        <div style={{ marginLeft: `${indent}px` }} className="text-sm py-0.5 flex items-center">
          <span className="text-gray-400 mr-2 w-4 text-center inline-block">○</span>
          <span className="text-gray-700">{toTitleCase(keyName)}:</span>
          <span className="text-red-500 ml-2 italic font-medium">null</span>
        </div>
      );
    }

    // Handle primitive values
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="text-sm py-0.5 flex items-center">
          <span className="text-blue-500 mr-2 w-4 text-center inline-block">●</span>
          {keyName && (
            <>
              <span className="text-gray-700">{toTitleCase(keyName)}:</span>
              <span className="text-gray-900 ml-2">{String(data)}</span>
            </>
          )}
          {!keyName && <span className="text-gray-900">{String(data)}</span>}
        </div>
      );
    }

    // Handle arrays
    if (Array.isArray(data)) {
      if (data.length === 0) {
        if (!keyName) return null;
        return (
          <div style={{ marginLeft: `${indent}px` }} className="text-sm py-0.5 flex items-center">
            <span className="text-gray-400 mr-2 w-4 text-center inline-block">○</span>
            <span className="text-gray-700">{toTitleCase(keyName)}:</span>
            <span className="text-gray-400 ml-2 italic">empty</span>
          </div>
        );
      }

      const preview = getSmartPreview(data);
      
      return (
        <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
          {keyName && (
            <div 
              className="flex items-center cursor-pointer hover:bg-gray-50 rounded py-0.5 transition-colors text-sm"
              onClick={toggleExpansion}
            >
              <span className="text-green-600 mr-2 w-4 text-center inline-block select-none">
                {isExpanded ? '▼' : '▶'}
              </span>
              <span className="text-gray-700">{toTitleCase(keyName)}:</span>
              <span className="text-gray-500 ml-2">{preview}</span>
            </div>
          )}
          {(isExpanded || !keyName) && (
            <div className={keyName ? "mt-0.5" : ""}>
              {data.map((item, index) => (
                <DataPreview 
                  key={index} 
                  data={item} 
                  level={keyName ? level + 1 : level}
                  keyName={`[${index}]`}
                  options={options}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Handle objects
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        if (!keyName) return null;
        return (
          <div style={{ marginLeft: `${indent}px` }} className="text-sm py-0.5 flex items-center">
            <span className="text-gray-400 mr-2 w-4 text-center inline-block">○</span>
            <span className="text-gray-700">{toTitleCase(keyName)}:</span>
            <span className="text-gray-400 ml-2 italic">empty</span>
          </div>
        );
      }

      const preview = getSmartPreview(data);
      const hasNestedData = keys.some(key => 
        Array.isArray(data[key]) || (typeof data[key] === 'object' && data[key] !== null)
      );

      return (
        <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
          {keyName && hasNestedData && (
            <div 
              className="flex items-center cursor-pointer hover:bg-gray-50 rounded py-0.5 transition-colors text-sm"
              onClick={toggleExpansion}
            >
              <span className="text-green-600 mr-2 w-4 text-center inline-block select-none">
                {isExpanded ? '▼' : '▶'}
              </span>
              <span className="text-gray-700">{toTitleCase(keyName)}:</span>
              <span className="text-gray-500 ml-2">{preview}</span>
            </div>
          )}
          {keyName && !hasNestedData && (
            <div className="flex items-center text-sm py-0.5">
              <span className="text-blue-500 mr-2 w-4 text-center inline-block">●</span>
              <span className="text-gray-700">{toTitleCase(keyName)}:</span>
              <span className="text-gray-900 ml-2">{preview}</span>
            </div>
          )}
          {(isExpanded || !keyName) && (
            <div className={keyName ? "mt-0.5" : ""}>
              {keys.map(key => (
                <DataPreview 
                  key={key} 
                  data={data[key]} 
                  level={keyName ? level + 1 : level}
                  keyName={key}
                  options={options}
                />
              ))}
            </div>
          )}
        </div>
      );
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Editor */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              JSON Data
            </label>
            <div className="h-6"></div> {/* Spacer to match toggle button height */}
          </div>
          <div className="relative flex-1 min-h-0">
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
              className="w-full h-full border border-gray-300 rounded-lg overflow-hidden"
              style={{ minHeight: '400px' }}
            />
          </div>

          {/* JSON File Upload for Custom Templates */}
          {isCustomTemplate && (
            <div className="mt-3">
              <div 
                className={`relative p-4 border-2 border-dashed rounded-lg text-center transition-all duration-200 cursor-pointer ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : uploadedJsonFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleJsonDragOver}
                onDragLeave={handleJsonDragLeave}
                onDrop={handleJsonDrop}
                onClick={handleJsonUploadClick}
              >
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileChange}
                  className="hidden"
                />
                
                <svg className={`mx-auto h-8 w-8 mb-2 ${isDragOver ? 'text-blue-500' : uploadedJsonFile ? 'text-green-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                
                {uploadedJsonFile ? (
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      ✓ {uploadedJsonFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(uploadedJsonFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">
                      {isDragOver 
                        ? 'Drop your JSON file here' 
                        : 'Upload JSON data file'
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Drag & drop or click to browse
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Error */}
              {uploadError && (
                <p className="mt-1 text-xs text-red-600">{uploadError}</p>
              )}
            </div>
          )}

          {jsonError && (
            <p className="mt-2 text-sm text-red-600">
              {jsonError}
            </p>
          )}
        </div>

        {/* Preview */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Data Preview
            </label>
            <div className="flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setPreviewMode('interactive')}
                className={`px-3 py-1 text-xs font-medium border cursor-pointer ${
                  previewMode === 'interactive'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                } rounded-l-md`}
              >
                Interactive
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('simple')}
                className={`px-3 py-1 text-xs font-medium border-t border-r border-b cursor-pointer ${
                  previewMode === 'simple'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                } rounded-r-md`}
              >
                Simple
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 bg-gray-50 border border-gray-300 rounded-lg overflow-auto" style={{ minHeight: '400px' }}>
            {(() => {
              const previewData = getPreviewData();
              if (!previewData) {
                return (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    {isLoading ? 'Loading...' : 'Enter valid JSON to see preview'}
                  </div>
                );
              }

              if (previewMode === 'simple') {
                const fullData = state.dataEditor ? (() => {
                  try {
                    return JSON.parse(state.dataEditor.getValue());
                  } catch {
                    return null;
                  }
                })() : null;
                
                if (!fullData) {
                  return (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Invalid JSON data
                    </div>
                  );
                }

                const transformedText = transformJsonToReadable(fullData);
                return (
                  <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                    {transformedText}
                  </pre>
                );
              }

              return (
                <div className="space-y-1">
                  <DataPreview data={previewData} level={0} />
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