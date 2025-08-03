/**
 * Media API Service Layer
 * 
 * Provides a comprehensive interface for all media-related HTTP requests
 * with progress tracking, error handling, and optimistic updates.
 * 
 * Features:
 * - Consistent response formats
 * - Upload progress tracking with XMLHttpRequest
 * - Retry logic for failed requests
 * - Proper error handling for different HTTP status codes
 * - Cache invalidation strategies
 * - Type-safe interfaces
 * - Full TypeScript support with comprehensive error handling
 */

import { AuthApiError } from './auth';

// ============================
// TypeScript Interfaces
// ============================

export interface MediaItem {
  _id: string;
  originalName: string;
  filename: string;
  cloudinaryId: string;
  url: string;
  secureUrl: string;
  type: 'image' | 'video';
  format: string;
  width?: number;
  height?: number;
  fileSize: number;
  duration?: number;
  tags: string[];
  description?: string;
  owner: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  aspectRatio?: string;
  isLandscape?: boolean;
  formattedFileSize: string;
  formattedDuration?: string;
}

export interface MediaStatistics {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  videoCount: number;
  totalUsage: number;
  avgFileSize: number;
  recentCount: number;
}

export interface MediaPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MediaFilters {
  type?: 'image' | 'video' | '';
  search: string;
  sortBy: 'date' | 'name' | 'size' | 'usage';
  sortOrder: 'asc' | 'desc';
  tags?: string;
}

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface UploadMetadata {
  duration?: number;
  tags?: string;
  description?: string;
}

export interface UpdateMediaMetadata {
  duration?: number;
  tags?: string;
  description?: string;
}

// API Response Interfaces
export interface MediaResponse {
  success: boolean;
  message: string;
  data: {
    media: MediaItem[];
    pagination: MediaPagination;
    statistics: MediaStatistics;
    filters: MediaFilters;
  };
}

export interface MediaStatsResponse {
  success: boolean;
  message: string;
  data: {
    database: MediaStatistics;
    recent: MediaItem[];
    popular: MediaItem[];
    storage: {
      userId: string;
      images: { count: number; bytes: number; credits: number };
      videos: { count: number; bytes: number; credits: number };
      total: { count: number; bytes: number; credits: number };
    };
    limits: {
      maxFileSize: { image: number; video: number };
      maxFiles: number;
    };
  };
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: MediaItem;
}

export interface UpdateResponse {
  success: boolean;
  message: string;
  data: MediaItem;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    cloudinaryId: string;
  };
  warning?: string;
}

export interface DownloadResponse {
  success: boolean;
  message: string;
  data: {
    downloadUrl: string;
    expiresAt: string;
    filename: string;
    fileSize: number;
    type: string;
  };
}

export interface GetMediaParams extends Partial<MediaFilters> {
  page?: number;
  limit?: number;
}

// ============================
// Configuration
// ============================

const API_BASE_URL = 'http://localhost:5000/api';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second base delay
const REQUEST_TIMEOUT = 30000; // 30 seconds

// ============================
// Utility Functions
// ============================

/**
 * Get authentication token from localStorage
 * Matches the token storage strategy in AuthContext
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
  retryCount = 0
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
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    // Handle network errors with retry logic
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.warn(`Network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        await sleep(delay);
        return fetchWithRetry(url, options, retryCount + 1);
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

// ============================
// Core API Functions
// ============================

/**
 * Get media with query parameters for pagination, filtering, and search
 * 
 * @param params Query parameters for filtering and pagination
 * @returns Promise<MediaResponse> Media items with pagination and statistics
 */
export async function getMedia(params: GetMediaParams = {}): Promise<MediaResponse> {
  const queryParams = new URLSearchParams();
  
  // Add all provided parameters to query string
  if (params.type) queryParams.append('type', params.type);
  if (params.search) queryParams.append('search', params.search);
  if (params.tags) queryParams.append('tags', params.tags);
  if (params.sortBy) queryParams.append('sort', params.sortBy);
  if (params.sortOrder) queryParams.append('order', params.sortOrder);
  if (params.page) queryParams.append('page', String(params.page));
  if (params.limit) queryParams.append('limit', String(params.limit));

  const url = `${API_BASE_URL}/media?${queryParams}`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'GET' });
    return await processResponse<MediaResponse>(response);
  } catch (error) {
    console.error('Failed to fetch media:', error);
    throw error;
  }
}

/**
 * Upload media with FormData and progress tracking using XMLHttpRequest
 * 
 * @param file File to upload
 * @param metadata Optional metadata (duration, tags, description)
 * @param onProgress Progress callback function
 * @returns Promise<MediaItem> Uploaded media item
 */
