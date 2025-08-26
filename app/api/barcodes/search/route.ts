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

// GET /api/barcodes/search - Buscar códigos de barras por nombre de producto
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('q');
      const limit = parseInt(searchParams.get('limit') || '10');
      
      if (!query || query.trim().length === 0) {
        return NextResponse.json(
          { error: { message: 'Parámetro de búsqueda requerido', status: 400 } },
          { status: 400 }
        );
      }
      
      await client.connect();
      
      const result = await client.query(`
        SELECT 
          gb.id,
          gb.barcode,
          gb.name,
          gb.description,
          gb.created_at,
          u.email as created_by_email,
          format_barcode_display(gb.barcode) as formatted_barcode,
          -- Calcular relevancia de la búsqueda
          CASE 
            WHEN LOWER(gb.name) = LOWER($1) THEN 100
            WHEN LOWER(gb.name) LIKE LOWER($1 || '%') THEN 90
            WHEN LOWER(gb.name) LIKE LOWER('%' || $1 || '%') THEN 80
            WHEN LOWER(gb.description) LIKE LOWER('%' || $1 || '%') THEN 70
            ELSE 60
          END as relevance_score
        FROM generated_barcodes gb
        LEFT JOIN users u ON gb.created_by = u.id
        WHERE gb.is_active = true
          AND (
            LOWER(gb.name) LIKE LOWER('%' || $1 || '%')
            OR LOWER(gb.description) LIKE LOWER('%' || $1 || '%')
            OR gb.barcode LIKE '%' || $1 || '%'
          )
        ORDER BY relevance_score DESC, gb.created_at DESC
        LIMIT $2
      `, [query.trim(), limit]);
      
      return NextResponse.json({
        results: result.rows,
        query: query.trim(),
        total: result.rows.length
      });
      
    } catch (error) {
      console.error('Error en búsqueda de códigos de barras:', error);
      return NextResponse.json(
        { error: { message: 'Error en la búsqueda', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}