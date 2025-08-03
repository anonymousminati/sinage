/**
 * Centralized TypeScript type definitions
 * 
 * This file consolidates and re-exports all TypeScript interfaces and types
 * used throughout the application to ensure type safety and consistency.
 */

// ============================
// Authentication Types
// ============================

export type {
  LoginRequest,
  RegisterRequest,
  User,
  AuthResponse,
  ApiError,
} from '../services/auth';

export { AuthApiError } from '../services/auth';

// ============================
// Media API Types
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

export type {
  UploadProgress,
  UploadMetadata,
  UpdateMediaMetadata,
  GetMediaParams,
  MediaResponse,
  MediaStatsResponse,
  UploadResponse,
  UpdateResponse,
  DeleteResponse,
  DownloadResponse,
} from '../services/mediaAPI';

// ============================
// Enhanced API Client Types
// ============================

export type { UploadProgressCallback } from '../services/api';

// ============================
// Store Types
// ============================

export type {
  MediaItem as StoreMediaItem,
  MediaStatistics as StoreMediaStatistics,
  MediaFilters as StoreMediaFilters,
  MediaPagination as StoreMediaPagination,
  UploadProgress as StoreUploadProgress,
  GetMediaParams as StoreGetMediaParams,
  UpdateMediaMetadata as StoreUpdateMediaMetadata,
  UploadMetadata as StoreUploadMetadata,
} from '../stores/useMediaStore';

// ============================
// Common Application Types
// ============================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

/**
 * Generic pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Generic filter parameters
 */
export interface FilterParams {
  search?: string;
  type?: string;
  tags?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Generic sort options
 */
export interface SortOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * File upload configuration
 */
export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  maxFiles: number;
  timeout: number;
}

/**
 * Error handling types
 */
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Network status types
 */
export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  lastConnected?: string;
}

/**
 * Loading states for different operations
 */
export interface LoadingStates {
  fetching: boolean;
  uploading: boolean;
  updating: boolean;
  deleting: boolean;
}

/**
 * Component props types
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Modal props
 */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

/**
 * Form field types
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'file';
  required?: boolean;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

/**
 * Toast notification types
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  secondaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: ThemeConfig;
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  media: {
    autoPlay: boolean;
    showThumbnails: boolean;
    defaultView: 'grid' | 'list';
    itemsPerPage: number;
  };
}

// ============================
// Utility Types
// ============================

/**
 * Make all properties of T optional except for K
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Extract keys of T where the value type is U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Recursive partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Function that returns a promise
 */
export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;

/**
 * Event handler types
 */
export type EventHandler<T = any> = (event: T) => void;
export type ChangeHandler<T = string> = (value: T) => void;

// ============================
// Environment and Configuration Types
// ============================

/**
 * Environment configuration
 */
export interface AppConfig {
  apiBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
  enableDebug: boolean;
  enableAnalytics: boolean;
  uploadConfig: UploadConfig;
  features: {
    mediaLibrary: boolean;
    realTimeUpdates: boolean;
    notifications: boolean;
    analytics: boolean;
  };
}

/**
 * Application metadata
 */
export interface AppMetadata {
  version: string;
  buildDate: string;
  gitCommit: string;
  environment: string;
}

// ============================
// Export all utility functions related to types
// ============================

/**
 * Type guard to check if an error is an API error
 */
export function isApiError(error: any): error is AuthApiError {
  return error instanceof AuthApiError;
}

/**
 * Type guard to check if a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a string is not empty
 */
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard to check if an object has a specific property
 */
export function hasProperty<K extends string>(
  obj: any,
  prop: K
): obj is Record<K, unknown> {
  return obj && typeof obj === 'object' && prop in obj;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unknown error occurred';
}

/**
 * Type-safe object keys
 */
export function getTypedKeys<T extends Record<string, any>>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

/**
 * Type-safe object entries
 */
export function getTypedEntries<T extends Record<string, any>>(
  obj: T
): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

// ============================
// Default exports for common types
// ============================

export default {
  // Utility functions
  isApiError,
  isDefined,
  isNonEmptyString,
  hasProperty,
  getErrorMessage,
  getTypedKeys,
  getTypedEntries,
};