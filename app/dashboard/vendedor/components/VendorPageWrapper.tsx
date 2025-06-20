'use client';

import { useState, Suspense } from 'react';
import VendorPageClient from './VendorPageClient';
import ProductCategories from './ProductCategories';
import ProductBrands from './ProductBrands';
import ProductCatalog from './ProductCatalog';
import FloatingCartButton from './FloatingCartButton';
import MobileNavBar from './MobileNavBar';
import DesktopNavTabs from './DesktopNavTabs';
import SalesHistory from './SalesHistory';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  type_name?: string;
  total_stock: number;
  image_url: string | null;
}

interface ProductType {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface VendorPageWrapperProps {
  products: Product[];
  searchTerm: string;
  categoryFilter: string;
  brandFilter: string;
  productTypes: ProductType[];
  brands: Brand[];
  productsError: any;
}

export default function VendorPageWrapper({
  products,
  searchTerm,
  categoryFilter,
  brandFilter,
  productTypes,
  brands,
  productsError
}: VendorPageWrapperProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'scanner' | 'sales'>('catalog');

  const renderContent = () => {
    switch (activeTab) {
      case 'scanner':
        return (
          <div className="space-y-6">
            {/* Título y descripción del modo escáner */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-black">Escáner de Códigos de Barras</h2>
                  <p className="text-sm text-gray-600">
                    Use la barra de búsqueda superior para escanear códigos o buscar productos
                  </p>
                </div>
              </div>
              
              {/* Instrucciones */}
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-black">Escáner Bluetooth:</p>
                    <p className="text-gray-600">Active el escáner y apunte al código de barras</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-black">Búsqueda Manual:</p>
                    <p className="text-gray-600">Escriba el código o nombre del producto</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Escáner de código de barras */}
            {productsError ? (
              <div className="text-red-600 bg-red-50 p-4 rounded-md">
                <p className="font-medium">Error al cargar productos:</p>
                <p className="text-sm">{productsError.message}</p>
              </div>
            ) : (
              <VendorPageClient />
            )}

            {/* Indicador de búsqueda activa en modo scanner */}
            {searchTerm && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="text-sm text-gray-600">
                  Mostrando resultados para: <span className="font-medium text-black">"{searchTerm}"</span>
                </div>
              </div>
            )}

            {/* Mostrar productos encontrados también en modo scanner */}
            {searchTerm && (
              <Suspense fallback={<div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>}>
                <ProductCatalog 
                  products={products}
                  searchTerm={searchTerm}
                  categoryFilter={categoryFilter}
                  brandFilter={brandFilter}
                />
              </Suspense>
            )}
          </div>
        );
      
      case 'sales':
        return (
          <div className="space-y-6">
            {/* Título para desktop */}
            <div className="hidden md:block bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-black">Historial de Ventas</h2>
                  <p className="text-sm text-gray-600">
                    Revise todas las transacciones realizadas en el día de hoy
                  </p>
                </div>
              </div>
            </div>
            
            <SalesHistory />
          </div>
        );
      
      case 'catalog':
      default:
        return (
          <div className="space-y-6">
            {/* Categorías de Productos */}
            <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>}>
              <ProductCategories 
                productTypes={productTypes}
                products={products}
              />
            </Suspense>

            {/* Filtrado por Marcas */}
            <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>}>
              <ProductBrands 
                brands={brands}
                products={products}
              />
            </Suspense>

            {/* Indicador de búsqueda activa */}
            {searchTerm && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="text-sm text-gray-600">
                  Mostrando resultados para: <span className="font-medium text-black">"{searchTerm}"</span>
                </div>
              </div>
            )}

            {/* Catálogo de productos */}
            <Suspense fallback={<div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>}>
              <ProductCatalog 
                products={products}
                searchTerm={searchTerm}
                categoryFilter={categoryFilter}
                brandFilter={brandFilter}
              />
            </Suspense>
          </div>
        );
    }
  };

  return (
    <>
      {/* Navegación por tabs para desktop (oculta en mobile) */}
      <DesktopNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contenido principal con padding bottom para la barra móvil */}
      <div className="pb-20 md:pb-0">
        {renderContent()}
      </div>

      {/* Barra de navegación móvil (solo visible en mobile) */}
      <MobileNavBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Botón flotante del carrito (solo visible en catalog) */}
      {activeTab === 'catalog' && <FloatingCartButton />}
    </>
  );
} 