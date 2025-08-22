import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from './jwt';
import { AuthenticatedUser } from '../../types/auth';

// Extender el tipo NextRequest para incluir user
declare module 'next/server' {
  interface NextRequest {
    user?: AuthenticatedUser;
  }
}

// Resultado de la autenticación
export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  response?: NextResponse;
}

// Middleware para verificar autenticación
export const authenticateRequest = async (request: NextRequest): Promise<AuthResult> => {
  try {
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader || undefined);
    console.log('Token del header:', token ? 'presente' : 'ausente');
    
    // Si no hay token en el header, buscar en cookies
    if (!token) {
      token = request.cookies.get('auth_token')?.value || null;
      console.log('Token de cookie:', token ? 'presente' : 'ausente');
    }

    if (!token) {
      console.log('No se encontró token de autenticación');
      return {
        success: false,
        error: 'Token de acceso requerido',
        response: NextResponse.json(
          {
            error: {
              message: 'Token de acceso requerido',
              status: 401
            }
          },
          { status: 401 }
        )
      };
    }

    console.log('Intentando verificar token:', token.substring(0, 20) + '...');
    const decoded = verifyToken(token);
    console.log('Token decodificado:', { userId: decoded.userId, email: decoded.email, role: decoded.role });
    const user: AuthenticatedUser = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    console.log('Usuario autenticado:', user);

    // Agregar usuario al request
    request.user = user;

    return {
      success: true,
      user
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token inválido';
    
    return {
      success: false,
      error: errorMessage,
      response: NextResponse.json(
        {
          error: {
            message: errorMessage,
            status: 403
          }
        },
        { status: 403 }
      )
    };
  }
};

// Middleware para verificar roles específicos
export const requireRole = (allowedRoles: string[]) => {
  return (user: AuthenticatedUser): { success: boolean; response?: NextResponse } => {
    console.log('Verificando rol:', { userRole: user.role, allowedRoles });
    if (!allowedRoles.includes(user.role)) {
      console.log('Rol no permitido:', user.role, 'Roles permitidos:', allowedRoles);
      return {
        success: false,
        response: NextResponse.json(
          {
            error: {
              message: 'No tienes permisos para acceder a este recurso',
              status: 403
            }
          },
          { status: 403 }
        )
      };
    }

    console.log('Rol permitido:', user.role);
    return { success: true };
  };
};

// Middleware específico para administradores
export const requireAdmin = requireRole(['administrator']);

// Middleware específico para vendedores y administradores
export const requireVendedorOrAdmin = requireRole(['vendedor', 'administrator']);

// Función helper para manejar autenticación en API routes
export const withAuth = async (
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
  roleCheck?: (user: AuthenticatedUser) => { success: boolean; response?: NextResponse }
): Promise<NextResponse> => {
  // Verificar autenticación
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return authResult.response || NextResponse.json(
      { error: { message: 'Error de autenticación', status: 401 } },
      { status: 401 }
    );
  }

  // Verificar roles si se especifica
  if (roleCheck) {
    const roleResult = roleCheck(authResult.user);
    if (!roleResult.success) {
      return roleResult.response || NextResponse.json(
        { error: { message: 'Permisos insuficientes', status: 403 } },
        { status: 403 }
      );
    }
  }

  // Ejecutar el handler con el usuario autenticado
  return handler(request, authResult.user);
};

// Función helper para endpoints que requieren admin
export const withAdminAuth = async (
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
): Promise<NextResponse> => {
  return withAuth(request, handler, requireAdmin);
};

// Función helper para endpoints que requieren vendedor o admin
export const withVendedorAuth = async (
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
): Promise<NextResponse> => {
  return withAuth(request, handler, requireVendedorOrAdmin);
};