'use client';

import { useState } from 'react';
import SellButton from './SellButton';
import SaleModal from './SaleModal';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  total_stock: number;
  image_url: string | null;
}

interface ProductCardsProps {
  products: Product[];
  onSaleCompleted: () => void;
}

export default function ProductCards({ products, onSaleCompleted }: ProductCardsProps) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    selectedProduct: Product | null;
  }>({
    isOpen: false,
    selectedProduct: null
  });

  const handleSell = (product: Product) => {
    setModalState({
      isOpen: true,
      selectedProduct: product
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      selectedProduct: null
    });
  };

  const handleSaleCompleted = () => {
    onSaleCompleted();
    handleCloseModal();
  };

  const handleAddToCart = async (product: Product) => {
    try {
      // Primero necesitamos obtener la información de precios del producto
      // Buscaremos el primer stock entry disponible para este producto
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
      
      // Crear el evento personalizado para agregar al carrito
      const cartEvent = new CustomEvent('addToCart', {
        detail: {
          product,
          stockEntry: {
            id: availableStock.id,
            sale_price_unit: availableStock.sale_price_unit,
            sale_price_box: availableStock.sale_price_box,
            sale_price_wholesale: availableStock.sale_price_wholesale,
            current_quantity: availableStock.current_quantity
          }
        }
      });
      
      window.dispatchEvent(cartEvent);
      
      // Mostrar confirmación
      alert(`${product.name} agregado al carrito`);
      
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      alert('Error al agregar el producto al carrito');
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden p-1 md:p-0"
          >
            {/* Imagen del producto */}
            <div className="aspect-square bg-gray-100 flex items-center justify-center rounded-md md:rounded-none">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-md md:rounded-none"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`text-gray-400 text-center p-2 md:p-4 ${product.image_url ? 'hidden' : ''}`}>
                <svg className="mx-auto h-8 w-8 md:h-12 md:w-12 mb-1 md:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] md:text-xs">Sin imagen</span>
              </div>
            </div>

            {/* Información del producto */}
            <div className="p-2 md:p-4">
              <h3 className="font-semibold text-black text-sm md:text-sm mb-1 line-clamp-2 leading-tight">
                {product.name}
              </h3>
              
              <p className="text-black text-[10px] md:text-xs mb-2 md:mb-3">
                {product.brand_name || 'Sin marca'}
              </p>

              {/* Stock */}
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <span className="text-[10px] md:text-xs text-black">Stock:</span>
                <span className={`text-[10px] md:text-sm font-medium px-1.5 py-0.5 md:px-2 md:py-1 rounded-full ${
                  product.total_stock > 10 
                    ? 'bg-green-100 text-green-800' 
                    : product.total_stock > 0 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.total_stock} un.
                </span>
              </div>

              {/* Botones de acción */}
              <div className="space-y-2">
                <SellButton product={product} onSell={handleSell} />
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.total_stock <= 0}
                  className={`w-full py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                    product.total_stock > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {product.total_stock > 0 ? '+ Carrito' : 'Sin Stock'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SaleModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        product={modalState.selectedProduct}
        onSaleCompleted={handleSaleCompleted}
      />
    </>
  );
} 