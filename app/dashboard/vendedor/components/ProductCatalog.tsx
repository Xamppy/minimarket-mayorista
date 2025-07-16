'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CartModal from './CartModal';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  type_name?: string;
  total_stock: number;
  image_url: string | null;
}

interface ProductCatalogProps {
  products: Product[];
  searchTerm: string;
  categoryFilter: string;
  brandFilter: string;
  onAddToCart?: (product: Product, stockEntry: any) => void;
}

export default function ProductCatalog({ products, searchTerm, categoryFilter, brandFilter, onAddToCart }: ProductCatalogProps) {
  const router = useRouter();
  const [cartModalState, setCartModalState] = useState<{
    isOpen: boolean;
    selectedProduct: Product | null;
  }>({
    isOpen: false,
    selectedProduct: null
  });

  const handleSaleCompleted = () => {
    // Refrescar la página para actualizar los datos
    router.refresh();
    setCartModalState({
      isOpen: false,
      selectedProduct: null
    });
  };

  const handleSellProduct = async (product: Product) => {
    if (!onAddToCart) {
      // Fallback al modal local si no hay función onAddToCart
      setCartModalState({
        isOpen: true,
        selectedProduct: product
      });
      return;
    }

    try {
      // Obtener información de precios del producto
      const response = await fetch(`/api/stock-entries?productId=${product.id}`);
      
      if (!response.ok) {
        throw new Error('Error al obtener información del producto');
      }
      
      const stockEntries = await response.json();
      
      if (!stockEntries || stockEntries.length === 0) {
        alert('No hay stock disponible para este producto');
        return;
      }
      
      // Tomar el primer stock entry con stock disponible
      const availableStock = stockEntries.find((entry: any) => entry.current_quantity > 0);
      
      if (!availableStock) {
        alert('No hay stock disponible para este producto');
        return;
      }
      
      // Usar la función onAddToCart pasada desde el componente padre
      onAddToCart(product, availableStock);
      
      // Mostrar confirmación
      alert(`${product.name} agregado al carrito`);
      
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      alert('Error al agregar el producto al carrito');
    }
  };

  const handleCloseCartModal = () => {
    setCartModalState({
      isOpen: false,
      selectedProduct: null
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-black mb-4">
          Catálogo de Productos
          {categoryFilter && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              - Categoría: {categoryFilter}
            </span>
          )}
          {brandFilter && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              - Marca: {brandFilter}
            </span>
          )}
          {searchTerm && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              - Búsqueda: "{searchTerm}"
            </span>
          )}
        </h3>
        
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product: Product) => (
              <div key={product.id} className="bg-gray-50 rounded-lg p-4 border">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
                <h4 className="font-medium text-black text-sm mb-1">{product.name}</h4>
                <p className="text-xs text-gray-600 mb-1">{product.brand_name}</p>
                {product.type_name && (
                  <p className="text-xs text-gray-500 mb-2">{product.type_name}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.total_stock > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    Stock: {product.total_stock}
                  </span>
                  {product.total_stock > 0 && (
                    <button 
                      onClick={() => handleSellProduct(product)}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Agregar al Carrito
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-black">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            {searchTerm || categoryFilter || brandFilter ? (
              <>
                <p className="text-lg font-medium text-black">No se encontraron productos</p>
                <p className="text-sm text-black">
                  No hay productos que coincidan con los filtros aplicados
                </p>
                <p className="text-xs text-black mt-2">
                  Intenta con otros términos de búsqueda o categorías
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-black">No hay productos disponibles</p>
                <p className="text-sm text-black">Los productos aparecerán aquí cuando sean agregados al catálogo.</p>
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
    </>
  );
} 