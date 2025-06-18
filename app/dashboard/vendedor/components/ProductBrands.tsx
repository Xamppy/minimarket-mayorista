'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Brand {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  brand_name: string;
  total_stock: number;
  type_name?: string;
}

interface ProductBrandsProps {
  brands: Brand[];
  products: Product[];
}

export default function ProductBrands({ brands, products }: ProductBrandsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBrand = searchParams.get('brand');

  // Contar productos por marca
  const brandCounts = brands.map(brand => {
    const count = products.filter(product => 
      product.brand_name?.toLowerCase() === brand.name.toLowerCase()
    ).length;
    return {
      ...brand,
      count
    };
  });

  // Agregar marca "Todas"
  const allBrands = [
    { id: 'all', name: 'Todas las marcas', count: products.length },
    ...brandCounts
  ];

  const handleBrandClick = (brandId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (brandId === 'all') {
      params.delete('brand');
    } else {
      const brandName = brands.find(brand => brand.id === brandId)?.name;
      if (brandName) {
        params.set('brand', brandName);
      }
    }
    
    router.push(`/dashboard/vendedor?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-black mb-4">
        Filtrar por Marca
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {allBrands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => handleBrandClick(brand.id)}
            className={`p-3 rounded-lg border text-center transition-all duration-200 ${
              (brand.id === 'all' && !currentBrand) || 
              (currentBrand && brand.name.toLowerCase() === currentBrand.toLowerCase())
                ? 'bg-green-600 text-white border-green-600 shadow-md'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-green-50 hover:border-green-300'
            }`}
          >
            <div className="font-medium text-sm mb-1">
              {brand.name}
            </div>
            <div className={`text-xs ${
              (brand.id === 'all' && !currentBrand) || 
              (currentBrand && brand.name.toLowerCase() === currentBrand.toLowerCase())
                ? 'text-green-100'
                : 'text-gray-500'
            }`}>
              {brand.count} productos
            </div>
          </button>
        ))}
      </div>

      {/* Información del filtro actual */}
      {currentBrand && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-800">
              Mostrando productos de la marca: <strong>{currentBrand}</strong>
            </span>
            <button
              onClick={() => handleBrandClick('all')}
              className="text-xs text-green-600 hover:text-green-800 font-medium"
            >
              Limpiar filtro
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 