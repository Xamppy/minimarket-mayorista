import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { hashPassword, validatePasswordStrength } from '../../../utils/auth/password';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

// Permite crear un administrador inicial si no existen administradores.
// Alternativamente, si existen, requiere header x-bootstrap-secret que coincida con BOOTSTRAP_ADMIN_SECRET.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, role } = body || {};
    const requestedRole: 'administrator' | 'vendedor' = role || 'administrator';

    if (!email || !password) {
      return NextResponse.json({
        error: { message: 'Email y contraseña son requeridos', status: 400 }
      }, { status: 400 });
    }

    // Validar formato básico de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: { message: 'Email no válido', status: 400 }
      }, { status: 400 });
    }

    // Validar fortaleza de contraseña
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({
        error: { message: `Contraseña no válida: ${passwordValidation.errors.join(', ')}`, status: 400 }
      }, { status: 400 });
    }

    const client = new Client(dbConfig);
    await client.connect();

    try {
      // Verificar si ya existe algún administrador
      const adminCountResult = await client.query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'administrator'");
      const adminCount = adminCountResult.rows[0]?.c || 0;

      if (adminCount > 0) {
        // Si ya hay admin, requerir secreto
        const provided = request.headers.get('x-bootstrap-secret') || '';
        const expected = process.env.BOOTSTRAP_ADMIN_SECRET || '';
        if (!expected || provided !== expected) {
          return NextResponse.json({
            error: { message: 'Operación no permitida: ya existe administrador. Proporcione x-bootstrap-secret válido', status: 403 }
          }, { status: 403 });
        }
      }

      // Verificar si email ya existe
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return NextResponse.json({
          error: { message: 'El email ya está registrado', status: 409 }
        }, { status: 409 });
      }

      const passwordHash = await hashPassword(password);
      const result = await client.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
        [email, passwordHash, requestedRole]
      );

      const user = result.rows[0];
      return NextResponse.json({ success: true, user }, { status: 201 });

    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('Error en bootstrap admin:', error);
    return NextResponse.json({ error: { message: 'Error interno del servidor', status: 500 } }, { status: 500 });
  }
}
