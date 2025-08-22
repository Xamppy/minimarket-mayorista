import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withAdminAuth } from '../../../utils/auth/middleware';
import { hashPassword, validatePasswordStrength } from '../../../utils/auth/password';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

const VALID_ROLES = ['administrator', 'vendedor'];

// GET - Listar todos los usuarios (solo administradores)
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const client = new Client(dbConfig);
      await client.connect();

      try {
        // Obtener parámetros de consulta
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const role = searchParams.get('role');
        const search = searchParams.get('search');
        
        const offset = (page - 1) * limit;

        // Construir consulta con filtros
        let query = `
          SELECT 
            u.id, 
            u.email, 
            u.role, 
            u.created_at,
            p.full_name
          FROM users u
          LEFT JOIN profiles p ON u.id = p.user_id
          WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 0;

        if (role && VALID_ROLES.includes(role)) {
          paramCount++;
          query += ` AND u.role = $${paramCount}`;
          params.push(role);
        }

        if (search) {
          paramCount++;
          query += ` AND (u.email ILIKE $${paramCount} OR p.full_name ILIKE $${paramCount})`;
          params.push(`%${search}%`);
        }

        query += ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await client.query(query, params);

        // Contar total de usuarios para paginación
        let countQuery = 'SELECT COUNT(*) FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE 1=1';
        const countParams: any[] = [];
        let countParamCount = 0;

        if (role && VALID_ROLES.includes(role)) {
          countParamCount++;
          countQuery += ` AND u.role = $${countParamCount}`;
          countParams.push(role);
        }

        if (search) {
          countParamCount++;
          countQuery += ` AND (u.email ILIKE $${countParamCount} OR p.full_name ILIKE $${countParamCount})`;
          countParams.push(`%${search}%`);
        }

        const countResult = await client.query(countQuery, countParams);
        const totalUsers = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalUsers / limit);

        return NextResponse.json({
          success: true,
          users: result.rows,
          pagination: {
            page,
            limit,
            totalUsers,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
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

// POST - Crear nuevo usuario (solo administradores)
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const body = await request.json();
      const { email, password, role, full_name } = body;

      // Validaciones
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

      if (!VALID_ROLES.includes(role)) {
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

      // Validar formato de email
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

      // Validar fortaleza de contraseña
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

        // Actualizar perfil si se proporcionó full_name
        if (full_name) {
          await client.query(
            'UPDATE profiles SET full_name = $1 WHERE user_id = $2',
            [full_name, newUser.id]
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Usuario creado exitosamente',
          user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            created_at: newUser.created_at,
            full_name: full_name || null
          }
        }, { status: 201 });

      } finally {
        await client.end();
      }

    } catch (error) {
      console.error('Error creando usuario:', error);
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