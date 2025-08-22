'use client';

import { useState, useEffect } from 'react';
import ProductsTable from './ProductsTable';

interface ProductWithStock {
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
  const [products, setProducts] = useState<ProductWithStock[]>(initialProducts);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Recargar la página para obtener datos actualizados
      window.location.reload();
    } catch (error) {
      console.error('Error al actualizar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductsUpdated = () => {
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-3">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Productos ({products.length})
          </h2>
        </div>
        
        {loading && (
          <div className="text-center py-4">
            <p className="text-gray-600">Actualizando productos...</p>
          </div>
        )}
        
        {products.length > 0 ? (
          <ProductsTable 
            products={products}
            brands={brands}
            productTypes={productTypes}
            onProductsUpdated={handleProductsUpdated}
          />
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