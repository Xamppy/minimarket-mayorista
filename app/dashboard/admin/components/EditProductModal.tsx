'use client';

import { useState } from 'react';
import { addProduct } from '../actions';
import ImageUpload from './ImageUpload';
import { authenticatedFetch } from '../../../utils/auth/api';

interface Brand {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  barcode?: string;
  brand_name: string;
  type_name: string;
  image_url: string | null;
  total_stock: number;
  min_stock?: number;
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  brands: Brand[];
  productTypes: ProductType[];
  onProductUpdated: () => void;
}

export default function EditProductModal({ 
  isOpen, 
  onClose, 
  product, 
  brands, 
  productTypes, 
  onProductUpdated 
}: EditProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  // Encontrar los IDs de marca y tipo basándose en los nombres
  const selectedBrand = brands.find(brand => brand.name === product.brand_name);
  const selectedType = productTypes.find(type => type.name === product.type_name);

  const handleImageSelect = (file: File | null, previewUrl: string | null) => {
    setImageFile(file);
    setImagePreview(previewUrl);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authenticatedFetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al subir la imagen');
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Si hay una imagen nueva, subirla primero
      let imageUrl = product.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      } else if (imagePreview === null && product.image_url) {
        // El usuario eliminó la imagen existente
        imageUrl = null;
      }

      // Agregar la URL de imagen al FormData
      if (imageUrl) {
        formData.set('imageUrl', imageUrl);
      } else {
        formData.delete('imageUrl');
      }

      // Agregar el productId para indicar que es una actualización
      formData.append('productId', product.id);

      await addProduct(formData);
      setSuccess('¡Producto actualizado exitosamente!');
      
      // Llamar al callback para actualizar la lista
      onProductUpdated();
      
      // Cerrar el modal después de un breve delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    setImageFile(null);
    setImagePreview(null);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">
            Editar Producto
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          {/* Nombre del producto */}
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-black mb-1">
              Nombre del Producto *
            </label>
            <input
              type="text"
              id="edit-name"
              name="name"
              required
              disabled={loading}
              defaultValue={product.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
              placeholder="Ej: Leche Entera La Serenísima 1L"
            />
          </div>

          {/* Código de Barras */}
          <div>
            <label htmlFor="edit-barcode" className="block text-sm font-medium text-black mb-1">
              Código de Barras *
            </label>
            <input
              type="text"
              id="edit-barcode"
              name="barcode"
              required
              disabled={loading}
              defaultValue={product.barcode || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
              placeholder="Ej: 7790123456789"
            />
            <p className="text-xs text-gray-500 mt-1">
              Escanea o ingresa el código de barras del producto
            </p>
          </div>

          {/* Marca */}
          <div>
            <label htmlFor="edit-brandId" className="block text-sm font-medium text-black mb-1">
              Marca *
            </label>
            <select
              id="edit-brandId"
              name="brandId"
              required
              disabled={loading}
              defaultValue={selectedBrand?.id || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
            >
              <option value="">Selecciona una marca</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de producto */}
          <div>
            <label htmlFor="edit-typeId" className="block text-sm font-medium text-black mb-1">
              Tipo de Producto *
            </label>
            <select
              id="edit-typeId"
              name="typeId"
              required
              disabled={loading}
              defaultValue={selectedType?.id || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
            >
              <option value="">Selecciona un tipo</option>
              {productTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Imagen del producto - Nuevo componente */}
          <ImageUpload
            currentImageUrl={imagePreview ?? product.image_url}
            onImageSelect={handleImageSelect}
            disabled={loading}
          />

          {/* Stock Mínimo para Alerta */}
          <div>
            <label htmlFor="edit-minStock" className="block text-sm font-medium text-black mb-1">
              Stock Mínimo para Alerta *
            </label>
            <input
              type="number"
              id="edit-minStock"
              name="minStock"
              required
              min="0"
              defaultValue={product.min_stock || 10}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
              placeholder="10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Umbral para recibir alertas cuando el stock esté por debajo de este valor
            </p>
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

          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Actualizando...' : 'Actualizar Producto'}
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Los campos marcados con * son obligatorios
        </p>
      </div>
    </div>
  );
}