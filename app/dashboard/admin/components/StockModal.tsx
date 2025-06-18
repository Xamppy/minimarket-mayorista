'use client';

import { useState, useEffect } from 'react';
import StockEntryForm from './StockEntryForm';

interface StockEntry {
  id: number;
  product_id: number;
  initial_quantity: number;
  current_quantity: number;
  barcode: string;
  purchase_price: number;
  sale_price_unit: number;
  sale_price_box: number;
  expiration_date: string;
  created_at: string;
}

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function StockModal({ isOpen, onClose, productId, productName }: StockModalProps) {
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStockEntries = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/stock-entries?productId=${productId}`);
      const data = await response.json();
      setStockEntries(data);
    } catch (error) {
      console.error('Error fetching stock entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && productId) {
      fetchStockEntries();
    }
  }, [isOpen, productId]);

  if (!isOpen) return null;

  const handleStockEntryAdded = () => {
    fetchStockEntries(); // Refrescar la lista cuando se agregue una nueva entrada
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Gestionar Stock - {productName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Formulario de entrada de stock */}
        <div className="mb-8">
          <StockEntryForm 
            productId={productId}
            productName={productName}
            onStockEntryAdded={handleStockEntryAdded}
          />
        </div>

        {/* Resumen de stock */}
        {stockEntries.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-black mb-2">Resumen de Stock</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Stock Total Actual</p>
                <p className="text-2xl font-bold text-green-600">
                  {stockEntries.reduce((sum, entry) => sum + entry.current_quantity, 0)} unidades
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Stock Inicial Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stockEntries.reduce((sum, entry) => sum + entry.initial_quantity, 0)} unidades
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Entradas de Stock</p>
                <p className="text-2xl font-bold text-gray-700">
                  {stockEntries.length} registros
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista de entradas de stock existentes */}
        <div>
          <h3 className="text-lg font-semibold text-black mb-4">Historial de Entradas de Stock</h3>
          
          {loading ? (
            <p className="text-gray-600">Cargando entradas de stock...</p>
          ) : stockEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Fecha de Entrada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Cantidad Inicial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Cantidad Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Código de Barras
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Precio Compra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Precio Venta Unit.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Precio Venta Caja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Fecha de Vencimiento
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {new Date(entry.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        <span className="font-medium">{entry.initial_quantity}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        <span className={`font-medium ${entry.current_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.current_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-mono">
                        {entry.barcode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        <span className="text-blue-600 font-medium">${entry.purchase_price.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        <span className="text-green-600 font-medium">${entry.sale_price_unit.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        <span className="text-green-600 font-medium">${entry.sale_price_box.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {entry.expiration_date ? (
                          <span className={`font-medium ${
                            new Date(entry.expiration_date) < new Date() 
                              ? 'text-red-600' 
                              : new Date(entry.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                          }`}>
                            {new Date(entry.expiration_date).toLocaleDateString('es-ES')}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No hay entradas de stock para este producto.</p>
          )}
        </div>
      </div>
    </div>
  );
} 