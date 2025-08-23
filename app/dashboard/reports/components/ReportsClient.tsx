'use client';

import { useState, useEffect } from 'react';
// Removed admin actions import - now using direct API calls
import { formatAsCLP } from '../../../../lib/formatters';
import { safeEmailInitial, formatSafeEmail, validateSaleData, SafeRecentSale } from '../../../../lib/safe-data-utils';
import DailySalesChart from './DailySalesChart';
import SalesHistorySearch from './SalesHistorySearch';

interface SalesReport {
  totalSales: number;
  totalTransactions: number;
  period: string;
  startDate: string;
  endDate: string;
}

interface TopProduct {
  id: string;
  name: string;
  brand_name: string;
  type_name: string;
  totalSold: number;
}

interface RecentSale {
  id: string;
  total_amount: number;
  created_at: string;
  seller_email: string | null;
}

interface DailySalesData {
  sale_date: string;
  total_sales: number;
}

export default function ReportsClient() {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [dailySalesData, setDailySalesData] = useState<DailySalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async (period: 'day' | 'week' | 'month', retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all reports data from the new endpoint
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          action: 'getAllReports',
          period: period
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const { data } = await response.json();
      const { salesReport: salesData, topProducts: topProductsData, recentSales: recentSalesData, dailyStats: dailySalesStats } = data;
      
      // Validate and sanitize data before setting state
      setSalesReport(salesData as SalesReport);
      setTopProducts(topProductsData as TopProduct[]);
      
      // Validate recent sales data to prevent runtime errors
      const validatedSales = Array.isArray(recentSalesData) 
        ? recentSalesData.map(validateSaleData)
        : [];
      setRecentSales(validatedSales as RecentSale[]);
      
      setDailySalesData(dailySalesStats as DailySalesData[]);
      
      // Log data quality issues for debugging
      const invalidSales = Array.isArray(recentSalesData) 
        ? recentSalesData.filter((sale: any) => !sale?.seller_email) 
        : [];
      if (invalidSales.length > 0) {
        console.warn(`Found ${invalidSales.length} sales with missing seller information`, invalidSales);
      }
      
      // Log successful data fetch
      console.info(`Reports data loaded successfully for period: ${period}`);
      
    } catch (err) {
      console.error(`Error al cargar reportes (intento ${retryCount + 1}/${maxRetries + 1}):`, err);
      
      // Retry logic for transient errors
      if (retryCount < maxRetries && err instanceof Error) {
        const isRetryableError = err.message.includes('network') || 
                                err.message.includes('timeout') ||
                                err.message.includes('fetch');
        
        if (isRetryableError) {
          console.info(`Reintentando carga de reportes en 2 segundos...`);
          setTimeout(() => {
            fetchReports(period, retryCount + 1);
          }, 2000);
          return;
        }
      }
      
      // Set error state for non-retryable errors or after max retries
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar reportes';
      setError(errorMessage);
      
      // Log final error state
      console.error('Error final al cargar reportes:', {
        period,
        retryCount,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(selectedPeriod);
  }, [selectedPeriod]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'day': return 'Hoy';
      case 'week': return 'Últimos 7 días';
      case 'month': return 'Últimos 30 días';
      default: return period;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando reportes y estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600 bg-red-50 p-4 rounded-md">
          <p className="font-medium">Error al cargar reportes:</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => fetchReports(selectedPeriod)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Período - Posición prominente */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              📊 Filtro de Período
            </h2>
            <p className="text-sm text-gray-600">
              Selecciona el período para visualizar los datos de ventas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['day', 'week', 'month'] as const).map((period) => {
              const labels = {
                day: { text: 'Día', icon: '📅', desc: 'Hoy' },
                week: { text: 'Semana', icon: '📈', desc: 'Últimos 7 días' },
                month: { text: 'Mes', icon: '📊', desc: 'Últimos 30 días' }
              };
              
              return (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`flex flex-col items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-w-[80px] ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105 ring-2 ring-blue-300'
                      : 'bg-white text-gray-700 hover:bg-blue-50 hover:shadow-md border border-gray-200'
                  }`}
                >
                  <span className="text-lg mb-1">{labels[period].icon}</span>
                  <span className="font-semibold">{labels[period].text}</span>
                  <span className={`text-xs mt-1 ${
                    selectedPeriod === period ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {labels[period].desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gráfico de Ventas Diarias */}
      <DailySalesChart data={dailySalesData} period={selectedPeriod} />

      {/* Resumen de Ventas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          💰 Resumen de Ventas - {getPeriodLabel(selectedPeriod)}
        </h2>
        
        {salesReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">$</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-800">Total Vendido</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatAsCLP(salesReport.totalSales)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">#</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-800">Transacciones</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {salesReport.totalTransactions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">⌀</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-800">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {salesReport.totalTransactions > 0 
                      ? formatAsCLP(salesReport.totalSales / salesReport.totalTransactions)
                      : formatAsCLP(0)
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top 5 Productos Más Vendidos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          🏆 Top 5 Productos Más Vendidos
        </h2>
        
        {topProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-lg font-medium">No hay datos de productos vendidos</p>
            <p className="text-sm">Los datos aparecerán una vez que se registren ventas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                    'bg-gradient-to-r from-blue-400 to-blue-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{product.brand_name}</span> • {product.type_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {product.totalSold} unidades
                  </p>
                  <p className="text-sm text-gray-500">vendidas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Búsqueda de Ventas Históricas */}
      <SalesHistorySearch />

      {/* Información adicional mejorada */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-blue-600 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="font-semibold text-blue-900 mb-3">📈 Información sobre los reportes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Los reportes se actualizan en tiempo real
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  El gráfico muestra las ventas de los últimos 30 días
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Todos los montos están en Pesos Chilenos (CLP)
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  El ranking se basa en unidades vendidas
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Puedes cambiar el período de análisis
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Haz hover en el gráfico para más detalles
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}