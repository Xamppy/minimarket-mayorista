'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface ProductType {
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

interface ProductCategoriesProps {
  productTypes: ProductType[];
  products: Product[];
}

export default function ProductCategories({ productTypes, products }: ProductCategoriesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');

  // Contar productos por categoría
  const categoryCounts = productTypes.map(type => {
    const count = products.filter(product => 
      product.type_name?.toLowerCase() === type.name.toLowerCase()
    ).length;
    return {
      ...type,
      count
    };
  });

  // Agregar categoría "Todos"
  const allCategories = [
    { id: 'all', name: 'Todos los productos', count: products.length },
    ...categoryCounts
  ];

  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (categoryId === 'all') {
      params.delete('category');
    } else {
      const categoryName = productTypes.find(type => type.id === categoryId)?.name;
      if (categoryName) {
        params.set('category', categoryName);
      }
    }
    
    router.push(`/dashboard/vendedor?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-black mb-4">
        Categorías de Productos
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {allCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={`p-3 rounded-lg border text-center transition-all duration-200 ${
              (category.id === 'all' && !currentCategory) || 
              (currentCategory && category.name.toLowerCase() === currentCategory.toLowerCase())
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
            }`}
          >
            <div className="font-medium text-sm mb-1">
              {category.name}
            </div>
            <div className={`text-xs ${
              (category.id === 'all' && !currentCategory) || 
              (currentCategory && category.name.toLowerCase() === currentCategory.toLowerCase())
                ? 'text-blue-100'
                : 'text-gray-500'
            }`}>
              {category.count} productos
            </div>
          </button>
        ))}
      </div>

      {/* Información del filtro actual */}
      {currentCategory && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              Mostrando productos de la categoría: <strong>{currentCategory}</strong>
            </span>
            <button
              onClick={() => handleCategoryClick('all')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar filtro
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 