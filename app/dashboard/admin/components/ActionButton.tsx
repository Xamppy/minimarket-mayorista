'use client';

import { useState } from 'react';
import { deleteProduct } from '../actions';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  type_name: string;
  image_url: string | null;
  total_stock: number;
}

interface ActionButtonProps {
  product: Product;
  onManageStock: (productId: string, productName: string) => void;
  onEditProduct: (product: Product) => void;
  onProductDeleted: () => void;
}

export default function ActionButton({ 
  product, 
  onManageStock, 
  onEditProduct, 
  onProductDeleted 
}: ActionButtonProps) {
  const [deleting, setDeleting] = useState(false);

  const handleManageStock = () => {
    onManageStock(product.id, product.name);
  };

  const handleEdit = () => {
    onEditProduct(product);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar el producto "${product.name}"?\n\nEsta acción también eliminará todas las entradas de stock asociadas y no se puede deshacer.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteProduct(product.id);
      onProductDeleted();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar el producto. Por favor, inténtalo de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex space-x-2">
      <button
        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors text-sm"
        onClick={handleManageStock}
        title="Gestionar Stock"
      >
        Stock
      </button>
      
      <button
        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors text-sm"
        onClick={handleEdit}
        title="Editar Producto"
      >
        Editar
      </button>
      
      <button
        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleDelete}
        disabled={deleting}
        title="Eliminar Producto"
      >
        {deleting ? '...' : 'Eliminar'}
      </button>
    </div>
  );
} 