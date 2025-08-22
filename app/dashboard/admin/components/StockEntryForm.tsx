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
  onStockEntryAdded, 
  editingStockEntry, 
  onCancelEdit 
}: StockEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wholesalePriceError, setWholesalePriceError] = useState('');
  const isEditing = !!editingStockEntry;

  useEffect(() => {
    // Agregar event listener para prevenir cambios de scroll en inputs numéricos
    document.addEventListener('wheel', preventScrollChange, { passive: false });

    // Pre-llenar el formulario cuando se esté editando
    if (editingStockEntry) {
      const form = document.getElementById('stock-entry-form') as HTMLFormElement;
      if (form) {
        (form.elements.namedItem('quantity') as HTMLInputElement).value = editingStockEntry.current_quantity.toString();
        (form.elements.namedItem('barcode') as HTMLInputElement).value = editingStockEntry.barcode;
        (form.elements.namedItem('purchasePrice') as HTMLInputElement).value = (editingStockEntry.purchase_price ?? 0).toString();
        (form.elements.namedItem('unitPrice') as HTMLInputElement).value = (editingStockEntry.sale_price_unit ?? 0).toString();

        if (editingStockEntry.sale_price_wholesale) {
          (form.elements.namedItem('wholesalePrice') as HTMLInputElement).value = (editingStockEntry.sale_price_wholesale ?? 0).toString();
        }
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

    // Cleanup function para remover el event listener
    return () => {
      document.removeEventListener('wheel', preventScrollChange);
    };
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
    setWholesalePriceError('');
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  // Validación en tiempo real del precio mayorista
  const validateWholesalePriceInput = () => {
    const form = document.getElementById('stock-entry-form') as HTMLFormElement;
    if (!form) return;

    const wholesalePrice = (form.elements.namedItem('wholesalePrice') as HTMLInputElement)?.value;
    const unitPrice = (form.elements.namedItem('unitPrice') as HTMLInputElement)?.value;
    const purchasePrice = (form.elements.namedItem('purchasePrice') as HTMLInputElement)?.value;

    // Limpiar error anterior
    setWholesalePriceError('');

    // Si no hay precio mayorista, no validar
    if (!wholesalePrice || wholesalePrice.trim() === '') {
      return;
    }

    const wholesalePriceNum = parseFloat(wholesalePrice);
    const unitPriceNum = parseFloat(unitPrice);
    const purchasePriceNum = parseFloat(purchasePrice);

    // Validaciones básicas
    if (isNaN(wholesalePriceNum) || wholesalePriceNum <= 0) {
      setWholesalePriceError('El precio mayorista debe ser un número mayor a 0');
      return;
    }

    if (wholesalePriceNum > 999999.99) {
      setWholesalePriceError('El precio mayorista no puede exceder $999,999.99');
      return;
    }

    // Validaciones de lógica de negocio (solo si los otros precios están disponibles)
    if (unitPriceNum && wholesalePriceNum >= unitPriceNum) {
      setWholesalePriceError('El precio mayorista debe ser menor al precio unitario para ofrecer un descuento');
      return;
    }

    if (purchasePriceNum && wholesalePriceNum <= purchasePriceNum) {
      setWholesalePriceError('El precio mayorista debe ser mayor al precio de compra para mantener rentabilidad');
      return;
    }

    if (purchasePriceNum && wholesalePriceNum < purchasePriceNum * 1.05) {
      const minimumPrice = (purchasePriceNum * 1.05).toFixed(2);
      setWholesalePriceError(`El precio mayorista debe ser al menos $${minimumPrice} para mantener un margen mínimo del 5%`);
      return;
    }
  };

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

        {/* Segunda fila: Código de Barras */}
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

        {/* Tercera fila: Precios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          
          <div>
            <label htmlFor="wholesalePrice" className="block text-sm font-medium text-gray-700 mb-1">
              Precio Mayorista
              <span className="text-xs text-gray-500 ml-1">(3+ unid.)</span>
            </label>
            <input
              type="number"
              id="wholesalePrice"
              name="wholesalePrice"
              min="0"
              step="0.01"
              disabled={loading}
              onChange={validateWholesalePriceInput}
              onBlur={validateWholesalePriceInput}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900 ${
                wholesalePriceError 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-indigo-500'
              }`}
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Mensajes de error y ayuda para precio mayorista */}
        {wholesalePriceError && (
          <div className="text-red-600 text-xs bg-red-50 p-2 rounded-md">
            ⚠️ {wholesalePriceError}
          </div>
        )}
        
        {!wholesalePriceError && (
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-md">
            💡 El precio mayorista se aplica automáticamente para compras de 3+ unidades
          </div>
        )}

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