// Server-side authentication utilities
import { cookies } from 'next/headers';
import { Pool } from 'pg';
import { verifyToken } from './jwt';

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
});

/**
 * Makes an authenticated API call with the JWT token from cookies (server-side)
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise with the fetch response
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `auth_token=${token}`,
    ...options.headers,
  };

  // For server-side calls, we need to use the full URL
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;

  return fetch(fullUrl, {
    ...options,
    headers,
  });
};

/**
 * Makes an authenticated API call and returns JSON response (server-side)
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise with the parsed JSON response
 */
export const authenticatedFetchJson = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

/**
 * Checks if the user is authenticated (server-side)
 * @returns Promise<boolean> - True if authenticated, false otherwise
 */
export const isAuthenticatedServer = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  return !!token;
};

/**
 * Gets the current user information (server-side)
 * @returns Promise with user data or null
 */
export const getCurrentUserServer = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      console.log('DEBUG: No auth token found in cookies');
      return null;
    }
    
    console.log('DEBUG: Token found, verifying...');
    
    // Verificar el token
    const decoded = await verifyToken(token);
    if (!decoded) {
      console.log('DEBUG: Token verification failed');
      return null;
    }
    
    console.log('DEBUG: Token verified, userId:', decoded.userId);
    
    // Buscar usuario en la base de datos
    const client = await pool.connect();
    try {
      const userQuery = `
        SELECT id, email, role, created_at, updated_at
        FROM users
        WHERE id = $1
      `;
      
      const userResult = await client.query(userQuery, [decoded.userId]);
      
      if (userResult.rows.length === 0) {
        console.log('DEBUG: User not found in database for userId:', decoded.userId);
        return null;
      }

      const user = userResult.rows[0];
      console.log('DEBUG: User found:', { id: user.id, email: user.email, role: user.role });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };

    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('DEBUG: Error in getCurrentUserServer:', error);
    return null;
  }
};