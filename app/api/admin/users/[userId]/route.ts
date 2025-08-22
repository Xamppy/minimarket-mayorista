import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAdminAuth } from '../../../../utils/auth/middleware';
import { hashPassword, validatePasswordStrength } from '../../../../utils/auth/password';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

const VALID_ROLES = ['administrator', 'vendedor'];

interface RouteParams {
  params: Promise<{
    userId: string;
  }>;
}

// GET - Obtener usuario específico
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { userId } = await params;

      if (!userId) {
        return NextResponse.json(
          {
            error: {
              message: 'ID de usuario requerido',
              status: 400
            }
          },
          { status: 400 }
        );
      }

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
            p.full_name
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          WHERE u.id = $1`,
          [userId]
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
          user: result.rows[0]
        });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error obteniendo usuario:', error);
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

// PUT - Actualizar usuario
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { userId } = await params;
      const body = await request.json();
      const { email, role, full_name, password } = body;

      if (!userId) {
        return NextResponse.json(
          {
            error: {
              message: 'ID de usuario requerido',
              status: 400
            }
          },
          { status: 400 }
        );
      }

      // Validar que no se está intentando modificar el propio usuario
      if (userId === user.id) {
        return NextResponse.json(
          {
            error: {
              message: 'No puedes modificar tu propio usuario',
              status: 403
            }
          },
          { status: 403 }
        );
      }

      // Validaciones
      if (role && !VALID_ROLES.includes(role)) {
        return NextResponse.json(
          {
            error: {
              message: `Rol inválido. Roles válidos: ${VALID_ROLES.join(', ')}`,
              status: 400
            }
          },
          { status: 400 }
        );
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return NextResponse.json(
            {
              error: {
                message: 'Formato de email inválido',
                status: 400
              }
            },
            { status: 400 }
          );
        }
      }

      if (password) {
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
      }

      const client = new Client(dbConfig);
      await client.connect();

      try {
        // Verificar que el usuario existe
        const existingUser = await client.query(
          'SELECT id, email FROM users WHERE id = $1',
          [userId]
        );

        if (existingUser.rows.length === 0) {
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

        // Verificar si el nuevo email ya existe (si se está cambiando)
        if (email && email !== existingUser.rows[0].email) {
          const emailCheck = await client.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, userId]
          );

          if (emailCheck.rows.length > 0) {
            return NextResponse.json(
              {
                error: {
                  message: 'El email ya está en uso por otro usuario',
                  status: 409
                }
              },
              { status: 409 }
            );
          }
        }

        // Construir consulta de actualización dinámica
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramCount = 0;

        if (email) {
          paramCount++;
          updateFields.push(`email = $${paramCount}`);
          updateValues.push(email);
        }

        if (role) {
          paramCount++;
          updateFields.push(`role = $${paramCount}`);
          updateValues.push(role);
        }

        if (password) {
          const passwordHash = await hashPassword(password);
          paramCount++;
          updateFields.push(`password_hash = $${paramCount}`);
          updateValues.push(passwordHash);
        }

        if (updateFields.length === 0 && !full_name) {
          return NextResponse.json(
            {
              error: {
                message: 'No se proporcionaron campos para actualizar',
                status: 400
              }
            },
            { status: 400 }
          );
        }

        // Actualizar usuario si hay campos de usuario para actualizar
        if (updateFields.length > 0) {
          paramCount++;
          updateFields.push(`updated_at = NOW()`);
          updateValues.push(userId);

          const updateQuery = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, email, role, created_at, updated_at
          `;

          await client.query(updateQuery, updateValues);
        }

        // Actualizar perfil si se proporcionó full_name
        if (full_name !== undefined) {
          await client.query(
            'UPDATE profiles SET full_name = $1, updated_at = NOW() WHERE user_id = $2',
            [full_name, userId]
          );
        }

        // Obtener usuario actualizado
        const updatedUser = await client.query(
          `SELECT 
            u.id, 
            u.email, 
            u.role, 
            u.created_at,
            u.updated_at,
            p.full_name
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          WHERE u.id = $1`,
          [userId]
        );

        return NextResponse.json({
          success: true,
          message: 'Usuario actualizado exitosamente',
          user: updatedUser.rows[0]
        });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error actualizando usuario:', error);
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

// DELETE - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { userId } = await params;

      if (!userId) {
        return NextResponse.json(
          {
            error: {
              message: 'ID de usuario requerido',
              status: 400
            }
          },
          { status: 400 }
        );
      }

      // Validar que no se está intentando eliminar el propio usuario
      if (userId === user.id) {
        return NextResponse.json(
          {
            error: {
              message: 'No puedes eliminar tu propio usuario',
              status: 403
            }
          },
          { status: 403 }
        );
      }

      const client = new Client(dbConfig);
      await client.connect();

      try {
        // Verificar que el usuario existe
        const existingUser = await client.query(
          'SELECT id, email, role FROM users WHERE id = $1',
          [userId]
        );

        if (existingUser.rows.length === 0) {
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

        const userToDelete = existingUser.rows[0];

        // Verificar si el usuario tiene ventas asociadas
        const salesCheck = await client.query(
          'SELECT COUNT(*) FROM sales WHERE user_id = $1',
          [userId]
        );

        const salesCount = parseInt(salesCheck.rows[0].count);

        if (salesCount > 0) {
          return NextResponse.json(
            {
              error: {
                message: `No se puede eliminar el usuario porque tiene ${salesCount} venta(s) asociada(s). Considera desactivar el usuario en su lugar.`,
                status: 409
              }
            },
            { status: 409 }
          );
        }

        // Eliminar usuario (el perfil se eliminará automáticamente por CASCADE)
        await client.query(
          'DELETE FROM users WHERE id = $1',
          [userId]
        );

        return NextResponse.json({
          success: true,
          message: `Usuario ${userToDelete.email} eliminado exitosamente`
        });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error eliminando usuario:', error);
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