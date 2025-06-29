'use client';

import { useState } from 'react';
import { formatAsCLP } from '@/lib/formatters';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  total_stock: number;
  image_url?: string | null;
}

interface CartItem {
  stockEntryId: string;
  product: Product;
  quantity: number;
  price: number;
}

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  cartItems?: CartItem[];
  onSaleCompleted: () => void;
}

export default function SaleModal({ 
  isOpen, 
  onClose, 
  product, 
  cartItems = [], 
  onSaleCompleted 
}: SaleModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [saleFormat, setSaleFormat] = useState<'unitario' | 'caja' | 'display' | 'pallet'>('unitario');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState<{ success: boolean; saleId?: string }>({ success: false });

  // Determinar si es venta individual o múltiple
  const isCartSale = cartItems.length > 0;
  const isSingleSale = product && !isCartSale;

  if (!isOpen) return null;

  const getTotalAmount = () => {
    if (isCartSale) {
      return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    return 0; // Para venta individual, no mostramos precio aquí
  };

  const getTotalItems = () => {
    if (isCartSale) {
      return cartItems.reduce((total, item) => total + item.quantity, 0);
    }
    return quantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isCartSale) {
        // Manejar venta múltiple del carrito
        await handleCartSale();
      } else if (isSingleSale) {
        // Manejar venta individual
        await handleSingleSale();
      } else {
        throw new Error('No hay productos para vender');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCartSale = async () => {
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

  const handleSingleSale = async () => {
    if (!product) throw new Error('No hay producto seleccionado');

    // Validaciones básicas
    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (quantity > product.total_stock) {
      setError(`Stock insuficiente. Solo hay ${product.total_stock} unidades disponibles.`);
      return;
    }

    // Crear FormData para venta individual
    const formData = new FormData();
    formData.append('productId', product.id);
    formData.append('quantity', quantity.toString());
    formData.append('saleFormat', saleFormat);

    const response = await fetch('/api/sales', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al procesar la venta');
    }

    setSaleSuccess({ success: true, saleId: result.saleId });
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
    onSaleCompleted();
    onClose();
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">
            {isCartSale ? 'Finalizar Venta' : 'Vender Producto'}
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
          {isCartSale ? (
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
          ) : isSingleSale ? (
            /* Información del producto individual */
            <div>
              <h3 className="font-semibold text-black text-lg mb-1">
                {product.name}
              </h3>
              <p className="text-black text-sm mb-2">
                Marca: {product.brand_name}
              </p>
              <p className="text-black text-sm">
                Stock disponible: <span className="font-medium">{product.total_stock} unidades</span>
              </p>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              No hay productos para vender
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
                {isCartSale 
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
          /* Formulario de venta */
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSingleSale && (
              <>
                {/* Cantidad - solo para venta individual */}
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
                    max={product?.total_stock || 1}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                    placeholder="1"
                  />
                </div>

                {/* Formato de Venta - solo para venta individual */}
                <div>
                  <label htmlFor="saleFormat" className="block text-sm font-medium text-black mb-1">
                    Formato de Venta *
                  </label>
                  <select
                    id="saleFormat"
                    value={saleFormat}
                    onChange={(e) => setSaleFormat(e.target.value as 'unitario' | 'caja' | 'display' | 'pallet')}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                  >
                    <option value="unitario">Unitario</option>
                    <option value="caja">Caja</option>
                    <option value="display">Display</option>
                    <option value="pallet">Pallet</option>
                  </select>
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
                disabled={loading || (isSingleSale && (quantity <= 0 || quantity > (product?.total_stock || 0))) || (!isSingleSale && !isCartSale)}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : (isCartSale ? 'Confirmar Venta' : 'Confirmar Venta')}
              </button>
            </div>
          </form>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          {isSingleSale && 'Los campos marcados con * son obligatorios'}
        </p>
      </div>
    </div>
  );
} 