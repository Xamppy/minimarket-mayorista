'use client';

import { useState, useEffect } from 'react';
import SellButton from './SellButton';
import SaleModal from './SaleModal';
import { authenticatedFetch } from '../../../utils/auth/api';

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
  
  // Estado local para el stock en tiempo real
  const [realTimeStock, setRealTimeStock] = useState<Record<string, number>>({});

  // Inicializar stock en tiempo real cuando cambian los productos
  useEffect(() => {
    const initialStock: Record<string, number> = {};
    products.forEach(product => {
      initialStock[product.id] = product.total_stock;
    });
    setRealTimeStock(initialStock);
  }, [products]);

  // Función para obtener stock actualizado de un producto específico
  const updateProductStock = async (productId: string) => {
    try {
      const response = await authenticatedFetch(`/api/stock-entries?productId=${productId}`);
      if (response.ok) {
        const stockEntries = await response.json();
        const totalStock = stockEntries.reduce((sum: number, entry: any) => 
          sum + (entry.current_quantity || 0), 0
        );
        setRealTimeStock(prev => ({
          ...prev,
          [productId]: totalStock
        }));
      }
    } catch (error) {
      console.error('Error al actualizar stock:', error);
    }
  };

  // Escuchar eventos de venta completada para actualizar stock
  useEffect(() => {
    const handleSaleCompleted = (event: CustomEvent) => {
      const { productIds } = event.detail || {};
      if (productIds && Array.isArray(productIds)) {
        // Actualizar stock de todos los productos vendidos
        productIds.forEach((productId: string) => {
          updateProductStock(productId);
        });
      }
    };

    const handleCartItemAdded = (event: CustomEvent) => {
      const { product } = event.detail || {};
      if (product?.id) {
        // Actualizar stock del producto agregado al carrito
        updateProductStock(product.id);
      }
    };

    window.addEventListener('saleCompleted', handleSaleCompleted as EventListener);
    window.addEventListener('addToCart', handleCartItemAdded as EventListener);

    return () => {
      window.removeEventListener('saleCompleted', handleSaleCompleted as EventListener);
      window.removeEventListener('addToCart', handleCartItemAdded as EventListener);
    };
  }, []);

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

  const handleSaleCompleted = (saleData?: { productIds?: string[] }) => {
    onSaleCompleted();
    handleCloseModal();
    
    // Disparar evento personalizado para actualizar stock
    if (saleData?.productIds) {
      const event = new CustomEvent('saleCompleted', {
        detail: { productIds: saleData.productIds }
      });
      window.dispatchEvent(event);
    }
  };

  const handleAddToCart = async (product: Product) => {
    try {
      const response = await authenticatedFetch(`/api/stock-entries?productId=${product.id}`);
      if (!response.ok) {
        throw new Error('Error al obtener stock');
      }
      
      const stockEntries = await response.json();
      const availableStock = stockEntries.filter((entry: any) => entry.current_quantity > 0);
      
      if (availableStock.length === 0) {
        alert('No hay stock disponible para este producto');
        return;
      }
      
      // Usar la primera entrada de stock disponible
      const stockEntry = availableStock[0];
      
      const cartItem = {
        id: `${product.id}-${stockEntry.id}`,
        productId: product.id,
        name: product.name,
        brand: product.brand_name,
        price: stockEntry.sale_price_unit,
        quantity: 1,
        stockEntry: {
          id: stockEntry.id,
          current_quantity: stockEntry.current_quantity,
          sale_price_unit: stockEntry.sale_price_unit
        }
      };
      
      // Obtener carrito actual
      const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
      
      // Verificar si el producto ya está en el carrito
      const existingItemIndex = currentCart.findIndex((item: any) => item.id === cartItem.id);
      
      if (existingItemIndex >= 0) {
        // Si ya existe, incrementar cantidad
        const existingItem = currentCart[existingItemIndex];
        if (existingItem.quantity < stockEntry.current_quantity) {
          currentCart[existingItemIndex].quantity += 1;
        } else {
          alert('No hay suficiente stock disponible');
          return;
        }
      } else {
        // Si no existe, agregar nuevo item
        currentCart.push(cartItem);
      }
      
      // Guardar carrito actualizado
      localStorage.setItem('cart', JSON.stringify(currentCart));
      
      // Disparar eventos para actualizar contador del carrito y stock
      window.dispatchEvent(new Event('cartUpdated'));
      
      // Disparar evento personalizado para actualizar stock en tiempo real
      const addToCartEvent = new CustomEvent('addToCart', {
        detail: { product }
      });
      window.dispatchEvent(addToCartEvent);
      
      alert('Producto agregado al carrito');
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      alert('Error al agregar producto al carrito');
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
            <div className="aspect-square bg-gray-50 flex items-center justify-center rounded-md md:rounded-none overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-md md:rounded-none"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : (
              <div className="text-gray-400 text-center p-2 md:p-4">
                <svg className="mx-auto h-8 w-8 md:h-12 md:w-12 mb-1 md:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] md:text-xs">Sin imagen</span>
              </div>
              )}
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
                  (realTimeStock[product.id] ?? product.total_stock) > 10 
                    ? 'bg-green-100 text-green-800' 
                    : (realTimeStock[product.id] ?? product.total_stock) > 0 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {realTimeStock[product.id] ?? product.total_stock} un.
                </span>
              </div>

              {/* Botones de acción */}
              <div className="space-y-2">
                <SellButton product={product} onSell={handleSell} />
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={(realTimeStock[product.id] ?? product.total_stock) <= 0}
                  className={`w-full py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                    (realTimeStock[product.id] ?? product.total_stock) > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {(realTimeStock[product.id] ?? product.total_stock) > 0 ? '+ Carrito' : 'Sin Stock'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SaleModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        mode="finalize-sale"
        cartItems={[]}
        onSaleCompleted={handleSaleCompleted}
      />
    </>
  );
}