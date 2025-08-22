import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAdminAuth } from '../../../utils/auth/middleware';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
  client_encoding: 'UTF8'
};

// GET - Obtener tipo de producto por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withAdminAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    const { id } = params;
    
    try {
      await client.connect();
      
      const result = await client.query(
        'SELECT id, name, created_at FROM product_types WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Tipo de producto no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(result.rows[0]);
      
    } catch (error) {
      console.error('Error al obtener tipo de producto:', error);
      return NextResponse.json(
        { error: 'Error al obtener tipo de producto' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// PUT - Actualizar tipo de producto
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAdminAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    const { id } = params;
    
    try {
      const body = await request.json();
      const { name } = body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'El nombre del tipo de producto es requerido' },
          { status: 400 }
        );
      }
      
      if (name.trim().length > 100) {
        return NextResponse.json(
          { error: 'El nombre del tipo de producto no puede exceder 100 caracteres' },
          { status: 400 }
        );
      }
      
      await client.connect();
      
      // Verificar que el tipo existe
      const existingType = await client.query(
        'SELECT id FROM product_types WHERE id = $1',
        [id]
      );
      
      if (existingType.rows.length === 0) {
        return NextResponse.json(
          { error: 'Tipo de producto no encontrado' },
          { status: 404 }
        );
      }
      
      // Verificar unicidad (excluyendo el tipo actual)
      const duplicateCheck = await client.query(
        'SELECT id FROM product_types WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name.trim(), id]
      );
      
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe otro tipo de producto con ese nombre' },
          { status: 409 }
        );
      }
      
      // Actualizar tipo
      const result = await client.query(
        'UPDATE product_types SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
        [name.trim(), id]
      );
      
      return NextResponse.json({
        productType: result.rows[0],
        message: 'Tipo de producto actualizado exitosamente'
      });
      
    } catch (error) {
      console.error('Error al actualizar tipo de producto:', error);
      return NextResponse.json(
        { error: 'Error al actualizar tipo de producto' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// DELETE - Eliminar tipo de producto
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAdminAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    const { id } = params;
    
    try {
      await client.connect();
      
      // Verificar que el tipo existe
      const existingType = await client.query(
        'SELECT id, name FROM product_types WHERE id = $1',
        [id]
      );
      
      if (existingType.rows.length === 0) {
        return NextResponse.json(
          { error: 'Tipo de producto no encontrado' },
          { status: 404 }
        );
      }
      
      // Verificar si hay productos asociados
      const associatedProducts = await client.query(
        'SELECT COUNT(*) as count FROM products WHERE product_type_id = $1',
        [id]
      );
      
      const productCount = parseInt(associatedProducts.rows[0].count);
      if (productCount > 0) {
        return NextResponse.json(
          { error: `No se puede eliminar el tipo de producto porque tiene ${productCount} producto(s) asociado(s)` },
          { status: 409 }
        );
      }
      
      // Eliminar tipo
      await client.query(
        'DELETE FROM product_types WHERE id = $1',
        [id]
      );
      
      return NextResponse.json({
        message: 'Tipo de producto eliminado exitosamente'
      });
      
    } catch (error) {
      console.error('Error al eliminar tipo de producto:', error);
      return NextResponse.json(
        { error: 'Error al eliminar tipo de producto' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}