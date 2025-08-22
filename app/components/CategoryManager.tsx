'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  product_count: number;
}

interface Brand {
  id: string;
  name: string;
  description: string;
  product_count: number;
}

interface CategoryManagerProps {
  type: 'categories' | 'brands';
}

export default function CategoryManager({ type }: CategoryManagerProps) {
  const [items, setItems] = useState<(Category | Brand)[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Category | Brand | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const isCategory = type === 'categories';
  const title = isCategory ? 'Categorías' : 'Marcas';
  const singular = isCategory ? 'categoría' : 'marca';
  const rpcFunction = isCategory ? 'get_product_categories' : 'get_product_brands';

  useEffect(() => {
    fetchItems();
  }, [type]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rpc/${rpcFunction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        setItems(data.result || []);
      } else {
        console.error(`Error al cargar ${title.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      console.error(`Error al cargar ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    try {
      // Aquí implementarías la lógica para crear/actualizar
      // Por ahora solo mostramos un mensaje
      const action = editingItem ? 'actualizada' : 'creada';
      alert(`${singular.charAt(0).toUpperCase() + singular.slice(1)} ${action} exitosamente`);
      
      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ name: '', description: '' });
      fetchItems();
    } catch (error) {
      alert(`Error al ${editingItem ? 'actualizar' : 'crear'} ${singular}`);
    }
  };

  const handleEdit = (item: Category | Brand) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Category | Brand) => {
    if (item.product_count > 0) {
      alert(`No se puede eliminar ${singular} con productos asociados`);
      return;
    }

    if (confirm(`¿Estás seguro de eliminar la ${singular} "${item.name}"?`)) {
      try {
        // Aquí implementarías la lógica para eliminar
        alert(`${singular.charAt(0).toUpperCase() + singular.slice(1)} eliminada exitosamente`);
        fetchItems();
      } catch (error) {
        alert(`Error al eliminar ${singular}`);
      }
    }
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData({ name: '', description: '' });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Package className="h-5 w-5" />
            {title}
          </h2>
        </div>
        <div className="p-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Package className="h-5 w-5" />
            {title}
          </h2>
          <button
            onClick={openCreateDialog}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agregar {singular}
          </button>
        </div>
      </div>
      
      {/* Modal/Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? `Editar ${singular}` : `Crear nueva ${singular}`}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`Nombre de la ${singular}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={`Descripción de la ${singular}`}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="p-6">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay {title.toLowerCase()} registradas
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={item.product_count > 0}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                )}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {item.product_count} productos
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}