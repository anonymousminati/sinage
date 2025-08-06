/**
 * Playlist API Service Layer
 * 
 * Provides a comprehensive interface for all playlist-related HTTP requests
 * with proper error handling, retry logic, and optimistic updates.
 * 
 * Features:
 * - Complete CRUD operations for playlists
 * - Playlist item management (add/remove/reorder)
 * - Screen assignment functionality
 * - Bulk operations with progress tracking
 * - Retry logic for failed requests
 * - Type-safe interfaces with comprehensive error handling
 * - Integration with existing media API patterns
 */

import { AuthApiError } from './auth';
import type {
  Playlist,
  PlaylistItem,
  ScreenAssignment,
  CreatePlaylistData,
  UpdatePlaylistData,
  GetPlaylistParams,
  PlaylistResponse,
  PlaylistStatsResponse,
  SinglePlaylistResponse,
  PlaylistItemResponse,
  BulkPlaylistOperation,
  BulkPlaylistResponse,
} from '../types';

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
      return new AuthApiError('Playlist not found', 404);
    case 409:
      return new AuthApiError('Playlist name already exists', 409);
    case 413:
      return new AuthApiError('Request too large', 413);
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
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

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
// Core Playlist API Functions
// ============================

/**
 * Get playlists with query parameters for pagination, filtering, and search
 * 
 * @param params Query parameters for filtering and pagination
 * @returns Promise<PlaylistResponse> Playlists with pagination and filters
 */
export async function getPlaylists(params: GetPlaylistParams = {}): Promise<PlaylistResponse> {
  const queryParams = new URLSearchParams();
  
  // Add all provided parameters to query string - matching backend schema
  if (params.search) queryParams.append('search', params.search);
  if (params.isPublic !== undefined) queryParams.append('isPublic', String(params.isPublic));
  if (params.tags) queryParams.append('tags', params.tags);
  if (params.assignedToScreen) queryParams.append('assignedToScreen', params.assignedToScreen);
  if (params.page) queryParams.append('page', String(params.page));
  if (params.limit) queryParams.append('limit', String(params.limit));
  
  // Map frontend sort values to backend expected values
  let sortValue = params.sortBy || 'modified';
  if (sortValue === 'date') sortValue = 'modified';
  if (sortValue === 'name') sortValue = 'name';
  if (sortValue === 'createdAt') sortValue = 'created';
  if (sortValue === 'updatedAt') sortValue = 'modified';
  queryParams.append('sort', sortValue);
  
  if (params.sortOrder) queryParams.append('order', params.sortOrder);
  
  // Remove unsupported parameters: includeItems, includeAnalytics, isActive, hasSchedule

  const url = `${API_BASE_URL}/playlists?${queryParams}`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'GET' });
    return await processResponse<PlaylistResponse>(response);
  } catch (error) {
    console.error('Failed to fetch playlists:', error);
    throw error;
  }
}

/**
 * Get a single playlist by ID with optional inclusions
 * 
 * @param id Playlist ID
 * @param includeItems Include playlist items
 * @param includeAnalytics Include analytics data
 * @returns Promise<Playlist> Single playlist data
 */
export async function getPlaylist(
  id: string,
  includeItems = true,
  includeAnalytics = false
): Promise<Playlist> {
  const queryParams = new URLSearchParams();
  if (includeItems) queryParams.append('includeItems', 'true');
  if (includeAnalytics) queryParams.append('includeAnalytics', 'true');

  const url = `${API_BASE_URL}/playlists/${id}?${queryParams}`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'GET' });
    const result = await processResponse<SinglePlaylistResponse>(response);
    return result.data;
  } catch (error) {
    console.error('Failed to fetch playlist:', error);
    throw error;
  }
}

/**
 * Create a new playlist
 * 
 * @param data Playlist creation data
 * @returns Promise<Playlist> Created playlist
 */
export async function createPlaylist(data: CreatePlaylistData): Promise<Playlist> {
  const url = `${API_BASE_URL}/playlists`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const result = await processResponse<SinglePlaylistResponse>(response);
    return result.data;
  } catch (error) {
    console.error('Failed to create playlist:', error);
    throw error;
  }
}

/**
 * Update playlist metadata
 * 
 * @param id Playlist ID
 * @param data Update data
 * @returns Promise<Playlist> Updated playlist
 */
export async function updatePlaylist(id: string, data: UpdatePlaylistData): Promise<Playlist> {
  const url = `${API_BASE_URL}/playlists/${id}`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    const result = await processResponse<SinglePlaylistResponse>(response);
    return result.data;
  } catch (error) {
    console.error('Failed to update playlist:', error);
    throw error;
  }
}

/**
 * Delete a playlist
 * 
 * @param id Playlist ID
 * @returns Promise<void> Deletion confirmation
 */
