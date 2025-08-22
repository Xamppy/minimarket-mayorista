import { cookies } from 'next/headers';

export async function authenticatedFetchServer(url: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  // For server-side calls, we need to use the full URL
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;

  return fetch(fullUrl, {
    ...options,
    headers: {
      ...options.headers,
      'Cookie': `auth_token=${token}`,
      'Content-Type': 'application/json',
    },
  });
}