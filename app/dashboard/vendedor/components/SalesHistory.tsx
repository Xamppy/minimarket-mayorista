'use client';

import { useState, useEffect } from 'react';
import { formatAsCLP } from '../../../../lib/formatters';
import { authenticatedFetch } from '../../../utils/auth/api';

interface Sale {
  id: string;
  ticket_number?: number;
  total_amount: number;
  created_at: string;
  sale_items_count?: number;
}

export default function SalesHistory() {
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    fetchTodaySales();
  }, []);

  const fetchTodaySales = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener ventas del día actual del vendedor autenticado
      const response = await authenticatedFetch('/api/vendor-sales');
      
      if (!response.ok) {
        throw new Error('Error al obtener ventas del día');
      }

      const data = await response.json();
      setTodaySales(data.sales || []);
      setTotalSales(data.total || 0);
    } catch (err) {
      console.error('Error al cargar ventas:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewTicket = (saleId: string) => {
    window.open(`/ticket/${saleId}`, '_blank', 'width=400,height=600');
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">Error al cargar ventas</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={fetchTodaySales}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayFormatted = formatDate(today.toISOString());

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          📊 Ventas de las Últimas 12 Horas
        </h2>
        <p className="text-sm text-gray-600 mb-3">{todayFormatted}</p>
        
        {/* Resumen */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800">Total Vendido</p>
            <p className="text-xl font-bold text-green-900">
              {formatAsCLP(totalSales)}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-800">Transacciones</p>
            <p className="text-xl font-bold text-blue-900">
              {todaySales.length}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de ventas */}
      {todaySales.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ventas en las últimas 12 horas</h3>
          <p className="text-gray-500">Las ventas de las últimas 12 horas aparecerán aquí una vez que realices transacciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todaySales.map((sale) => (
            <div key={sale.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">{sale.ticket_number || sale.id.slice(-4)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Venta #{sale.ticket_number ? sale.ticket_number.toString().padStart(10, '0') : sale.id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTime(sale.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 text-lg">
                    {formatAsCLP(sale.total_amount)}
                  </p>
                  <button
                    onClick={() => handleViewTicket(sale.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                  >
                    Ver Ticket
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón de actualizar */}
      <div className="pt-4">
        <button
          onClick={fetchTodaySales}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          🔄 Actualizar Ventas
        </button>
      </div>
    </div>
  );
}