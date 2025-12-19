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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sale_id: string }> }
) {
  return withVendedorAuth(request, async (req, user) => {
    try {
      const { sale_id } = await params;

      if (!sale_id) {
        return NextResponse.json(
          {
            error: {
              message: 'ID de venta es requerido',
              status: 400
            }
          },
          { status: 400 }
        );
      }

      const client = new Client(dbConfig);
      await client.connect();

      try {
        // Obtener datos básicos de la venta (incluyendo campos de descuento)
        const saleQuery = `
          SELECT 
            s.id,
            s.user_id as seller_id,
            s.total_amount,
            s.sale_date as created_at,
            s.ticket_number,
            s.discount_type,
            s.discount_value,
            u.email as seller_email
          FROM sales s
          LEFT JOIN users u ON s.user_id = u.id
          WHERE s.id = $1
        `;
        
        const saleResult = await client.query(saleQuery, [sale_id]);
        
        if (saleResult.rows.length === 0) {
          return NextResponse.json(
            {
              error: {
                message: 'Venta no encontrada',
                status: 404
              }
            },
            { status: 404 }
          );
        }
        
        const sale = saleResult.rows[0];
        
        // Obtener items de la venta con información completa
        const itemsQuery = `
          SELECT DISTINCT ON (si.id)
            si.id,
            si.quantity,
            si.unit_price,
            si.sale_type as sale_format,
            se.barcode,
            p.name as product_name,
            b.name as brand_name
          FROM sale_items si
          JOIN products p ON si.product_id = p.id
          LEFT JOIN stock_entries se ON p.id = se.product_id
          LEFT JOIN brands b ON p.brand_id = b.id
          WHERE si.sale_id = $1
          ORDER BY si.id, se.entry_date DESC
        `;
        
        const itemsResult = await client.query(itemsQuery, [sale_id]);
        
        // Calcular el subtotal sumando los items
        const subtotal = itemsResult.rows.reduce((sum: number, item: any) => {
          return sum + (parseFloat(item.unit_price) * item.quantity);
        }, 0);

        // Construir objeto de descuento si existe
        let discount = undefined;
        if (sale.discount_type && sale.discount_value) {
          const discountValue = parseFloat(sale.discount_value);
          let discountAmount = 0;
          
          if (sale.discount_type === 'amount') {
            discountAmount = discountValue;
          } else if (sale.discount_type === 'percentage') {
            discountAmount = subtotal * (discountValue / 100);
          }
          
          discount = {
            type: sale.discount_type as 'amount' | 'percentage',
            value: discountValue,
            amount: discountAmount
          };
        }
        
        // Formatear los datos para que coincidan con la interfaz esperada
        const saleData = {
          id: sale.id.toString(),
          seller_id: sale.seller_id,
          total_amount: parseFloat(sale.total_amount),
          created_at: sale.created_at,
          ticket_number: sale.ticket_number,
          seller_email: sale.seller_email || '',
          subtotal: subtotal,
          discount: discount,
          sale_items: itemsResult.rows.map((item: any) => ({
            id: item.id.toString(),
            quantity_sold: item.quantity,
            price_at_sale: parseFloat(item.unit_price),
            sale_format: item.sale_format,
            product_name: item.product_name,
            brand_name: item.brand_name || 'Sin marca',
            barcode: item.barcode || ''
          }))
        };
        
        return NextResponse.json({
          success: true,
          data: saleData
        });
        
      } finally {
        await client.end();
      }
      
    } catch (error) {
      console.error('Error fetching sale data:', error);
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