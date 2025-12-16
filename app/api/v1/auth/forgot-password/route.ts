import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

function generateNumericCode(length: number = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const n = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(n);
}

async function sendResetCodeEmailMock(email: string, code: string, minutes: number) {
  console.log('[MOCK EMAIL] Reset de contraseña:', { email, code, expiresInMinutes: minutes });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: { message: 'Email es requerido', status: 400 } }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: { message: 'Email no válido', status: 400 } }, { status: 400 });
    }

    const client = new Client(dbConfig);
    await client.connect();

    try {
      // Asegurar columnas en users
      await client.query(
        `ALTER TABLE users
           ADD COLUMN IF NOT EXISTS password_reset_code TEXT,
           ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ`
      );

      const userRes = await client.query('SELECT id, email FROM users WHERE email = $1', [email]);

      // Siempre retornar 200 para no filtrar existencia
      if (userRes.rows.length === 0) {
        return NextResponse.json({ success: true, message: 'Si el email existe, se enviará un código de recuperación.' });
      }

      const userId = userRes.rows[0].id;
      const ttlMinutes = parseInt(process.env.RESET_CODE_TTL_MIN || '15');
      const code = generateNumericCode(6);
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await client.query(
        `UPDATE users
           SET password_reset_code = $1,
               password_reset_expires_at = $2,
               updated_at = NOW()
         WHERE id = $3`,
        [code, expiresAt, userId]
      );

      await sendResetCodeEmailMock(email, code, ttlMinutes);

      return NextResponse.json({ success: true, message: 'Si el email existe, se enviará un código de recuperación.' });
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error en v1/forgot-password:', error);
    return NextResponse.json({ error: { message: 'Error interno del servidor', status: 500 } }, { status: 500 });
  }
}
