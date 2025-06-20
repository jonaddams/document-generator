'use client';

import Link from 'next/link';
import { useWizard } from '../../context/WizardContext';

export default function DownloadStep() {
  const { state, dispatch } = useWizard();

  const handleReset = () => {
    dispatch({ type: 'RESET_WIZARD' });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🎉 Your Document is Ready!
        </h2>
        <p className="text-lg text-gray-600">
          Download your completed document or create another one
        </p>
      </div>

      {/* Success Card */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Generated Successfully</h3>
        <p className="text-gray-600 mb-6">
          Your {state.template} document has been created with your custom data
        </p>

        {/* Download Options */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5l7-7 7 7M9 20h6" />
            </svg>
            Download DOCX
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="text-center p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600">
            {state.template || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Template Used</div>
        </div>
        <div className="text-center p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600">
            {state.dataJson ? Object.keys(state.dataJson.model || {}).length : 0}
          </div>
          <div className="text-sm text-gray-600">Data Fields</div>
        </div>
        <div className="text-center p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600">
            {state.steps.filter(step => step.isComplete).length}
          </div>
          <div className="text-sm text-gray-600">Steps Completed</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4 pt-8 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Create Another Document
        </button>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}