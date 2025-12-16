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

      // Obtener información del usuario autenticado
      console.log('=== DEBUG USER INFO ===');
      console.log('Usuario autenticado:', user);
      
      // Obtener todas las ventas de las últimas 12 horas con sus user_id
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - (12 * 60 * 60 * 1000));
      
      const salesResult = await client.query(
        `SELECT id, user_id, total_amount, sale_date, 
                u.email as user_email
         FROM sales s
         LEFT JOIN users u ON s.user_id = u.id
         WHERE sale_date >= $1 AND sale_date <= $2
         ORDER BY sale_date DESC`,
        [twelveHoursAgo.toISOString(), now.toISOString()]
      );
      
      console.log('Ventas encontradas:', salesResult.rows.map(sale => ({
        id: sale.id,
        user_id: sale.user_id,
        user_email: sale.user_email,
        total_amount: sale.total_amount,
        sale_date: sale.sale_date
      })));
      
      // Obtener todos los usuarios
      const usersResult = await client.query(
        'SELECT id, email, role FROM users ORDER BY email'
      );
      
      console.log('Usuarios en sistema:', usersResult.rows);
      console.log('=== FIN DEBUG USER ===');

      return NextResponse.json({
        success: true,
        authenticated_user: user,
        sales: salesResult.rows,
        all_users: usersResult.rows
      });
      
    } catch (error) {
      console.error('Error en debug user:', error);
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