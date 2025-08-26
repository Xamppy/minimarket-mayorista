import { NextRequest, NextResponse } from 'next/server';
import { refreshTokenIfNeeded, verifyToken } from '../../../utils/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Obtener el token de las cookies
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        {
          error: {
            message: 'Token de autenticación no encontrado',
            status: 401
          }
        },
        { status: 401 }
      );
    }

    // Intentar refrescar el token
    const newToken = refreshTokenIfNeeded(token);
    
    if (newToken) {
      // Crear respuesta con el nuevo token
      const response = NextResponse.json({
        success: true,
        message: 'Token renovado exitosamente'
      });
      
      // Establecer el nuevo token en las cookies
      response.cookies.set('auth_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 horas
      });
      
      return response;
    } else {
      // El token no necesita renovación o es inválido
      try {
        // Verificar si el token actual es válido
        verifyToken(token);
        return NextResponse.json({
          success: true,
          message: 'Token aún válido, no necesita renovación'
        });
      } catch (error) {
        // Token inválido o expirado
        return NextResponse.json(
          {
            error: {
              message: 'Token inválido o expirado',
              status: 401
            }
          },
          { status: 401 }
        );
      }
    }
  } catch (error) {
    console.error('Error al renovar token:', error);
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
}