'use client';

import { useState, useEffect } from 'react';
import { formatAsCLP } from '@/lib/formatters';

interface WholesaleStats {
  total_products_with_wholesale: number;
  total_products_without_wholesale: number;
  avg_wholesale_discount: number;
  total_wholesale_sales: number;
  total_regular_sales: number;
}

interface SalesComparison {
  sale_type: string;
  total_sales: number;
  total_amount: number;
  avg_sale_amount: number;
  total_items_sold: number;
}

export default function WholesalePricingReports() {
  const [stats, setStats] = useState<WholesaleStats | null>(null);
  const [salesComparison, setSalesComparison] = useState<SalesComparison[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Obtener estadísticas generales
      const statsResponse = await fetch('/api/admin/wholesale-stats');
      if (!statsResponse.ok) {
        throw new Error('Error al obtener estadísticas');
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Obtener comparación de ventas
      const comparisonResponse = await fetch(`/api/admin/wholesale-comparison?period=${period}`);
      if (!comparisonResponse.ok) {
        throw new Error('Error al obtener comparación de ventas');
      }
      const comparisonData = await comparisonResponse.json();
      setSalesComparison(comparisonData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar reportes</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchReports}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const wholesaleData = salesComparison.find(s => s.sale_type === 'wholesale');
  const regularData = salesComparison.find(s => s.sale_type === 'regular');

  return (
    <div className="space-y-6">
      {/* Título y controles */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          📊 Reportes de Precios Mayoristas
        </h2>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Período:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Hoy</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
          </select>
        </div>
      </div>

      {/* Estadísticas generales */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 Estadísticas Generales
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.total_products_with_wholesale}
              </div>
              <div className="text-sm text-purple-700">
                Productos con Precio Mayorista
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {stats.total_products_without_wholesale}
              </div>
              <div className="text-sm text-gray-700">
                Productos sin Precio Mayorista
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatAsCLP(stats.avg_wholesale_discount)}
              </div>
              <div className="text-sm text-green-700">
                Descuento Promedio
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total_wholesale_sales}
              </div>
              <div className="text-sm text-blue-700">
                Ventas Mayoristas
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {stats.total_regular_sales}
              </div>
              <div className="text-sm text-orange-700">
                Ventas Regulares
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparación de ventas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔄 Comparación de Ventas ({period === 'day' ? 'Hoy' : period === 'week' ? 'Esta Semana' : 'Este Mes'})
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ventas Mayoristas */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-purple-800 mb-3">
              🎉 Ventas Mayoristas
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-purple-700">Total de ventas:</span>
                <span className="font-medium">{wholesaleData?.total_sales || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Monto total:</span>
                <span className="font-medium">{formatAsCLP(wholesaleData?.total_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Promedio por venta:</span>
                <span className="font-medium">{formatAsCLP(wholesaleData?.avg_sale_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Items vendidos:</span>
                <span className="font-medium">{wholesaleData?.total_items_sold || 0}</span>
              </div>
            </div>
          </div>

          {/* Ventas Regulares */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-blue-800 mb-3">
              🛒 Ventas Regulares
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">Total de ventas:</span>
                <span className="font-medium">{regularData?.total_sales || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Monto total:</span>
                <span className="font-medium">{formatAsCLP(regularData?.total_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Promedio por venta:</span>
                <span className="font-medium">{formatAsCLP(regularData?.avg_sale_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Items vendidos:</span>
                <span className="font-medium">{regularData?.total_items_sold || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Análisis comparativo */}
        {wholesaleData && regularData && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-lg font-medium text-gray-800 mb-3">
              📊 Análisis Comparativo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {((wholesaleData.total_sales / (wholesaleData.total_sales + regularData.total_sales)) * 100).toFixed(1)}%
                </div>
                <div className="text-gray-600">Ventas Mayoristas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {((wholesaleData.total_amount / (wholesaleData.total_amount + regularData.total_amount)) * 100).toFixed(1)}%
                </div>
                <div className="text-gray-600">Ingresos Mayoristas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {(wholesaleData.avg_sale_amount / regularData.avg_sale_amount).toFixed(1)}x
                </div>
                <div className="text-gray-600">Ratio Venta Promedio</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}