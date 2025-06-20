'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAsCLP } from '../../../../lib/formatters';

interface DailySalesData {
  sale_date: string;
  total_sales: number;
}

interface DailySalesChartProps {
  data: DailySalesData[];
}

export default function DailySalesChart({ data }: DailySalesChartProps) {
  // Formatear datos para el gráfico
  const chartData = data.map(item => ({
    ...item,
    total_sales: Number(item.total_sales)
  }));

  // Función para formatear la fecha en el eje X (evita problemas de zona horaria)
  const formatXAxisLabel = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${parseInt(month)}`;
  };

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Para el tooltip, usamos el string de fecha directamente y lo formateamos manualmente
      const [year, month, day] = label.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const formattedDate = date.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {formattedDate}
          </p>
          <p className="text-sm text-blue-600">
            <span className="font-semibold">Ventas totales:</span>
          </p>
          <p className="text-lg font-bold text-green-600">
            {formatAsCLP(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📊 Ventas Diarias - Últimos 30 Días
        </h2>
        <div className="text-center py-12 text-gray-500">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-lg font-medium">No hay datos de ventas disponibles</p>
          <p className="text-sm">Los datos aparecerán aquí una vez que se registren ventas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          📊 Ventas Diarias - Últimos 30 Días
        </h2>
        <p className="text-sm text-gray-600">
          Evolución de las ventas día a día. Haz hover sobre las barras para ver detalles.
        </p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="sale_date" 
              tickFormatter={formatXAxisLabel}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tickFormatter={(value) => formatAsCLP(value)}
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="total_sales" 
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              className="hover:opacity-80 transition-opacity"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center text-sm text-blue-700">
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>Total de días con ventas:</strong> {data.length} días | 
            <strong> Promedio diario:</strong> {formatAsCLP(data.reduce((sum, item) => sum + Number(item.total_sales), 0) / data.length)}
          </span>
        </div>
      </div>
    </div>
  );
} 