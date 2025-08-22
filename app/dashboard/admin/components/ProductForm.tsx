'use client';

import { useState } from 'react';
import { addProduct } from '../actions';

interface Brand {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
}

interface ProductFormProps {
  brands: Brand[];
  productTypes: ProductType[];
  onSuccess?: () => void;
}

export default function ProductForm({ brands, productTypes, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Debug: Log de las props recibidas
  console.log('ProductForm - Marcas recibidas:', brands);
  console.log('ProductForm - Tipos recibidos:', productTypes);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await addProduct(formData);
      setSuccess('¡Producto registrado en el catálogo exitosamente!');
      
      // Limpiar el formulario
      const form = document.getElementById('product-form') as HTMLFormElement;
      if (form) {
        form.reset();
      }
      
      // Llamar callback de éxito si existe (para cerrar modal)
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

  return (
    <form id="product-form" action={handleSubmit} className="space-y-4">
        {/* Nombre del producto */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Producto *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
            placeholder="Ej: Leche Entera La Serenísima 1L"
          />
        </div>

        {/* Marca */}
        <div>
          <label htmlFor="brand_name" className="block text-sm font-medium text-gray-700 mb-1">
            Marca *
          </label>
          <select
            id="brand_name"
            name="brand_name"
            required
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
          >
            <option value="">Selecciona una marca</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.name}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de producto */}
        <div>
          <label htmlFor="product_type_id" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Producto *
          </label>
          <select
            id="product_type_id"
            name="product_type_id"
            required
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
          >
            <option value="">Selecciona un tipo</option>
            {productTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* URL de la imagen */}
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
            URL de la Imagen (opcional)
          </label>
          <input
            type="url"
            id="imageUrl"
            name="imageUrl"
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
            placeholder="https://ejemplo.com/imagen.jpg"
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
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Registrando...' : 'Registrar en Catálogo'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Los campos marcados con * son obligatorios.<br/>
          Este formulario registra productos en el catálogo general sin precio ni stock.
        </p>
      </form>
    );
}