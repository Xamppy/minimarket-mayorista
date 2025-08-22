import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAuth } from '../../../utils/auth/middleware';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../../../utils/auth/password';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

// GET - Obtener perfil del usuario autenticado
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const client = new Client(dbConfig);
      await client.connect();

      try {
        const result = await client.query(
          `SELECT 
            u.id, 
            u.email, 
            u.role, 
            u.created_at,
            u.updated_at,
            p.full_name,
            p.phone,
            p.address
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          WHERE u.id = $1`,
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

        return NextResponse.json({
          success: true,
          profile: result.rows[0]
        });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
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

// PUT - Actualizar perfil del usuario autenticado
export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json();
      const { full_name, phone, address, current_password, new_password } = body;

      // Validar que al menos un campo se está actualizando
      if (!full_name && !phone && !address && !new_password) {
        return NextResponse.json(
          {
            error: {
              message: 'Debe proporcionar al menos un campo para actualizar',
              status: 400
            }
          },
          { status: 400 }
        );
      }

      // Si se quiere cambiar la contraseña, validar la actual
      if (new_password) {
        if (!current_password) {
          return NextResponse.json(
            {
              error: {
                message: 'Debe proporcionar la contraseña actual para cambiarla',
                status: 400
              }
            },
            { status: 400 }
          );
        }

        const passwordValidation = validatePasswordStrength(new_password);
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
      }

      const client = new Client(dbConfig);
      await client.connect();

      try {
        // Si se quiere cambiar la contraseña, verificar la actual
        if (new_password) {
          const userResult = await client.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [user.id]
          );

          if (userResult.rows.length === 0) {
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

          // Verificar la contraseña actual
          const isValidPassword = await verifyPassword(current_password, userResult.rows[0].password_hash);
          
          if (!isValidPassword) {
            return NextResponse.json(
              {
                error: {
                  message: 'Contraseña actual incorrecta',
                  status: 400
                }
              },
              { status: 400 }
            );
          }

          // Actualizar contraseña
          const newPasswordHash = await hashPassword(new_password);
          await client.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, user.id]
          );
        }

        // Actualizar campos del perfil
        const profileFields: string[] = [];
        const profileValues: any[] = [];
        let paramCount = 0;

        if (full_name !== undefined) {
          paramCount++;
          profileFields.push(`full_name = $${paramCount}`);
          profileValues.push(full_name);
        }

        if (phone !== undefined) {
          paramCount++;
          profileFields.push(`phone = $${paramCount}`);
          profileValues.push(phone);
        }

        if (address !== undefined) {
          paramCount++;
          profileFields.push(`address = $${paramCount}`);
          profileValues.push(address);
        }

        if (profileFields.length > 0) {
          paramCount++;
          profileFields.push(`updated_at = NOW()`);
          profileValues.push(user.id);

          const updateQuery = `
            UPDATE profiles 
            SET ${profileFields.join(', ')}
            WHERE user_id = $${paramCount}
          `;

          await client.query(updateQuery, profileValues);
        }

        // Obtener perfil actualizado
        const updatedProfile = await client.query(
          `SELECT 
            u.id, 
            u.email, 
            u.role, 
            u.created_at,
            u.updated_at,
            p.full_name,
            p.phone,
            p.address
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          WHERE u.id = $1`,
          [user.id]
        );

        return NextResponse.json({
          success: true,
          message: 'Perfil actualizado exitosamente',
          profile: updatedProfile.rows[0]
        });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error actualizando perfil:', error);
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