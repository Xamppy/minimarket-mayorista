'use client';

import { useState, useEffect } from 'react';
import { addStockEntry, updateStockEntry } from '../actions';

interface StockEntryFormProps {
  productId: string;
  productName?: string;
  onStockEntryAdded?: () => void;
  editingStockEntry?: {
    id: string;
    current_quantity: number;
    barcode: string;
    purchase_price: number;
    sale_price_unit: number;
    sale_price_box: number;
    expiration_date?: string;
  };
  onCancelEdit?: () => void;
}

export default function StockEntryForm({ 
  productId, 
  productName, 
  onStockEntryAdded, 
  editingStockEntry, 
  onCancelEdit 
}: StockEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isEditing = !!editingStockEntry;

  useEffect(() => {
    // Pre-llenar el formulario cuando se esté editando
    if (editingStockEntry) {
      const form = document.getElementById('stock-entry-form') as HTMLFormElement;
      if (form) {
        (form.elements.namedItem('quantity') as HTMLInputElement).value = editingStockEntry.current_quantity.toString();
        (form.elements.namedItem('barcode') as HTMLInputElement).value = editingStockEntry.barcode;
        (form.elements.namedItem('purchasePrice') as HTMLInputElement).value = editingStockEntry.purchase_price.toString();
        (form.elements.namedItem('unitPrice') as HTMLInputElement).value = editingStockEntry.sale_price_unit.toString();
        (form.elements.namedItem('boxPrice') as HTMLInputElement).value = editingStockEntry.sale_price_box.toString();
        if (editingStockEntry.expiration_date) {
          (form.elements.namedItem('expirationDate') as HTMLInputElement).value = editingStockEntry.expiration_date;
        }
      }
    } else {
      // Limpiar el formulario cuando no se esté editando
      const form = document.getElementById('stock-entry-form') as HTMLFormElement;
      if (form) {
        form.reset();
      }
    }
  }, [editingStockEntry]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isEditing && editingStockEntry) {
        // Agregar el stockEntryId al formData para edición
        formData.append('stockEntryId', editingStockEntry.id);
        await updateStockEntry(formData);
        setSuccess('¡Lote actualizado exitosamente!');
        
        // Cancelar la edición después de actualizar
        if (onCancelEdit) {
          onCancelEdit();
        }
      } else {
        // Agregar el productId al formData para crear nuevo
        formData.append('productId', productId);
        await addStockEntry(formData);
        setSuccess('¡Stock agregado exitosamente!');
        
        // Limpiar el formulario
        const form = document.getElementById('stock-entry-form') as HTMLFormElement;
        if (form) {
          form.reset();
        }
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

  const handleCancel = () => {
    setError('');
    setSuccess('');
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {isEditing ? 'Editar Lote de Stock' : 'Añadir Stock'}
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

        {/* Botones de acción */}
        <div className="flex gap-3">
          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isEditing ? 'Actualizando...' : 'Agregando Stock...') : (isEditing ? 'Actualizar Lote' : 'Agregar Stock')}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Los campos marcados con * son obligatorios.<br/>
          {isEditing ? 'Esta acción actualizará el lote de stock seleccionado.' : 'Esta acción agregará stock al producto seleccionado.'}
        </p>
      </form>
    </div>
  );
} 