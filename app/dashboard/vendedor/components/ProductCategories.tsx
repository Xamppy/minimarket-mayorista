'use client';

import { useState, useEffect, useMemo } from 'react';
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

const INITIAL_VISIBLE_COUNT = 6;

export default function ProductCategories({ productTypes, products }: ProductCategoriesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');
  
  // Estado para controlar el acordeón en móvil
  const [isOpen, setIsOpen] = useState(false);
  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  // Estado para mostrar más/menos
  const [showAll, setShowAll] = useState(false);

  // Auto-expandir cuando hay un filtro activo
  useEffect(() => {
    if (currentCategory) {
      setIsOpen(true);
    }
  }, [currentCategory]);

  // Contar productos por categoría y ordenar por cantidad (descendente)
  const categoryCounts = useMemo(() => {
    return productTypes.map(type => {
      const count = products.filter(product => 
        product.type_name?.toLowerCase() === type.name.toLowerCase()
      ).length;
      return {
        ...type,
        count
      };
    }).sort((a, b) => b.count - a.count); // Ordenar por productos (más productos primero)
  }, [productTypes, products]);

  // Agregar categoría "Todos" al principio
  const allCategories = useMemo(() => [
    { id: 'all', name: 'Todos los productos', count: products.length },
    ...categoryCounts
  ], [categoryCounts, products.length]);

  // Filtrar categorías por término de búsqueda
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return allCategories;
    const term = searchTerm.toLowerCase();
    return allCategories.filter(category => 
      category.name.toLowerCase().includes(term)
    );
  }, [allCategories, searchTerm]);

  // Aplicar límite de visualización
  const visibleCategories = useMemo(() => {
    if (showAll || searchTerm.trim()) return filteredCategories;
    return filteredCategories.slice(0, INITIAL_VISIBLE_COUNT);
  }, [filteredCategories, showAll, searchTerm]);

  const hasMoreToShow = filteredCategories.length > INITIAL_VISIBLE_COUNT && !searchTerm.trim();

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
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      {/* Header móvil con acordeón (solo visible en móvil) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-full flex items-center justify-between text-left mb-3"
      >
        <h3 className="text-lg font-semibold text-black">
          {currentCategory ? `Categoría: ${currentCategory}` : 'Filtrar por Categoría'}
        </h3>
        <svg 
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Header desktop (siempre visible, no interactivo) */}
      <h3 className="hidden md:block text-lg font-semibold text-black mb-4">
        Categorías de Productos
      </h3>
      
      {/* Contenido: oculto en móvil cuando cerrado, siempre visible en desktop */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:block`}>
        {/* Barra de búsqueda */}
        <div className="relative mb-4">
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-gray-50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Resultados de búsqueda info */}
        {searchTerm && (
          <p className="text-xs text-gray-500 mb-2">
            {filteredCategories.length} categoría{filteredCategories.length !== 1 ? 's' : ''} encontrada{filteredCategories.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Grid de categorías */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {visibleCategories.map((category) => (
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
              <div className="font-medium text-sm mb-1 truncate">
                {category.name}
              </div>
              <div className={`text-xs ${
                (category.id === 'all' && !currentCategory) || 
                (currentCategory && category.name.toLowerCase() === currentCategory.toLowerCase())
                  ? 'text-blue-100'
                  : 'text-gray-500'
              }`}>
                {category.count} producto{category.count !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>

        {/* Botón Ver más/menos */}
        {hasMoreToShow && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-4 w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {showAll ? (
              <>
                Ver menos
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Ver {filteredCategories.length - INITIAL_VISIBLE_COUNT} más
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}

        {/* Información del filtro actual */}
        {currentCategory && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                Filtrando por: <strong>{currentCategory}</strong>
              </span>
              <button
                onClick={() => handleCategoryClick('all')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}  