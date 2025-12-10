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
      const rawBarcode = searchParams.get('barcode');

      if (!rawBarcode) {
        return NextResponse.json(
          { error: 'Código de barras es requerido' },
          { status: 400 }
        );
      }

      // Limpieza como solicitó el usuario: .trim()
      // Mantengo la sanitización extra por robustez
      const barcode = rawBarcode.trim();

      const client = new Client(dbConfig);
      await client.connect();

      try {
        // Consulta Robusta: Producot + Stock + Precio (del lote más antiguo/prioritario)
        const query = `
          SELECT 
            p.id, 
            p.name, 
            p.barcode, 
            p.image_url,
            p.brand_name,
            pt.name as type_name,
            COALESCE(SUM(se.current_quantity), 0) as current_stock,
            -- Subconsulta para obtener el precio del lote más prioritario (FIFO)
            (
              SELECT sale_price_unit 
              FROM stock_entries 
              WHERE product_id = p.id AND current_quantity > 0 
              ORDER BY 
                CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END,
                expiration_date ASC, 
                entry_date ASC 
              LIMIT 1
            ) as price,
             -- Necesitamos un stock entry ID para el carrito? Usamos el más prioritario
            (
              SELECT id
              FROM stock_entries 
              WHERE product_id = p.id AND current_quantity > 0 
              ORDER BY 
                CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END,
                expiration_date ASC, 
                entry_date ASC 
              LIMIT 1
            ) as best_stock_entry_id
          FROM products p
          LEFT JOIN stock_entries se ON p.id = se.product_id
          LEFT JOIN product_types pt ON p.product_type_id = pt.id
          WHERE p.barcode = $1
          GROUP BY p.id, pt.name
        `;

        const result = await client.query(query, [barcode]);

        if (result.rows.length === 0) {
           return NextResponse.json(
            { error: 'Producto no encontrado' }, 
            { status: 404 }
          );
        }

        const data = result.rows[0];
        const totalStock = parseInt(data.current_stock);

        // Estructura de respuesta
        const product = {
          id: data.id,
          name: data.name,
          brand_name: data.brand_name || 'Sin marca',
          type_name: data.type_name || 'Sin tipo',
          total_stock: totalStock,
          image_url: data.image_url,
          // Precio puede ser null si no hay stock_entries
          price: data.price ? parseInt(data.price) : 0 
        };

        // Si tenemos un stock entry ID, lo pasamos para compatibilidad
        const stockEntry = data.best_stock_entry_id ? {
          id: data.best_stock_entry_id,
          sale_price_unit: product.price,
          sale_price_wholesale: 0, // No lo tenemos en el group by, simplificado
          current_quantity: totalStock, // Dummy value para el entry específico
          purchase_price: 0,
          barcode: data.barcode
        } : null;

        return NextResponse.json({
          success: true,
          product,
          stockEntry, // Mantenemos compatibilidad si el front lo usa
          message: totalStock > 0 ? 'Producto encontrado' : 'Producto sin stock'
        });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error in by-barcode API:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  });
}