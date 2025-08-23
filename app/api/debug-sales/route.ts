import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

export async function GET(request: NextRequest) {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('=== DEBUG SALES - CONEXIÓN EXITOSA ===');
    
    // Calcular fechas de las últimas 12 horas
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - (12 * 60 * 60 * 1000));
    
    console.log('Período:', twelveHoursAgo.toISOString(), 'a', now.toISOString());
    
    // Obtener todas las ventas de las últimas 12 horas
    const result = await client.query(
      `SELECT id, total_amount, sale_date, user_id 
       FROM sales 
       WHERE sale_date >= $1 
         AND sale_date <= $2 
       ORDER BY sale_date DESC`,
      [twelveHoursAgo.toISOString(), now.toISOString()]
    );
    
    const sales = result.rows;
    console.log('Ventas encontradas:', sales.length);
    
    // Log detallado de cada venta
    sales.forEach((sale, index) => {
      console.log(`Venta ${index + 1}:`, {
        id: sale.id,
        total_amount: sale.total_amount,
        type: typeof sale.total_amount,
        sale_date: sale.sale_date,
        user_id: sale.user_id
      });
    });
    
    // Calcular total
    const total = sales.reduce((sum, sale) => {
      const amount = parseFloat(sale.total_amount);
      console.log(`Sumando: ${sum} + ${amount} (${typeof sale.total_amount})`);
      return sum + amount;
    }, 0);
    
    console.log('Total calculado:', total);
    
    // También obtener información de sale_items para verificar
    const itemsResult = await client.query(
      `SELECT si.sale_id, si.quantity, si.unit_price, si.total_price,
              s.total_amount as sale_total
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       WHERE s.sale_date >= $1 
         AND s.sale_date <= $2
       ORDER BY s.sale_date DESC, si.id`,
      [twelveHoursAgo.toISOString(), now.toISOString()]
    );
    
    console.log('=== ITEMS DE VENTAS ===');
    const itemsBySale = {};
    itemsResult.rows.forEach(item => {
      if (!itemsBySale[item.sale_id]) {
        itemsBySale[item.sale_id] = {
          sale_total: item.sale_total,
          items: [],
          calculated_total: 0
        };
      }
      itemsBySale[item.sale_id].items.push(item);
      itemsBySale[item.sale_id].calculated_total += parseFloat(item.total_price);
    });
    
    Object.entries(itemsBySale).forEach(([saleId, data]) => {
      console.log(`Venta ${saleId}:`);
      console.log(`  Total en tabla sales: ${data.sale_total}`);
      console.log(`  Total calculado de items: ${data.calculated_total}`);
      console.log(`  Items:`, data.items.map(item => ({
        quantity: item.quantity,
        price: item.unit_price,
        total: item.total_price
      })));
      console.log('---');
    });
    
    return NextResponse.json({
      success: true,
      debug: true,
      period: {
        start: twelveHoursAgo.toISOString(),
        end: now.toISOString()
      },
      sales_count: sales.length,
      sales: sales,
      total_calculated: total,
      items_by_sale: itemsBySale
    });
    
  } catch (error) {
    console.error('Error en debug-sales:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  } finally {
    await client.end();
  }
}