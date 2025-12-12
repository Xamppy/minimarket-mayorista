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

// GET /api/products/[id] - Obtener un producto específico
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de producto requerido' },
        { status: 400 }
      );
    }

    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const result = await client.query(
        `SELECT 
          p.id, p.name, p.barcode, p.image_url, 
          p.brand_id, p.brand_name, p.type_id,
          p.created_at, p.updated_at,
          pt.name as type_name
        FROM products p
        LEFT JOIN product_types pt ON p.type_id = pt.id
        WHERE p.id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Producto no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(result.rows[0]);
      
    } catch (error: any) {
      console.error('Error al obtener producto:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// DELETE /api/products/[id] - Eliminar un producto (con verificación de integridad referencial)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de producto requerido' },
        { status: 400 }
      );
    }

    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      // 1. Verificar que el producto existe
      const existingResult = await client.query(
        'SELECT id, name FROM products WHERE id = $1',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Producto no encontrado' },
          { status: 404 }
        );
      }

      const productName = existingResult.rows[0].name;
      
      // 2. Verificar si el producto tiene ventas asociadas (sale_items)
      const salesResult = await client.query(
        'SELECT COUNT(*) as count FROM sale_items WHERE product_id = $1',
        [id]
      );
      
      if (parseInt(salesResult.rows[0].count) > 0) {
        return NextResponse.json(
          { 
            error: 'No se puede eliminar el producto porque tiene historial de ventas. Considere desactivarlo.',
            details: {
              productId: id,
              productName: productName,
              salesCount: parseInt(salesResult.rows[0].count)
            }
          },
          { status: 409 }
        );
      }
      
      // 3. Borrado en cascada manual (el producto NO tiene ventas)
      // Primero eliminar las entradas de stock
      const stockDeleteResult = await client.query(
        'DELETE FROM stock_entries WHERE product_id = $1',
        [id]
      );
      
      console.log(`[DELETE /api/products/${id}] Eliminadas ${stockDeleteResult.rowCount} entradas de stock`);
      
      // Luego eliminar el producto
      await client.query(
        'DELETE FROM products WHERE id = $1',
        [id]
      );
      
      console.log(`[DELETE /api/products/${id}] Producto "${productName}" eliminado correctamente`);
      
      return NextResponse.json({ 
        message: 'Producto eliminado correctamente',
        details: {
          productId: id,
          productName: productName,
          stockEntriesDeleted: stockDeleteResult.rowCount
        }
      });
      
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      
      // Manejar errores de clave foránea (por si acaso)
      if (error.code === '23503') { // Foreign key violation
        return NextResponse.json(
          { 
            error: 'No se puede eliminar el producto porque tiene datos relacionados en otras tablas.',
            details: error.detail
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error interno del servidor', details: error.message },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// PUT /api/products/[id] - Actualizar un producto
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de producto requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, barcode, image_url, brand_id, type_id } = body;
    
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del producto es requerido' },
        { status: 400 }
      );
    }

    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      // Verificar que el producto existe
      const existingResult = await client.query(
        'SELECT id FROM products WHERE id = $1',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Producto no encontrado' },
          { status: 404 }
        );
      }
      
      // Si se proporciona barcode, verificar unicidad (excluyendo el producto actual)
      if (barcode) {
        const duplicateResult = await client.query(
          'SELECT id FROM products WHERE barcode = $1 AND id != $2',
          [barcode, id]
        );
        
        if (duplicateResult.rows.length > 0) {
          return NextResponse.json(
            { error: 'Ya existe otro producto con este código de barras' },
            { status: 409 }
          );
        }
      }
      
      // Obtener el nombre de la marca si se proporciona brand_id
      let brandName = null;
      if (brand_id) {
        const brandResult = await client.query(
          'SELECT name FROM brands WHERE id = $1',
          [brand_id]
        );
        if (brandResult.rows.length > 0) {
          brandName = brandResult.rows[0].name;
        }
      }
      
      // Actualizar el producto
      const result = await client.query(
        `UPDATE products 
         SET name = $1, 
             barcode = $2, 
             image_url = $3, 
             brand_id = $4, 
             brand_name = $5,
             type_id = $6, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $7 
         RETURNING id, name, barcode, image_url, brand_id, brand_name, type_id, created_at, updated_at`,
        [name.trim(), barcode || null, image_url || null, brand_id || null, brandName, type_id || null, id]
      );
      
      return NextResponse.json(result.rows[0]);
      
    } catch (error: any) {
      console.error('Error al actualizar producto:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Ya existe otro producto con este código de barras' },
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
