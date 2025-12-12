'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatAsCLP } from '@/lib/formatters';

import { StockEntry } from '@/lib/cart-types';


// Función para prevenir cambios de valor en inputs numéricos al hacer scroll
const preventScrollChange = (e: WheelEvent) => {
  const target = e.target as HTMLInputElement;
  if (target.type === 'number' && document.activeElement === target) {
    e.preventDefault();
  }
};

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  brand_name: string;
  total_stock: number;
  type_name?: string;
}

interface CartItem {
  product: Product;
  stockEntryId: string;
  quantity: number;
  saleFormat: 'unitario' | 'display' | 'pallet';
  unitPrice: number;
  totalPrice: number;
}

interface ScannedItem {
  product: Product;
  stockEntry: {
    id: string;
    sale_price_unit: number;
  
    current_quantity: number;
    expiration_date?: string | null;
    barcode?: string;
    purchase_price?: number;
  };
  stockEntries?: any[]; // Array completo de lotes disponibles
}

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add-to-cart-from-scan' | 'finalize-sale' | 'direct-sale-from-scan';
  // Para modo add-to-cart-from-scan
  scannedItem?: ScannedItem;
  onItemAddedToCart?: (item: {
    product: Product;
    stockEntryId: string;
    quantity: number;
    saleFormat: 'unitario';
    price: number;
  }) => void;
  // Para modo finalize-sale  
  cartItems?: CartItem[];
  onSaleCompleted?: (saleData?: { productIds?: string[] }) => void;
}

