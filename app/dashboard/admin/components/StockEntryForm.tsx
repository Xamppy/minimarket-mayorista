'use client';

import { useState } from 'react';
import { addStockEntry } from '../actions';

interface StockEntryFormProps {
  productId: string;
  productName?: string;
  onStockEntryAdded?: () => void;
}

export default function StockEntryForm({ productId, productName, onStockEntryAdded }: StockEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    // Agregar el productId al formData
    formData.append('productId', productId);

    try {
      await addStockEntry(formData);
      setSuccess('¡Stock agregado exitosamente!');
      
      // Limpiar el formulario
      const form = document.getElementById('stock-entry-form') as HTMLFormElement;
      if (form) {
        form.reset();
      }

      // Llamar al callback si existe
      if (onStockEntryAdded) {
        onStockEntryAdded();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Añadir Stock
        {productName && <span className="text-gray-600 font-normal"> - {productName}</span>}
      </h3>
      
      <form id="stock-entry-form" action={handleSubmit} className="space-y-4">
        {/* Cantidad */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad *
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            required
            min="1"
            step="1"
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
            placeholder="Ej: 50"
          />
        </div>

        {/* Código de Barras */}
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
            Código de Barras *
          </label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            required
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
            placeholder="Ej: 7790123456789"
          />
        </div>

        {/* Precio de Compra */}
        <div>
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
            Precio de Compra *
          </label>
          <input
            type="number"
            id="purchasePrice"
            name="purchasePrice"
            required
            min="0"
            step="0.01"
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Precio de Venta Unitario */}
          <div>
            <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Precio de Venta Unitario *
            </label>
            <input
              type="number"
              id="unitPrice"
              name="unitPrice"
              required
              min="0"
              step="0.01"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
              placeholder="0.00"
            />
          </div>

          {/* Precio de Venta por Caja */}
          <div>
            <label htmlFor="boxPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Precio de Venta por Caja *
            </label>
            <input
              type="number"
              id="boxPrice"
              name="boxPrice"
              required
              min="0"
              step="0.01"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Fecha de Vencimiento */}
        <div>
          <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Vencimiento (opcional)
          </label>
          <input
            type="date"
            id="expirationDate"
            name="expirationDate"
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
          />
        </div>

        {/* Mensajes de error y éxito */}
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
            {success}
          </div>
        )}

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Agregando Stock...' : 'Agregar Stock'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Los campos marcados con * son obligatorios.<br/>
          Esta acción agregará stock al producto seleccionado.
        </p>
      </form>
    </div>
  );
} 