export async function uploadMedia(
  file: File,
  metadata: UploadMetadata = {},
  onProgress?: (progress: UploadProgress) => void
): Promise<MediaItem> {
  const token = getAuthToken();
  
  if (!token) {
    throw new AuthApiError('Authentication required', 401);
  }

  const fileId = `${Date.now()}_${file.name}`;
  const formData = new FormData();
  
  formData.append('file', file);
  if (metadata.duration) formData.append('duration', String(metadata.duration));
  if (metadata.tags) formData.append('tags', metadata.tags);
  if (metadata.description) formData.append('description', metadata.description);

  return new Promise<MediaItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress({
          fileId,
          filename: file.name,
          progress,
          status: 'uploading',
        });
      }
    };

    // Handle successful completion
    xhr.onload = () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response: UploadResponse = JSON.parse(xhr.responseText);
          
          if (onProgress) {
            onProgress({
              fileId,
              filename: file.name,
              progress: 100,
              status: 'completed',
            });
          }
          
          resolve(response.data);
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
          
          if (onProgress) {
            onProgress({
              fileId,
              filename: file.name,
              progress: 0,
              status: 'error',
              error: error.message,
            });
          }
          
          reject(error);
        }
      } catch (parseError) {
        const error = new AuthApiError('Failed to parse server response', xhr.status);
        
        if (onProgress) {
          onProgress({
            fileId,
            filename: file.name,
            progress: 0,
            status: 'error',
            error: error.message,
          });
        }
        
        reject(error);
      }
    };

    // Handle network errors
    xhr.onerror = () => {
      const error = new AuthApiError('Network error during upload', 0);
      
      if (onProgress) {
        onProgress({
          fileId,
          filename: file.name,
          progress: 0,
          status: 'error',
          error: error.message,
        });
      }
      
      reject(error);
    };

    // Handle timeouts
    xhr.ontimeout = () => {
      const error = new AuthApiError('Upload timeout. Please try again.', 0);
      
      if (onProgress) {
        onProgress({
          fileId,
          filename: file.name,
          progress: 0,
          status: 'error',
          error: error.message,
        });
      }
      
      reject(error);
    };

    // Configure and send request
    xhr.timeout = 120000; // 2 minutes timeout for uploads
    xhr.open('POST', `${API_BASE_URL}/media/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * Update media metadata with optimistic updates
 * 
 * @param id Media item ID
 * @param metadata Metadata to update
 * @returns Promise<MediaItem> Updated media item
 */
export async function updateMedia(id: string, metadata: UpdateMediaMetadata): Promise<MediaItem> {
  const url = `${API_BASE_URL}/media/${id}`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      body: JSON.stringify(metadata),
    });
    
    const result = await processResponse<UpdateResponse>(response);
    return result.data;
  } catch (error) {
    console.error('Failed to update media:', error);
    throw error;
  }
}

/**
 * Delete media with proper error handling
 * 
 * @param id Media item ID
 * @returns Promise<DeleteResponse> Deletion confirmation
 */
export async function deleteMedia(id: string): Promise<DeleteResponse> {
  const url = `${API_BASE_URL}/media/${id}`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'DELETE' });
    return await processResponse<DeleteResponse>(response);
  } catch (error) {
    console.error('Failed to delete media:', error);
    throw error;
  }
}

/**
 * Get secure download URL for media
 * 
 * @param id Media item ID
 * @returns Promise<string> Secure download URL
 */
export async function getDownloadUrl(id: string): Promise<string> {
  const url = `${API_BASE_URL}/media/${id}/download`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'GET' });
    const result = await processResponse<DownloadResponse>(response);
    return result.data.downloadUrl;
  } catch (error) {
    console.error('Failed to get download URL:', error);
    throw error;
  }
}

/**
 * Get media statistics for dashboard
 * 
 * @returns Promise<MediaStatsResponse> Comprehensive media statistics
 */
export async function getMediaStats(): Promise<MediaStatsResponse> {
  const url = `${API_BASE_URL}/media/stats`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'GET' });
    return await processResponse<MediaStatsResponse>(response);
  } catch (error) {
    console.error('Failed to fetch media statistics:', error);
    throw error;
  }
}

/**
 * Generate video thumbnail
 * 
 * @param id Video media item ID
 * @param options Thumbnail generation options
 * @returns Promise<any> Thumbnail generation response
 */
export async function generateVideoThumbnail(
  id: string,
  options: {
    width?: number;
    height?: number;
    start_offset?: string;
  } = {}
): Promise<any> {
  const url = `${API_BASE_URL}/media/${id}/thumbnail`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify(options),
    });
    
    return await processResponse(response);
  } catch (error) {
    console.error('Failed to generate video thumbnail:', error);
    throw error;
  }
}

// ============================
// Convenience Functions
// ============================

/**
 * Check if error is a media API error
 */
export function isMediaApiError(error: any): error is AuthApiError {
  return error instanceof AuthApiError;
}

/**
 * Get user-friendly error message
 */
export function getMediaErrorMessage(error: any): string {
  if (isMediaApiError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Get validation errors from API response
 */
export function getMediaValidationErrors(error: any): Record<string, string> | undefined {
  if (isMediaApiError(error) && error.validationErrors) {
    return error.validationErrors;
  }
  
  return undefined;
}

/**
 * Utility to format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Utility to format duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================
// Export default API object
// ============================

export const mediaAPI = {
  getMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
  getDownloadUrl,
  getMediaStats,
  generateVideoThumbnail,
  
  // Utility functions
  isMediaApiError,
  getMediaErrorMessage,
  getMediaValidationErrors,
  formatFileSize,
  formatDuration,
} as const;

export default mediaAPI;