export default function SaleModal({ 
  isOpen, 
  onClose, 
  mode,
  scannedItem,
  onItemAddedToCart,
  cartItems = [], 
  onSaleCompleted 
}: SaleModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [saleFormat, setSaleFormat] = useState<'unitario'>('unitario');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState<{ success: boolean; saleId?: string; ticketUrl?: string; totalAmount?: number }>({ success: false });
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  
  // Estado para el lote seleccionado manualmente
  const [selectedStockEntry, setSelectedStockEntry] = useState<any | null>(null);

  // Determinar modo de operación
  const isAddToCartMode = mode === 'add-to-cart-from-scan';
  const isFinalizeSaleMode = mode === 'finalize-sale';
  const isDirectSaleMode = mode === 'direct-sale-from-scan';

  const resetForm = () => {
    setQuantity(1);
    setSaleFormat('unitario');
    setError('');
    setSaleSuccess({ success: false });
    setIsButtonPressed(false); // Resetear estado de botones
  };

  useEffect(() => {
    // Agregar event listener para prevenir cambios de scroll en inputs numéricos
    document.addEventListener('wheel', preventScrollChange, { passive: false });

    // Cleanup function para remover el event listener
    return () => {
      document.removeEventListener('wheel', preventScrollChange);
    };
  }, []);

  // Resetear formulario cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      resetForm();
      // Resetear al lote prioritario (FEFO) cuando se abre el modal
      setSelectedStockEntry(scannedItem?.stockEntry || null);
    }
  }, [isOpen, scannedItem]);

  // Debug: Monitorear cambios en quantity y estados de botones
  useEffect(() => {
    console.log('Debug - Estados:', {
      quantity,
      loading,
      stock: scannedItem?.stockEntry.current_quantity,
      isButtonPressed,
      decreaseDisabled: loading || quantity <= 1 || isButtonPressed,
      increaseDisabled: loading || quantity >= (scannedItem?.stockEntry.current_quantity || 0) || isButtonPressed
    });
  }, [quantity, loading, scannedItem?.stockEntry.current_quantity, isButtonPressed]);

  // Funciones optimizadas para manejar clics de botones
  const handleDecreaseQuantity = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isButtonPressed || loading || quantity <= 1) return;
    
    setIsButtonPressed(true);
    console.log('Botón disminuir clickeado, quantity actual:', quantity);
    setQuantity(prev => {
      const newQuantity = prev > 1 ? prev - 1 : 1;
      console.log('Nueva quantity después de disminuir:', newQuantity);
      return newQuantity;
    });
    
    // Reducir tiempo de bloqueo
    setTimeout(() => setIsButtonPressed(false), 100);
  }, [isButtonPressed, loading, quantity]);

  const handleIncreaseQuantity = useCallback((e: React.MouseEvent) => {
     e.preventDefault();
     e.stopPropagation();
     
     const maxQuantity = scannedItem?.stockEntry.current_quantity || 0;
     if (isButtonPressed || loading || quantity >= maxQuantity) return;
    
    setIsButtonPressed(true);
    console.log('Botón aumentar clickeado, quantity actual:', quantity);
    setQuantity(prev => {
      const newQuantity = prev < maxQuantity ? prev + 1 : prev;
      console.log('Nueva quantity después de aumentar:', newQuantity);
      return newQuantity;
    });
    
    // Reducir tiempo de bloqueo
    setTimeout(() => setIsButtonPressed(false), 100);
  }, [isButtonPressed, loading, quantity, scannedItem?.stockEntry.current_quantity]);

  if (!isOpen) return null;

  const getPrice = () => {
    if (!isAddToCartMode || !scannedItem) return 0;
    
    // Usar el lote seleccionado o el lote por defecto
    const activeStockEntry = selectedStockEntry || scannedItem.stockEntry;
    
    return activeStockEntry.sale_price_unit;
  };

  /* getPricingInfo removido ya que no se usa unified pricing */

  const getTotalAmount = () => {
    if (isFinalizeSaleMode) {
      return cartItems.reduce((total, item) => total + (item.totalPrice || 0), 0);
    }
    return getPrice() * quantity;
  };

  const getTotalItems = () => {
    if (isFinalizeSaleMode) {
      return cartItems.reduce((total, item) => total + item.quantity, 0);
    }
    return quantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isAddToCartMode) {
        await handleAddToCart();
      } else if (isFinalizeSaleMode) {
        await handleFinalizeSale();
      } else if (isDirectSaleMode) {
        await handleDirectSaleFromScan();
      } else {
        throw new Error('Modo de operación no válido');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!scannedItem || !onItemAddedToCart) {
      throw new Error('Información del producto no disponible');
    }

    // Usar el lote seleccionado o el lote por defecto
    const activeStockEntry = selectedStockEntry || scannedItem.stockEntry;

    // Validaciones
    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (quantity > activeStockEntry.current_quantity) {
      setError(`Stock insuficiente. Solo hay ${activeStockEntry.current_quantity} unidades disponibles.`);
      return;
    }

    // Llamar al callback para añadir al carrito con el lote seleccionado
    onItemAddedToCart({
      product: scannedItem.product,
      stockEntryId: activeStockEntry.id,
      quantity,
      saleFormat,
      price: getPrice(),
    });

    // Cerrar modal y resetear
    resetForm();
    onClose();
  };

  const handleDirectSaleFromScan = async () => {
    if (!scannedItem) {
      throw new Error('No hay producto escaneado para procesar');
    }

    // Validaciones
    if (quantity <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    if (quantity > scannedItem.stockEntry.current_quantity) {
      throw new Error(`Stock insuficiente. Solo hay ${scannedItem.stockEntry.current_quantity} unidades disponibles.`);
    }

    // Convertir el producto escaneado al formato esperado por la API del carrito
    const cartItemsForAPI = [{
      productId: scannedItem.product.id,
      stockEntryId: scannedItem.stockEntry.id,
      quantity: quantity,
      saleFormat: saleFormat,
      specificPrice: getPrice()
    }];

    // Procesar la venta usando el mismo sistema del carrito
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
      throw new Error(result.error?.message || 'Error al procesar la venta del producto escaneado');
    }

    if (result.success) {
      setSaleSuccess({ 
        success: true, 
        saleId: result.data?.saleId,
        ticketUrl: result.data?.ticketUrl,
        totalAmount: result.data?.totalAmount
      });
    } else {
      throw new Error(result.error?.message || 'Error procesando la venta');
    }
  };

  const handleFinalizeSale = async () => {
    if (cartItems.length === 0) {
      throw new Error('No hay productos en el carrito');
    }

    // Convertir items del carrito al formato esperado por la nueva API
    const cartItemsForAPI = cartItems.map(item => ({
      productId: item.product.id,
      stockEntryId: item.stockEntryId,
      quantity: item.quantity,
      saleFormat: item.saleFormat,
      specificPrice: item.unitPrice
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

    if (result.success) {
      setSaleSuccess({ 
        success: true, 
        saleId: result.data?.saleId,
        ticketUrl: result.data?.ticketUrl,
        totalAmount: result.data?.totalAmount
      });
    } else {
      throw new Error(result.error?.message || 'Error procesando la venta');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePrintTicket = (saleId: string) => {
    const ticketWindow = window.open(`/ticket/${saleId}`, '_blank', 'width=400,height=600,scrollbars=yes');
    
    if (!ticketWindow) {
      alert('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueando ventanas emergentes.');
      return;
    }
  };

  const handleCompleteSale = () => {
    if (onSaleCompleted) {
      // Extraer IDs únicos de productos vendidos
      const productIds = [...new Set(cartItems.map(item => item.product.id))];
      onSaleCompleted({ productIds });
    }
    onClose();
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ pointerEvents: 'auto' }}>
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ pointerEvents: 'auto' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">
            {isAddToCartMode ? 'Añadir al Carrito' : isDirectSaleMode ? 'Confirmar Venta' : 'Finalizar Venta'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Información del contenido */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          {isAddToCartMode && scannedItem ? (
            /* Información del producto escaneado */
            <div>
              <div className="flex items-center mb-3">
                {scannedItem.product.image_url && (
                  <img
                    src={scannedItem.product.image_url}
                    alt={scannedItem.product.name}
                    className="w-16 h-16 object-cover rounded-md mr-3"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-black text-lg">
                    {scannedItem.product.name}
                  </h3>
                  <p className="text-black text-sm">
                    Marca: {scannedItem.product.brand_name}
                  </p>
                </div>
              </div>
              
              {/* Stock Entry Details */}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">📦 Información del Lote</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-600">Lote ID:</p>
                    <p className="font-medium text-black">#{String(scannedItem.stockEntry.id).slice(-6)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Stock disponible:</p>
                    <p className="font-medium text-black">{scannedItem.stockEntry.current_quantity} unidades</p>
                  </div>
                  {scannedItem.stockEntry.barcode && (
                    <div>
                      <p className="text-gray-600">Código de barras:</p>
                      <p className="font-medium text-black">{scannedItem.stockEntry.barcode}</p>
                    </div>
                  )}
                  {scannedItem.stockEntry.expiration_date && (
                    <div>
                      <p className="text-gray-600">Fecha de vencimiento:</p>
                      <p className={`font-medium ${(() => {
                        const expirationDate = new Date(scannedItem.stockEntry.expiration_date!);
                        const today = new Date();
                        const diffDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays <= 0) return 'text-red-600';
                        if (diffDays <= 7) return 'text-orange-600';
                        if (diffDays <= 30) return 'text-yellow-600';
                        return 'text-green-600';
                      })()}`}>
                        {new Date(scannedItem.stockEntry.expiration_date).toLocaleDateString('es-CL')}
                      </p>
                      <p className={`text-xs ${(() => {
                        const expirationDate = new Date(scannedItem.stockEntry.expiration_date!);
                        const today = new Date();
                        const diffDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays <= 0) return 'text-red-600';
                        if (diffDays <= 7) return 'text-orange-600';
                        if (diffDays <= 30) return 'text-yellow-600';
                        return 'text-green-600';
                      })()}`}>
                        {(() => {
                          const expirationDate = new Date(scannedItem.stockEntry.expiration_date!);
                          const today = new Date();
                          const diffDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          if (diffDays <= 0) return 'Vencido';
                          if (diffDays === 1) return 'Vence mañana';
                          return `Vence en ${diffDays} días`;
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
                {/* Lot Selection Dropdown - Solo si hay múltiples lotes disponibles */}
              {scannedItem.stockEntries && scannedItem.stockEntries.length > 1 && (
                <div className="mt-3">
                  <label htmlFor="lotSelect" className="block text-sm font-medium text-gray-700 mb-1">
                    🔄 Seleccionar Lote Alternativo
                  </label>
                  <select
                    id="lotSelect"
                    value={selectedStockEntry?.id || scannedItem.stockEntry.id}
                    onChange={(e) => {
                      const selected = scannedItem.stockEntries!.find(lot => lot.id === e.target.value);
                      if (selected) {
                        setSelectedStockEntry(selected);
                        // Resetear cantidad si excede el nuevo stock
                        if (quantity > selected.current_quantity) {
                          setQuantity(selected.current_quantity);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white text-sm"
                  >
                    {scannedItem.stockEntries.map((lot: any, index) => {
                      const expirationText = lot.expiration_date 
                        ? `Vence: ${new Date(lot.expiration_date).toLocaleDateString('es-CL')}` 
                        : 'Sin vencimiento';
                      const priceText = formatAsCLP(lot.sale_price_unit);
                      return (
                        <option key={lot.id} value={lot.id}>
                          {index === 0 ? '⭐ ' : ''}{expirationText} - Stock: {lot.current_quantity} - {priceText}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    El lote marcado con ⭐ vence primero (FEFO)
                  </p>
                </div>
              )}

              {/* Expiration Warning */}
              {scannedItem.stockEntry.expiration_date && (() => {
                const expirationDate = new Date(scannedItem.stockEntry.expiration_date);
                const today = new Date();
                const diffDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 7) {
                  return (
                    <div className={`mt-3 p-3 rounded-lg ${
                      diffDays <= 0 ? 'bg-red-50 border border-red-200' : 
                      diffDays <= 3 ? 'bg-orange-50 border border-orange-200' : 
                      'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex items-center">
                        <svg className={`w-5 h-5 mr-2 ${
                          diffDays <= 0 ? 'text-red-600' : 
                          diffDays <= 3 ? 'text-orange-600' : 
                          'text-yellow-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className={`text-sm font-medium ${
                            diffDays <= 0 ? 'text-red-800' : 
                            diffDays <= 3 ? 'text-orange-800' : 
                            'text-yellow-800'
                          }`}>
                            {diffDays <= 0 ? '⚠️ Producto Vencido' : 
                             diffDays === 1 ? '⚠️ Vence Mañana' : 
                             `⚠️ Vence en ${diffDays} días`}
                          </p>
                          <p className={`text-xs ${
                            diffDays <= 0 ? 'text-red-600' : 
                            diffDays <= 3 ? 'text-orange-600' : 
                            'text-yellow-600'
                          }`}>
                            Verifique la fecha de vencimiento antes de vender
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Pricing Information */}
              <div className="mt-3 space-y-1">
                <p className="text-black text-sm">
                  Precio unitario: <span className="font-medium text-green-600">{formatAsCLP(scannedItem.stockEntry.sale_price_unit)}</span>
                </p>

              </div>


            </div>
          ) : isFinalizeSaleMode ? (
            /* Resumen del carrito */
            <div>
              <h3 className="font-semibold text-black text-lg mb-3">
                Resumen de la Venta
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {cartItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <span className="font-medium text-black">{item.product.name}</span>
                      <span className="text-gray-600 block">{item.product.brand_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-black">{item.quantity}x <span style={{color: '#000000'}}>{formatAsCLP(item.unitPrice)}</span></span>
                      <div className="font-medium text-black" style={{color: '#000000'}}>{formatAsCLP(item.totalPrice)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-300 mt-3 pt-3 flex justify-between items-center">
                <span className="font-semibold text-black">Total ({getTotalItems()} items):</span>
                <span className="font-bold text-lg text-black" style={{color: '#000000'}}>{formatAsCLP(getTotalAmount())}</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              No hay información disponible
            </div>
          )}
        </div>

        {/* Contenido principal: formulario o mensaje de éxito */}
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
                {isFinalizeSaleMode 
                  ? `Se han procesado ${cartItems.length} productos correctamente.`
                  : 'La venta se ha procesado correctamente.'
                }
              </p>
              <p className="text-sm text-green-600 mt-2">
                Ticket #{saleSuccess.saleId}
              </p>
            </div>

            {/* Opciones después de la venta */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => saleSuccess.saleId && handlePrintTicket(saleSuccess.saleId)}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
                </svg>
                Imprimir Ticket
              </button>

              <button
                type="button"
                onClick={handleCompleteSale}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continuar sin Imprimir
              </button>
            </div>
          </div>
        ) : (
          /* Formulario */
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAddToCartMode && (
              <>
                {/* Cantidad - solo para modo add-to-cart */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-black mb-1">
                    Cantidad *
                  </label>
                  <div className="flex items-center space-x-3" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 20 }}>
                    {/* Botón de disminuir */}
                    <button
                      type="button"
                      onClick={handleDecreaseQuantity}
                      onMouseEnter={() => console.log('Mouse enter en botón disminuir, disabled:', loading || quantity <= 1)}
                      disabled={loading || quantity <= 1 || isButtonPressed}
                      className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-md"
                      style={{ 
                        pointerEvents: 'auto', 
                        position: 'relative', 
                        zIndex: 30, 
                        cursor: (loading || quantity <= 1 || isButtonPressed) ? 'not-allowed' : 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>

                    {/* Input de cantidad - optimizado para móviles */}
                    <input
                      type="number"
                      id="quantity"
                      value={quantity === 0 ? '' : quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setQuantity(0); // Permitir campo vacío temporalmente
                        } else {
                          const numValue = parseInt(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setQuantity(numValue);
                          }
                        }
                      }}
                      min="1"
                      max={scannedItem?.stockEntry.current_quantity || 1}
                      required
                      disabled={loading}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black text-center no-spinner"
                      placeholder="1"
                      style={{
                        /* Eliminar iconos nativos de incremento/decremento en móviles */
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield'
                      }}
                      onWheel={(e) => e.currentTarget.blur()} // Prevenir cambios con scroll
                    />

                    {/* Botón de aumentar */}
                    <button
                      type="button"
                      onClick={handleIncreaseQuantity}
                      onMouseEnter={() => console.log('Mouse enter en botón aumentar, disabled:', loading || quantity >= (scannedItem?.stockEntry.current_quantity || 0))}
                      disabled={loading || quantity >= (scannedItem?.stockEntry.current_quantity || 0) || isButtonPressed}
                      className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-md"
                      style={{ 
                        pointerEvents: 'auto', 
                        position: 'relative', 
                        zIndex: 30, 
                        cursor: (loading || quantity >= (scannedItem?.stockEntry.current_quantity || 0) || isButtonPressed) ? 'not-allowed' : 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>

                  {/* Información de stock disponible */}
                  {scannedItem && (
                    <p className="text-xs text-gray-500 mt-1">
                      Stock disponible: {scannedItem.stockEntry.current_quantity} unidades
                    </p>
                  )}
                </div>

                {/* Formato de Venta - solo para modo add-to-cart */}
                <div>
                  <label htmlFor="saleFormat" className="block text-sm font-medium text-black mb-1">
                    Formato de Venta *
                  </label>
                  <select
                    id="saleFormat"
                    value={saleFormat}
                    onChange={(e) => setSaleFormat(e.target.value as 'unitario')}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                  >
                    <option value="unitario">Unitario - {scannedItem && formatAsCLP(scannedItem.stockEntry.sale_price_unit)}</option>
                  </select>
                </div>

                {/* Total para modo add-to-cart con información de wholesale pricing */}
                <div className="p-3 bg-blue-50 rounded-md">
                  {(() => {
                    const price = getPrice();
                    const total = price * quantity;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-black">Subtotal:</span>
                          <span className="font-bold text-lg text-black">{formatAsCLP(total)}</span>
                        </div>
                        
                        {saleFormat === 'unitario' && (
                          <div className="text-xs text-gray-600">
                            Precio por unidad: <span style={{color: '#000000'}}>{formatAsCLP(price)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || ((isAddToCartMode || isDirectSaleMode) && (quantity <= 0 || (scannedItem && quantity > scannedItem.stockEntry.current_quantity)))}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : (isAddToCartMode ? 'Añadir al Carrito' : isDirectSaleMode ? 'Confirmar Venta' : 'Finalizar Venta')}
              </button>
            </div>
          </form>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          {isAddToCartMode && 'Los campos marcados con * son obligatorios'}
        </p>
      </div>
    </div>
  );
}