'use client';

import { useRouter } from 'next/navigation';
import ProductCards from './ProductCards';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  total_stock: number;
  image_url: string | null;
}

interface VendorPageClientProps {
  products: Product[];
  searchTerm: string;
}

export default function VendorPageClient({ products, searchTerm }: VendorPageClientProps) {
  const router = useRouter();

  const handleSaleCompleted = () => {
    // Refrescar la página para actualizar los datos
    router.refresh();
  };

  return (
    <>
      {products && products.length > 0 ? (
        <ProductCards products={products} onSaleCompleted={handleSaleCompleted} />
      ) : (
        <div className="text-center py-12 text-black">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          {searchTerm ? (
            <>
              <p className="text-lg font-medium text-black">No se encontraron productos</p>
              <p className="text-sm text-black">No hay productos que coincidan con "{searchTerm}"</p>
              <p className="text-xs text-black mt-2">Intenta con otros términos de búsqueda</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-black">No hay productos disponibles</p>
              <p className="text-sm text-black">Los productos aparecerán aquí cuando sean agregados al catálogo.</p>
            </>
          )}
        </div>
      )}
    </>
  );
} 