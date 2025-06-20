'use client';

import { useState } from 'react';
import { useWizard } from '../../context/WizardContext';
import StepNavigation from '../StepNavigation';

export default function DataStep() {
  const { state, dispatch, completeCurrentStep, nextStep } = useWizard();
  const [jsonData, setJsonData] = useState(
    state.dataJson ? JSON.stringify(state.dataJson, null, 2) : 
    `{
  "config": {
    "delimiter": ["{{", "}}"]
  },
  "model": {
    "companyName": "Acme Corporation",
    "invoiceNumber": "INV-001",
    "date": "2024-01-15",
    "customerName": "John Doe",
    "amount": "$1,250.00"
  }
}`
  );

  const handleJsonChange = (value: string) => {
    setJsonData(value);
    try {
      const parsed = JSON.parse(value);
      dispatch({ type: 'SET_DATA_JSON', payload: parsed });
    } catch (error) {
      // Invalid JSON, don't update state
    }
  };

  const handleNext = () => {
    completeCurrentStep();
    nextStep();
  };

  const isValidJson = () => {
    try {
      JSON.parse(jsonData);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-8">
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
          <label htmlFor="json-editor" className="block text-sm font-medium text-gray-700 mb-2">
            JSON Data
          </label>
          <textarea
            id="json-editor"
            value={jsonData}
            onChange={(e) => handleJsonChange(e.target.value)}
            className={`w-full h-80 p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              isValidJson() ? 'border-gray-300' : 'border-red-300'
            }`}
            placeholder="Enter your JSON data here..."
          />
          {!isValidJson() && (
            <p className="mt-2 text-sm text-red-600">
              Invalid JSON format. Please check your syntax.
            </p>
          )}
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Preview
          </label>
          <div className="h-80 p-4 bg-gray-50 border border-gray-300 rounded-lg overflow-auto">
            {isValidJson() ? (
              <div className="space-y-2">
                {Object.entries(JSON.parse(jsonData).model || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-gray-200">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className="text-gray-600">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Enter valid JSON to see preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Quick Start Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleJsonChange(`{
  "config": { "delimiter": ["{{", "}}"] },
  "model": {
    "companyName": "Acme Corp",
    "invoiceNumber": "INV-001",
    "amount": "$1,250.00"
  }
}`)}
            className="text-xs bg-white border border-blue-300 rounded px-3 py-2 text-blue-700 hover:bg-blue-50"
          >
            Invoice Data
          </button>
          <button
            onClick={() => handleJsonChange(`{
  "config": { "delimiter": ["{{", "}}"] },
  "model": {
    "restaurantName": "Bistro Delight",
    "specialDish": "Grilled Salmon",
    "price": "$24.99"
  }
}`)}
            className="text-xs bg-white border border-blue-300 rounded px-3 py-2 text-blue-700 hover:bg-blue-50"
          >
            Menu Data
          </button>
          <button
            onClick={() => handleJsonChange(`{
  "config": { "delimiter": ["{{", "}}"] },
  "model": {
    "projectName": "Website Launch",
    "dueDate": "2024-02-01",
    "priority": "High"
  }
}`)}
            className="text-xs bg-white border border-blue-300 rounded px-3 py-2 text-blue-700 hover:bg-blue-50"
          >
            Checklist Data
          </button>
        </div>
      </div>

      <StepNavigation
        canProceed={isValidJson() && jsonData.trim() !== ''}
        onNext={handleNext}
      />
    </div>
  );
}