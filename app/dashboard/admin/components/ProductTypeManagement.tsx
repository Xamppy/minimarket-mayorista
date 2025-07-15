'use client';

import { useState } from 'react';
import ProductTypeList from './ProductTypeList';
import ProductTypeModal from './ProductTypeModal';

export default function ProductTypeManagement() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Gestión de Tipos de Producto</h1>
          <p className="mt-2 text-sm text-gray-700">
            Administra los tipos de producto. Los tipos te permiten categorizar productos por su clasificación (bebidas, snacks, lácteos, etc.).
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Tipo
          </button>
        </div>
      </div>

      {/* Lista de tipos de producto */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <ProductTypeList key={refreshKey} onRefresh={handleRefresh} />
        </div>
      </div>

      {/* Modal para crear tipo de producto */}
      <ProductTypeModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Crear Nuevo Tipo de Producto"
      />
    </div>
  );
}