import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
});

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No se encontró token de autenticación' },
        { status: 401 }
      );
    }

    // Verificar y decodificar el token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Buscar usuario en la base de datos
    const client = await pool.connect();
    try {
      const userQuery = `
        SELECT id, email, role, created_at, updated_at
        FROM users
        WHERE id = $1
      `;
      
      const userResult = await client.query(userQuery, [decoded.userId]);
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const user = userResult.rows[0];

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}