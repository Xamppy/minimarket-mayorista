import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withVendedorAuth } from '../../utils/auth/middleware';
import { AuthenticatedUser } from '../../types/auth';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

export async function GET(request: NextRequest) {
  return withVendedorAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();

    // Calcular fechas de las últimas 12 horas
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - (12 * 60 * 60 * 1000));
    
    const endOfPeriod = now;
    const startOfPeriod = twelveHoursAgo;

      // Obtener ventas de las últimas 12 horas del vendedor autenticado
      // Query optimizada con índice idx_sales_user_date
      const result = await client.query(
        `SELECT id, ticket_number, total_amount, sale_date as created_at 
         FROM sales 
         WHERE user_id = $1 
           AND sale_date >= $2 
           AND sale_date <= $3 
         ORDER BY sale_date DESC`,
        [user.id, startOfPeriod.toISOString(), endOfPeriod.toISOString()]
      );
      
      const sales = result.rows;

    // Debug: Log de los datos obtenidos
    console.log('=== DEBUG VENDOR-SALES ===');
    console.log('Usuario ID:', user.id);
    console.log('Período:', startOfPeriod.toISOString(), 'a', endOfPeriod.toISOString());
    console.log('Número de ventas encontradas:', sales.length);
    console.log('Ventas encontradas:', sales.map(sale => ({
      id: sale.id,
      total_amount: sale.total_amount,
      type: typeof sale.total_amount,
      created_at: sale.created_at
    })));

    // Calcular total
    const total = sales?.reduce((sum, sale) => {
      console.log(`Sumando: ${sum} + ${sale.total_amount} (${typeof sale.total_amount})`);
      return sum + parseFloat(sale.total_amount);
    }, 0) || 0;
    
    console.log('Total calculado:', total);
    console.log('=== FIN DEBUG ===');

      return NextResponse.json({
        success: true,
        sales: sales || [],
        total,
        count: sales?.length || 0,
        date: now.toISOString().split('T')[0],
        period: 'last_12_hours',
        startTime: startOfPeriod.toISOString(),
        endTime: endOfPeriod.toISOString()
      });
      
    } catch (error) {
      console.error('Error en API de ventas del vendedor:', error);
      return NextResponse.json({ 
        error: { 
          message: 'Error interno del servidor', 
          status: 500 
        } 
      }, { status: 500 });
    } finally {
      await client.end();
    }
  });
}