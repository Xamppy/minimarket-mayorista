import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import jwt from 'jsonwebtoken';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

const jwtSecret = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'No hay sesión activa' },
        { status: 401 }
      );
    }

    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    const client = new Client(dbConfig);
    await client.connect();
    
    try {
      const result = await client.query(
        'SELECT id, email, role, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }
      
      const user = result.rows[0];
      const userData: User = {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      };
      
      return NextResponse.json({ user: userData });
      
    } finally {
      await client.end();
    }
    
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    );
  }
}