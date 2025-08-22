'use client';

import { useState } from 'react';
import { searchSalesByDate } from '../../admin/actions';
import { formatAsCLP } from '../../../../lib/formatters';

interface Sale {
  id: string;
  total_amount: number;
  created_at: string;
  seller_email: string | null;
  sale_items: Array<{
    id: string;
    quantity_sold: number;
    price_at_sale: number;
    product: {
      id: string;
      name: string;
      brand_name: string;
      type_name: string;
    };
  }>;
}

export default function SalesHistorySearch() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      setError('Por favor selecciona ambas fechas');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Agregar tiempo completo a las fechas
      const startDateTime = startDate + 'T00:00:00';
      const endDateTime = endDate + 'T23:59:59';
      
      const result = await searchSalesByDate(startDateTime, endDateTime, 100);
      setSales(result || []);
    } catch (err: any) {
      setError(err.message || 'Error al buscar ventas');
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setSales([]);
    setError(null);
    setHasSearched(false);
  };

  const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        🔍 Búsqueda de Ventas Históricas
      </h2>
      
      {/* Filtros de búsqueda */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Inicio
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Fin
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Limpiar
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Resumen de resultados */}
      {hasSearched && !loading && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{sales.length}</p>
              <p className="text-sm text-gray-600">Ventas encontradas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{formatAsCLP(totalSales)}</p>
              <p className="text-sm text-gray-600">Total vendido</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {sales.length > 0 ? formatAsCLP(totalSales / sales.length) : formatAsCLP(0)}
              </p>
              <p className="text-sm text-gray-600">Ticket promedio</p>
            </div>
          </div>
        </div>
      )}

      {/* Resultados de búsqueda */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Buscando ventas...</p>
        </div>
      ) : hasSearched && sales.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-lg font-medium">No se encontraron ventas</p>
          <p className="text-sm">No hay ventas registradas en el período seleccionado</p>
        </div>
      ) : sales.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Venta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha y Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                      #{sale.id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(sale.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-gray-600">
                          {sale.seller_email ? sale.seller_email.charAt(0).toUpperCase() : 'S'}
                        </span>
                      </div>
                      <span className="font-medium">
                        {sale.seller_email || 'Sistema'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      {sale.sale_items.slice(0, 2).map((item, index) => (
                        <div key={item.id} className="text-xs text-gray-600">
                          {item.quantity_sold}x {item.product.name}
                        </div>
                      ))}
                      {sale.sale_items.length > 2 && (
                        <div className="text-xs text-gray-500 italic">
                          +{sale.sale_items.length - 2} productos más
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatAsCLP(sale.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}