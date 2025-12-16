'use client';

import { useState, useEffect } from 'react';
import { addStockEntry, updateStockEntry } from '../actions';

// Función para prevenir cambios de valor en inputs numéricos al hacer scroll
const preventScrollChange = (e: WheelEvent) => {
  const target = e.target as HTMLInputElement;
  if (target.type === 'number' && document.activeElement === target) {
    e.preventDefault();
  }
};

interface StockEntryFormProps {
  productId: string;
  productName?: string;
  productBarcode?: string;
  onStockEntryAdded?: () => void;
  editingStockEntry?: {
    id: string;
    current_quantity: number;
    barcode: string;
    purchase_price: number | string | null;
    sale_price_unit: number | string | null;

    sale_price_wholesale?: number | string | null;
    expiration_date?: string;
  };
  onCancelEdit?: () => void;
}

export default function StockEntryForm({ 
  productId, 
  productName,
  productBarcode,
  onStockEntryAdded, 
  editingStockEntry, 
  onCancelEdit 
}: StockEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Wholesale pricing removed - not used anymore
  const [barcodeValue, setBarcodeValue] = useState(productBarcode || '');
  const isEditing = !!editingStockEntry;

  useEffect(() => {
    // Agregar event listener para prevenir cambios de scroll en inputs numéricos
    document.addEventListener('wheel', preventScrollChange, { passive: false });

    // Pre-llenar el formulario cuando se esté editando
    if (editingStockEntry) {
      const form = document.getElementById('stock-entry-form') as HTMLFormElement;
      if (form) {
        (form.elements.namedItem('quantity') as HTMLInputElement).value = editingStockEntry.current_quantity.toString();
        setBarcodeValue(editingStockEntry.barcode);
        (form.elements.namedItem('purchasePrice') as HTMLInputElement).value = (editingStockEntry.purchase_price ?? 0).toString();
        (form.elements.namedItem('unitPrice') as HTMLInputElement).value = (editingStockEntry.sale_price_unit ?? 0).toString();

        // Wholesale price field removed
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
      // Restaurar el barcode del producto
      setBarcodeValue(productBarcode || '');
    }

    // Cleanup function para remover el event listener
    return () => {
      document.removeEventListener('wheel', preventScrollChange);
    };
  }, [editingStockEntry, productBarcode]);

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

  // Wholesale price validation removed - feature deprecated

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {isEditing ? 'Editar Lote de Stock' : 'Añadir Stock'}
        {productName && <span className="text-gray-600 font-normal"> - {productName}</span>}
      </h3>
      
      <form id="stock-entry-form" action={handleSubmit} className="space-y-3">
        {/* Primera fila: Cantidad y Fecha de Vencimiento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900 text-center"
              placeholder="50"
            />
          </div>
          
          <div className="md:col-span-2">
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
        </div>

        {/* Segunda fila: Código de Barras (auto-rellenado del producto) */}
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
            Código de Barras {productBarcode ? '(del producto)' : '*'}
          </label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            required
            value={barcodeValue}
            onChange={(e) => setBarcodeValue(e.target.value)}
            readOnly={!!productBarcode && !isEditing}
            disabled={loading}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900 ${productBarcode && !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="Ej: 7790123456789"
          />
          {productBarcode && !isEditing && (
            <p className="text-xs text-green-600 mt-1">✓ Heredado del producto</p>
          )}
        </div>

        {/* Tercera fila: Precios (Compra y Unitario solamente) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
              Precio Compra *
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
          
          <div>
            <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Precio Unitario *
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
        </div>

        {/* Wholesale pricing info removed */}

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