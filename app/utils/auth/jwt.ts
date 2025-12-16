import * as jwt from 'jsonwebtoken';
import { JWTPayload } from '../../types/auth';

// Obtener el secreto JWT desde las variables de entorno
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno');
  }
  return secret;
};

// Generar token JWT
export const generateToken = (userId: string, email: string, role: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    role
  };

  return jwt.sign(
    payload,
    getJWTSecret(),
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'minimarket-don-ale',
      audience: 'minimarket-users'
    } as jwt.SignOptions
  );
};

// Verificar y decodificar token JWT
export const verifyToken = (token: string): JWTPayload => {
  try {
    console.log('Verificando token JWT...');
    
    // Primero intentar verificar con issuer y audience (tokens nuevos)
    try {
      const decoded = jwt.verify(token, getJWTSecret(), {
        issuer: 'minimarket-don-ale',
        audience: 'minimarket-users'
      }) as JWTPayload;
      
      console.log('Token JWT verificado exitosamente (formato nuevo):', { userId: decoded.userId, email: decoded.email, role: decoded.role });
      return decoded;
    } catch (audienceError) {
      // Si falla por audience/issuer, intentar sin esas validaciones (tokens antiguos)
      console.log('Intentando verificar token con formato anterior...');
      const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
      
      console.log('Token JWT verificado exitosamente (formato anterior):', { userId: decoded.userId, email: decoded.email, role: decoded.role });
      return decoded;
    }
  } catch (error) {
    console.log('Error al verificar token JWT:', error);
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    } else {
      throw new Error('Error al verificar token');
    }
  }
};

// Extraer token del header Authorization
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

// Verificar si un token está próximo a expirar (dentro de 1 hora)
export const isTokenNearExpiry = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - currentTime;
    
    // Retorna true si el token expira en menos de 1 hora (3600 segundos)
    return timeUntilExpiry < 3600;
  } catch (error) {
    return true;
  }
};

// Refrescar token si está próximo a expirar
export const refreshTokenIfNeeded = (token: string): string | null => {
  try {
    const decoded = verifyToken(token);
    
    if (isTokenNearExpiry(token)) {
      return generateToken(decoded.userId, decoded.email, decoded.role);
    }
    
    return null; // No necesita refresh
  } catch (error) {
    return null;
  }
};