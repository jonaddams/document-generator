import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Image from 'next/image';
import Link from 'next/link';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nutrient Document Generator Demo',
  description: 'A step-by-step document generator using Nutrient SDKs',
  keywords: ['document', 'generator', 'PDF', 'DOCX', 'template', 'Nutrient'],
  authors: [{ name: 'Nutrient' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* CodeMirror CSS */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.14/codemirror.min.css"
        />
      </head>
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        {/* External Scripts */}
        <Script
          src="https://document-authoring.cdn.nutrient.io/releases/document-authoring-1.7.0-umd.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.14/codemirror.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.14/mode/javascript/javascript.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.cloud.pspdfkit.com/pspdfkit-web@1.4.0/nutrient-viewer.js"
          strategy="beforeInteractive"
        />
        
        {/* Global error handler for SDK IntersectionObserver errors */}
        <Script id="global-error-handler" strategy="beforeInteractive">
          {`
            // Suppress IntersectionObserver errors from Document Authoring SDK
            window.addEventListener('error', function(event) {
              const error = event.error;
              const stack = error && error.stack ? error.stack.toString() : '';
              
              // Check if this is an IntersectionObserver error from the Document Authoring SDK
              if (stack.includes('IntersectionObserver') && 
                  stack.includes('document-authoring.cdn.nutrient.io')) {
                console.warn('⚠️ Suppressed Document Authoring SDK IntersectionObserver error:', error);
                event.preventDefault();
                return false;
              }
            });
            
            // Also handle unhandled promise rejections
            window.addEventListener('unhandledrejection', function(event) {
              const reason = event.reason;
              const stack = reason && reason.stack ? reason.stack.toString() : '';
              
              if (stack.includes('IntersectionObserver') && 
                  stack.includes('document-authoring.cdn.nutrient.io')) {
                console.warn('⚠️ Suppressed Document Authoring SDK IntersectionObserver promise rejection:', reason);
                event.preventDefault();
                return false;
              }
            });
          `}
        </Script>

        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer">
                <Image
                  src="/assets/logo-nutrient-docs.svg"
                  alt="Nutrient Logo"
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                  style={{ width: 'auto', height: 'auto' }}
                />
                <h1 className="text-xl font-semibold text-gray-900">
                  Document Generator Demo
                </h1>
              </Link>
            </div>
          </div>
        </nav>
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
