'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProductType, updateProductType } from '../actions';

interface ProductType {
  id: string;
  name: string;
  created_at: string;
}

interface ProductTypeFormProps {
  productType?: ProductType; // Si se pasa, es modo edición
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ProductTypeForm({ productType, onSuccess, onCancel }: ProductTypeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState(productType?.name || '');

  const isEditMode = !!productType;

  // Validación del lado del cliente
  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'El nombre del tipo de producto es requerido';
    }
    if (value.trim().length < 1 || value.trim().length > 100) {
      return 'El nombre debe tener entre 1 y 100 caracteres';
    }
    return '';
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    // Validación del lado del cliente
    const nameValue = formData.get('name') as string;
    const nameError = validateName(nameValue);
    
    if (nameError) {
      setError(nameError);
      setLoading(false);
      return;
    }

    try {
      if (isEditMode) {
        // Agregar el ID del tipo de producto para actualización
        formData.append('typeId', productType.id);
        await updateProductType(formData);
        setSuccess('¡Tipo de producto actualizado exitosamente!');
      } else {
        await createProductType(formData);
        setSuccess('¡Tipo de producto creado exitosamente!');
        setName(''); // Limpiar el campo en modo creación
      }
      
      // Refrescar para mostrar los cambios en la lista
      router.refresh();
      
      // Llamar callback de éxito si existe
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500); // Esperar un poco para mostrar el mensaje de éxito
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (error) {
      setError('');
    }
    
    // Validación en tiempo real
    const nameError = validateName(value);
    if (nameError && value.length > 0) {
      setError(nameError);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* Nombre del tipo de producto */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del Tipo de Producto *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={handleNameChange}
          required
          disabled={loading}
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
          placeholder="Ej: Bebidas, Snacks, Lácteos, Panadería..."
        />
        <p className="text-xs text-gray-500 mt-1">
          {name.length}/100 caracteres
        </p>
      </div>

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={loading || !name.trim() || !!validateName(name)}
          className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isEditMode ? 'Actualizando...' : 'Creando...'}
            </div>
          ) : (
            isEditMode ? 'Actualizar Tipo' : 'Crear Tipo'
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        Los campos marcados con * son obligatorios.<br/>
        {isEditMode 
          ? 'Los productos asociados mantendrán su vinculación con este tipo.'
          : 'El tipo estará disponible inmediatamente para asociar con productos.'
        }
      </p>
    </form>
  );
}