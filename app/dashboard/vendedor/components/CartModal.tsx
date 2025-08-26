'use client';

import { useState, useEffect } from 'react';
import { calculateItemPrice } from '@/lib/wholesale-pricing-utils';
import { formatAsCLP } from '@/lib/formatters';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  type_name?: string;
  total_stock: number;
  image_url: string | null;
}

interface CartItem {
  product: Product;
  stockEntryId: string;
  quantity: number;
  saleFormat: 'unitario' | 'display' | 'pallet';
  unitPrice: number;

  wholesalePrice?: number;
  appliedPrice: number;
  appliedPriceType: 'unit' | 'wholesale';
  totalPrice: number;
  savings?: number;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted: (saleData?: { productIds?: string[] }) => void;
  initialProduct?: Product | null;
  // Props para carrito compartido
  cartItems?: CartItem[];
  onUpdateQuantity?: (stockEntryId: string, productId: string, newQuantity: number) => void;
  onRemoveItem?: (stockEntryId: string, productId: string) => void;
}

export default function CartModal({ 
  isOpen, 
  onClose, 
  onSaleCompleted, 
  initialProduct,
  cartItems: externalCartItems,
  onUpdateQuantity,
  onRemoveItem
}: CartModalProps) {
  // Usar carrito externo si está disponible, sino usar estado interno
  const cartItems = externalCartItems || [];
  const isUsingExternalCart = !!externalCartItems;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState<{ success: boolean; saleId?: string }>({ success: false });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false);

  // Agregar producto inicial al carrito cuando se abre el modal
  useEffect(() => {
    if (isOpen && initialProduct && !cartItems.some(item => item.product.id === initialProduct.id)) {
      // Por ahora, no agregamos automáticamente productos al carrito
      // porque necesitamos obtener la información de precios primero
      // TODO: Implementar obtención de precios del producto inicial
    }
  }, [isOpen, initialProduct]);

  // El listener de eventos ya no es necesario porque usamos props del carrito compartido

  if (!isOpen) return null;

  // Función para calcular precios de un item del carrito
  const calculateCartItemPricing = (
    quantity: number,
    saleFormat: 'unitario' | 'display' | 'pallet',
    unitPrice: number,
    wholesalePrice?: number
  ) => {
    const calculation = calculateItemPrice({
      quantity,
      unitPrice,
      wholesalePrice
    });
    
    return {
      appliedPrice: calculation.applicablePrice,
      appliedPriceType: calculation.priceType as 'unit' | 'wholesale',
      totalPrice: calculation.totalPrice,
      savings: calculation.savings
    };
  };

  // Función para actualizar precios de un item existente
  const updateCartItemPricing = (item: CartItem): CartItem => {
    const pricing = calculateCartItemPricing(
      item.quantity,
      item.saleFormat,
      item.unitPrice,

      item.wholesalePrice
    );

    return {
      ...item,
      ...pricing
    };
  };

  const addToCart = (product: Product, stockEntry?: any) => {
    // Esta función ya no es necesaria porque el carrito se maneja en VendorPageClient
    // Solo se mantiene para compatibilidad con el botón de prueba
    console.log('addToCart llamado en CartModal (no implementado para carrito externo):', product.name);
  };

  const removeFromCart = (productId: string) => {
    if (isUsingExternalCart && onRemoveItem) {
      // Encontrar el item para obtener el stockEntryId
      const item = cartItems.find(item => item.product.id === productId);
      if (item) {
        onRemoveItem(item.stockEntryId, productId);
      }
    }
    // Si no hay carrito externo, no hacer nada (el carrito está vacío)
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (isUsingExternalCart && onUpdateQuantity) {
      // Encontrar el item para obtener el stockEntryId
      const item = cartItems.find(item => item.product.id === productId);
      if (item) {
        onUpdateQuantity(item.stockEntryId, productId, newQuantity);
      }
    }
    // Si no hay carrito externo, no hacer nada
  };

  const updateSaleFormat = (productId: string, newFormat: 'unitario' | 'display' | 'pallet') => {
    // Esta funcionalidad no está implementada en el carrito externo aún
    // TODO: Implementar actualización de formato de venta en VendorPageClient
    console.log('updateSaleFormat no implementado para carrito externo:', productId, newFormat);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.totalPrice || 0), 0);
  };

  const getTotalSavings = () => {
    return cartItems.reduce((total, item) => total + (item.savings || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      setError('El carrito está vacío. Agrega al menos un producto.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validar stock para todos los productos
      for (const item of cartItems) {
        if (item.quantity > item.product.total_stock) {
          throw new Error(`Stock insuficiente para ${item.product.name}. Solo hay ${item.product.total_stock} unidades disponibles.`);
        }
      }

      // Convertir items del carrito al formato esperado por la API del carrito
      const cartItemsForAPI = cartItems.map(item => ({
        productId: item.product.id,
        stockEntryId: item.stockEntryId,
        quantity: item.quantity,
        saleFormat: item.saleFormat,
        specificPrice: item.appliedPrice
      }));

      // Procesar toda la venta como un carrito usando el sistema reutilizable
      const response = await fetch('/api/sales/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cartItems: cartItemsForAPI }),
        credentials: 'include', // Incluir cookies de autenticación
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Error al procesar la venta del carrito');
      }

      if (!result.success || !result.data?.saleId) {
        throw new Error(result.error?.message || 'Error procesando la venta');
      }

      const lastSaleId = result.data.saleId;

      // Éxito
      setSaleSuccess({ success: true, saleId: lastSaleId });
      setHasAutoPrinted(false); // Resetear estado de impresión automática
      
      // Activar impresión automática después de un breve delay
      setTimeout(() => {
        if (lastSaleId) {
          handleAutoPrint(lastSaleId);
        }
      }, 500);
      
      // No cerrar el modal automáticamente, permitir que el usuario vea la pantalla de éxito
      // y elija si imprimir o continuar
      
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      let errorMessage = 'Error desconocido al procesar la venta';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        // Intentar extraer información útil del objeto error
        if ('message' in err && typeof err.message === 'string') {
          errorMessage = err.message;
        } else if ('error' in err && typeof err.error === 'string') {
          errorMessage = err.error;
        } else {
          errorMessage = 'Error interno del servidor. Por favor, intente nuevamente.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetCart = () => {
    // Ya no manejamos el estado del carrito aquí, se maneja en VendorPageClient
    setError('');
    setSaleSuccess({ success: false });
    setHasAutoPrinted(false);
  };

  const handleClose = () => {
    resetCart();
    onClose();
  };

  const handleAutoPrint = (saleId: string) => {
    if (hasAutoPrinted) return; // Evitar impresión múltiple
    
    setHasAutoPrinted(true);
    const ticketWindow = window.open(`/ticket/${saleId}`, '_blank', 'width=400,height=600,scrollbars=yes');
    
    if (!ticketWindow) {
      console.warn('No se pudo abrir la ventana de impresión automática.');
      setHasAutoPrinted(false); // Permitir reintento manual
    }
  };

  const handlePrintTicket = (saleId: string) => {
    const ticketWindow = window.open(`/ticket/${saleId}`, '_blank', 'width=400,height=600,scrollbars=yes');
    
    if (!ticketWindow) {
      alert('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueando ventanas emergentes.');
      return;
    }
  };

  const handleSaveAsPDF = (saleId: string) => {
    const pdfWindow = window.open(`/ticket/${saleId}?format=pdf`, '_blank', 'width=800,height=600');
    
    if (!pdfWindow) {
      alert('No se pudo abrir la ventana para guardar como PDF. Verifique que no esté bloqueando ventanas emergentes.');
      return;
    }
  };

  const handleCompleteSale = () => {
    // Extraer IDs únicos de productos vendidos
    const productIds = [...new Set(cartItems.map(item => item.product.id))];
    onSaleCompleted({ productIds });
    onClose();
    resetCart();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">
            Carrito de Compras
            {cartItems.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({getTotalItems()} productos)
              </span>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {saleSuccess.success ? (
          /* Pantalla de éxito */
          <div className="space-y-4">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                ¡Venta Exitosa!
              </h3>
              <p className="text-green-700">
                La venta se ha procesado correctamente.
              </p>
              <p className="text-sm text-green-600 mt-2">
                Último Ticket #{saleSuccess.saleId}
              </p>
            </div>

            {hasAutoPrinted ? (
              <div className="space-y-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    ✓ El ticket se ha enviado a impresión automáticamente
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => saleSuccess.saleId && handlePrintTicket(saleSuccess.saleId)}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
                    </svg>
                    Reimprimir Ticket
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => saleSuccess.saleId && handleSaveAsPDF(saleSuccess.saleId)}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center justify-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Guardar como PDF
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCompleteSale}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    ⏳ Preparando impresión automática...
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => saleSuccess.saleId && handlePrintTicket(saleSuccess.saleId)}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
                    </svg>
                    Imprimir Ahora
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => saleSuccess.saleId && handleSaveAsPDF(saleSuccess.saleId)}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center justify-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Guardar como PDF
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCompleteSale}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancelar Impresión
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Carrito de compras */
          <div className="space-y-6">
            {/* Lista de productos en el carrito */}
            {cartItems.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-black">Productos en el carrito:</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddProduct(!showAddProduct)}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                      disabled={loading}
                    >
                      + Agregar Producto
                    </button>
                    
                    {/* Botón de prueba para wholesale pricing */}
                    <button
                      onClick={() => {
                        const testProduct: Product = {
                          id: 'test-wholesale',
                          name: 'Producto de Prueba Mayorista',
                          brand_name: 'Marca Test',
                          total_stock: 100,
                          image_url: null
                        };
                        
                        const testStockEntry = {
                          id: 'test-stock-1',
                          sale_price_unit: 1000,
                  
                          sale_price_wholesale: 800
                        };
                        
                        addToCart(testProduct, testStockEntry);
                      }}
                      className="text-sm bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 transition-colors"
                      disabled={loading}
                    >
                      🧪 Prueba Mayorista
                    </button>
                  </div>
                </div>
                
                {cartItems.map((item) => (
                  <div key={item.product.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-black">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">Marca: {item.product.brand_name}</p>
                        {item.product.type_name && (
                          <p className="text-sm text-gray-500">Tipo: {item.product.type_name}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Stock disponible: {item.product.total_stock} unidades
                        </p>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700 ml-4"
                        disabled={loading}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cantidad */}
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                          min="1"
                          max={item.product.total_stock}
                          disabled={loading}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                        />
                      </div>
                      
                      {/* Formato */}
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Formato
                        </label>
                        <select
                          value={item.saleFormat}
                          onChange={(e) => updateSaleFormat(item.product.id, e.target.value as any)}
                          disabled={loading}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                        >
                          <option value="unitario">Unitario</option>
    
                          <option value="display">Display</option>
                          <option value="pallet">Pallet</option>
                        </select>
                      </div>
                    </div>

                    {/* Información de precios y totales */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-black" style={{color: '#000000 !important'}}>
                            Precio por unidad:
                            {item.appliedPriceType === 'wholesale' ? (
                              <span className="ml-1 text-purple-600 font-medium">🎉 Mayorista</span>
                            ) : null}
                          </span>
                          <span className="font-medium text-black" style={{color: '#000000 !important'}}>
                            {formatAsCLP(item.appliedPrice)}
                            {item.appliedPriceType === 'wholesale' ? (
                              <span className="text-xs text-gray-500 ml-1">(3+ unidades)</span>
                            ) : null}
                          </span>
                        </div>
                        
                        {item.savings && item.savings > 0 ? (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-600">Ahorro total:</span>
                            <span className="font-medium text-green-600">
                              {formatAsCLP(item.savings)}
                            </span>
                          </div>
                        ) : null}
                        
                        <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                          <span className="font-medium text-black" style={{color: '#000000 !important'}}>Subtotal:</span>
                          <span className="font-bold text-lg text-black" style={{color: '#000000 !important'}}>
                            {formatAsCLP(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p>El carrito está vacío</p>
                <p className="text-sm">Agrega productos desde el catálogo</p>
              </div>
            )}

            {/* Resumen total del carrito */}
            {cartItems.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-black text-lg mb-3" style={{color: '#000000 !important'}}>Resumen de la Compra</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-black" style={{color: '#000000 !important'}}>Total de productos:</span>
                    <span className="font-medium text-black" style={{color: '#000000 !important'}}>{getTotalItems()} unidades</span>
                  </div>
                  
                  {getTotalSavings() > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-600">🎉 Ahorro total por precios mayoristas:</span>
                      <span className="font-medium text-green-600">
                        {formatAsCLP(getTotalSavings())}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center border-t border-green-300 pt-2">
                    <span className="font-bold text-black text-lg" style={{color: '#000000 !important'}}>Total a pagar:</span>
                    <span className="font-bold text-xl text-black" style={{color: '#000000 !important'}}>
                      {formatAsCLP(getTotalPrice())}
                    </span>
                  </div>
                  
                  {getTotalSavings() > 0 && (
                    <p className="text-xs text-green-600 text-center">
                      ¡Has ahorrado {formatAsCLP(getTotalSavings())} con precios mayoristas!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              
              {cartItems.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={loading || cartItems.length === 0}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Procesando...' : `Confirmar Venta - ${formatAsCLP(getTotalPrice())}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}