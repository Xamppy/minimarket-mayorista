import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAuth } from '../../../../utils/auth/middleware';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../../../../utils/auth/password';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { currentPassword, newPassword } = await req.json();

      if (!currentPassword || !newPassword) {
        return NextResponse.json({
          error: { message: 'Contraseña actual y nueva contraseña son requeridas', status: 400 }
        }, { status: 400 });
      }

      const strength = validatePasswordStrength(newPassword);
      if (!strength.isValid) {
        return NextResponse.json({
          error: { message: `Contraseña no válida: ${strength.errors.join(', ')}`, status: 400 }
        }, { status: 400 });
      }

      const client = new Client(dbConfig);
      await client.connect();

      try {
        // Asegurar columna must_change_password
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false");

        const res = await client.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
        if (res.rows.length === 0) {
          return NextResponse.json({ error: { message: 'Usuario no encontrado', status: 404 } }, { status: 404 });
        }

        const isValid = await verifyPassword(currentPassword, res.rows[0].password_hash);
        if (!isValid) {
          return NextResponse.json({ error: { message: 'Contraseña actual incorrecta', status: 401 } }, { status: 401 });
        }

        const newHash = await hashPassword(newPassword);
        await client.query(
          'UPDATE users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2',
          [newHash, user.id]
        );

        return NextResponse.json({ success: true, message: 'Contraseña actualizada. Ya puedes continuar.' });
      } finally {
        await client.end();
      }
    } catch (error) {
      console.error('Error en force-change-password:', error);
      return NextResponse.json({ error: { message: 'Error interno del servidor', status: 500 } }, { status: 500 });
    }
  });
}