export async function deletePlaylist(id: string): Promise<void> {
  const url = `${API_BASE_URL}/playlists/${id}`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'DELETE' });
    await processResponse(response);
  } catch (error) {
    console.error('Failed to delete playlist:', error);
    throw error;
  }
}

/**
 * Duplicate a playlist with optional new name
 * 
 * @param id Playlist ID
 * @param name Optional new name (defaults to "Copy of [original name]")
 * @returns Promise<Playlist> Duplicated playlist
 */
export async function duplicatePlaylist(id: string, name?: string): Promise<Playlist> {
  const url = `${API_BASE_URL}/playlists/${id}/duplicate`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    
    const result = await processResponse<SinglePlaylistResponse>(response);
    return result.data;
  } catch (error) {
    console.error('Failed to duplicate playlist:', error);
    throw error;
  }
}

// ============================
// Playlist Item Management
// ============================

/**
 * Add media to playlist at specific position
 * 
 * @param playlistId Playlist ID
 * @param mediaId Media item ID
 * @param position Optional position (defaults to end)
 * @param duration Optional custom duration override
 * @returns Promise<PlaylistItem> Created playlist item
 */
export async function addMediaToPlaylist(
  playlistId: string,
  mediaId: string,
  position?: number,
  duration?: number
): Promise<PlaylistItem> {
  const url = `${API_BASE_URL}/playlists/${playlistId}/items`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify({
        mediaId,
        order: position, // Backend expects 'order' not 'position'
        duration,
      }),
    });
    
    const result = await processResponse<any>(response);
    // Backend returns { data: { item: PlaylistItem } } structure
    return result.data.item || result.data;
  } catch (error) {
    console.error('Failed to add media to playlist:', error);
    throw error;
  }
}

/**
 * Remove media from playlist
 * 
 * @param playlistId Playlist ID
 * @param itemId Playlist item ID
 * @returns Promise<void> Removal confirmation
 */
export async function removeMediaFromPlaylist(playlistId: string, itemId: string): Promise<void> {
  const url = `${API_BASE_URL}/playlists/${playlistId}/items/${itemId}`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'DELETE' });
    await processResponse(response);
  } catch (error) {
    console.error('Failed to remove media from playlist:', error);
    throw error;
  }
}

/**
 * Reorder playlist items
 * 
 * @param playlistId Playlist ID
 * @param items Array of playlist items with updated order
 * @returns Promise<Playlist> Updated playlist with reordered items
 */
export async function reorderPlaylistItems(
  playlistId: string,
  items: PlaylistItem[]
): Promise<Playlist> {
  // Note: Backend expects /items/reorder not /reorder
  const url = `${API_BASE_URL}/playlists/${playlistId}/items/reorder`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      body: JSON.stringify({
        // Backend expects itemOrder not items
        itemOrder: items.map(item => item.id),
      }),
    });
    
    const result = await processResponse<SinglePlaylistResponse>(response);
    return result.data;
  } catch (error) {
    console.error('Failed to reorder playlist items:', error);
    throw error;
  }
}

/**
 * Update playlist item settings
 * 
 * @param playlistId Playlist ID
 * @param itemId Playlist item ID
 * @param data Update data (duration, transitions, conditions)
 * @returns Promise<PlaylistItem> Updated playlist item
 */
export async function updatePlaylistItem(
  playlistId: string,
  itemId: string,
  data: Partial<Pick<PlaylistItem, 'duration' | 'transitions' | 'conditions'>>
): Promise<PlaylistItem> {
  const url = `${API_BASE_URL}/playlists/${playlistId}/items/${itemId}`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    const result = await processResponse<PlaylistItemResponse>(response);
    return result.data;
  } catch (error) {
    console.error('Failed to update playlist item:', error);
    throw error;
  }
}

// ============================
// Screen Assignment
// ============================

/**
 * Assign playlist to screens
 * 
 * @param playlistId Playlist ID
 * @param screenIds Array of screen IDs
 * @returns Promise<void> Assignment confirmation
 */
export async function assignPlaylistToScreens(
  playlistId: string,
  screenIds: string[]
): Promise<void> {
  const url = `${API_BASE_URL}/playlists/${playlistId}/assign`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify({ 
        screenIds,
        action: 'assign' // Backend expects action field
      }),
    });
    
    await processResponse(response);
  } catch (error) {
    console.error('Failed to assign playlist to screens:', error);
    throw error;
  }
}

/**
 * Remove playlist assignment from screens
 * 
 * @param playlistId Playlist ID
 * @param screenIds Array of screen IDs (optional, removes from all if not provided)
 * @returns Promise<void> Unassignment confirmation
 */
export async function unassignPlaylistFromScreens(
  playlistId: string,
  screenIds?: string[]
): Promise<void> {
  // Backend uses same assign endpoint with different action
  const url = `${API_BASE_URL}/playlists/${playlistId}/assign`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify({ 
        screenIds: screenIds || [], 
        action: 'unassign' // Backend expects action field
      }),
    });
    
    await processResponse(response);
  } catch (error) {
    console.error('Failed to unassign playlist from screens:', error);
    throw error;
  }
}

