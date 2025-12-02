import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { hashPassword, validatePasswordStrength } from '../../../../utils/auth/password';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: { message: 'Email, código y nueva contraseña son requeridos', status: 400 } }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: { message: 'Email no válido', status: 400 } }, { status: 400 });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return NextResponse.json({ error: { message: `Contraseña no válida: ${strength.errors.join(', ')}`, status: 400 } }, { status: 400 });
    }

    const client = new Client(dbConfig);
    await client.connect();

    try {
      // Asegurar columnas existen
      await client.query(
        `ALTER TABLE users
           ADD COLUMN IF NOT EXISTS password_reset_code TEXT,
           ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ`
      );

      const res = await client.query(
        `SELECT id, password_reset_code, password_reset_expires_at
           FROM users WHERE email = $1`,
        [email]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: { message: 'Usuario no encontrado', status: 404 } }, { status: 404 });
      }

      const row = res.rows[0];
      if (!row.password_reset_code || !row.password_reset_expires_at) {
        return NextResponse.json({ error: { message: 'No hay código de reseteo activo', status: 400 } }, { status: 400 });
      }

      if (String(row.password_reset_code) !== String(code)) {
        return NextResponse.json({ error: { message: 'Código inválido', status: 400 } }, { status: 400 });
      }

      const now = new Date();
      const exp = new Date(row.password_reset_expires_at);
      if (now > exp) {
        return NextResponse.json({ error: { message: 'El código ha expirado', status: 400 } }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await client.query(
        `UPDATE users
           SET password_hash = $1,
               password_reset_code = NULL,
               password_reset_expires_at = NULL,
               must_change_password = false,
               updated_at = NOW()
         WHERE id = $2`,
        [newHash, row.id]
      );

      return NextResponse.json({ success: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error en v1/reset-password:', error);
    return NextResponse.json({ error: { message: 'Error interno del servidor', status: 500 } }, { status: 500 });
  }
}
