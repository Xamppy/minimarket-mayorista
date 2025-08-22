// Client-side authentication utilities

/**
 * Makes an authenticated API call (client-side)
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise with the fetch response
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Incluir cookies en la petición
  });
};



/**
 * Makes an authenticated API call and returns the JSON response (client-side)
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise with the parsed JSON response
 */
export const authenticatedFetchJson = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token de acceso requerido');
    }
    const errorData = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }
  
  return response.json();
};



/**
 * Checks if user is authenticated by calling the API (client-side)
 * @returns Promise<boolean> indicating if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Logs out the user by calling the logout API and redirecting
 * @param router - Next.js router instance
 */
export const logout = async (router: any) => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    router.push('/');
    router.refresh();
  }
};

/**
 * Gets the current user information from the API (client-side)
 * @returns Promise with user data
 */
export const getCurrentUser = async () => {
  return authenticatedFetchJson('/api/auth/me');
};