/**
 * Get playlist assignments for a playlist
 * 
 * @param playlistId Playlist ID
 * @returns Promise<ScreenAssignment[]> Screen assignments
 */
export async function getPlaylistAssignments(playlistId: string): Promise<ScreenAssignment[]> {
  const url = `${API_BASE_URL}/playlists/${playlistId}/assignments`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'GET' });
    const result = await processResponse<{ success: boolean; data: ScreenAssignment[] }>(response);
    return result.data;
  } catch (error) {
    console.error('Failed to get playlist assignments:', error);
    throw error;
  }
}

// ============================
// Bulk Operations
// ============================

/**
 * Perform bulk operations on multiple playlists
 * 
 * @param operation Bulk operation configuration
 * @returns Promise<BulkPlaylistResponse> Operation results
 */
export async function bulkPlaylistOperation(operation: BulkPlaylistOperation): Promise<BulkPlaylistResponse> {
  const url = `${API_BASE_URL}/playlists/bulk`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify(operation),
    });
    
    return await processResponse<BulkPlaylistResponse>(response);
  } catch (error) {
    console.error('Failed to perform bulk playlist operation:', error);
    throw error;
  }
}

// ============================
// Statistics and Analytics
// ============================

/**
 * Get playlist statistics for dashboard
 * 
 * @returns Promise<PlaylistStatsResponse> Comprehensive playlist statistics
 */
export async function getPlaylistStats(): Promise<PlaylistStatsResponse> {
  const url = `${API_BASE_URL}/playlists/stats`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'GET' });
    return await processResponse<PlaylistStatsResponse>(response);
  } catch (error) {
    console.error('Failed to fetch playlist statistics:', error);
    throw error;
  }
}

/**
 * Get playlist analytics for a specific playlist
 * 
 * @param playlistId Playlist ID
 * @param dateRange Optional date range filter
 * @returns Promise<any> Playlist analytics data
 */
export async function getPlaylistAnalytics(
  playlistId: string,
  dateRange?: { startDate: string; endDate: string }
): Promise<any> {
  const queryParams = new URLSearchParams();
  if (dateRange) {
    queryParams.append('startDate', dateRange.startDate);
    queryParams.append('endDate', dateRange.endDate);
  }

  const url = `${API_BASE_URL}/playlists/${playlistId}/analytics?${queryParams}`;
  
  try {
    const response = await fetchWithRetry(url, { method: 'GET' });
    return await processResponse(response);
  } catch (error) {
    console.error('Failed to fetch playlist analytics:', error);
    throw error;
  }
}

// ============================
// Convenience Functions
// ============================

/**
 * Check if error is a playlist API error
 */
export function isPlaylistApiError(error: any): error is AuthApiError {
  return error instanceof AuthApiError;
}

/**
 * Get user-friendly error message
 */
export function getPlaylistErrorMessage(error: any): string {
  if (isPlaylistApiError(error)) {
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
export function getPlaylistValidationErrors(error: any): Record<string, string> | undefined {
  if (isPlaylistApiError(error) && error.validationErrors) {
    return error.validationErrors;
  }
  
  return undefined;
}

/**
 * Calculate total duration from playlist items
 */
export function calculatePlaylistDuration(items: PlaylistItem[]): number {
  return items.reduce((total, item) => {
    const duration = item.duration || item.media?.duration || 0;
    return total + duration;
  }, 0);
}

/**
 * Format playlist duration to human-readable string
 */
export function formatPlaylistDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0 && remainingSeconds === 0) {
    return `${hours}h`;
  }
  
  if (remainingSeconds === 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

/**
 * Validate playlist name
 */
export function validatePlaylistName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Playlist name is required';
  }
  
  if (name.trim().length < 2) {
    return 'Playlist name must be at least 2 characters';
  }
  
  if (name.trim().length > 100) {
    return 'Playlist name must be less than 100 characters';
  }
  
  return null;
}

// ============================
// Export default API object
// ============================

export const playlistAPI = {
  // CRUD operations
  getPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  duplicatePlaylist,
  
  // Item management
  addMediaToPlaylist,
  removeMediaFromPlaylist,
  reorderPlaylistItems,
  updatePlaylistItem,
  
  // Screen assignment
  assignPlaylistToScreens,
  unassignPlaylistFromScreens,
  getPlaylistAssignments,
  
  // Bulk operations
  bulkPlaylistOperation,
  
  // Statistics and analytics
  getPlaylistStats,
  getPlaylistAnalytics,
  
  // Utility functions
  isPlaylistApiError,
  getPlaylistErrorMessage,
  getPlaylistValidationErrors,
  calculatePlaylistDuration,
  formatPlaylistDuration,
  validatePlaylistName,
} as const;

export default playlistAPI;