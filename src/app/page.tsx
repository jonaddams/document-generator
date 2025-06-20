import DocumentGenerator from '@/components/DocumentGenerator';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* New Wizard Option */}
      <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              ✨ Try the New Modern Wizard
            </h2>
            <p className="text-gray-600">
              Experience our redesigned document generator with a cleaner interface and better user experience.
            </p>
          </div>
          <Link
            href="/wizard"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Launch Wizard
            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Original App */}
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Original Document Generator (Reference)</h2>
        <DocumentGenerator />
      </div>
    </div>
  );
}