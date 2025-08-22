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

// GET - Obtener todas las marcas
export async function GET(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const result = await client.query(`
        SELECT 
          b.id, 
          b.name, 
          b.created_at,
          COUNT(p.id) as product_count
        FROM brands b
        LEFT JOIN products p ON b.name = p.brand_name
        GROUP BY b.id, b.name, b.created_at
        ORDER BY b.name ASC
      `);
      
      const brandsWithUsage = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        product_count: parseInt(row.product_count) || 0
      }));
      
      return NextResponse.json(brandsWithUsage);
      
    } catch (error) {
      console.error('Error al obtener marcas:', error);
      return NextResponse.json(
        { error: { message: 'Error al obtener marcas', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// POST - Crear nueva marca
export async function POST(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      const body = await request.json();
      const { name } = body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: { message: 'El nombre de la marca es requerido', status: 400 } },
          { status: 400 }
        );
      }
      
      await client.connect();
      
      // Verificar si la marca ya existe
      const existingBrand = await client.query(
        'SELECT id FROM brands WHERE LOWER(name) = LOWER($1)',
        [name.trim()]
      );
      
      if (existingBrand.rows.length > 0) {
        return NextResponse.json(
          { error: { message: 'Ya existe una marca con ese nombre', status: 409 } },
          { status: 409 }
        );
      }
      
      // Crear nueva marca
      const result = await client.query(
        'INSERT INTO brands (name) VALUES ($1) RETURNING id, name, created_at',
        [name.trim()]
      );
      
      return NextResponse.json({
        brand: result.rows[0],
        message: 'Marca creada exitosamente'
      }, { status: 201 });
      
    } catch (error) {
      console.error('Error al crear marca:', error);
      return NextResponse.json(
        { error: { message: 'Error al crear marca', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}