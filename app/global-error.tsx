'use client';
 
import { useEffect } from 'react';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error caught:', error);
  }, [error]);
 
  // Determine if we are in development mode
  // Note: NODE_ENV is available in client components in Next.js
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html>
      <body className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full">
          {isDev ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-red-600">Application Error (Dev Mode)</h2>
              <div className="bg-red-50 border border-red-200 p-4 rounded text-sm font-mono overflow-auto max-h-[60vh]">
                <p className="font-bold mb-2">{error.message}</p>
                <div className="whitespace-pre-wrap text-gray-700">{error.stack}</div>
              </div>
              {error.digest && (
                 <p className="text-xs text-gray-500">Digest: {error.digest}</p>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Error interno del servidor</h2>
              <p className="text-gray-600">
                Lo sentimos, ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.
              </p>
            </div>
          )}
          
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
