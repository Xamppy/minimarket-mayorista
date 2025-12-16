import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAdminAuth } from '../../../utils/auth/middleware';
import { AuthenticatedUser } from '../../../types/auth';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

// GET /api/barcodes/[id] - Obtener un código de barras específico
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de código de barras requerido' },
        { status: 400 }
      );
    }

    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const result = await client.query(`
        SELECT 
          gb.id,
          gb.barcode,
          gb.name,
          gb.description,
          gb.created_at,
          gb.updated_at,
          gb.is_active,
          u.email as created_by_email,
          format_barcode_display(gb.barcode) as formatted_barcode
        FROM generated_barcodes gb
        LEFT JOIN users u ON gb.created_by = u.id
        WHERE gb.id = $1 AND gb.is_active = true
      `, [id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Código de barras no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(result.rows[0]);
      
    } catch (error: any) {
      console.error('Error al obtener código de barras:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// PUT /api/barcodes/[id] - Actualizar un código de barras
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de código de barras requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description } = body;
    
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del producto es requerido' },
        { status: 400 }
      );
    }
    
    if (name.trim().length > 255) {
      return NextResponse.json(
        { error: 'El nombre no puede exceder 255 caracteres' },
        { status: 400 }
      );
    }

    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      // Verificar que el código de barras existe
      const existingResult = await client.query(
        'SELECT id FROM generated_barcodes WHERE id = $1 AND is_active = true',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Código de barras no encontrado' },
          { status: 404 }
        );
      }
      
      // Verificar unicidad del nombre (excluyendo el código actual)
      const duplicateResult = await client.query(
        'SELECT id FROM generated_barcodes WHERE LOWER(name) = LOWER($1) AND id != $2 AND is_active = true',
        [name.trim(), id]
      );
      
      if (duplicateResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe otro código de barras para este producto' },
          { status: 409 }
        );
      }
      
      // Actualizar el código de barras
      const result = await client.query(`
        UPDATE generated_barcodes 
        SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $3 AND is_active = true
        RETURNING 
          id, 
          barcode, 
          name, 
          description, 
          created_at, 
          updated_at, 
          is_active,
          format_barcode_display(barcode) as formatted_barcode
      `, [name.trim(), description?.trim() || null, id]);
      
      return NextResponse.json(result.rows[0]);
      
    } catch (error: any) {
      console.error('Error al actualizar código de barras:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// DELETE /api/barcodes/[id] - Eliminar (desactivar) un código de barras
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de código de barras requerido' },
        { status: 400 }
      );
    }

    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      // Verificar que el código de barras existe
      const existingResult = await client.query(
        'SELECT id FROM generated_barcodes WHERE id = $1 AND is_active = true',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Código de barras no encontrado' },
          { status: 404 }
        );
      }
      
      // Desactivar el código de barras (soft delete)
      await client.query(
        'UPDATE generated_barcodes SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
      
      return NextResponse.json({ message: 'Código de barras eliminado exitosamente' });
      
    } catch (error: any) {
      console.error('Error al eliminar código de barras:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}