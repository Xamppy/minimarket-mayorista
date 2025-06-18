'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="relative max-w-md w-full">
      <div className="relative">
        {/* Icono de búsqueda */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
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

        {/* Campo de búsqueda */}
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-black"
          placeholder="Buscar productos por nombre o marca..."
        />

        {/* Botón para limpiar búsqueda */}
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            type="button"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Indicador de búsqueda activa */}
      {searchTerm && (
        <div className="mt-2 text-sm font-medium" style={{ color: '#000000' }}>
          Buscando: <span className="font-bold" style={{ color: '#000000' }}>"{searchTerm}"</span>
        </div>
      )}
    </div>
  );
} 