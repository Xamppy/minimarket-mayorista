'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminPageClient from './AdminPageClient';
import AlertsDashboard from './AlertsDashboard';
import AddProductModal from './AddProductModal';
import dynamic from 'next/dynamic';
import CreateVendedorForm from './CreateVendedorForm';

const CategoryManagementModal = dynamic(() => import('./CategoryManagementModal'), {
  ssr: false
});
const BarcodeGeneratorModal = dynamic(() => import('./BarcodeGeneratorModal'), {
  ssr: false
});
const ProductImportModal = dynamic(() => import('./ProductImportModal'), {
  ssr: false
});
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
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [currentBrands, setCurrentBrands] = useState(brands);
  const [currentProductTypes, setCurrentProductTypes] = useState(productTypes);
  


  // Sincronizar estados con props cuando cambien
  useEffect(() => {
    setCurrentBrands(brands);
  }, [brands]);

  useEffect(() => {
    setCurrentProductTypes(productTypes);
  }, [productTypes]);

  // Debug: Log de los datos iniciales
  console.log('AdminDashboard - Marcas iniciales:', brands);
  console.log('AdminDashboard - Tipos iniciales:', productTypes);
  console.log('AdminDashboard - Estado currentBrands:', currentBrands);
  console.log('AdminDashboard - Estado currentProductTypes:', currentProductTypes);

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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Administrador</h1>
            <p className="text-gray-600 mt-2">
              Bienvenido, <strong>{user?.email || 'Usuario'}</strong>
            </p>
          </div>
          <div>
            <Link
              href="/dashboard/vendedor"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Ir a Ventas (POS)
            </Link>
          </div>
        </div>

        {/* Panel de Alertas */}
        <div className="mb-8">
          <AlertsDashboard />
        </div>

        {/* Gestión de Usuarios */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
              <p className="text-gray-600 mt-1">Crea cuentas de vendedores y administra accesos</p>
            </div>
            <CreateVendedorForm />
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
                  onClick={() => setImportModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Importar CSV
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
          onClose={() => {
            console.log('Cerrando modal de añadir producto');
            console.log('Marcas disponibles:', currentBrands);
            console.log('Tipos disponibles:', currentProductTypes);
            setIsModalOpen(false);
          }}
          brands={currentBrands}
          types={currentProductTypes}
        />

        {/* Modal para Gestión de Categorías */}
        <CategoryManagementModal
          isOpen={categoryModalOpen}
          onClose={handleCategoryModalClose}
        />

        {/* Modal para Códigos de Barras */}
        <BarcodeGeneratorModal
          isOpen={barcodeModalOpen}
          onClose={() => setBarcodeModalOpen(false)}
        />

        {/* Modal para Importación Masiva */}
        <ProductImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
        />


      </div>
    </div>
  );
}