'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CartModal from './CartModal';
import StockEntrySelectionModal from './StockEntrySelectionModal';
import { StockEntry } from '@/lib/cart-types';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  type_name?: string;
  total_stock: number;
  image_url: string | null;
  min_price?: number;
}

interface ProductCatalogProps {
  products: Product[];
  searchTerm: string;
  categoryFilter: string;
  brandFilter: string;
  onAddToCart?: (product: Product, stockEntry: any, quantity?: number) => void;
}

// Formato de moneda chilena sin decimales
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function ProductCatalog({ products, searchTerm, categoryFilter, brandFilter, onAddToCart }: ProductCatalogProps) {
  const router = useRouter();
  
  // Estado para búsqueda local
  const [localSearch, setLocalSearch] = useState('');
  
  const [cartModalState, setCartModalState] = useState<{
    isOpen: boolean;
    selectedProduct: Product | null;
  }>({
    isOpen: false,
    selectedProduct: null
  });

  const [stockSelectionModal, setStockSelectionModal] = useState<{
    isOpen: boolean;
    selectedProduct: Product | null;
  }>({
    isOpen: false,
    selectedProduct: null
  });

  // Filtrar productos por búsqueda local
  const filteredProducts = useMemo(() => {
    if (!localSearch.trim()) return products;
    const term = localSearch.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(term) ||
      product.brand_name?.toLowerCase().includes(term)
    );
  }, [products, localSearch]);

  const handleSaleCompleted = () => {
    router.refresh();
    setCartModalState({
      isOpen: false,
      selectedProduct: null
    });
  };

  const handleSellProduct = async (product: Product) => {
    if (!onAddToCart) {
      setCartModalState({
        isOpen: true,
        selectedProduct: product
      });
      return;
    }

    setStockSelectionModal({
      isOpen: true,
      selectedProduct: product
    });
  };

  const handleStockEntrySelected = (stockEntry: StockEntry, quantity: number, _saleFormat: 'unitario') => {
    if (!stockSelectionModal.selectedProduct || !onAddToCart) return;

    const stockEntryForCart = {
      id: stockEntry.id,
      sale_price_unit: stockEntry.sale_price_unit,
      sale_price_wholesale: stockEntry.sale_price_wholesale,
      current_quantity: stockEntry.current_quantity,
      barcode: stockEntry.barcode,
      expiration_date: stockEntry.expiration_date
    };

    onAddToCart(stockSelectionModal.selectedProduct, stockEntryForCart, quantity);

    setStockSelectionModal({
      isOpen: false,
      selectedProduct: null
    });
  };

  const handleCloseStockSelectionModal = () => {
    setStockSelectionModal({
      isOpen: false,
      selectedProduct: null
    });
  };

  const handleCloseCartModal = () => {
    setCartModalState({
      isOpen: false,
      selectedProduct: null
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        {/* Header con título */}
        <h3 className="text-lg font-semibold text-black mb-4">
          Catálogo de Productos
          {categoryFilter && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              - {categoryFilter}
            </span>
          )}
          {brandFilter && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              - {brandFilter}
            </span>
          )}
        </h3>

        {/* Barra de Búsqueda Global */}
        <div className="relative mb-4">
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar producto por nombre o marca..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-gray-50"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Contador de resultados */}
        {localSearch && (
          <p className="text-xs text-gray-500 mb-3">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        )}
        
        {filteredProducts && filteredProducts.length > 0 ? (
          <>
            {/* Vista Desktop: Grid de Alta Densidad */}
            <div className="hidden md:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProducts.map((product: Product) => (
                <div 
                  key={product.id} 
                  onClick={() => product.total_stock > 0 && handleSellProduct(product)}
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col items-center text-center h-full transition-all duration-150 ${
                    product.total_stock > 0 
                      ? 'cursor-pointer hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 active:scale-95' 
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Imagen Controlada */}
                  <div className="h-24 w-full mb-2 flex items-center justify-center bg-gray-50 rounded-md overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="object-contain w-full h-full"
                      />
                    ) : (
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>
                  {/* Info Compacta */}
                  <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</h4>
                  {product.min_price && product.min_price > 0 && (
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(product.min_price)}</p>
                  )}
                  <p className="text-xs text-gray-500 truncate w-full">{product.brand_name}</p>
                  {/* Badge de Stock Discreto */}
                  <span className={`text-xs mt-auto pt-2 px-2 py-0.5 rounded-full ${
                    product.total_stock > 10 
                      ? 'bg-green-100 text-green-800' 
                      : product.total_stock > 0 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.total_stock > 0 ? `Stock: ${product.total_stock}` : 'Sin Stock'}
                  </span>
                </div>
              ))}
            </div>

            {/* Vista Móvil: Lista Compacta Horizontal */}
            <div className="md:hidden flex flex-col gap-2">
              {filteredProducts.map((product: Product) => (
                <div 
                  key={product.id} 
                  className="flex flex-row items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>

                  {/* Info del producto */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-black text-sm truncate">{product.name}</h4>
                    <p className="text-xs text-gray-600 truncate">{product.brand_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        product.total_stock > 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {product.total_stock} uds
                      </span>
                    </div>
                  </div>

                  {/* Botón Agregar */}
                  {product.total_stock > 0 ? (
                    <button 
                      onClick={() => handleSellProduct(product)}
                      className="flex-shrink-0 w-11 h-11 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center active:scale-95"
                      aria-label={`Agregar ${product.name}`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
                      </svg>
                    </button>
                  ) : (
                    <div className="flex-shrink-0 w-11 h-11 bg-gray-300 text-gray-500 rounded-lg flex items-center justify-center cursor-not-allowed">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-black">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            {localSearch || searchTerm || categoryFilter || brandFilter ? (
              <>
                <p className="text-lg font-medium text-black">No se encontraron productos</p>
                <p className="text-sm text-gray-600">
                  {localSearch ? `No hay productos que coincidan con "${localSearch}"` : 'No hay productos con los filtros aplicados'}
                </p>
                {localSearch && (
                  <button
                    onClick={() => setLocalSearch('')}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-black">No hay productos disponibles</p>
                <p className="text-sm text-gray-600">Los productos aparecerán aquí cuando sean agregados al catálogo.</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal del carrito */}
      <CartModal
        isOpen={cartModalState.isOpen}
        onClose={handleCloseCartModal}
        initialProduct={cartModalState.selectedProduct}
        onSaleCompleted={handleSaleCompleted}
      />

      {/* Modal de selección de stock entry */}
      {stockSelectionModal.selectedProduct && (
        <StockEntrySelectionModal
          isOpen={stockSelectionModal.isOpen}
          onClose={handleCloseStockSelectionModal}
          product={stockSelectionModal.selectedProduct}
          onStockEntrySelected={handleStockEntrySelected}
        />
      )}
    </>
  );
}