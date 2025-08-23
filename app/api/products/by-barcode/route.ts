import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withVendedorAuth } from '../../../utils/auth/middleware';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

export async function GET(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    try {
      const { searchParams } = req.nextUrl;
      const barcode = searchParams.get('barcode');

      if (!barcode) {
        return NextResponse.json(
          {
            error: {
              message: 'Código de barras es requerido',
              status: 400
            }
          },
          { status: 400 }
        );
      }

      const client = new Client(dbConfig);
      await client.connect();

      try {

        // Buscar en stock_entries por código de barras y obtener información del producto
        // Implementar FIFO: seleccionar el stock entry con fecha de vencimiento más próxima
        const stockQuery = `
          SELECT 
            se.id,
            se.product_id,
            se.current_quantity,
            p.barcode,
            se.sale_price_unit,
            se.sale_price_wholesale,
            se.purchase_price,
            se.expiration_date,
            se.entry_date,
            p.id as product_id,
            p.name as product_name,
            p.image_url,
            b.name as brand_name,
            pt.name as type_name
          FROM stock_entries se
          JOIN products p ON se.product_id = p.id
          LEFT JOIN brands b ON p.brand_name = b.name
          LEFT JOIN product_types pt ON p.product_type_id = pt.id
          WHERE p.barcode = $1 AND se.current_quantity > 0
          ORDER BY 
            CASE WHEN se.expiration_date IS NULL THEN 1 ELSE 0 END,
            se.expiration_date ASC,
            se.entry_date ASC
        `;

        const stockResult = await client.query(stockQuery, [barcode.trim()]);

        if (stockResult.rows.length === 0) {
          return NextResponse.json({ 
            product: null, 
            message: 'No se encontró producto con ese código de barras o sin stock disponible' 
          });
        }

        // Seleccionar el primer stock entry (FIFO - más próximo a vencer o más antiguo)
        const stockEntry = stockResult.rows[0];

        // Obtener el stock total del producto
        const totalStockQuery = `
          SELECT COALESCE(SUM(current_quantity), 0) as total_stock
        FROM stock_entries 
        WHERE product_id = $1 AND current_quantity > 0
        `;
        
        const totalStockResult = await client.query(totalStockQuery, [stockEntry.product_id]);
        const totalStock = parseInt(totalStockResult.rows[0].total_stock) || 0;

        // Construir el objeto producto
        const product = {
          id: stockEntry.product_id,
          name: stockEntry.product_name,
          brand_name: stockEntry.brand_name || 'Sin marca',
          type_name: stockEntry.type_name || 'Sin tipo',
          total_stock: totalStock,
          image_url: stockEntry.image_url
        };

        return NextResponse.json({ 
          success: true,
          product,
          stockEntry: {
            id: stockEntry.id,
            sale_price_unit: stockEntry.sale_price_unit,
            sale_price_wholesale: stockEntry.sale_price_wholesale,
            current_quantity: stockEntry.current_quantity,
            purchase_price: stockEntry.purchase_price,
            expiration_date: stockEntry.expiration_date,
            barcode: stockEntry.barcode
          },
          message: 'Producto encontrado exitosamente'
        });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error in by-barcode API:', error);
      return NextResponse.json(
        {
          error: {
            message: 'Error interno del servidor',
            status: 500
          }
        },
        { status: 500 }
      );
    }
  });
}