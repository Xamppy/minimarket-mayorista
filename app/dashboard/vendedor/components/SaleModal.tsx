'use client';

import { useState } from 'react';
import { formatAsCLP } from '@/lib/formatters';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  brand_name: string;
  total_stock: number;
  type_name?: string;
}

interface CartItem {
  stockEntryId: string;
  product: Product;
  quantity: number;
  price: number;
}

interface ScannedItem {
  product: Product;
  stockEntry: {
    id: string;
    sale_price_unit: number;
    sale_price_box: number;
    current_quantity: number;
  };
}

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add-to-cart-from-scan' | 'finalize-sale';
  // Para modo add-to-cart-from-scan
  scannedItem?: ScannedItem;
  onItemAddedToCart?: (item: {
    product: Product;
    stockEntryId: string;
    quantity: number;
    saleFormat: 'unitario' | 'caja';
    price: number;
  }) => void;
  // Para modo finalize-sale  
  cartItems?: CartItem[];
  onSaleCompleted?: () => void;
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
  const [saleFormat, setSaleFormat] = useState<'unitario' | 'caja'>('unitario');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState<{ success: boolean; saleId?: string }>({ success: false });

  // Determinar modo de operación
  const isAddToCartMode = mode === 'add-to-cart-from-scan';
  const isFinalizeSaleMode = mode === 'finalize-sale';

  if (!isOpen) return null;

  const getPrice = () => {
    if (!isAddToCartMode || !scannedItem) return 0;
    
    switch (saleFormat) {
      case 'unitario':
        return scannedItem.stockEntry.sale_price_unit;
      case 'caja':
        return scannedItem.stockEntry.sale_price_box;
      default:
        return scannedItem.stockEntry.sale_price_unit;
    }
  };

  const getTotalAmount = () => {
    if (isFinalizeSaleMode) {
      return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
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

    // Validaciones
    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (quantity > scannedItem.stockEntry.current_quantity) {
      setError(`Stock insuficiente. Solo hay ${scannedItem.stockEntry.current_quantity} unidades disponibles.`);
      return;
    }

    // Llamar al callback para añadir al carrito
    onItemAddedToCart({
      product: scannedItem.product,
      stockEntryId: scannedItem.stockEntry.id,
      quantity,
      saleFormat,
      price: getPrice()
    });

    // Cerrar modal y resetear
    resetForm();
    onClose();
  };

  const handleFinalizeSale = async () => {
    if (cartItems.length === 0) {
      throw new Error('No hay productos en el carrito');
    }

    // Crear múltiples ventas para cada item del carrito
    const salePromises = cartItems.map(async (item) => {
      const formData = new FormData();
      formData.append('productId', item.product.id);
      formData.append('stockEntryId', item.stockEntryId);
      formData.append('quantity', item.quantity.toString());
      formData.append('saleFormat', 'unitario');
      formData.append('price', item.price.toString());

      const response = await fetch('/api/sales', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error al procesar la venta de ${item.product.name}`);
      }

      return result;
    });

    const results = await Promise.all(salePromises);
    
    // Tomar el ID de la primera venta para el ticket
    const firstSaleId = results[0]?.saleId;
    setSaleSuccess({ success: true, saleId: firstSaleId });
  };

  const resetForm = () => {
    setQuantity(1);
    setSaleFormat('unitario');
    setError('');
    setSaleSuccess({ success: false });
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
      onSaleCompleted();
    }
    onClose();
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">
            {isAddToCartMode ? 'Añadir al Carrito' : 'Finalizar Venta'}
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
              <p className="text-black text-sm">
                Stock disponible: <span className="font-medium">{scannedItem.stockEntry.current_quantity} unidades</span>
              </p>
              <p className="text-black text-sm">
                Precio unitario: <span className="font-medium text-green-600">{formatAsCLP(scannedItem.stockEntry.sale_price_unit)}</span>
              </p>
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
                      <span className="text-black">{item.quantity}x {formatAsCLP(item.price)}</span>
                      <div className="font-medium text-black">{formatAsCLP(item.price * item.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-300 mt-3 pt-3 flex justify-between items-center">
                <span className="font-semibold text-black">Total ({getTotalItems()} items):</span>
                <span className="font-bold text-lg text-black">{formatAsCLP(getTotalAmount())}</span>
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
                  <input
                    type="number"
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    min="1"
                    max={scannedItem?.stockEntry.current_quantity || 1}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                    placeholder="1"
                  />
                </div>

                {/* Formato de Venta - solo para modo add-to-cart */}
                <div>
                  <label htmlFor="saleFormat" className="block text-sm font-medium text-black mb-1">
                    Formato de Venta *
                  </label>
                  <select
                    id="saleFormat"
                    value={saleFormat}
                    onChange={(e) => setSaleFormat(e.target.value as 'unitario' | 'caja')}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                  >
                    <option value="unitario">Unitario - {scannedItem && formatAsCLP(scannedItem.stockEntry.sale_price_unit)}</option>
                    <option value="caja">Caja - {scannedItem && formatAsCLP(scannedItem.stockEntry.sale_price_box)}</option>
                  </select>
                </div>

                {/* Total para modo add-to-cart */}
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-black">Subtotal:</span>
                    <span className="font-bold text-lg text-black">{formatAsCLP(getTotalAmount())}</span>
                  </div>
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
                disabled={loading || (isAddToCartMode && (quantity <= 0 || (scannedItem && quantity > scannedItem.stockEntry.current_quantity)))}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : (isAddToCartMode ? 'Añadir al Carrito' : 'Confirmar Venta')}
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