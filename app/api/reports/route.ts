import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'minimarket',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
  ssl: process.env.POSTGRES_SSL === 'true',
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Función para verificar autenticación y rol de administrador
async function verifyAdminAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return { error: 'Token de autenticación no encontrado', status: 401 };
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET no está configurado');
      return { error: 'Error de configuración del servidor', status: 500 };
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    if (decoded.role !== 'administrator') {
      return { error: 'Acceso denegado. Se requieren permisos de administrador', status: 403 };
    }

    return { user: decoded };
  } catch (error) {
    console.error('Error de verificación de token:', error);
    return { error: 'Token inválido o expirado', status: 401 };
  }
}

// Función para obtener reporte de ventas
async function getSalesReport(period: 'day' | 'week' | 'month') {
  const client = await pool.connect();
  try {
    const now = new Date();
    let reportStartDate: Date;

    switch (period) {
      case 'day':
        reportStartDate = new Date();
        reportStartDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        reportStartDate = new Date();
        reportStartDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        reportStartDate = new Date();
        reportStartDate.setDate(now.getDate() - 30);
        break;
      default:
        reportStartDate = new Date();
        reportStartDate.setHours(0, 0, 0, 0);
    }

    const salesResult = await client.query(
      'SELECT total_amount, sale_date FROM sales WHERE sale_date >= $1 ORDER BY sale_date DESC',
      [reportStartDate.toISOString()]
    );

    const totalSales = salesResult.rows.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
    const totalTransactions = salesResult.rows.length;

    return {
      totalSales,
      totalTransactions,
      period,
      startDate: reportStartDate.toISOString(),
      endDate: now.toISOString()
    };
  } finally {
    client.release();
  }
}

// Función para obtener productos más vendidos
async function getTopSellingProducts(limit: number = 5, period: 'day' | 'week' | 'month' = 'day') {
  const client = await pool.connect();
  try {
    // Calcular fechas según el período
    let dateCondition = '';
    switch (period) {
      case 'day':
        dateCondition = "AND s.sale_date >= CURRENT_DATE";
        break;
      case 'week':
        dateCondition = "AND s.sale_date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateCondition = "AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
    }

    const result = await client.query(`
      SELECT 
        p.id,
        p.name,
        COALESCE(b.name, p.brand_name, 'Sin marca') as brand_name,
        COALESCE(pt.name, 'Sin tipo') as type_name,
        SUM(si.quantity) as totalSold
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_types pt ON p.type_id = pt.id
      WHERE 1=1 ${dateCondition}
      GROUP BY p.id, p.name, b.name, p.brand_name, pt.name
      ORDER BY totalSold DESC
      LIMIT $1
    `, [limit]);

    // Convertir totalsold de string a número y cambiar el nombre del campo
    const processedRows = result.rows.map(row => ({
      ...row,
      totalSold: parseInt(row.totalsold, 10),
      totalsold: undefined // Eliminar el campo original
    }));
    
    return processedRows;
  } finally {
    client.release();
  }
}

// Función para obtener ventas recientes
async function getRecentSales(limit: number = 10) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        s.id,
        s.total_amount,
        s.sale_date as created_at,
        u.email as seller_email
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.sale_date DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  } finally {
    client.release();
  }
}

// Función para obtener estadísticas diarias
async function getDailySalesStats() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        DATE(sale_date) as sale_date,
        SUM(total_amount) as total_sales
      FROM sales
      WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(sale_date)
      ORDER BY sale_date DESC
    `);

    return result.rows;
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos de administrador
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    let result;

    switch (action) {
      case 'getSalesReport':
        const { period = 'day' } = params;
        result = await getSalesReport(period);
        break;

      case 'getTopSellingProducts':
        const { limit = 5, period: productsPeriod = 'day' } = params;
        result = await getTopSellingProducts(limit, productsPeriod);
        break;

      case 'getRecentSales':
        const { limit: salesLimit = 10 } = params;
        result = await getRecentSales(salesLimit);
        break;

      case 'getDailySalesStats':
        result = await getDailySalesStats();
        break;

      case 'getAllReports':
        // Obtener todos los reportes de una vez
        const [salesReport, topProducts, recentSales, dailyStats] = await Promise.all([
          getSalesReport(params.period || 'day'),
          getTopSellingProducts(5, params.period || 'day'),
          getRecentSales(10),
          getDailySalesStats()
        ]);
        
        result = {
          salesReport,
          topProducts,
          recentSales,
          dailyStats
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('Error en endpoint de reportes:', error);
    
    // Manejo específico de errores de base de datos
    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        return NextResponse.json(
          { error: 'Error de conexión a la base de datos. Intente nuevamente.' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Tiempo de espera agotado. Intente nuevamente.' },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Error interno del servidor al procesar reportes' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos de administrador
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Por defecto, devolver todos los reportes básicos
    const [salesReport, topProducts, recentSales, dailyStats] = await Promise.all([
      getSalesReport('day'),
      getTopSellingProducts(5),
      getRecentSales(10),
      getDailySalesStats()
    ]);
    
    const result = {
      salesReport,
      topProducts,
      recentSales,
      dailyStats
    };

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('Error en endpoint GET de reportes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener reportes' },
      { status: 500 }
    );
  }
}