'use client';

import { useState } from 'react';
import { formatAsCLP } from '@/lib/formatters';
import { calculateUnifiedPricing } from '@/lib/unified-pricing-service';
import { StockEntry } from '@/lib/cart-types';
import WholesalePricingIndicator from './WholesalePricingIndicator';

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
  saleFormat: 'unitario' | 'caja' | 'display' | 'pallet';
  unitPrice: number;
  boxPrice?: number;
  wholesalePrice?: number;
  appliedPrice: number;
  appliedPriceType: 'unit' | 'box' | 'wholesale';
  totalPrice: number;
  savings?: number;
}

interface ScannedItem {
  product: Product;
  stockEntry: {
    id: string;
    sale_price_unit: number;
    sale_price_box: number;
    sale_price_wholesale?: number;
    current_quantity: number;
    expiration_date?: string | null;
    barcode?: string;
    purchase_price?: number;
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
    
    // Crear stock entry para el cálculo unificado
    const stockEntry: StockEntry = {
      id: scannedItem.stockEntry.id,
      product_id: scannedItem.product.id,
      barcode: '',
      current_quantity: scannedItem.stockEntry.current_quantity,
      initial_quantity: scannedItem.stockEntry.current_quantity,
      expiration_date: null,
      created_at: new Date().toISOString(),
      purchase_price: 0,
      sale_price_unit: scannedItem.stockEntry.sale_price_unit,
      sale_price_box: scannedItem.stockEntry.sale_price_box,
      sale_price_wholesale: scannedItem.stockEntry.sale_price_wholesale || null
    };
    
    const pricingInfo = calculateUnifiedPricing(stockEntry, quantity, saleFormat);
    return pricingInfo.appliedPrice;
  };

  const getPricingInfo = () => {
    if (!isAddToCartMode || !scannedItem) return null;
    
    // Crear stock entry para el cálculo unificado
    const stockEntry: StockEntry = {
      id: scannedItem.stockEntry.id,
      product_id: scannedItem.product.id,
      barcode: '',
      current_quantity: scannedItem.stockEntry.current_quantity,
      initial_quantity: scannedItem.stockEntry.current_quantity,
      expiration_date: null,
      created_at: new Date().toISOString(),
      purchase_price: 0,
      sale_price_unit: scannedItem.stockEntry.sale_price_unit,
      sale_price_box: scannedItem.stockEntry.sale_price_box,
      sale_price_wholesale: scannedItem.stockEntry.sale_price_wholesale || null
    };
    
    const pricingInfo = calculateUnifiedPricing(stockEntry, quantity, saleFormat);
    
    // Convertir a formato compatible con la UI existente
    return {
      applicablePrice: pricingInfo.appliedPrice,
      priceType: pricingInfo.priceType,
      totalPrice: pricingInfo.totalPrice,
      savings: pricingInfo.savings
    };
  };

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
      formData.append('price', item.appliedPrice.toString());

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
                {scannedItem.stockEntry.sale_price_wholesale && (
                  <p className="text-black text-sm">
                    Precio mayorista: <span className="font-medium text-purple-600">{formatAsCLP(scannedItem.stockEntry.sale_price_wholesale)}</span>
                    <span className="text-xs text-gray-500 ml-1">(3+ unidades)</span>
                  </p>
                )}
              </div>

              {/* Wholesale Pricing Indicator */}
              {scannedItem.stockEntry.sale_price_wholesale && (
                <div className="mt-3">
                  <WholesalePricingIndicator
                    unitPrice={scannedItem.stockEntry.sale_price_unit}
                    wholesalePrice={scannedItem.stockEntry.sale_price_wholesale}
                    currentQuantity={quantity}
                    wholesaleThreshold={3}
                    size="medium"
                    showSavings={true}
                  />
                </div>
              )}
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
                      <span className="text-black">{item.quantity}x {formatAsCLP(item.appliedPrice)}</span>
                      <div className="font-medium text-black">{formatAsCLP(item.totalPrice)}</div>
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
                  <div className="flex items-center space-x-3">
                    {/* Botón de disminuir */}
                    <button
                      type="button"
                      onClick={() => {
                        if (quantity > 1) {
                          setQuantity(quantity - 1);
                        }
                      }}
                      disabled={loading || quantity <= 1}
                      className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>

                    {/* Input de cantidad */}
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black text-center"
                      placeholder="1"
                    />

                    {/* Botón de aumentar */}
                    <button
                      type="button"
                      onClick={() => {
                        const maxQuantity = scannedItem?.stockEntry.current_quantity || 1;
                        if (quantity < maxQuantity) {
                          setQuantity(quantity + 1);
                        }
                      }}
                      disabled={loading || quantity >= (scannedItem?.stockEntry.current_quantity || 1)}
                      className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    onChange={(e) => setSaleFormat(e.target.value as 'unitario' | 'caja')}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                  >
                    <option value="unitario">Unitario - {scannedItem && formatAsCLP(scannedItem.stockEntry.sale_price_unit)}</option>
                    <option value="caja">Caja - {scannedItem && formatAsCLP(scannedItem.stockEntry.sale_price_box)}</option>
                  </select>
                </div>

                {/* Total para modo add-to-cart con información de wholesale pricing */}
                <div className="p-3 bg-blue-50 rounded-md">
                  {(() => {
                    const pricingInfo = getPricingInfo();
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-black">Subtotal:</span>
                          <span className="font-bold text-lg text-black">{formatAsCLP(getTotalAmount())}</span>
                        </div>
                        
                        {pricingInfo && pricingInfo.priceType === 'wholesale' && pricingInfo.savings > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-purple-600 font-medium">
                              🎉 Precio Mayorista Aplicado
                            </span>
                            <span className="text-green-600 font-medium">
                              Ahorro: {formatAsCLP(pricingInfo.savings)}
                            </span>
                          </div>
                        )}
                        
                        {pricingInfo && saleFormat === 'unitario' && (
                          <div className="text-xs text-gray-600">
                            Precio por unidad: {formatAsCLP(pricingInfo.applicablePrice)}
                            {pricingInfo.priceType === 'wholesale' && (
                              <span className="text-purple-600 ml-1">(mayorista)</span>
                            )}
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