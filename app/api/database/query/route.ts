import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
      jwt.verify(authToken, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { query, params } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query requerida' }, { status: 400 });
    }

    // Execute the query
    const client = await pool.connect();
    try {
      const result = await client.query(query, params || []);
      return NextResponse.json({ data: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}