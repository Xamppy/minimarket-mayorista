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
        // Paso 1: Buscar el producto por código de barras
        const productQuery = `
          SELECT 
            p.id, 
            p.name, 
            p.barcode, 
            p.image_url,
            p.brand_name,
            pt.name as type_name
          FROM products p
          LEFT JOIN product_types pt ON p.product_type_id = pt.id
          WHERE p.barcode = $1
        `;

        const productResult = await client.query(productQuery, [barcode]);

        if (productResult.rows.length === 0) {
          return NextResponse.json(
            { error: 'Producto no encontrado' }, 
            { status: 404 }
          );
        }

        const productData = productResult.rows[0];

        // Paso 2: Obtener todos los stock entries con lógica FEFO
        const stockEntriesQuery = `
          SELECT 
            id,
            product_id,
            current_quantity,
            initial_quantity,
            sale_price_unit,
            sale_price_wholesale,
            purchase_price,
            barcode,
            expiration_date,
            entry_date
          FROM stock_entries
          WHERE product_id = $1 AND current_quantity > 0
          ORDER BY 
            CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END,
            expiration_date ASC, 
            entry_date ASC
        `;

        const stockEntriesResult = await client.query(stockEntriesQuery, [productData.id]);
        const stockEntries = stockEntriesResult.rows;

        // Calcular stock total
        const totalStock = stockEntries.reduce((sum, entry) => sum + entry.current_quantity, 0);

        // Estructura de respuesta del producto
        const product = {
          id: productData.id,
          name: productData.name,
          brand_name: productData.brand_name || 'Sin marca',
          type_name: productData.type_name || 'Sin tipo',
          total_stock: totalStock,
          image_url: productData.image_url
        };

        // DEPRECATED: Mantener compatibilidad con código anterior
        const stockEntry = stockEntries.length > 0 ? {
          id: stockEntries[0].id,
          sale_price_unit: stockEntries[0].sale_price_unit,
          sale_price_wholesale: stockEntries[0].sale_price_wholesale,
          current_quantity: stockEntries[0].current_quantity,
          purchase_price: stockEntries[0].purchase_price,
          barcode: stockEntries[0].barcode,
          expiration_date: stockEntries[0].expiration_date
        } : null;

        return NextResponse.json({
          success: true,
          product,
          stockEntries, // NUEVO: Array completo con lógica FEFO
          stockEntry, // DEPRECATED: Mantener para compatibilidad
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