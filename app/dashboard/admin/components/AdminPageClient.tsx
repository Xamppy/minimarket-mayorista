'use client';

import { useState, useMemo } from 'react';
import ProductsTable from './ProductsTable';
import ProductToolbar from './ProductToolbar';

interface ProductWithStock {
  id: string;
  name: string;
  brand_name: string;
  type_name: string;
  image_url: string | null;
  total_stock: number;
  barcode?: string;
}

interface Brand {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
}

interface AdminPageClientProps {
  initialProducts: ProductWithStock[];
  brands: Brand[];
  productTypes: ProductType[];
}

export default function AdminPageClient({ 
  initialProducts, 
  brands, 
  productTypes 
}: AdminPageClientProps) {
  const [products] = useState<ProductWithStock[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Filtered products with search (name + barcode) and brand/type filters
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return products.filter(p => {
      // Search matches name OR barcode
      const matchesSearch = query === '' || 
        p.name.toLowerCase().includes(query) || 
        p.barcode?.toLowerCase().includes(query);
      
      // Brand filter (empty = all brands)
      const matchesBrand = selectedBrands.length === 0 || 
        selectedBrands.includes(p.brand_name);
      
      // Type filter (empty = all types)
      const matchesType = selectedTypes.length === 0 || 
        selectedTypes.includes(p.type_name);
      
      return matchesSearch && matchesBrand && matchesType;
    });
  }, [products, searchQuery, selectedBrands, selectedTypes]);

  const handleProductsUpdated = () => {
    setLoading(true);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Smart Toolbar */}
      <ProductToolbar
        brands={brands}
        productTypes={productTypes}
        searchQuery={searchQuery}
        selectedBrands={selectedBrands}
        selectedTypes={selectedTypes}
        onSearchChange={setSearchQuery}
        onBrandsChange={setSelectedBrands}
        onTypesChange={setSelectedTypes}
        totalProducts={products.length}
        filteredCount={filteredProducts.length}
      />

      {/* Products Table */}
      <div className="rounded-xl bg-white">
        {loading && (
          <div className="text-center py-4">
            <p className="text-gray-600">Actualizando productos...</p>
          </div>
        )}
        
        {filteredProducts.length > 0 ? (
          <ProductsTable 
            products={filteredProducts}
            brands={brands}
            productTypes={productTypes}
            onProductsUpdated={handleProductsUpdated}
          />
        ) : products.length > 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="font-medium">No se encontraron productos</p>
            <p className="text-sm mt-1">Intenta con otros términos de búsqueda o filtros</p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No hay productos registrados.</p>
            <p className="text-sm">Añade el primer producto usando el formulario.</p>
          </div>
        )}
      </div>
    </div>
  );
}