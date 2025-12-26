'use client';

import { useState, useRef, useEffect } from 'react';

interface Brand {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
}

interface ProductToolbarProps {
  brands: Brand[];
  productTypes: ProductType[];
  searchQuery: string;
  selectedBrands: string[];
  selectedTypes: string[];
  onSearchChange: (query: string) => void;
  onBrandsChange: (brands: string[]) => void;
  onTypesChange: (types: string[]) => void;
  totalProducts: number;
  filteredCount: number;
}

export default function ProductToolbar({
  brands,
  productTypes,
  searchQuery,
  selectedBrands,
  selectedTypes,
  onSearchChange,
  onBrandsChange,
  onTypesChange,
  totalProducts,
  filteredCount
}: ProductToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBrandToggle = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      onBrandsChange(selectedBrands.filter(b => b !== brandName));
    } else {
      onBrandsChange([...selectedBrands, brandName]);
    }
  };

  const handleTypeToggle = (typeName: string) => {
    if (selectedTypes.includes(typeName)) {
      onTypesChange(selectedTypes.filter(t => t !== typeName));
    } else {
      onTypesChange([...selectedTypes, typeName]);
    }
  };

  const clearFilters = () => {
    onBrandsChange([]);
    onTypesChange([]);
    onSearchChange('');
  };

  const activeFiltersCount = selectedBrands.length + selectedTypes.length;
  const hasActiveFilters = activeFiltersCount > 0 || searchQuery.length > 0;

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Search + Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        {/* Search Input - Full width on mobile */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, código de barras..."
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Button + Popover */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`inline-flex items-center px-4 py-2.5 border rounded-lg text-sm font-medium transition-all ${
              activeFiltersCount > 0
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Filter Popover */}
          {isFilterOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Filtros Avanzados</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
              </div>

              <div>
                {/* Brands Section */}
                <div className="p-4 border-b border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Marcas ({brands.length})
                  </h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-2">
                    {brands.map((brand) => (
                      <label
                        key={brand.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand.name)}
                          onChange={() => handleBrandToggle(brand.name)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{brand.name}</span>
                      </label>
                    ))}
                    {brands.length === 0 && (
                      <p className="text-sm text-gray-400 italic">Sin marcas disponibles</p>
                    )}
                  </div>
                </div>

                {/* Types Section */}
                <div className="p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Tipos ({productTypes.length})
                  </h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-2">
                    {productTypes.map((type) => (
                      <label
                        key={type.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type.name)}
                          onChange={() => handleTypeToggle(type.name)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{type.name}</span>
                      </label>
                    ))}
                    {productTypes.length === 0 && (
                      <p className="text-sm text-gray-400 italic">Sin tipos disponibles</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Results count */}
      <div className="text-sm text-gray-500">
        {hasActiveFilters ? (
          <span>
            Mostrando <span className="font-semibold text-gray-900">{filteredCount}</span> de {totalProducts} productos
          </span>
        ) : (
          <span>
            <span className="font-semibold text-gray-900">{totalProducts}</span> productos
          </span>
        )}
      </div>
    </div>
  );
}
