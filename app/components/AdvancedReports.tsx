'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, BarChart3, TrendingUp } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface SalesReportItem {
  product_id: string;
  product_name: string;
  brand_name: string;
  category_name: string;
  total_quantity: number;
  total_revenue: number;
  avg_price: number;
  sales_count: number;
  first_sale: string;
  last_sale: string;
}

interface ReportSummary {
  total_products: number;
  total_revenue: number;
  total_quantity: number;
}

interface ReportData {
  sales: SalesReportItem[];
  summary: ReportSummary;
}

export default function AdvancedReports() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: '',
    brandId: '',
    limit: 50
  });

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    // Cargar reporte inicial sin filtros
    generateReport();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/rpc/get_product_categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.result || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/rpc/get_product_brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        setBrands(data.result || []);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const requestBody: any = {
        reportLimit: filters.limit
      };

      if (filters.startDate) requestBody.startDate = filters.startDate;
      if (filters.endDate) requestBody.endDate = filters.endDate;
      if (filters.categoryId) requestBody.categoryId = filters.categoryId;
      if (filters.brandId) requestBody.brandId = filters.brandId;

      const response = await fetch('/api/rpc/get_filtered_sales_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data.result);
      } else {
        alert('Error al generar el reporte');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.sales.length) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = [
      'Producto',
      'Marca',
      'Categoría',
      'Cantidad Total',
      'Ingresos Totales',
      'Precio Promedio',
      'Número de Ventas',
      'Primera Venta',
      'Última Venta'
    ];

    const csvContent = [
      headers.join(','),
      ...reportData.sales.map(item => [
        `"${item.product_name}"`,
        `"${item.brand_name}"`,
        `"${item.category_name}"`,
        item.total_quantity,
        item.total_revenue.toFixed(2),
        item.avg_price.toFixed(2),
        item.sales_count,
        item.first_sale,
        item.last_sale
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Reporte exportado exitosamente');
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      categoryId: '',
      brandId: '',
      limit: 50
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Filter className="h-5 w-5" />
            Filtros de Reporte
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <select
                value={filters.brandId}
                onChange={(e) => setFilters({ ...filters, brandId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las marcas</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generando...' : 'Generar Reporte'}
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Limpiar Filtros
            </button>
            <button
              onClick={exportToCSV}
              disabled={!reportData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Resumen */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Productos</p>
                  <p className="text-2xl font-bold">{reportData.summary.total_products}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData.summary.total_revenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cantidad Total</p>
                  <p className="text-2xl font-bold">{reportData.summary.total_quantity}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Resultados */}
      {reportData && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Resultados del Reporte</h2>
          </div>
          <div className="p-6">
            {reportData.sales.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron datos para los filtros seleccionados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Producto</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Marca</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Categoría</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Cantidad</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Ingresos</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Precio Prom.</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Ventas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sales.map((item, index) => (
                      <tr key={item.product_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-4 py-2 font-medium">{item.product_name}</td>
                        <td className="border border-gray-200 px-4 py-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">{item.brand_name}</span>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.category_name}</span>
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{item.total_quantity}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right font-medium">
                          {formatCurrency(item.total_revenue)}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {formatCurrency(item.avg_price)}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{item.sales_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}