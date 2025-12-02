import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { generateToken } from '../../../../utils/auth/jwt';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
});

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false"
      );

      const userQuery = `
        SELECT id, email, password_hash, role, created_at, updated_at, COALESCE(must_change_password, false) AS must_change_password
        FROM users
        WHERE email = $1
      `;
      const userResult = await client.query(userQuery, [email]);

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Credenciales incorrectas' },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Credenciales incorrectas' },
          { status: 401 }
        );
      }

      const token = generateToken(user.id, user.email, user.role);

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        forcePasswordChange: !!user.must_change_password,
        message: user.must_change_password ? 'Debes cambiar tu contraseña antes de continuar.' : undefined
      });

      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en login v1:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
