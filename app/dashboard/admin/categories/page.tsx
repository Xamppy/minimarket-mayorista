'use client';

import React, { useState } from 'react';
import { Settings, Package, Tag, BarChart3 } from 'lucide-react';
import CategoryManager from '../../../components/CategoryManager';
import AdvancedReports from '../../../components/AdvancedReports';

export default function CategoriesAdminPage() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administración Avanzada</h1>
          <p className="text-gray-600">Gestión de categorías, marcas y reportes detallados</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid w-full grid-cols-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'categories'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="h-4 w-4" />
            Categorías
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'brands'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Tag className="h-4 w-4" />
            Marcas
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'reports'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Reportes
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Análisis
          </button>
        </div>

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <CategoryManager type="categories" />
          </div>
        )}

        {activeTab === 'brands' && (
          <div className="space-y-6">
            <CategoryManager type="brands" />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <AdvancedReports />
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  <BarChart3 className="h-5 w-5" />
                  Análisis Avanzado
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="font-semibold mb-2">Rendimiento por Categoría</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Análisis detallado del rendimiento de ventas por categoría de productos.
                    </p>
                    <div className="text-2xl font-bold text-blue-600">En desarrollo</div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="font-semibold mb-2">Tendencias de Marca</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Seguimiento de tendencias y popularidad de marcas a lo largo del tiempo.
                    </p>
                    <div className="text-2xl font-bold text-green-600">En desarrollo</div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="font-semibold mb-2">Predicciones de Inventario</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Predicciones inteligentes basadas en patrones de venta históricos.
                    </p>
                    <div className="text-2xl font-bold text-purple-600">En desarrollo</div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="font-semibold mb-2">Análisis de Rentabilidad</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Análisis detallado de márgenes y rentabilidad por producto y categoría.
                    </p>
                    <div className="text-2xl font-bold text-orange-600">En desarrollo</div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="font-semibold mb-2">Segmentación de Clientes</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Análisis de patrones de compra y segmentación de clientes.
                    </p>
                    <div className="text-2xl font-bold text-red-600">En desarrollo</div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="font-semibold mb-2">Optimización de Precios</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Recomendaciones de precios basadas en análisis de mercado y demanda.
                    </p>
                    <div className="text-2xl font-bold text-indigo-600">En desarrollo</div>
                  </div>
                </div>
                
                <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">🚀 Funcionalidades Implementadas</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✅ Sistema de categorización con tablas relacionales</li>
                    <li>✅ Gestión de marcas con integridad referencial</li>
                    <li>✅ Reportes con filtrado avanzado por fecha, categoría y marca</li>
                    <li>✅ Exportación de reportes a CSV</li>
                    <li>✅ Consultas optimizadas con índices para alto rendimiento</li>
                    <li>✅ Interfaz de administración intuitiva</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}