'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface AdminErrorBoundaryProps {
  children: React.ReactNode;
}

class AdminErrorBoundary extends React.Component<
  AdminErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Actualizar el estado para mostrar la UI de error
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log del error para debugging
    console.error('Error en AdminErrorBoundary:', error, errorInfo);
    
    // Errores específicos de contexto de React/Next.js
    if (error.message.includes('useContext') || error.message.includes('Context')) {
      console.warn('Error de contexto de React detectado - posible problema de hot reload');
    }
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    // Resetear el estado del error boundary
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Forzar recarga completa para problemas de contexto
    if (this.state.error?.message.includes('useContext')) {
      window.location.reload();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isContextError = this.state.error?.message.includes('useContext') || 
                            this.state.error?.message.includes('Context');

      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-center">
                <div className="mb-6">
                  <svg 
                    className="mx-auto h-16 w-16 text-red-500" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                    />
                  </svg>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {isContextError ? 'Error de Contexto de React' : 'Error en el Dashboard'}
                </h1>
                
                <div className="mb-6">
                  {isContextError ? (
                    <div className="text-left max-w-2xl mx-auto">
                      <p className="text-gray-600 mb-4">
                        Se ha detectado un error de contexto de React, posiblemente causado por el hot reload durante el desarrollo.
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <h3 className="font-medium text-yellow-800 mb-2">💡 Solución Recomendada:</h3>
                        <p className="text-sm text-yellow-700">
                          Este tipo de error suele resolverse recargando completamente la página. 
                          Haz clic en "Recargar Página" para continuar.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600 max-w-md mx-auto">
                      Ha ocurrido un error inesperado en el dashboard de administrador. 
                      Puedes intentar recargar la página o contactar al soporte técnico.
                    </p>
                  )}
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left max-w-2xl mx-auto">
                  <h3 className="font-medium text-red-800 mb-2">Detalles del Error:</h3>
                  <p className="text-sm text-red-700 font-mono break-all">
                    {this.state.error?.message || 'Error desconocido'}
                  </p>
                  {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                    <details className="mt-3">
                      <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
                        Ver stack trace (desarrollo)
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-32 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={this.handleReload}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Recargar Página
                  </button>
                  
                  {!isContextError && (
                    <button
                      onClick={this.handleRetry}
                      className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reintentar
                    </button>
                  )}
                </div>
                
                <div className="mt-8 text-sm text-gray-500">
                  <p>Si el problema persiste, contacta al administrador del sistema.</p>
                  {process.env.NODE_ENV === 'development' && (
                    <p className="mt-2 text-xs">
                      <strong>Modo desarrollo:</strong> Los errores de contexto suelen resolverse con un hard refresh (Ctrl+F5)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;