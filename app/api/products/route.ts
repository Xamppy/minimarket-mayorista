import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withVendedorAuth } from '../../utils/auth/middleware';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
  client_encoding: 'UTF8'
};

// GET - Obtener todos los productos con información de stock
export async function GET(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      // Obtener productos con información de marcas y tipos
      const productsQuery = `
        SELECT 
          p.id,
          p.name,
          p.image_url,
          p.created_at,
          p.brand_name,
          pt.name as type_name
        FROM products p
        LEFT JOIN product_types pt ON p.product_type_id = pt.id
        ORDER BY p.created_at DESC
      `;
      
      const productsResult = await client.query(productsQuery);
      
      // Calcular stock total para cada producto
      const productsWithStock = await Promise.all(
        productsResult.rows.map(async (product) => {
          const stockQuery = `
            SELECT COALESCE(SUM(current_quantity), 0) as total_stock
            FROM stock_entries 
            WHERE product_id = $1 AND current_quantity > 0
          `;
          
          const stockResult = await client.query(stockQuery, [product.id]);
          const totalStock = parseInt(stockResult.rows[0]?.total_stock || '0');
          
          return {
            id: product.id,
            name: product.name,
            brand_name: product.brand_name || 'Sin marca',
            type_name: product.type_name || 'Sin tipo',
            image_url: product.image_url,
            total_stock: totalStock,
            created_at: product.created_at
          };
        })
      );
      
      return NextResponse.json({
        products: productsWithStock,
        total: productsWithStock.length
      });
      
    } catch (error) {
      console.error('Error al obtener productos:', error);
      return NextResponse.json(
        { error: { message: 'Error al obtener productos', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      const body = await request.json();
      const { name, brand_name, product_type_id, image_url, barcode } = body;
      
      // Validaciones básicas
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: { message: 'El nombre del producto es requerido', status: 400 } },
          { status: 400 }
        );
      }
      
      await client.connect();
      
      // Verificar si el producto ya existe
      const existingProduct = await client.query(
        'SELECT id FROM products WHERE LOWER(name) = LOWER($1)',
        [name.trim()]
      );
      
      if (existingProduct.rows.length > 0) {
        return NextResponse.json(
          { error: { message: 'Ya existe un producto con ese nombre', status: 409 } },
          { status: 409 }
        );
      }
      
      // Crear nuevo producto
      const insertQuery = `
        INSERT INTO products (name, brand_name, product_type_id, image_url, barcode) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id, name, brand_name, product_type_id, image_url, barcode, created_at
      `;
      
      const result = await client.query(insertQuery, [
        name.trim(),
        brand_name || null,
        product_type_id || null,
        image_url || null,
        barcode || null
      ]);
      
      return NextResponse.json({
        product: result.rows[0],
        message: 'Producto creado exitosamente'
      }, { status: 201 });
      
    } catch (error) {
      console.error('Error al crear producto:', error);
      return NextResponse.json(
        { error: { message: 'Error al crear producto', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}