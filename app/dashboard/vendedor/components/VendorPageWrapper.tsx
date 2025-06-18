'use client';

import { Suspense } from 'react';
import VendorPageClient from './VendorPageClient';
import ProductCategories from './ProductCategories';
import ProductBrands from './ProductBrands';
import ProductCatalog from './ProductCatalog';
import FloatingCartButton from './FloatingCartButton';
import SearchBar from './SearchBar';

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
  return (
    <>
      {/* Escáner de código de barras - Elemento principal */}
      {productsError ? (
        <div className="text-red-600 bg-red-50 p-4 rounded-md mb-6">
          <p className="font-medium">Error al cargar productos:</p>
          <p className="text-sm">{productsError.message}</p>
        </div>
      ) : (
        <VendorPageClient />
      )}

      {/* Categorías de Productos */}
      <div className="mt-8">
        <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>}>
          <ProductCategories 
            productTypes={productTypes}
            products={products}
          />
        </Suspense>
      </div>

      {/* Filtrado por Marcas */}
      <div className="mt-6">
        <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>}>
          <ProductBrands 
            brands={brands}
            products={products}
          />
        </Suspense>
      </div>

      {/* Barra de búsqueda manual */}
      <div className="mt-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Búsqueda Manual</h3>
          <Suspense fallback={<div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>}>
            <SearchBar />
          </Suspense>
          {searchTerm && (
            <div className="mt-3 text-sm text-gray-600">
              Mostrando resultados para: <span className="font-medium text-black">"{searchTerm}"</span>
            </div>
          )}
        </div>
      </div>

      {/* Catálogo de productos - Al final */}
      <div className="mt-8">
        <Suspense fallback={<div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>}>
          <ProductCatalog 
            products={products}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
            brandFilter={brandFilter}
          />
        </Suspense>
      </div>

      {/* Botón flotante del carrito */}
      <FloatingCartButton />
    </>
  );
} 