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

    // Calcular fechas del día actual
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

      // Obtener ventas del día del vendedor autenticado
      // Query optimizada con índice idx_sales_user_date
      const result = await client.query(
        `SELECT id, total_amount, sale_date as created_at 
         FROM sales 
         WHERE user_id = $1 
           AND sale_date >= $2 
           AND sale_date <= $3 
         ORDER BY sale_date DESC`,
        [user.id, startOfDay.toISOString(), endOfDay.toISOString()]
      );
      
      const sales = result.rows;

    // Calcular total
    const total = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

      return NextResponse.json({
        success: true,
        sales: sales || [],
        total,
        count: sales?.length || 0,
        date: today.toISOString().split('T')[0]
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