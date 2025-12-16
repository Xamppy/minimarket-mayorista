import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withVendedorAuth, withAdminAuth } from '../../utils/auth/middleware';
import { AuthenticatedUser } from '../../types/auth';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
  client_encoding: 'UTF8'
};

export async function GET(request: NextRequest) {
  return withVendedorAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const { searchParams } = request.nextUrl;
      const productId = searchParams.get('product_id') || searchParams.get('productId');
      const lowStockThreshold = searchParams.get('low_stock');
      const expirationDays = searchParams.get('expiration_days');

      // Manejar alertas de bajo stock
      if (lowStockThreshold) {
        const threshold = parseInt(lowStockThreshold);
        
        // Query actualizado: Compara contra min_stock individual de cada producto
        const lowStockQuery = `
          SELECT 
            p.id as product_id,
            p.name as product_name,
            p.brand_name,
            p.min_stock,
            COALESCE(SUM(se.current_quantity), 0) as total_stock
          FROM products p
          LEFT JOIN stock_entries se ON p.id = se.product_id AND se.current_quantity > 0
          GROUP BY p.id, p.name, p.brand_name, p.min_stock
          HAVING COALESCE(SUM(se.current_quantity), 0) <= p.min_stock
          ORDER BY total_stock ASC, p.name ASC
        `;
        
        // Ya no necesitamos pasar el threshold como parámetro porque usamos p.min_stock
        const result = await client.query(lowStockQuery);
        
        return NextResponse.json({
          success: true,
          low_stock_products: result.rows,
          threshold: threshold, // Mantener para compatibilidad, pero ya no se usa
          count: result.rows.length
        });
      }

      // Manejar alertas de expiración
      if (expirationDays) {
        const days = parseInt(expirationDays);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        
        const expirationQuery = `
          SELECT 
            se.id,
            se.product_id,
            p.name as product_name,
            p.brand_name,
            se.current_quantity,
            se.expiration_date,
            (se.expiration_date - CURRENT_DATE) as days_until_expiration
          FROM stock_entries se
          JOIN products p ON se.product_id = p.id
          WHERE se.current_quantity > 0 
            AND se.expiration_date IS NOT NULL
            AND se.expiration_date <= $1
          ORDER BY se.expiration_date ASC
        `;
        
        const result = await client.query(expirationQuery, [futureDate.toISOString().split('T')[0]]);
        
        return NextResponse.json({
          success: true,
          expiring_products: result.rows,
          days_ahead: days,
          count: result.rows.length
        });
      }

      // Funcionalidad original: obtener stock por producto específico
      if (!productId) {
        return NextResponse.json({ 
          error: { 
            message: 'Se requiere product_id, low_stock o expiration_days como parámetro', 
            status: 400 
          } 
        }, { status: 400 });
      }

      // Obtener entradas de stock para el producto específico
      const result = await client.query(
        `SELECT id, product_id, initial_quantity, current_quantity, 
                barcode, purchase_price, sale_price_unit, sale_price_wholesale,
                expiration_date, entry_date as created_at
         FROM stock_entries 
         WHERE product_id = $1 AND current_quantity > 0 
         ORDER BY expiration_date ASC, entry_date ASC`,
        [productId]
      );
      
      const stockEntries = result.rows;
      
      // Calcular días hasta expiración para cada entrada
      const stockEntriesWithDays = stockEntries.map(entry => {
        const today = new Date();
        const expirationDate = entry.expiration_date ? new Date(entry.expiration_date) : null;
        const daysUntilExpiration = expirationDate 
          ? Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        return {
          ...entry,
          days_until_expiration: daysUntilExpiration
        };
      });
      
      // Calcular totales
      const totalQuantity = stockEntries.reduce((sum, entry) => sum + entry.current_quantity, 0);
      const totalValue = stockEntries.reduce((sum, entry) => sum + (entry.current_quantity * entry.purchase_price), 0);

      return NextResponse.json({
        success: true,
        stock_entries: stockEntriesWithDays,
        totals: {
          quantity: totalQuantity,
          value: totalValue,
          entries_count: stockEntries.length
        }
      });
      
    } catch (error: any) {
      console.error('Error in stock-entries API:', error);
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

// POST - Crear nueva entrada de stock
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const body = await request.json();
      const {
        product_id,
        initial_quantity,
        barcode,
        purchase_price,
        sale_price_unit,
        sale_price_wholesale,
        expiration_date
      } = body;
      

      
      // Validar campos requeridos (considerando que pueden venir como strings)
      if (!product_id || initial_quantity === undefined || initial_quantity === null || 
          purchase_price === undefined || purchase_price === null) {

        return NextResponse.json({ 
          error: { 
            message: 'Faltan campos requeridos', 
            status: 400 
          } 
        }, { status: 400 });
      }
      
      // Crear nueva entrada de stock
      const result = await client.query(
        `INSERT INTO stock_entries 
         (product_id, quantity, current_quantity, initial_quantity, barcode, purchase_price, 
          sale_price_unit, sale_price_wholesale, expiration_date, entry_date)
         VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          product_id,
          initial_quantity,
          initial_quantity,
          barcode,
          purchase_price,
          sale_price_unit,
          sale_price_wholesale,
          expiration_date
        ]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Entrada de stock creada exitosamente',
        stock_entry: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error creating stock entry:', error);
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