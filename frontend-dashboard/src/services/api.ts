/**
 * API client with authentication support
 * Provides a centralized way to make authenticated API requests throughout the app
 */

import { AuthApiError } from './auth';

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Get authentication token from session storage
 * This should match the token storage strategy in AuthContext
 */
function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

/**
 * Authenticated API request wrapper
 * Automatically includes Bearer token and handles common errors
 */
export async function authenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  if (!token) {
    throw new AuthApiError('Authentication required', 401);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid - trigger logout
        throw new AuthApiError('Session expired. Please log in again.', 401);
      } else if (response.status === 403) {
        // Forbidden
        throw new AuthApiError('Access denied', 403);
      } else if (response.status >= 500) {
        // Server errors
        throw new AuthApiError('Server error. Please try again later.', response.status);
      } else {
        // Other errors
        throw new AuthApiError(data.message || 'An error occurred', response.status);
      }
    }

    return data as T;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    
    // Network or other errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AuthApiError('Network error. Please check your connection.', 0);
    }
    
    throw new AuthApiError('An unexpected error occurred', 0);
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    authenticatedRequest<T>(endpoint, { method: 'GET', ...options }),
    
  post: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    authenticatedRequest<T>(endpoint, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined,
      ...options 
    }),
    
  put: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    authenticatedRequest<T>(endpoint, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined,
      ...options 
    }),
    
  patch: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    authenticatedRequest<T>(endpoint, { 
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined,
      ...options 
    }),
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    authenticatedRequest<T>(endpoint, { method: 'DELETE', ...options }),
};

/**
 * Example usage:
 * 
 * // GET request
 * const screens = await api.get<Screen[]>('/screens');
 * 
 * // POST request
 * const newScreen = await api.post<Screen>('/screens', { name: 'New Screen' });
 * 
 * // PUT request
 * const updatedScreen = await api.put<Screen>(`/screens/${id}`, screenData);
 * 
 * // DELETE request
 * await api.delete(`/screens/${id}`);
 */