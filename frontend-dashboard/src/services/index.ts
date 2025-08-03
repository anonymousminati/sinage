/**
 * Services Index
 * 
 * Centralized export point for all service modules, providing a clean
 * and organized API for the rest of the application.
 * 
 * This file ensures that all services are properly typed and accessible
 * throughout the application with consistent interfaces.
 */

// ============================
// Authentication Services
// ============================

export {
  login,
  register,
  logout,
  getProfile,
  isAuthApiError,
  getErrorMessage,
  getValidationErrors,
  AuthApiError,
  type LoginRequest,
  type RegisterRequest,
  type User,
  type AuthResponse,
  type ApiError,
} from './auth';

// ============================
// Enhanced API Client
// ============================

export {
  authenticatedRequest,
  uploadFile,
  api,
  type UploadProgressCallback,
} from './api';

// ============================
// Media API Services
// ============================

export {
  getMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
  getDownloadUrl,
  getMediaStats,
  generateVideoThumbnail,
  isMediaApiError,
  getMediaErrorMessage,
  getMediaValidationErrors,
  formatFileSize,
  formatDuration,
  mediaAPI,
  type MediaItem,
  type MediaStatistics,
  type MediaPagination,
  type MediaFilters,
  type UploadProgress,
  type UploadMetadata,
  type UpdateMediaMetadata,
  type GetMediaParams,
  type MediaResponse,
  type MediaStatsResponse,
  type UploadResponse,
  type UpdateResponse,
  type DeleteResponse,
  type DownloadResponse,
} from './mediaAPI';

// ============================
// Service Utilities
// ============================

/**
 * Check if the application is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Get the current API base URL based on environment
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string, status = 500): ApiError {
  return {
    success: false,
    message,
    errors: {},
  };
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

// ============================
// Service Health Check
// ============================

/**
 * Perform a health check on all services
 */
export async function performHealthCheck(): Promise<{
  auth: boolean;
  media: boolean;
  overall: boolean;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  let authHealthy = false;
  let mediaHealthy = false;

  try {
    // Test auth service by attempting to get profile (will fail gracefully if no token)
    await getProfile();
    authHealthy = true;
  } catch (error) {
    // Auth service is accessible even if request fails due to no token
    authHealthy = error instanceof AuthApiError;
  }

  try {
    // Test media service by attempting to get stats
    await getMediaStats();
    mediaHealthy = true;
  } catch (error) {
    // Media service is accessible even if request fails due to auth
    mediaHealthy = error instanceof AuthApiError;
  }

  return {
    auth: authHealthy,
    media: mediaHealthy,
    overall: authHealthy && mediaHealthy,
    timestamp,
  };
}

// ============================
// Default Service Configuration
// ============================

/**
 * Default configuration for all services
 */
export const serviceConfig = {
  apiBaseUrl: getApiBaseUrl(),
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  uploadTimeout: 120000,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  
  // File upload constraints
  upload: {
    maxFileSize: {
      image: 10 * 1024 * 1024, // 10MB
      video: 50 * 1024 * 1024, // 50MB
    },
    allowedTypes: {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
      video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    },
    maxFiles: 1000,
  },
  
  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;

// ============================
// Service Event Types
// ============================

/**
 * Service event types for monitoring and debugging
 */
export interface ServiceEvent {
  type: 'request' | 'response' | 'error' | 'retry' | 'upload_progress';
  service: 'auth' | 'media' | 'api';
  endpoint?: string;
  timestamp: string;
  data?: any;
  error?: any;
}

/**
 * Service event listener type
 */
export type ServiceEventListener = (event: ServiceEvent) => void;

/**
 * Simple event emitter for service events
 */
class ServiceEventEmitter {
  private listeners: ServiceEventListener[] = [];

  subscribe(listener: ServiceEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(event: ServiceEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Service event listener error:', error);
      }
    });
  }
}

/**
 * Global service event emitter instance
 */
export const serviceEvents = new ServiceEventEmitter();

// ============================
// Service Monitoring
// ============================

/**
 * Enable service monitoring in development mode
 */
if (isDevelopment()) {
  serviceEvents.subscribe((event) => {
    console.log(`[${event.service.toUpperCase()}] ${event.type}:`, event);
  });
}

// ============================
// Export default service bundle
// ============================

export default {
  auth: {
    login,
    register,
    logout,
    getProfile,
    isAuthApiError,
    getErrorMessage,
    getValidationErrors,
  },
  api: {
    authenticatedRequest,
    uploadFile,
    api,
  },
  media: {
    getMedia,
    uploadMedia,
    updateMedia,
    deleteMedia,
    getDownloadUrl,
    getMediaStats,
    generateVideoThumbnail,
    isMediaApiError,
    getMediaErrorMessage,
    getMediaValidationErrors,
    formatFileSize,
    formatDuration,
    mediaAPI,
  },
  utils: {
    isOnline,
    getApiBaseUrl,
    createErrorResponse,
    isDevelopment,
    isProduction,
    performHealthCheck,
  },
  config: serviceConfig,
  events: serviceEvents,
} as const;