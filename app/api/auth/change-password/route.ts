import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAuth } from '../../../utils/auth/middleware';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../../../utils/auth/password';
import { ChangePasswordRequest } from '../../../types/auth';

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
      const body: ChangePasswordRequest = await req.json();
      const { currentPassword, newPassword } = body;

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          {
            error: {
              message: 'Contraseña actual y nueva contraseña son requeridas',
              status: 400
            }
          },
          { status: 400 }
        );
      }

      // Validar fortaleza de la nueva contraseña
      const passwordValidation = validatePasswordStrength(newPassword);
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
        // Obtener la contraseña actual del usuario
        const result = await client.query(
          'SELECT password_hash FROM users WHERE id = $1',
          [user.id]
        );

        if (result.rows.length === 0) {
          return NextResponse.json(
            {
              error: {
                message: 'Usuario no encontrado',
                status: 404
              }
            },
            { status: 404 }
          );
        }

        const currentPasswordHash = result.rows[0].password_hash;

        // Verificar contraseña actual
        const isCurrentPasswordValid = await verifyPassword(currentPassword, currentPasswordHash);
        if (!isCurrentPasswordValid) {
          return NextResponse.json(
            {
              error: {
                message: 'Contraseña actual incorrecta',
                status: 401
              }
            },
            { status: 401 }
          );
        }

        // Hash de la nueva contraseña
        const newPasswordHash = await hashPassword(newPassword);

        // Actualizar contraseña en la base de datos
        await client.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [newPasswordHash, user.id]
        );

        return NextResponse.json({
          success: true,
          message: 'Contraseña actualizada exitosamente'
        });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
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