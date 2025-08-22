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
  ssl: process.env.POSTGRES_SSL === 'true',
  client_encoding: 'UTF8'
};

// GET - Obtener una entrada de stock específica
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const { id } = await params;
      const stockEntryId = id;
      
      const result = await client.query(
        `SELECT id, product_id, initial_quantity, remaining_quantity, barcode, 
                purchase_price, sale_price_unit, sale_price_wholesale,
                expiration_date, entry_date
         FROM stock_entries 
         WHERE id = $1`,
        [stockEntryId]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: { 
            message: 'Entrada de stock no encontrada', 
            status: 404 
          } 
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        stock_entry: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error getting stock entry:', error);
      return NextResponse.json({ 
        error: { 
          message: 'Error interno del servidor', 
          status: 500 
        } 
      }, { status: 500 });
    } finally {
      await client.end();
    }
  });
}

// PUT - Actualizar una entrada de stock
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const { id } = await params;
      const stockEntryId = id;
      const body = await request.json();
      
      const {
        remaining_quantity,
        barcode,
        purchase_price,
        sale_price_unit,
        sale_price_wholesale,
        expiration_date
      } = body;
      
      // Verificar que la entrada de stock existe
      const checkResult = await client.query(
        'SELECT id FROM stock_entries WHERE id = $1',
        [stockEntryId]
      );
      
      if (checkResult.rows.length === 0) {
        return NextResponse.json({ 
          error: { 
            message: 'Entrada de stock no encontrada', 
            status: 404 
          } 
        }, { status: 404 });
      }
      
      // Actualizar la entrada de stock
      const updateResult = await client.query(
        `UPDATE stock_entries 
         SET remaining_quantity = $1, barcode = $2, purchase_price = $3,
             sale_price_unit = $4, sale_price_wholesale = $5,
             expiration_date = $6
         WHERE id = $7
         RETURNING *`,
        [
          remaining_quantity,
          barcode,
          purchase_price,
          sale_price_unit,
          sale_price_wholesale,
          expiration_date,
          stockEntryId
        ]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Entrada de stock actualizada exitosamente',
        stock_entry: updateResult.rows[0]
      });
      
    } catch (error) {
      console.error('Error updating stock entry:', error);
      return NextResponse.json({ 
        error: { 
          message: 'Error interno del servidor', 
          status: 500 
        } 
      }, { status: 500 });
    } finally {
      await client.end();
    }
  });
}

// DELETE - Eliminar una entrada de stock
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      const { id } = await params;
      const stockEntryId = id;
      
      // Verificar que la entrada de stock existe
      const checkResult = await client.query(
        'SELECT id, remaining_quantity FROM stock_entries WHERE id = $1',
        [stockEntryId]
      );
      
      if (checkResult.rows.length === 0) {
        return NextResponse.json({ 
          error: { 
            message: 'Entrada de stock no encontrada', 
            status: 404 
          } 
        }, { status: 404 });
      }
      
      // Eliminar la entrada de stock
      await client.query(
        'DELETE FROM stock_entries WHERE id = $1',
        [stockEntryId]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Entrada de stock eliminada exitosamente'
      });
      
    } catch (error) {
      console.error('Error deleting stock entry:', error);
      return NextResponse.json({ 
        error: { 
          message: 'Error interno del servidor', 
          status: 500 
        } 
      }, { status: 500 });
    } finally {
      await client.end();
    }
  });
}