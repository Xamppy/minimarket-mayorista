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

// GET /api/brands/[id] - Obtener una marca específica
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de marca requerido' },
        { status: 400 }
      );
    }

    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const result = await client.query(
        'SELECT id, name, created_at, updated_at FROM brands WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Marca no encontrada' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(result.rows[0]);
      
    } catch (error: any) {
      console.error('Error al obtener marca:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// PUT /api/brands/[id] - Actualizar una marca
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de marca requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;
    
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la marca es requerido' },
        { status: 400 }
      );
    }
    
    if (name.trim().length < 1 || name.trim().length > 100) {
      return NextResponse.json(
        { error: 'El nombre de la marca debe tener entre 1 y 100 caracteres' },
        { status: 400 }
      );
    }

    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      // Verificar que la marca existe
      const existingResult = await client.query(
        'SELECT id FROM brands WHERE id = $1',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Marca no encontrada' },
          { status: 404 }
        );
      }
      
      // Verificar unicidad (excluyendo la marca actual)
      const duplicateResult = await client.query(
        'SELECT id FROM brands WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name.trim(), id]
      );
      
      if (duplicateResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe otra marca con este nombre' },
          { status: 409 }
        );
      }
      
      // Actualizar la marca
      const result = await client.query(
        'UPDATE brands SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, created_at, updated_at',
        [name.trim(), id]
      );
      
      return NextResponse.json(result.rows[0]);
      
    } catch (error: any) {
      console.error('Error al actualizar marca:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Ya existe otra marca con este nombre' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// DELETE /api/brands/[id] - Eliminar una marca
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de marca requerido' },
        { status: 400 }
      );
    }

    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      // Verificar que la marca existe
      const existingResult = await client.query(
        'SELECT id FROM brands WHERE id = $1',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Marca no encontrada' },
          { status: 404 }
        );
      }
      
      // Verificar si hay productos usando esta marca
      const productsResult = await client.query(
        'SELECT COUNT(*) as count FROM products WHERE brand_id = $1',
        [id]
      );
      
      if (parseInt(productsResult.rows[0].count) > 0) {
        return NextResponse.json(
          { error: 'No se puede eliminar la marca porque tiene productos asociados' },
          { status: 409 }
        );
      }
      
      // Eliminar la marca
      await client.query(
        'DELETE FROM brands WHERE id = $1',
        [id]
      );
      
      return NextResponse.json({ message: 'Marca eliminada exitosamente' });
      
    } catch (error: any) {
      console.error('Error al eliminar marca:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}