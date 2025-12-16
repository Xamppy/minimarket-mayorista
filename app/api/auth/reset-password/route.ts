import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import crypto from 'crypto';
import { hashPassword, validatePasswordStrength } from '../../../utils/auth/password';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({
        error: { message: 'Token y nueva contraseña son requeridos', status: 400 }
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
      // Asegurar tabla (por si el entorno limpió DB)
      await client.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          token_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      const tokenHash = hashToken(token);

      // Buscar token válido
      const tokRes = await client.query(
        `SELECT id, user_id, expires_at, used_at
         FROM password_reset_tokens
         WHERE token_hash = $1
         LIMIT 1`,
        [tokenHash]
      );

      if (tokRes.rows.length === 0) {
        return NextResponse.json({
          error: { message: 'Token inválido', status: 400 }
        }, { status: 400 });
      }

      const row = tokRes.rows[0];
      if (row.used_at) {
        return NextResponse.json({
          error: { message: 'El token ya fue usado', status: 400 }
        }, { status: 400 });
      }

      const now = new Date();
      const exp = new Date(row.expires_at);
      if (now > exp) {
        return NextResponse.json({
          error: { message: 'El token ha expirado', status: 400 }
        }, { status: 400 });
      }

      // Actualizar contraseña del usuario
      const newHash = await hashPassword(newPassword);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, row.user_id]);

      // Marcar token como usado
      await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [row.id]);

      return NextResponse.json({ success: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });

    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error en reset-password:', error);
    return NextResponse.json({ error: { message: 'Error interno del servidor', status: 500 } }, { status: 500 });
  }
}
