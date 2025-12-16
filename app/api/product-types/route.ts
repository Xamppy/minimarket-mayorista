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

// GET - Obtener todos los tipos de productos
export async function GET(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const result = await client.query(`
        SELECT 
          pt.id, 
          pt.name, 
          pt.created_at,
          COUNT(p.id) as product_count
        FROM product_types pt
        LEFT JOIN products p ON pt.id = p.product_type_id
        GROUP BY pt.id, pt.name, pt.created_at
        ORDER BY pt.name ASC
      `);
      
      const productTypesWithUsage = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        product_count: parseInt(row.product_count) || 0
      }));
      
      return NextResponse.json(productTypesWithUsage);
      
    } catch (error) {
      console.error('Error al obtener tipos de productos:', error);
      return NextResponse.json(
        { error: { message: 'Error al obtener tipos de productos', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// POST - Crear nuevo tipo de producto
export async function POST(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      const body = await request.json();
      const { name } = body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: { message: 'El nombre del tipo de producto es requerido', status: 400 } },
          { status: 400 }
        );
      }
      
      await client.connect();
      
      // Verificar si el tipo ya existe
      const existingType = await client.query(
        'SELECT id FROM product_types WHERE LOWER(name) = LOWER($1)',
        [name.trim()]
      );
      
      if (existingType.rows.length > 0) {
        return NextResponse.json(
          { error: { message: 'Ya existe un tipo de producto con ese nombre', status: 409 } },
          { status: 409 }
        );
      }
      
      // Crear nuevo tipo
      const result = await client.query(
        'INSERT INTO product_types (name) VALUES ($1) RETURNING id, name, created_at',
        [name.trim()]
      );
      
      return NextResponse.json({
        productType: result.rows[0],
        message: 'Tipo de producto creado exitosamente'
      }, { status: 201 });
      
    } catch (error) {
      console.error('Error al crear tipo de producto:', error);
      return NextResponse.json(
        { error: { message: 'Error al crear tipo de producto', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}