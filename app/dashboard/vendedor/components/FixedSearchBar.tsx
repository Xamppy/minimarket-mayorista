'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FixedSearchBarProps {
  onScannerFocus?: () => void;
}

export default function FixedSearchBar({ onScannerFocus }: FixedSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isScanning, setIsScanning] = useState(false);
  const [lastInputTime, setLastInputTime] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Función para actualizar la URL
  const updateURL = useCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (term.trim()) {
      params.set('search', term.trim());
    } else {
      params.delete('search');
    }
    
    // Actualizar la URL sin recargar la página
    router.replace(`/dashboard/vendedor?${params.toString()}`);
  }, [router, searchParams]);

  // Actualizar el término de búsqueda cuando cambie la URL
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    setSearchTerm(currentSearch);
  }, [searchParams]);

  // Debounce personalizado con useEffect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateURL(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, updateURL]);

  // Función para enfocar el campo de escáner (llamada desde MobileNavBar)
  const focusScanner = useCallback(() => {
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
      setIsScanning(true);
      onScannerFocus?.();
    }
  }, [onScannerFocus]);

  // Exponer la función focusScanner globalmente
  useEffect(() => {
    (window as any).focusScanner = focusScanner;
    return () => {
      delete (window as any).focusScanner;
    };
  }, [focusScanner]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleScannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const currentTime = Date.now();
    
    // Detectar entrada rápida (típica de escáner Bluetooth)
    if (value.length > 3 && (currentTime - lastInputTime) < 100) {
      // Es probable que sea un escáner
      setSearchTerm(value);
      // Auto-procesar después de un breve delay
      setTimeout(() => {
        if (scannerInputRef.current?.value === value) {
          processBarcodeSearch(value);
        }
      }, 200);
    } else if (value.length > 0) {
      // Entrada manual más lenta, actualizar el término de búsqueda
      setSearchTerm(value);
    }
    
    setLastInputTime(currentTime);
  };

  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value;
      processBarcodeSearch(value);
    }
  };

  const processBarcodeSearch = (barcode: string) => {
    if (barcode.trim()) {
      // Buscar por código de barras primero
      setSearchTerm(barcode.trim());
      setIsScanning(false);
      // Enfocar el campo de búsqueda principal
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleScannerBlur = () => {
    // Delay para evitar que se cierre inmediatamente
    setTimeout(() => {
      setIsScanning(false);
    }, 200);
  };

  return (
    <>
      {/* Barra de búsqueda principal */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 md:h-5 md:w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          className="block w-full pl-9 md:pl-10 pr-10 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-black bg-gray-50"
          placeholder="Buscar productos..."
        />

        {/* Botones de acción */}
        <div className="absolute inset-y-0 right-0 flex items-center">
          {/* Botón de escáner (desktop) */}
          <button
            onClick={focusScanner}
            className="hidden md:flex items-center px-2 text-gray-400 hover:text-blue-600 transition-colors"
            type="button"
            title="Activar escáner"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          
          {/* Botón para limpiar búsqueda */}
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="pr-3 flex items-center text-gray-400 hover:text-gray-600"
              type="button"
            >
              <svg
                className="h-4 w-4 md:h-5 md:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Campo oculto para escáner Bluetooth */}
      <input
        ref={scannerInputRef}
        type="text"
        className={`absolute left-0 ${isScanning ? 'top-0 opacity-100 z-10' : '-top-96 opacity-0 pointer-events-none'} w-full pl-9 md:pl-10 pr-3 py-2 md:py-2.5 border-2 border-blue-500 rounded-lg text-sm text-black bg-blue-50 font-mono`}
        onChange={handleScannerChange}
        onKeyDown={handleScannerKeyDown}
        onBlur={handleScannerBlur}
        placeholder="Escaneando... apunte el escáner al código"
        autoComplete="off"
        tabIndex={isScanning ? 0 : -1}
      />

      {/* Indicador de modo escáner */}
      {isScanning && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-blue-50 border border-blue-200 rounded-lg p-2 text-center z-50">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-blue-700 font-medium">
              Modo escáner activo - Escanee el código
            </span>
          </div>
        </div>
      )}
    </>
  );
} 