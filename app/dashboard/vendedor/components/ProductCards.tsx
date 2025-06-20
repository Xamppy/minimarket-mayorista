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

              {/* Botón de venta */}
              <SellButton product={product} onSell={handleSell} />
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