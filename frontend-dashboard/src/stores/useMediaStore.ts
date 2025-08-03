/**
 * Comprehensive Media Management Store
 * 
 * This Zustand store manages all media-related state and operations including:
 * - Media items with pagination and filtering
 * - Upload progress and file management
 * - Statistics and analytics
 * - Real-time updates and optimistic UI
 * - Comprehensive error handling
 * 
 * Updated to use the new Media API Service for all operations
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  getMedia,
  uploadMedia,
  updateMedia as updateMediaAPI,
  deleteMedia as deleteMediaAPI,
  getDownloadUrl,
  getMediaStats,
  isMediaApiError,
  getMediaErrorMessage,
  type MediaItem,
  type MediaStatistics,
  type MediaPagination,
  type MediaFilters,
  type UploadProgress,
  type GetMediaParams,
  type UpdateMediaMetadata,
  type UploadMetadata,
} from '../services/mediaAPI';

// Re-export types from API service for backward compatibility
export type {
  MediaItem,
  MediaStatistics,
  MediaFilters,
  MediaPagination,
  UploadProgress,
  GetMediaParams,
  UpdateMediaMetadata,
  UploadMetadata,
} from '../services/mediaAPI';

// Store-specific interfaces
interface MediaStoreState {
  media: MediaItem[];
  statistics: MediaStatistics;
  loading: boolean;
  uploading: boolean;
  uploadProgress: Record<string, UploadProgress>;
  error: string | null;
  filters: MediaFilters;
  pagination: MediaPagination;
  selectedMedia: MediaItem | null;
  searchValue: string;
  searchDebounceTimer: NodeJS.Timeout | null;
  lastFetch: number;
  cacheTimeout: number;
}

interface MediaStore extends MediaStoreState {
  // Actions - API Integration
  fetchMedia: (params?: GetMediaParams) => Promise<void>;
  uploadMedia: (file: File, metadata?: UploadMetadata) => Promise<MediaItem | null>;
  updateMedia: (id: string, metadata: UpdateMediaMetadata) => Promise<void>;
  deleteMedia: (id: string) => Promise<void>;
  downloadMedia: (id: string) => Promise<string | null>;
  fetchStats: () => Promise<void>;
  
  // Actions - Filter & Search
  setFilters: (filters: Partial<MediaFilters>) => void;
  setSortOrder: (sortBy: MediaFilters['sortBy'], sortOrder?: MediaFilters['sortOrder']) => void;
  clearFilters: () => void;
  setSearch: (search: string) => void;
  
  // Actions - UI State
  setSelectedMedia: (media: MediaItem | null) => void;
  clearError: () => void;
  setUploadProgress: (fileId: string, progress: Partial<UploadProgress>) => void;
  clearUploadProgress: (fileId: string) => void;
  
  // Actions - Pagination
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  
  // Actions - Cache Management
  invalidateCache: () => void;
  isDataStale: () => boolean;
}

// Default values
const defaultFilters: MediaFilters = {
  type: '',
  search: '',
  sortBy: 'date',
  sortOrder: 'desc',
  tags: undefined,
};

const defaultPagination: MediaPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasMore: false,
  hasNext: false,
  hasPrev: false,
};

const defaultStatistics: MediaStatistics = {
  totalFiles: 0,
  totalSize: 0,
  imageCount: 0,
  videoCount: 0,
  totalUsage: 0,
  avgFileSize: 0,
  recentCount: 0,
};

// Configuration
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Store Implementation
export const useMediaStore = create<MediaStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      media: [],
      statistics: defaultStatistics,
      loading: false,
      uploading: false,
      uploadProgress: {},
      error: null,
      filters: defaultFilters,
      pagination: defaultPagination,
      selectedMedia: null,
      searchValue: '',
      searchDebounceTimer: null,
      lastFetch: 0,
      cacheTimeout: CACHE_TIMEOUT,

      // API Actions
      fetchMedia: async (params = {}) => {
        const state = get();
        
        // Check cache validity - only if no params and cache is valid
        if (state.lastFetch && Date.now() - state.lastFetch < state.cacheTimeout && Object.keys(params).length === 0 && state.lastFetch > 0) {
          return;
        }

        set({ loading: true, error: null });

        try {
          // Merge current filters with new params
          const mergedParams: GetMediaParams = {
            ...state.filters,
            page: state.pagination.page,
            limit: state.pagination.limit,
            ...params,
          };

          const response = await getMedia(mergedParams);

          set({
            media: response.data.media,
            pagination: response.data.pagination,
            statistics: response.data.statistics,
            filters: response.data.filters,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error) {
          const errorMessage = isMediaApiError(error) 
            ? getMediaErrorMessage(error)
            : 'Failed to fetch media';
            
          set({
            loading: false,
            error: errorMessage,
          });
          
          console.error('Failed to fetch media:', error);
        }
      },

      uploadMedia: async (file, metadata = {}) => {
        const fileId = `${Date.now()}_${file.name}`;
        
        set({ uploading: true, error: null });
        
        // Initialize upload progress
        get().setUploadProgress(fileId, {
          fileId,
          filename: file.name,
          progress: 0,
          status: 'uploading',
        });

        try {
          // Use the new uploadMedia API service with progress callback
          const newMedia = await uploadMedia(file, metadata, (progress) => {
            get().setUploadProgress(fileId, progress);
          });

          // Add to media list optimistically
          set((state) => ({
            media: [newMedia, ...state.media],
            uploading: false,
            statistics: {
              ...state.statistics,
              totalFiles: state.statistics.totalFiles + 1,
              totalSize: state.statistics.totalSize + newMedia.fileSize,
              imageCount: newMedia.type === 'image' 
                ? state.statistics.imageCount + 1 
                : state.statistics.imageCount,
              videoCount: newMedia.type === 'video' 
                ? state.statistics.videoCount + 1 
                : state.statistics.videoCount,
            },
          }));

          // Clear progress after delay
          setTimeout(() => get().clearUploadProgress(fileId), 2000);
          
          return newMedia;
        } catch (error) {
          const errorMessage = isMediaApiError(error) 
            ? getMediaErrorMessage(error)
            : 'Upload failed';
            
          get().setUploadProgress(fileId, {
            status: 'error',
            error: errorMessage,
          });
          
          set({
            uploading: false,
            error: errorMessage,
          });
          
          console.error('Failed to upload media:', error);
          return null;
        }
      },

      updateMedia: async (id, metadata) => {
        set({ loading: true, error: null });

        try {
          const updatedMedia = await updateMediaAPI(id, metadata);

          // Update media optimistically
          set((state) => ({
            media: state.media.map((item) =>
              item._id === id ? { ...item, ...updatedMedia } : item
            ),
            selectedMedia: state.selectedMedia?._id === id 
              ? { ...state.selectedMedia, ...updatedMedia }
              : state.selectedMedia,
            loading: false,
          }));
        } catch (error) {
          const errorMessage = isMediaApiError(error) 
            ? getMediaErrorMessage(error)
            : 'Failed to update media';
            
          set({
            loading: false,
            error: errorMessage,
          });
          
          console.error('Failed to update media:', error);
        }
      },

      deleteMedia: async (id) => {
        set({ loading: true, error: null });

        // Store the item for potential rollback
        const state = get();
        const mediaToDelete = state.media.find(item => item._id === id);
        
        if (!mediaToDelete) {
          set({ loading: false, error: 'Media item not found' });
          return;
        }

        try {
          // Optimistic delete
          set((state) => ({
            media: state.media.filter((item) => item._id !== id),
            selectedMedia: state.selectedMedia?._id === id ? null : state.selectedMedia,
            statistics: {
              ...state.statistics,
              totalFiles: state.statistics.totalFiles - 1,
              totalSize: state.statistics.totalSize - mediaToDelete.fileSize,
              imageCount: mediaToDelete.type === 'image' 
                ? state.statistics.imageCount - 1 
                : state.statistics.imageCount,
              videoCount: mediaToDelete.type === 'video' 
                ? state.statistics.videoCount - 1 
                : state.statistics.videoCount,
            },
          }));

          await deleteMediaAPI(id);
          set({ loading: false });
        } catch (error) {
          const errorMessage = isMediaApiError(error) 
            ? getMediaErrorMessage(error)
            : 'Failed to delete media';
            
          // Rollback on error
          set((state) => ({
            media: [mediaToDelete, ...state.media],
            statistics: {
              ...state.statistics,
              totalFiles: state.statistics.totalFiles + 1,
              totalSize: state.statistics.totalSize + mediaToDelete.fileSize,
              imageCount: mediaToDelete.type === 'image' 
                ? state.statistics.imageCount + 1 
                : state.statistics.imageCount,
              videoCount: mediaToDelete.type === 'video' 
                ? state.statistics.videoCount + 1 
                : state.statistics.videoCount,
            },
            loading: false,
            error: errorMessage,
          }));
          
          console.error('Failed to delete media:', error);
        }
      },

      downloadMedia: async (id) => {
        try {
          const downloadUrl = await getDownloadUrl(id);

          // Update usage count optimistically
          set((state) => ({
            media: state.media.map((item) =>
              item._id === id ? { ...item, usageCount: item.usageCount + 1 } : item
            ),
          }));

          return downloadUrl;
        } catch (error) {
          const errorMessage = isMediaApiError(error) 
            ? getMediaErrorMessage(error)
            : 'Failed to generate download URL';
            
          set({ error: errorMessage });
          console.error('Failed to get download URL:', error);
          return null;
        }
      },

      fetchStats: async () => {
        const state = get();
        
        // Check cache validity - use shorter cache for stats (30 seconds)
        if (state.lastFetch && Date.now() - state.lastFetch < 30000) {
          return;
        }

        try {
          const response = await getMediaStats();
          
          set({
            statistics: {
              ...response.data.database,
              recentCount: response.data.recent.length,
            },
          });
        } catch (error) {
          const errorMessage = isMediaApiError(error) 
            ? getMediaErrorMessage(error)
            : 'Failed to fetch statistics';
            
          set({ error: errorMessage });
          console.error('Failed to fetch media statistics:', error);
        }
      },

      // Filter & Search Actions
      setFilters: (newFilters) => {
        set((state) => {
          const updatedFilters = { ...state.filters, ...newFilters };
          return {
            filters: updatedFilters,
            pagination: { ...state.pagination, page: 1 }, // Reset to first page
            lastFetch: 0, // Invalidate cache to force fetch
          };
        });
        
        // Trigger fetch with new filters
        get().fetchMedia();
      },

      setSortOrder: (sortBy, sortOrder = 'desc') => {
        set((state) => ({
          filters: { ...state.filters, sortBy, sortOrder },
          pagination: { ...state.pagination, page: 1 },
          lastFetch: 0, // Invalidate cache to force fetch
        }));
        
        get().fetchMedia();
      },

      clearFilters: () => {
        set({
          filters: defaultFilters,
          pagination: { ...defaultPagination },
          searchValue: '',
          lastFetch: 0, // Invalidate cache to force fetch
        });
        
        get().fetchMedia();
      },

      setSearch: (search) => {
        const state = get();
        
        // Clear existing debounce timer
        if (state.searchDebounceTimer) {
          clearTimeout(state.searchDebounceTimer);
        }
        
        set({ searchValue: search });
        
        // Debounce search
        const timer = setTimeout(() => {
          set((state) => ({
            filters: { ...state.filters, search },
            pagination: { ...state.pagination, page: 1 },
            searchDebounceTimer: null,
            lastFetch: 0, // Invalidate cache to force fetch
          }));
          
          get().fetchMedia();
        }, 300);
        
        set({ searchDebounceTimer: timer });
      },

      // UI State Actions
      setSelectedMedia: (media) => {
        set({ selectedMedia: media });
      },

      clearError: () => {
        set({ error: null });
      },

      setUploadProgress: (fileId, progress) => {
        set((state) => ({
          uploadProgress: {
            ...state.uploadProgress,
            [fileId]: { ...state.uploadProgress[fileId], ...progress },
          },
        }));
      },

      clearUploadProgress: (fileId) => {
        set((state) => {
          const { [fileId]: removed, ...rest } = state.uploadProgress;
          return { uploadProgress: rest };
        });
      },

      // Pagination Actions
      setPage: (page) => {
        set((state) => ({
          pagination: { ...state.pagination, page },
        }));
        
        get().fetchMedia({ page });
      },

      setLimit: (limit) => {
        set((state) => ({
          pagination: { ...state.pagination, limit, page: 1 }, // Reset to first page
        }));
        
        get().fetchMedia({ page: 1, limit });
      },

      nextPage: () => {
        const state = get();
        if (state.pagination.hasNext) {
          get().setPage(state.pagination.page + 1);
        }
      },

      prevPage: () => {
        const state = get();
        if (state.pagination.hasPrev) {
          get().setPage(state.pagination.page - 1);
        }
      },

      // Cache Management
      invalidateCache: () => {
        set({ lastFetch: 0 });
      },

      isDataStale: () => {
        const state = get();
        return !state.lastFetch || Date.now() - state.lastFetch > state.cacheTimeout;
      },
    })),
    {
      name: 'media-store',
      partialize: (state: MediaStore) => ({
        // Persist only essential data
        filters: state.filters,
        pagination: { ...state.pagination, page: 1 }, // Reset page on reload
      }),
    }
  )
);

// Selectors for optimized re-renders
export const useMediaItems = () => useMediaStore((state) => state.media);
export const useMediaLoading = () => useMediaStore((state) => state.loading);
export const useMediaError = () => useMediaStore((state) => state.error);
export const useMediaStatistics = () => useMediaStore((state) => state.statistics);
export const useMediaFilters = () => useMediaStore((state) => state.filters);
export const useMediaPagination = () => useMediaStore((state) => state.pagination);
export const useSelectedMedia = () => useMediaStore((state) => state.selectedMedia);
export const useUploadProgress = () => useMediaStore((state) => state.uploadProgress);
export const useUploading = () => useMediaStore((state) => state.uploading);

// Individual action selectors to avoid object creation
export const useFetchMedia = () => useMediaStore((state) => state.fetchMedia);
export const useUploadMedia = () => useMediaStore((state) => state.uploadMedia);
export const useUpdateMedia = () => useMediaStore((state) => state.updateMedia);
export const useDeleteMedia = () => useMediaStore((state) => state.deleteMedia);
export const useDownloadMedia = () => useMediaStore((state) => state.downloadMedia);
export const useFetchStats = () => useMediaStore((state) => state.fetchStats);
export const useSetSelectedMedia = () => useMediaStore((state) => state.setSelectedMedia);
export const useClearError = () => useMediaStore((state) => state.clearError);
export const useInvalidateCache = () => useMediaStore((state) => state.invalidateCache);

// Combined actions hook for convenience (with better caching)
const STABLE_ACTIONS = {} as any;

export const useMediaActions = () => {
  return useMediaStore((state) => {
    // Only update if any action function has actually changed
    if (
      STABLE_ACTIONS.fetchMedia !== state.fetchMedia ||
      STABLE_ACTIONS.uploadMedia !== state.uploadMedia ||
      STABLE_ACTIONS.updateMedia !== state.updateMedia ||
      STABLE_ACTIONS.deleteMedia !== state.deleteMedia ||
      STABLE_ACTIONS.downloadMedia !== state.downloadMedia ||
      STABLE_ACTIONS.fetchStats !== state.fetchStats ||
      STABLE_ACTIONS.setSelectedMedia !== state.setSelectedMedia ||
      STABLE_ACTIONS.clearError !== state.clearError ||
      STABLE_ACTIONS.invalidateCache !== state.invalidateCache ||
      STABLE_ACTIONS.setSearch !== state.setSearch ||
      STABLE_ACTIONS.setFilters !== state.setFilters ||
      STABLE_ACTIONS.clearFilters !== state.clearFilters ||
      STABLE_ACTIONS.setPage !== state.setPage ||
      STABLE_ACTIONS.setLimit !== state.setLimit
    ) {
      STABLE_ACTIONS.fetchMedia = state.fetchMedia;
      STABLE_ACTIONS.uploadMedia = state.uploadMedia;
      STABLE_ACTIONS.updateMedia = state.updateMedia;
      STABLE_ACTIONS.deleteMedia = state.deleteMedia;
      STABLE_ACTIONS.downloadMedia = state.downloadMedia;
      STABLE_ACTIONS.fetchStats = state.fetchStats;
      STABLE_ACTIONS.setSelectedMedia = state.setSelectedMedia;
      STABLE_ACTIONS.clearError = state.clearError;
      STABLE_ACTIONS.invalidateCache = state.invalidateCache;
      STABLE_ACTIONS.setSearch = state.setSearch;
      STABLE_ACTIONS.setFilters = state.setFilters;
      STABLE_ACTIONS.clearFilters = state.clearFilters;
      STABLE_ACTIONS.setPage = state.setPage;
      STABLE_ACTIONS.setLimit = state.setLimit;
    }
    return STABLE_ACTIONS;
  });
};

// Simple combined selectors without complex equality checks
export const useMediaWithPagination = () => {
  const media = useMediaStore((state) => state.media);
  const pagination = useMediaStore((state) => state.pagination);
  const loading = useMediaStore((state) => state.loading);
  
  // Return a stable object using useMemo pattern in the component
  return { media, pagination, loading };
};

export const useSearchState = () => {
  const searchValue = useMediaStore((state) => state.searchValue);
  const filters = useMediaStore((state) => state.filters);
  const setSearch = useMediaStore((state) => state.setSearch);
  const setFilters = useMediaStore((state) => state.setFilters);
  const clearFilters = useMediaStore((state) => state.clearFilters);
  
  return { searchValue, filters, setSearch, setFilters, clearFilters };
};