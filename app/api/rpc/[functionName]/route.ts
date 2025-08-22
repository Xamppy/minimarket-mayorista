import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import jwt from 'jsonwebtoken';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

const jwtSecret = process.env.JWT_SECRET;

// Verificar autenticación
async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return null;
  }

  if (!jwtSecret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ functionName: string }> }) {
  try {
    // Verificar autenticación
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { functionName } = await params;
    const body = await request.json();

    const client = new Client(dbConfig);
    await client.connect();

    try {
      let result;
      
      switch (functionName) {
        case 'get_daily_sales_stats':
          const dailyStatsResult = await client.query('SELECT get_daily_sales_stats() as stats');
          result = dailyStatsResult.rows[0]?.stats || [];
          break;
          
        case 'get_products_with_stock':
          const productsResult = await client.query('SELECT * FROM get_products_with_stock()');
          result = productsResult.rows || [];
          break;
          
        case 'get_user_role':
          // Esta función se maneja en el cliente, pero por compatibilidad
          const roleResult = await client.query(
            'SELECT role FROM users WHERE id = $1',
            [body.user_id]
          );
          result = roleResult.rows[0]?.role || null;
          break;
          
        case 'get_sales_report':
          const { period } = body;
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
          
          result = {
            totalSales,
            totalTransactions,
            period,
            startDate: reportStartDate.toISOString(),
            endDate: now.toISOString()
          };
          break;
          
        case 'get_top_selling_products':
          const { limit = 5 } = body;
          
          const topProductsResult = await client.query(`
            SELECT 
              p.id,
              p.name,
              COALESCE(b.name, p.brand_name, 'Sin marca') as brand_name,
              COALESCE(pt.name, 'Sin tipo') as type_name,
              SUM(si.quantity) as total_sold,
              SUM(si.unit_price * si.quantity) as total_revenue,
              SUM(CASE WHEN si.quantity >= 3 AND p.wholesale_price IS NOT NULL AND si.unit_price = p.wholesale_price 
                       THEN si.quantity ELSE 0 END) as wholesale_sales,
              SUM(CASE WHEN si.quantity >= 3 AND p.wholesale_price IS NOT NULL AND si.unit_price = p.wholesale_price 
                       THEN si.unit_price * si.quantity ELSE 0 END) as wholesale_revenue,
              SUM(CASE WHEN NOT (si.quantity >= 3 AND p.wholesale_price IS NOT NULL AND si.unit_price = p.wholesale_price) 
                       THEN si.quantity ELSE 0 END) as regular_sales,
              SUM(CASE WHEN NOT (si.quantity >= 3 AND p.wholesale_price IS NOT NULL AND si.unit_price = p.wholesale_price) 
                       THEN si.unit_price * si.quantity ELSE 0 END) as regular_revenue,
              CASE WHEN COUNT(CASE WHEN p.wholesale_price IS NOT NULL THEN 1 END) > 0 THEN true ELSE false END as has_wholesale_price,
              AVG(p.unit_price) as unit_price,
              AVG(p.wholesale_price) as wholesale_price
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN product_types pt ON p.product_type_id = pt.id
            GROUP BY p.id, p.name, p.brand_name, b.name, pt.name
            ORDER BY total_sold DESC
            LIMIT $1
          `, [limit]);
          
          result = topProductsResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            brand_name: row.brand_name,
            type_name: row.type_name,
            totalSold: parseInt(row.total_sold),
            totalRevenue: parseFloat(row.total_revenue),
            wholesaleSales: parseInt(row.wholesale_sales),
            wholesaleRevenue: parseFloat(row.wholesale_revenue),
            regularSales: parseInt(row.regular_sales),
            regularRevenue: parseFloat(row.regular_revenue),
            hasWholesalePrice: row.has_wholesale_price,
            unitPrice: parseFloat(row.unit_price) || 0,
            wholesalePrice: row.wholesale_price ? parseFloat(row.wholesale_price) : null,
            wholesalePercentage: parseInt(row.total_sold) > 0 ? (parseInt(row.wholesale_sales) / parseInt(row.total_sold)) * 100 : 0,
            regularPercentage: parseInt(row.total_sold) > 0 ? (parseInt(row.regular_sales) / parseInt(row.total_sold)) * 100 : 0
          }));
           break;
           
        case 'get_recent_sales':
          const { limit: salesLimit = 10 } = body;
          
          const recentSalesResult = await client.query(`
            SELECT 
              s.id,
              s.total_amount,
              s.sale_date,
              s.user_id,
              u.email as seller_email,
              u.email as seller_name,
              json_agg(
                json_build_object(
                  'id', si.id,
                  'quantity_sold', si.quantity,
                  'price_at_sale', si.unit_price,
                  'sale_format', 'unit',
                  'product', json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'brand_name', COALESCE(b.name, p.brand_name, 'Sin marca'),
                    'type_name', COALESCE(pt.name, 'Sin tipo'),
                    'unit_price', p.unit_price,
                    'wholesale_price', p.wholesale_price
                  )
                )
              ) as sale_items
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON si.product_id = p.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN product_types pt ON p.product_type_id = pt.id
            GROUP BY s.id, s.total_amount, s.sale_date, s.user_id, u.email
            ORDER BY s.sale_date DESC
            LIMIT $1
          `, [salesLimit]);
          
          result = recentSalesResult.rows.map(row => ({
            id: row.id,
            total_amount: parseFloat(row.total_amount),
            created_at: row.sale_date,
            seller_id: row.user_id,
            seller_email: row.seller_email,
            seller_name: row.seller_name,
            sale_items: row.sale_items.map((item: any) => ({
              ...item,
              quantity_sold: parseInt(item.quantity_sold),
              price_at_sale: parseFloat(item.price_at_sale),
              isWholesale: item.quantity_sold >= 3 && 
                          item.stock_entry.sale_price_wholesale && 
                          item.price_at_sale === parseFloat(item.stock_entry.sale_price_wholesale),
              stock_entry: {
                ...item.stock_entry,
                sale_price_unit: parseFloat(item.stock_entry.sale_price_unit),
                sale_price_wholesale: item.stock_entry.sale_price_wholesale ? parseFloat(item.stock_entry.sale_price_wholesale) : null
              }
            }))
          }));
          break;

        case 'search_sales_by_date':
          const { startDate, endDate, limit: searchLimit = 50 } = body;
          
          if (!startDate || !endDate) {
            return NextResponse.json(
              { error: 'Se requieren fechas de inicio y fin' },
              { status: 400 }
            );
          }
          
          const searchSalesResult = await client.query(`
            SELECT 
              s.id,
              s.total_amount,
              s.sale_date,
              s.user_id,
              u.email as seller_email,
              u.email as seller_name,
              json_agg(
                json_build_object(
                  'id', si.id,
                  'quantity_sold', si.quantity,
                  'price_at_sale', si.unit_price,
                  'sale_format', 'unit',
                  'product', json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'brand_name', COALESCE(b.name, p.brand_name, 'Sin marca'),
                    'type_name', COALESCE(pt.name, 'Sin tipo'),
                    'unit_price', p.unit_price,
                    'wholesale_price', p.wholesale_price
                  )
                )
              ) as sale_items
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON si.product_id = p.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN product_types pt ON p.product_type_id = pt.id
            WHERE s.sale_date >= $1 AND s.sale_date <= $2
            GROUP BY s.id, s.total_amount, s.sale_date, s.user_id, u.email
            ORDER BY s.sale_date DESC
            LIMIT $3
          `, [startDate, endDate, searchLimit]);
          
          result = searchSalesResult.rows.map(row => ({
            id: row.id,
            total_amount: parseFloat(row.total_amount),
            created_at: row.sale_date,
            seller_id: row.user_id,
            seller_email: row.seller_email,
            seller_name: row.seller_name,
            sale_items: row.sale_items.map((item: any) => ({
              ...item,
              quantity_sold: parseInt(item.quantity_sold),
              price_at_sale: parseFloat(item.price_at_sale)
            }))
          }));
           break;

        case 'get_product_categories':
          const categoriesResult = await client.query(`
            SELECT 
              pt.id,
              pt.name,
              pt.description,
              COUNT(p.id) as product_count
            FROM product_types pt
            LEFT JOIN products p ON p.product_type_id = pt.id
            GROUP BY pt.id, pt.name, pt.description
            ORDER BY pt.name
          `);
          
          result = categoriesResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            product_count: parseInt(row.product_count)
          }));
          break;

        case 'get_product_brands':
          const brandsResult = await client.query(`
            SELECT 
              b.id,
              b.name,
              b.description,
              COUNT(p.id) as product_count
            FROM brands b
            LEFT JOIN products p ON p.brand_id = b.id
            GROUP BY b.id, b.name, b.description
            ORDER BY b.name
          `);
          
          result = brandsResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            product_count: parseInt(row.product_count)
          }));
          break;

        case 'get_filtered_sales_report':
          const { 
            startDate: filterStartDate, 
            endDate: filterEndDate, 
            categoryId, 
            brandId, 
            reportLimit = 50 
          } = body;
          
          let whereConditions = [];
          let queryParams = [];
          let paramIndex = 1;
          
          if (filterStartDate) {
            whereConditions.push(`s.sale_date >= $${paramIndex}`);
            queryParams.push(filterStartDate);
            paramIndex++;
          }
          
          if (filterEndDate) {
            whereConditions.push(`s.sale_date <= $${paramIndex}`);
            queryParams.push(filterEndDate);
            paramIndex++;
          }
          
          if (categoryId) {
            whereConditions.push(`p.product_type_id = $${paramIndex}`);
            queryParams.push(categoryId);
            paramIndex++;
          }
          
          if (brandId) {
            whereConditions.push(`p.brand_id = $${paramIndex}`);
            queryParams.push(brandId);
            paramIndex++;
          }
          
          const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';
          
          queryParams.push(reportLimit);
          
          const filteredSalesResult = await client.query(`
            SELECT 
              p.id as product_id,
              p.name as product_name,
              COALESCE(b.name, p.brand_name, 'Sin marca') as brand_name,
              COALESCE(pt.name, 'Sin tipo') as category_name,
              SUM(si.quantity) as total_quantity,
              SUM(si.quantity * si.unit_price) as total_revenue,
              AVG(si.unit_price) as avg_price,
              COUNT(DISTINCT s.id) as sales_count,
              MIN(s.sale_date) as first_sale,
              MAX(s.sale_date) as last_sale
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN product_types pt ON p.product_type_id = pt.id
            ${whereClause}
            GROUP BY p.id, p.name, p.brand_name, b.name, pt.name
            ORDER BY total_revenue DESC
            LIMIT $${paramIndex}
          `, queryParams);
          
          result = {
            sales: filteredSalesResult.rows.map(row => ({
              product_id: row.product_id,
              product_name: row.product_name,
              brand_name: row.brand_name,
              category_name: row.category_name,
              total_quantity: parseInt(row.total_quantity),
              total_revenue: parseFloat(row.total_revenue),
              avg_price: parseFloat(row.avg_price),
              sales_count: parseInt(row.sales_count),
              first_sale: row.first_sale,
              last_sale: row.last_sale
            })),
            summary: {
              total_products: filteredSalesResult.rows.length,
              total_revenue: filteredSalesResult.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0),
              total_quantity: filteredSalesResult.rows.reduce((sum, row) => sum + parseInt(row.total_quantity), 0)
            }
          };
          break;
          
        default:
          return NextResponse.json(
            { error: `Función RPC '${functionName}' no implementada` },
            { status: 400 }
          );
      }

      return NextResponse.json({ result });
      
    } finally {
      await client.end();
    }
    
  } catch (error) {
    console.error('Error en función RPC:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}