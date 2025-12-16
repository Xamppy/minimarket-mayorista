import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAdminAuth } from '../../../utils/auth/middleware';
import { hashPassword, validatePasswordStrength } from '../../../utils/auth/password';
import { RegisterRequest } from '../../../types/auth';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

const VALID_ROLES = ['administrator', 'vendedor'];

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const body: RegisterRequest = await req.json();
      const { email, password, role } = body;

      if (!email || !password || !role) {
        return NextResponse.json(
          {
            error: {
              message: 'Email, contraseña y rol son requeridos',
              status: 400
            }
          },
          { status: 400 }
        );
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          {
            error: {
              message: 'Email no válido',
              status: 400
            }
          },
          { status: 400 }
        );
      }

      // Validar rol
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json(
          {
            error: {
              message: `Rol no válido. Roles permitidos: ${VALID_ROLES.join(', ')}`,
              status: 400
            }
          },
          { status: 400 }
        );
      }

      // Validar fortaleza de la contraseña
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          {
            error: {
              message: `Contraseña no válida: ${passwordValidation.errors.join(', ')}`,
              status: 400
            }
          },
          { status: 400 }
        );
      }

      const client = new Client(dbConfig);
      await client.connect();

      try {
        // Verificar si el email ya existe
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          return NextResponse.json(
            {
              error: {
                message: 'El email ya está registrado',
                status: 409
              }
            },
            { status: 409 }
          );
        }

        // Hash de la contraseña
        const passwordHash = await hashPassword(password);

        // Crear nuevo usuario
        const result = await client.query(
          'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
          [email, passwordHash, role]
        );

        const newUser = result.rows[0];

        return NextResponse.json({
          success: true,
          message: 'Usuario creado exitosamente',
          user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            created_at: newUser.created_at
          }
        }, { status: 201 });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error registrando usuario:', error);
      return NextResponse.json(
        {
          error: {
            message: 'Error interno del servidor',
            status: 500
          }
        },
        { status: 500 }
      );
    }
  });
}