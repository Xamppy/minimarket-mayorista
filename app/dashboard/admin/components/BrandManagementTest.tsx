'use client';

import { useState } from 'react';
import BrandModal from './BrandModal';

// Componente de prueba para verificar que BrandForm y BrandModal funcionan
export default function BrandManagementTest() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Datos de prueba para modo edición
  const testBrand = {
    id: '1',
    name: 'Coca Cola',
    created_at: '2025-06-17T23:27:02.312474+00:00'
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Prueba de Gestión de Marcas</h2>
      
      <div className="space-x-4">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Crear Nueva Marca
        </button>
        
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Editar Marca (Prueba)
        </button>
      </div>

      {/* Modal para crear marca */}
      <BrandModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Modal para editar marca */}
      <BrandModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        brand={testBrand}
      />
    </div>
  );
}