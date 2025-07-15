'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminPageClient from './AdminPageClient';
import AlertsDashboard from './AlertsDashboard';
import AddProductModal from './AddProductModal';
import CategoryManagementModal from './CategoryManagementModal';
import { getAllBrands, getAllProductTypes } from '../actions';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  type_name: string;
  image_url: string | null;
  total_stock: number;
}

interface Brand {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
}

interface User {
  id: string;
  email?: string;
}

interface AdminDashboardProps {
  user: User;
  role: string;
  products: Product[];
  brands: Brand[];
  productTypes: ProductType[];
  productsError: Error | null;
}

export default function AdminDashboard({ 
  user, 
  role, 
  products, 
  brands, 
  productTypes, 
  productsError 
}: AdminDashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [currentBrands, setCurrentBrands] = useState(brands);
  const [currentProductTypes, setCurrentProductTypes] = useState(productTypes);

  // Función para refrescar marcas y tipos después de operaciones de categorías
  const refreshCategories = async () => {
    try {
      const [updatedBrands, updatedTypes] = await Promise.all([
        getAllBrands(),
        getAllProductTypes()
      ]);
      setCurrentBrands(updatedBrands);
      setCurrentProductTypes(updatedTypes);
    } catch (error) {
      console.error('Error al refrescar categorías:', error);
    }
  };

  // Manejar cierre del modal de categorías con refresh
  const handleCategoryModalClose = () => {
    setCategoryModalOpen(false);
    refreshCategories(); // Refrescar datos cuando se cierre el modal
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Administrador</h1>
          <p className="text-gray-600 mt-2">
            Bienvenido, <strong>{user.email}</strong>
          </p>
          {/* Información de depuración del rol */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Debug - Información del usuario:</strong>
            </p>
            <p className="text-sm text-blue-700">
              ID de usuario: <code className="bg-blue-100 px-1 rounded">{user.id}</code>
            </p>
            <p className="text-sm text-blue-700">
              Rol obtenido: <code className="bg-blue-100 px-1 rounded">{role}</code>
            </p>
            <p className="text-sm text-blue-700">
              Tipo de rol: <code className="bg-blue-100 px-1 rounded">{typeof role}</code>
            </p>
          </div>
        </div>

        {/* Encabezado de Acciones */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gestión de Catálogo</h2>
                <p className="text-gray-600 mt-1">
                  Administra productos, stock y visualiza reportes
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard/reports"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                  </svg>
                  Ver Reportes
                </Link>
                <button
                  onClick={() => setCategoryModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Gestionar Categorías
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Añadir Nuevo Producto
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Alertas */}
        <div className="mb-8">
          <AlertsDashboard />
        </div>

        {/* Lista de Productos en Tabla */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {productsError ? (
            <div className="text-red-600 bg-red-50 p-4 rounded-md">
              <p className="font-medium">Error al cargar productos:</p>
              <p className="text-sm">{productsError.message}</p>
            </div>
          ) : (
            <AdminPageClient
              initialProducts={products}
              brands={brands}
              productTypes={productTypes}
            />
          )}
        </div>

        {/* Modal para Añadir Producto */}
        <AddProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          brands={currentBrands}
          types={currentProductTypes}
        />

        {/* Modal para Gestión de Categorías */}
        <CategoryManagementModal
          isOpen={categoryModalOpen}
          onClose={handleCategoryModalClose}
        />
      </div>
    </div>
  );
} 