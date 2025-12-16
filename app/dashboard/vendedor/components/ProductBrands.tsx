'use client';

import { useState, useEffect, useMemo } from 'react';
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

const INITIAL_VISIBLE_COUNT = 6;

export default function ProductBrands({ brands, products }: ProductBrandsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBrand = searchParams.get('brand');
  
  // Estado para controlar el acordeón en móvil
  const [isOpen, setIsOpen] = useState(false);
  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  // Estado para mostrar más/menos
  const [showAll, setShowAll] = useState(false);

  // Auto-expandir cuando hay un filtro activo
  useEffect(() => {
    if (currentBrand) {
      setIsOpen(true);
    }
  }, [currentBrand]);

  // Contar productos por marca y ordenar por cantidad (descendente)
  const brandCounts = useMemo(() => {
    return brands.map(brand => {
      const count = products.filter(product => 
        product.brand_name?.toLowerCase() === brand.name.toLowerCase()
      ).length;
      return {
        ...brand,
        count
      };
    }).sort((a, b) => b.count - a.count); // Ordenar por productos (más productos primero)
  }, [brands, products]);

  // Agregar marca "Todas" al principio
  const allBrands = useMemo(() => [
    { id: 'all', name: 'Todas las marcas', count: products.length },
    ...brandCounts
  ], [brandCounts, products.length]);

  // Filtrar marcas por término de búsqueda
  const filteredBrands = useMemo(() => {
    if (!searchTerm.trim()) return allBrands;
    const term = searchTerm.toLowerCase();
    return allBrands.filter(brand => 
      brand.name.toLowerCase().includes(term)
    );
  }, [allBrands, searchTerm]);

  // Aplicar límite de visualización
  const visibleBrands = useMemo(() => {
    if (showAll || searchTerm.trim()) return filteredBrands;
    return filteredBrands.slice(0, INITIAL_VISIBLE_COUNT);
  }, [filteredBrands, showAll, searchTerm]);

  const hasMoreToShow = filteredBrands.length > INITIAL_VISIBLE_COUNT && !searchTerm.trim();

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
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      {/* Header móvil con acordeón (solo visible en móvil) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-full flex items-center justify-between text-left mb-3"
      >
        <h3 className="text-lg font-semibold text-black">
          {currentBrand ? `Marca: ${currentBrand}` : 'Filtrar por Marca'}
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
        Filtrar por Marca
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
            placeholder="Buscar marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black bg-gray-50"
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
            {filteredBrands.length} marca{filteredBrands.length !== 1 ? 's' : ''} encontrada{filteredBrands.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Grid de marcas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {visibleBrands.map((brand) => (
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
              <div className="font-medium text-sm mb-1 truncate">
                {brand.name}
              </div>
              <div className={`text-xs ${
                (brand.id === 'all' && !currentBrand) || 
                (currentBrand && brand.name.toLowerCase() === currentBrand.toLowerCase())
                  ? 'text-green-100'
                  : 'text-gray-500'
              }`}>
                {brand.count} producto{brand.count !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>

        {/* Botón Ver más/menos */}
        {hasMoreToShow && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-4 w-full py-2 text-sm font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center gap-1"
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
                Ver {filteredBrands.length - INITIAL_VISIBLE_COUNT} más
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}

        {/* Información del filtro actual */}
        {currentBrand && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-800">
                Filtrando por: <strong>{currentBrand}</strong>
              </span>
              <button
                onClick={() => handleBrandClick('all')}
                className="text-xs text-green-600 hover:text-green-800 font-medium"
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