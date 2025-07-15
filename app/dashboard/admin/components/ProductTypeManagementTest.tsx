'use client';

import { useState } from 'react';
import ProductTypeModal from './ProductTypeModal';

// Componente de prueba para verificar que ProductTypeForm y ProductTypeModal funcionan
export default function ProductTypeManagementTest() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Datos de prueba para modo edición
  const testProductType = {
    id: '1',
    name: 'Bebestible',
    created_at: '2025-06-17T23:27:30.924520+00:00'
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Prueba de Gestión de Tipos de Producto</h2>
      
      <div className="space-x-4">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Crear Nuevo Tipo
        </button>
        
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Editar Tipo (Prueba)
        </button>
      </div>

      {/* Modal para crear tipo de producto */}
      <ProductTypeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Modal para editar tipo de producto */}
      <ProductTypeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        productType={testProductType}
      />
    </div>
  );
}