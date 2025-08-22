'use client';

import { useState, useEffect } from 'react';
import { getLowStockAlerts, getExpirationAlerts } from '../actions';

interface StockAlert {
  product_id: string;
  product_name: string;
  brand_name: string;
  total_stock: number;
}

interface ExpirationAlert {
  id: string;
  product_id: string;
  product_name: string;
  brand_name: string;
  remaining_quantity: number;
  expiration_date: string;
  days_until_expiration: number;
}

export default function AlertsDashboard() {
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [lowStock, expiring] = await Promise.all([
          getLowStockAlerts(10),
          getExpirationAlerts(30)
        ]);
        
        setLowStockItems(lowStock);
        setExpiringItems(expiring);
      } catch (err) {
        console.error('Error al cargar alertas:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationUrgency = (days: number) => {
    if (days <= 0) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 7) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (days <= 15) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🔔 Panel de Alertas
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-600">Cargando alertas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🔔 Panel de Alertas
        </h2>
        <div className="text-red-600 bg-red-50 p-4 rounded-md">
          <p className="font-medium">Error al cargar alertas:</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        🔔 Panel de Alertas
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de Bajo Stock */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium text-orange-700 mb-4 flex items-center">
            ⚠️ Alerta: Bajo Stock
            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
              {lowStockItems.length}
            </span>
          </h3>
          
          {lowStockItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">✅ No hay productos con bajo stock</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {lowStockItems.map((item: any) => (
                <div
                  key={item.product_id}
                  className="border border-orange-200 bg-orange-50 rounded-lg p-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.product_name || 'Producto sin nombre'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {item.brand_name || 'Sin marca'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ID: {item.product_id}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.total_stock} unidades
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de Productos Próximos a Vencer */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-700 mb-4 flex items-center">
            ⏳ Alerta: Próximo a Vencer
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {expiringItems.length}
            </span>
          </h3>
          
          {expiringItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">✅ No hay productos próximos a vencer</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {expiringItems.map((item: any) => {
                const daysUntilExp = item.days_until_expiration;
                const urgencyClass = getExpirationUrgency(daysUntilExp);
                
                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-3 ${urgencyClass}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {item.product_name || 'Producto sin nombre'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.brand_name || 'Sin marca'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          ID: {item.product_id}
                        </p>
                        <p className="text-xs mt-1">
                          Stock: {item.remaining_quantity} unidades
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-xs font-medium">
                          {formatDate(item.expiration_date)}
                        </div>
                        <div className="text-xs mt-1">
                          {daysUntilExp <= 0 ? (
                            <span className="text-red-600 font-bold">¡VENCIDO!</span>
                          ) : daysUntilExp === 1 ? (
                            <span className="text-red-600">Vence mañana</span>
                          ) : (
                            <span>Vence en {daysUntilExp} días</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resumen de alertas */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">📊 Resumen de Alertas</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-orange-600">⚠️ Productos con bajo stock:</span>
            <span className="ml-2 font-semibold text-orange-600">{lowStockItems.length}</span>
          </div>
          <div>
            <span className="text-blue-600">⏳ Productos próximos a vencer:</span>
            <span className="ml-2 font-semibold text-blue-600">{expiringItems.length}</span>
          </div>
        </div>
        {(lowStockItems.length > 0 || expiringItems.length > 0) && (
          <p className="text-xs text-gray-600 mt-2">
            💡 Tip: Revisa regularmente estas alertas para evitar pérdidas y mantener un inventario adecuado.
          </p>
        )}
      </div>
    </div>
  );
}