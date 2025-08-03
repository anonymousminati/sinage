/**
 * Authentication API service
 * Handles all authentication-related API calls to the backend
 */

const API_BASE_URL = 'http://localhost:5000/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken?: string;
    };
  };
  message: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

/**
 * Custom error class for API errors
 */
export class AuthApiError extends Error {
  public status: number;
  public errors?: Record<string, string>;

  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Generic API request wrapper with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle different types of errors
      if (response.status === 400 && data.errors) {
        // Validation errors
        throw new AuthApiError(data.message || 'Validation failed', response.status, data.errors);
      } else if (response.status === 401) {
        // Unauthorized - use server message if available, fallback to generic message
        throw new AuthApiError(data.message || 'Invalid email or password', response.status);
      } else if (response.status === 409) {
        // Conflict (e.g., user already exists)
        throw new AuthApiError(data.message || 'Conflict', response.status);
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
 * Register a new user
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Login user
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get user profile (requires authentication)
 */
export async function getProfile(token: string): Promise<{ success: boolean; data: { user: User } }> {
  return apiRequest<{ success: boolean; data: { user: User } }>('/auth/profile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Logout user (requires authentication)
 */
export async function logout(token: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Check if an error is an AuthApiError
 */
export function isAuthApiError(error: unknown): error is AuthApiError {
  return error instanceof AuthApiError;
}

/**
 * Extract user-friendly error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (isAuthApiError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Extract validation errors from API error
 */
export function getValidationErrors(error: unknown): Record<string, string> | undefined {
  if (isAuthApiError(error)) {
    return error.errors;
  }
  
  return undefined;
}