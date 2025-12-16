// api utilities

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    console.warn("Unauthorized: Token mungkin expired atau tidak valid");
  }

  return res;
}