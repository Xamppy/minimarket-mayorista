import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import crypto from 'crypto';
import { validatePasswordStrength } from '../../../utils/auth/password';

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

function generateToken(len: number = 48) {
  return crypto.randomBytes(len).toString('hex'); // 96 chars
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({
        error: { message: 'Email es requerido', status: 400 }
      }, { status: 400 });
    }

    const client = new Client(dbConfig);
    await client.connect();

    try {
      // Crear tabla de tokens si no existe
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

      // Buscar usuario por email
      const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);

      // Siempre responder 200 para no filtrar existencia del email
      if (userRes.rows.length === 0) {
        return NextResponse.json({ success: true, message: 'Si el email existe, se enviará un enlace de recuperación' });
      }

      const userId = userRes.rows[0].id;

      // Invalidar tokens anteriores no usados (opcional): se dejan, no es crítico
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [userId]);

      // Generar token y guardar hash
      const token = generateToken(24); // 48 hex chars
      const tokenHash = hashToken(token);
      const ttlMinutes = parseInt(process.env.RESET_TOKEN_TTL_MIN || '30');
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await client.query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [userId, tokenHash, expiresAt]
      );

      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      // TODO: Enviar email con resetLink si hay SMTP configurado.
      // Por ahora, devolvemos el enlace para facilitar pruebas en desarrollo.

      return NextResponse.json({ success: true, resetLink });

    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error en forgot-password:', error);
    return NextResponse.json({ error: { message: 'Error interno del servidor', status: 500 } }, { status: 500 });
  }
}
