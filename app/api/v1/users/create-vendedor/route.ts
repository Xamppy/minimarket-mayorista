import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAdminAuth } from '../../../../utils/auth/middleware';
import { generateTemporaryPassword, hashPassword } from '../../../../utils/auth/password';
import { sendTemporaryPasswordEmail } from '../../../../../lib/email';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (req, adminUser) => {
    try {
      const { email } = await req.json();

      if (!email) {
        return NextResponse.json({
          error: { message: 'Email es requerido', status: 400 }
        }, { status: 400 });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({
          error: { message: 'Email no válido', status: 400 }
        }, { status: 400 });
      }

      const client = new Client(dbConfig);
      await client.connect();

      try {
        // Asegurar columna must_change_password exista
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false");

        // Verificar unicidad de email
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
          return NextResponse.json({
            error: { message: 'El email ya está registrado', status: 409 }
          }, { status: 409 });
        }

        // Generar contraseña temporal, hashearla y crear usuario con rol vendedor
        const tempPassword = generateTemporaryPassword(12);
        const passwordHash = await hashPassword(tempPassword);
        
        console.log('🔑 DEBUG - Creando vendedor:', {
          email,
          tempPassword,
          passwordHash
        });

        const insert = await client.query(
          `INSERT INTO users (email, password_hash, role, must_change_password)
           VALUES ($1, $2, 'vendedor', true)
           RETURNING id, email, role, must_change_password, created_at`,
          [email, passwordHash]
        );

        const newUser = insert.rows[0];

        // Enviar email con contraseña temporal
        try {
          const emailSent = await sendTemporaryPasswordEmail(email, tempPassword);
          if (emailSent) {
            console.log('✅ Email con contraseña temporal enviado a:', email);
          } else {
            console.warn('⚠️ No se pudo enviar el email a:', email);
          }
        } catch (emailError) {
          console.error('❌ Error al enviar email:', emailError);
          // Continuar - el usuario fue creado exitosamente
        }

        return NextResponse.json({
          success: true,
          message: 'Cuenta creada. La contraseña inicial ha sido enviada al correo del nuevo vendedor.',
          user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            must_change_password: newUser.must_change_password,
            created_at: newUser.created_at
          }
        }, { status: 201 });
      } finally {
        await client.end();
      }
    } catch (error) {
      console.error('Error creando vendedor:', error);
      return NextResponse.json({ error: { message: 'Error interno del servidor', status: 500 } }, { status: 500 });
    }
  });
}
