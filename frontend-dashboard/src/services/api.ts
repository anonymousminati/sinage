/**
 * Enhanced API client with authentication support, file uploads, and retry logic
 * Provides a centralized way to make authenticated API requests throughout the app
 */

import { AuthApiError } from './auth';

const API_BASE_URL = 'http://localhost:5000/api';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second base delay
const REQUEST_TIMEOUT = 30000; // 30 seconds default timeout

/**
 * Get authentication token from localStorage
 * Fixed to match the token storage strategy in AuthContext exactly
 */
function getAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch (error) {
    console.warn('Failed to retrieve auth token:', error);
    return null;
  }
}

/**
 * Sleep utility for retry delays with exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create standardized error from response
 */
function createErrorFromResponse(response: Response, data?: any): AuthApiError {
  const message = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
  
  switch (response.status) {
    case 401:
      return new AuthApiError('Session expired. Please log in again.', 401);
    case 403:
      return new AuthApiError('Access denied', 403);
    case 404:
      return new AuthApiError('Resource not found', 404);
    case 413:
      return new AuthApiError('File too large', 413);
    case 429:
      return new AuthApiError('Too many requests. Please try again later.', 429);
    case 422:
      return new AuthApiError(message, 422, data?.errors);
    default:
      if (response.status >= 500) {
        return new AuthApiError('Server error. Please try again later.', response.status);
      }
      return new AuthApiError(message, response.status);
  }
}

/**
 * Enhanced fetch with retry logic and proper error handling
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retryCount = 0,
  timeout = REQUEST_TIMEOUT
): Promise<Response> {
  const token = getAuthToken();
  
  if (!token) {
    throw new AuthApiError('Authentication required', 401);
  }

  const config: RequestInit = {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  // Add Content-Type only for non-FormData requests
  if (!(options.body instanceof FormData)) {
    config.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  try {
    // Add timeout to the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    // Handle network errors with retry logic for non-upload requests
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (retryCount < MAX_RETRY_ATTEMPTS && !(options.body instanceof FormData)) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.warn(`Network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        await sleep(delay);
        return fetchWithRetry(url, options, retryCount + 1, timeout);
      }
      throw new AuthApiError('Network error. Please check your connection.', 0);
    }
    
    // Handle abort/timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AuthApiError('Request timeout. Please try again.', 0);
    }
    
    throw error;
  }
}

/**
 * Process response and handle errors consistently
 */
async function processResponse<T>(response: Response): Promise<T> {
  let data;
  
  try {
    data = await response.json();
  } catch (error) {
    throw new AuthApiError('Invalid response format', response.status);
  }

  if (!response.ok) {
    throw createErrorFromResponse(response, data);
  }

  return data as T;
}

/**
 * Enhanced authenticated API request wrapper
 * Supports both JSON and FormData requests with retry logic
 */
export async function authenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout?: number
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetchWithRetry(url, options, 0, timeout);
    return await processResponse<T>(response);
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Upload progress callback type
 */
export interface UploadProgressCallback {
  (progress: { loaded: number; total: number; percentage: number }): void;
}

/**
 * Enhanced file upload function with progress tracking
 */
export async function uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>,
  onProgress?: UploadProgressCallback,
  timeout = 120000 // 2 minutes for uploads
): Promise<T> {
  const token = getAuthToken();
  
  if (!token) {
    throw new AuthApiError('Authentication required', 401);
  }

  const formData = new FormData();
  formData.append('file', file);
  
  // Add additional form data if provided
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage,
          });
        }
      };
    }

    // Handle successful completion
    xhr.onload = () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } else {
          let errorData;
          try {
            errorData = JSON.parse(xhr.responseText);
          } catch {
            errorData = { message: 'Upload failed' };
          }
          
          const error = createErrorFromResponse(
            { status: xhr.status, statusText: xhr.statusText } as Response,
            errorData
          );
          
          reject(error);
        }
      } catch (parseError) {
        reject(new AuthApiError('Failed to parse server response', xhr.status));
      }
    };

    // Handle network errors
    xhr.onerror = () => {
      reject(new AuthApiError('Network error during upload', 0));
    };

    // Handle timeouts
    xhr.ontimeout = () => {
      reject(new AuthApiError('Upload timeout. Please try again.', 0));
    };

    // Configure and send request
    xhr.timeout = timeout;
    xhr.open('POST', `${API_BASE_URL}${endpoint}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * Enhanced convenience methods for common HTTP verbs
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestInit, timeout?: number) => 
    authenticatedRequest<T>(endpoint, { method: 'GET', ...options }, timeout),
    
  post: <T>(endpoint: string, data?: any, options?: RequestInit, timeout?: number) => {
    // Handle FormData vs JSON automatically
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    return authenticatedRequest<T>(endpoint, { 
      method: 'POST', 
      body,
      ...options 
    }, timeout);
  },
    
  put: <T>(endpoint: string, data?: any, options?: RequestInit, timeout?: number) => {
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    return authenticatedRequest<T>(endpoint, { 
      method: 'PUT', 
      body,
      ...options 
    }, timeout);
  },
    
  patch: <T>(endpoint: string, data?: any, options?: RequestInit, timeout?: number) => {
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    return authenticatedRequest<T>(endpoint, { 
      method: 'PATCH', 
      body,
      ...options 
    }, timeout);
  },
    
  delete: <T>(endpoint: string, options?: RequestInit, timeout?: number) => 
    authenticatedRequest<T>(endpoint, { method: 'DELETE', ...options }, timeout),

  // File upload with progress tracking
  upload: uploadFile,
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