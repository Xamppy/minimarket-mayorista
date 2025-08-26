import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAdminAuth } from '../../utils/auth/middleware';
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

// GET - Obtener todos los códigos de barras
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      // Obtener parámetros de consulta
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search');
      
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          gb.id,
          gb.barcode,
          gb.name,
          gb.description,
          gb.created_at,
          gb.updated_at,
          gb.is_active,
          u.email as created_by_email
        FROM generated_barcodes gb
        LEFT JOIN users u ON gb.created_by = u.id
        WHERE gb.is_active = true
      `;
      
      const params: any[] = [];
      let paramCount = 0;
      
      if (search) {
        paramCount++;
        query += ` AND (gb.name ILIKE $${paramCount} OR gb.description ILIKE $${paramCount} OR gb.barcode ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }
      
      query += ` ORDER BY gb.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);
      
      const result = await client.query(query, params);
      
      // Contar total de registros para paginación
      let countQuery = `
        SELECT COUNT(*) as total
        FROM generated_barcodes gb
        WHERE gb.is_active = true
      `;
      
      const countParams: any[] = [];
      if (search) {
        countQuery += ` AND (gb.name ILIKE $1 OR gb.description ILIKE $1 OR gb.barcode ILIKE $1)`;
        countParams.push(`%${search}%`);
      }
      
      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      return NextResponse.json({
        barcodes: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      console.error('Error al obtener códigos de barras:', error);
      return NextResponse.json(
        { error: { message: 'Error al obtener códigos de barras', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// POST - Crear nuevo código de barras
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (req, user: AuthenticatedUser) => {
    const client = new Client(dbConfig);
    
    try {
      const body = await request.json();
      const { name, description } = body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: { message: 'El nombre del producto es requerido', status: 400 } },
          { status: 400 }
        );
      }
      
      if (name.trim().length > 255) {
        return NextResponse.json(
          { error: { message: 'El nombre no puede exceder 255 caracteres', status: 400 } },
          { status: 400 }
        );
      }
      
      await client.connect();
      
      // Verificar si ya existe un código de barras para este producto
      const existingBarcode = await client.query(
        'SELECT id FROM generated_barcodes WHERE LOWER(name) = LOWER($1) AND is_active = true',
        [name.trim()]
      );
      
      if (existingBarcode.rows.length > 0) {
        return NextResponse.json(
          { error: { message: 'Ya existe un código de barras para este producto', status: 409 } },
          { status: 409 }
        );
      }
      
      // Generar código de barras usando la función de la base de datos
      const result = await client.query(`
        INSERT INTO generated_barcodes (barcode, name, description, created_by)
        VALUES (generate_gs1_chile_barcode(), $1, $2, $3)
        RETURNING id, barcode, name, description, created_at, is_active
      `, [name.trim(), description?.trim() || null, user.id]);
      
      const newBarcode = result.rows[0];
      
      return NextResponse.json({
        barcode: {
          ...newBarcode,
          formatted_barcode: await client.query(
            'SELECT format_barcode_display($1) as formatted',
            [newBarcode.barcode]
          ).then(res => res.rows[0].formatted)
        },
        message: 'Código de barras generado exitosamente'
      }, { status: 201 });
      
    } catch (error) {
      console.error('Error al generar código de barras:', error);
      return NextResponse.json(
        { error: { message: 'Error al generar código de barras', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}