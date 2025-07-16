'use client';

import { useState, useEffect } from 'react';
import StockEntryForm from './StockEntryForm';
import { deleteStockEntry } from '../actions';

interface StockEntry {
  id: number;
  product_id: number;
  initial_quantity: number;
  current_quantity: number;
  barcode: string;
  purchase_price: number;
  sale_price_unit: number;
  sale_price_box: number;
  sale_price_wholesale?: number;
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
  const [error, setError] = useState('');
  const [editingStockEntry, setEditingStockEntry] = useState<StockEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStockEntries = async () => {
    if (!productId) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/stock-entries?productId=${productId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStockEntries(data);
    } catch (error) {
      console.error('Error fetching stock entries:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar las entradas de stock');
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

  const handleEditStock = (stockEntry: StockEntry) => {
    setEditingStockEntry(stockEntry);
  };

  const handleCancelEdit = () => {
    setEditingStockEntry(null);
  };

  const handleDeleteStock = async (stockEntry: StockEntry) => {
    // Mostrar confirmación antes de eliminar
    const confirmMessage = `¿Estás seguro de eliminar este lote de ${productName} con ${stockEntry.current_quantity} unidades y código ${stockEntry.barcode}?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingId(stockEntry.id.toString());
    
    try {
      await deleteStockEntry(stockEntry.id.toString());
      await fetchStockEntries(); // Refrescar la lista después de eliminar
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el lote';
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
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
            editingStockEntry={editingStockEntry ? {
              id: editingStockEntry.id.toString(),
              current_quantity: editingStockEntry.current_quantity,
              barcode: editingStockEntry.barcode,
              purchase_price: editingStockEntry.purchase_price,
              sale_price_unit: editingStockEntry.sale_price_unit,
              sale_price_box: editingStockEntry.sale_price_box,
              sale_price_wholesale: editingStockEntry.sale_price_wholesale,
              expiration_date: editingStockEntry.expiration_date
            } : undefined}
            onCancelEdit={handleCancelEdit}
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
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error al cargar el stock</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <p className="text-gray-600">Cargando entradas de stock...</p>
          ) : error ? (
            <div className="text-center py-8">
              <button
                onClick={fetchStockEntries}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reintentar
              </button>
            </div>
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
                      Precio Mayorista
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Fecha de Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Acciones
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
                        {entry.sale_price_wholesale ? (
                          <span className="text-purple-600 font-medium">
                            ${entry.sale_price_wholesale.toFixed(2)}
                            <span className="text-xs text-gray-500 ml-1">(3+ unidades)</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleEditStock(entry)}
                            disabled={deletingId === entry.id.toString()}
                            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteStock(entry)}
                            disabled={deletingId === entry.id.toString()}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === entry.id.toString() ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
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