'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useWizard } from '../../context/WizardContext';
import StepNavigation from '../StepNavigation';

const templates = [
  {
    id: 'invoice',
    name: 'Invoice Template',
    description: 'Professional invoice template for businesses',
    preview: '/assets/invoice.png',
    category: 'Business',
  },
  {
    id: 'checklist',
    name: 'Checklist Template',
    description: 'Organized checklist for tasks and projects',
    preview: '/assets/checklist.png',
    category: 'Productivity',
  },
  {
    id: 'menu',
    name: 'Menu Template',
    description: 'Restaurant menu template with elegant design',
    preview: '/assets/menu.png',
    category: 'Food & Beverage',
  },
];

export default function TemplateStep() {
  const { state, dispatch, nextStep, completeCurrentStep } = useWizard();
  const [selectedTemplate, setSelectedTemplate] = useState<string>(state.template || '');

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    dispatch({ type: 'SET_TEMPLATE', payload: templateId });
  };

  const handleNext = () => {
    if (selectedTemplate) {
      completeCurrentStep();
      nextStep();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Choose Your Template
        </h2>
        <p className="text-lg text-gray-600">
          Select a template to get started with your document
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`relative group cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden ${
              selectedTemplate === template.id
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            {/* Preview Image */}
            <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
              <Image
                src={template.preview}
                alt={template.name}
                width={300}
                height={400}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>

            {/* Template Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 flex-1">{template.name}</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>

            {/* Selection Indicator */}
            {selectedTemplate === template.id && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Custom Upload Option */}
      <div className="mt-8 p-6 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-gray-400 transition-colors">
        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900">Upload Custom Template</h3>
          <p className="text-sm text-gray-600 mt-1">
            Have your own DOCX template? Upload it to get started
          </p>
          <button className="mt-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Choose File
          </button>
        </div>
      </div>

      <StepNavigation
        canProceed={!!selectedTemplate}
        onNext={handleNext}
      />
    </div>
  );
}