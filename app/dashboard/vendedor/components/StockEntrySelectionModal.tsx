'use client';

import { useState, useEffect } from 'react';
import { formatAsCLP } from '@/lib/formatters';
import { calculateUnifiedPricing, getWholesalePricingInfo, validateQuantity } from '@/lib/unified-pricing-service';
import { Product, StockEntry } from '@/lib/cart-types';

interface StockEntrySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onStockEntrySelected: (stockEntry: StockEntry, quantity: number, saleFormat: 'unitario' | 'caja') => void;
}

export default function StockEntrySelectionModal({
  isOpen,
  onClose,
  product,
  onStockEntrySelected
}: StockEntrySelectionModalProps) {
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [selectedStockEntry, setSelectedStockEntry] = useState<StockEntry | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saleFormat, setSaleFormat] = useState<'unitario' | 'caja'>('unitario');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch stock entries when modal opens
  useEffect(() => {
    if (isOpen && product.id) {
      fetchStockEntries();
    }
  }, [isOpen, product.id]);

  const fetchStockEntries = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching stock entries for product:', product.id);
      const response = await fetch(`/api/products/${product.id}/stock-entries`);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener stock entries');
      }
      
      if (data.stockEntries && data.stockEntries.length > 0) {
        // Sort by FIFO logic (expiration date, then entry date)
        const sortedEntries = data.stockEntries.sort((a: StockEntry, b: StockEntry) => {
          // First by expiration date (nulls last)
          if (a.expiration_date && b.expiration_date) {
            return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
          }
          if (a.expiration_date && !b.expiration_date) return -1;
          if (!a.expiration_date && b.expiration_date) return 1;
          
          // Then by created_at date (oldest first)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        setStockEntries(sortedEntries);
        setSelectedStockEntry(sortedEntries[0]); // Auto-select first (FIFO recommended)
      } else {
        setError('No hay stock disponible para este producto');
      }
    } catch (err) {
      console.error('Error fetching stock entries:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar stock entries');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const getDaysUntilExpiration = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationStatus = (expirationDate: string | null) => {
    const days = getDaysUntilExpiration(expirationDate);
    if (days === null) return { color: 'text-gray-500', text: 'Sin vencimiento' };
    if (days <= 0) return { color: 'text-red-600', text: 'Vencido' };
    if (days <= 7) return { color: 'text-orange-600', text: `Vence en ${days} días` };
    if (days <= 30) return { color: 'text-yellow-600', text: `Vence en ${days} días` };
    return { color: 'text-green-600', text: `Vence en ${days} días` };
  };

  const getPricingInfo = () => {
    if (!selectedStockEntry) return null;
    return calculateUnifiedPricing(selectedStockEntry, quantity, saleFormat);
  };

  const getValidation = () => {
    if (!selectedStockEntry) return null;
    return validateQuantity(selectedStockEntry, quantity);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStockEntry) {
      setError('Debe seleccionar un lote de stock');
      return;
    }
    
    const validation = getValidation();
    if (!validation?.isValid) {
      setError(validation?.errors.join(', ') || 'Cantidad inválida');
      return;
    }
    
    onStockEntrySelected(selectedStockEntry, quantity, saleFormat);
    handleClose();
  };

  const handleClose = () => {
    setSelectedStockEntry(null);
    setQuantity(1);
    setSaleFormat('unitario');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const pricingInfo = getPricingInfo();
  const validation = getValidation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">
            Seleccionar Lote de Stock
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Product Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-md mr-4"
              />
            )}
            <div>
              <h3 className="font-semibold text-black text-lg">{product.name}</h3>
              <p className="text-gray-600">Marca: {product.brand_name}</p>
              <p className="text-gray-600">Stock total: {product.total_stock} unidades</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando lotes de stock...</p>
          </div>
        ) : error ? (
          <div className="text-red-600 bg-red-50 p-4 rounded-md mb-6">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stock Entry Selection */}
            <div>
              <label className="block text-sm font-medium text-black mb-3">
                Seleccionar Lote de Stock *
              </label>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {stockEntries.map((entry, index) => {
                  const wholesaleInfo = getWholesalePricingInfo(entry);
                  const expirationStatus = getExpirationStatus(entry.expiration_date);
                  const isRecommended = index === 0; // First one is FIFO recommended
                  
                  return (
                    <div
                      key={entry.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedStockEntry?.id === entry.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedStockEntry(entry)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <input
                              type="radio"
                              checked={selectedStockEntry?.id === entry.id}
                              onChange={() => setSelectedStockEntry(entry)}
                              className="text-blue-600"
                            />
                            <span className="font-medium text-black">
                              Lote #{String(entry.id).slice(-6)}
                            </span>
                            {isRecommended && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                Recomendado (FIFO)
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Cantidad disponible:</p>
                              <p className="font-medium text-black">{entry.current_quantity} unidades</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Código de barras:</p>
                              <p className="font-medium text-black">{entry.barcode}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Fecha de vencimiento:</p>
                              <p className={`font-medium ${expirationStatus.color}`}>
                                {formatDate(entry.expiration_date)}
                              </p>
                              <p className={`text-xs ${expirationStatus.color}`}>
                                {expirationStatus.text}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Fecha de ingreso:</p>
                              <p className="font-medium text-black">{formatDate(entry.created_at)}</p>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-gray-600">Precio unitario:</p>
                                <p className="font-medium text-green-600">{formatAsCLP(entry.sale_price_unit)}</p>
                              </div>
                              {wholesaleInfo.hasWholesalePrice && (
                                <div>
                                  <p className="text-sm text-gray-600">Precio mayorista (3+):</p>
                                  <p className="font-medium text-purple-600">
                                    {formatAsCLP(wholesaleInfo.wholesalePrice!)}
                                    <span className="text-xs text-gray-500 ml-1">
                                      (Ahorro: {formatAsCLP(wholesaleInfo.potentialSavings!)})
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedStockEntry && (
              <>
                {/* Quantity Selection */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-black mb-1">
                    Cantidad *
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    
                    <input
                      type="number"
                      id="quantity"
                      value={quantity === 0 ? '' : quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setQuantity(0);
                        } else {
                          const numValue = parseInt(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setQuantity(numValue);
                          }
                        }
                      }}
                      min="1"
                      max={selectedStockEntry.current_quantity}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-center"
                      placeholder="1"
                    />
                    
                    <button
                      type="button"
                      onClick={() => quantity < selectedStockEntry.current_quantity && setQuantity(quantity + 1)}
                      disabled={quantity >= selectedStockEntry.current_quantity}
                      className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                  
                  {validation && (
                    <div className="mt-2">
                      {validation.warnings.map((warning, index) => (
                        <p key={index} className="text-xs text-amber-600">{warning}</p>
                      ))}
                      {validation.errors.map((error, index) => (
                        <p key={index} className="text-xs text-red-600">{error}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sale Format */}
                <div>
                  <label htmlFor="saleFormat" className="block text-sm font-medium text-black mb-1">
                    Formato de Venta *
                  </label>
                  <select
                    id="saleFormat"
                    value={saleFormat}
                    onChange={(e) => setSaleFormat(e.target.value as 'unitario' | 'caja')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="unitario">Unitario - {formatAsCLP(selectedStockEntry.sale_price_unit)}</option>
                    <option value="caja">Caja - {formatAsCLP(selectedStockEntry.sale_price_box)}</option>
                  </select>
                </div>

                {/* Pricing Summary */}
                {pricingInfo && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-black">Subtotal:</span>
                        <span className="font-bold text-lg text-black">{formatAsCLP(pricingInfo.totalPrice)}</span>
                      </div>
                      
                      {pricingInfo.priceType === 'wholesale' && pricingInfo.savings > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-purple-600 font-medium">
                            🎉 Precio Mayorista Aplicado
                          </span>
                          <span className="text-green-600 font-medium">
                            Ahorro: {formatAsCLP(pricingInfo.savings)}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-600">
                        Precio por unidad: {formatAsCLP(pricingInfo.appliedPrice)}
                        {pricingInfo.priceType === 'wholesale' && (
                          <span className="text-purple-600 ml-1">(mayorista)</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedStockEntry || !validation?.isValid}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Añadir al Carrito
              </button>
            </div>
          </form>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          Los campos marcados con * son obligatorios
        </p>
      </div>
    </div>
  );
}