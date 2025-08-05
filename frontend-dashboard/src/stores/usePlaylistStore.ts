/**
 * Comprehensive Playlist Management Store
 * 
 * This Zustand store manages all playlist-related state and operations including:
 * - Playlist CRUD operations with optimistic updates
 * - Playlist item management and reordering
 * - Drag-and-drop state management for playlist creation
 * - Screen assignment functionality
 * - Real-time updates and error handling
 * - Integration with media store for shared data
 * - Comprehensive filtering and pagination
 * 
 * Features:
 * - Optimistic UI updates for better user experience
 * - Proper error handling and rollback mechanisms
 * - Efficient re-render prevention with stable selectors
 * - Cache management for performance optimization
 * - Drag-and-drop state management for playlist editor
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  getPlaylists,
  getPlaylist,
  createPlaylist as createPlaylistAPI,
  updatePlaylist as updatePlaylistAPI,
  deletePlaylist as deletePlaylistAPI,
  duplicatePlaylist as duplicatePlaylistAPI,
  addMediaToPlaylist as addMediaToPlaylistAPI,
  removeMediaFromPlaylist as removeMediaFromPlaylistAPI,
  reorderPlaylistItems as reorderPlaylistItemsAPI,
  updatePlaylistItem as updatePlaylistItemAPI,
  assignPlaylistToScreens as assignPlaylistToScreensAPI,
  unassignPlaylistFromScreens as unassignPlaylistFromScreensAPI,
  getPlaylistAssignments as getPlaylistAssignmentsAPI,
  bulkPlaylistOperation as bulkPlaylistOperationAPI,
  getPlaylistStats,
  getPlaylistAnalytics as getPlaylistAnalyticsAPI,
  isPlaylistApiError,
  getPlaylistErrorMessage,
  calculatePlaylistDuration,
} from '../services/playlistAPI';

import { socketService } from '../services/socketService';
import type { 
  PlaylistUpdateEvent, 
  PlaylistItemEvent, 
  PlaylistReorderEvent 
} from '../services/socketService';

import type {
  Playlist,
  PlaylistItem,
  ScreenAssignment,
  CreatePlaylistData,
  UpdatePlaylistData,
  GetPlaylistParams,
  PlaylistFilters,
  PlaylistPagination,
  DragState,
  BulkPlaylistOperation,
  MediaItem,
} from '../types';

// ============================
// Store State Interfaces
// ============================

interface PlaylistStoreState {
  // Core data
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  playlistItems: Record<string, PlaylistItem[]>; // Keyed by playlist ID
  screenAssignments: Record<string, ScreenAssignment[]>; // Keyed by playlist ID
  
  // UI state
  loading: boolean;
  error: string | null;
  operationLoading: Record<string, boolean>; // Track specific operations
  
  // Filters and pagination
  filters: PlaylistFilters;
  pagination: PlaylistPagination;
  searchValue: string;
  searchDebounceTimer: NodeJS.Timeout | null;
  
  // Drag and drop state
  dragState: DragState;
  
  // Selection and bulk operations
  selectedPlaylists: Set<string>;
  bulkOperationProgress: {
    inProgress: boolean;
    operation?: string;
    completed: number;
    total: number;
    errors: Array<{ id: string; error: string }>;
  };
  
  // Cache management
  lastFetch: number;
  cacheTimeout: number;
  playlistCache: Record<string, { data: Playlist; timestamp: number }>;
  
  // Statistics
  statistics: {
    totalPlaylists: number;
    activePlaylists: number;
    totalItems: number;
    averageDuration: number;
  };
  
  // Real-time collaboration
  activeUsers: Record<string, Array<{ userId: string; userEmail: string; joinedAt: string }>>;
  realtimeUpdatesPaused: boolean;
  conflictResolution: {
    hasConflict: boolean;
    conflictingUserId?: string;
    conflictingUserEmail?: string;
    localVersion?: any;
    remoteVersion?: any;
    conflictType?: 'metadata' | 'items' | 'assignment';
  };
  
  // Socket connection management
  socketInitialized: boolean;
}

interface PlaylistStore extends PlaylistStoreState {
  // ============================
  // Playlist CRUD Actions
  // ============================
  fetchPlaylists: (params?: GetPlaylistParams) => Promise<void>;
  fetchPlaylist: (id: string, includeItems?: boolean) => Promise<void>;
  createPlaylist: (data: CreatePlaylistData) => Promise<Playlist | null>;
  updatePlaylist: (id: string, data: UpdatePlaylistData) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  duplicatePlaylist: (id: string, name?: string) => Promise<Playlist | null>;
  
  // ============================
  // Playlist Item Management
  // ============================
  addMediaToPlaylist: (playlistId: string, mediaId: string, position?: number) => Promise<void>;
  removeFromPlaylist: (playlistId: string, itemId: string) => Promise<void>;
  reorderPlaylistItems: (playlistId: string, items: PlaylistItem[]) => Promise<void>;
  updatePlaylistItemSettings: (playlistId: string, itemId: string, data: Partial<PlaylistItem>) => Promise<void>;
  
  // ============================
  // Screen Assignment
  // ============================
  assignToScreens: (playlistId: string, screenIds: string[]) => Promise<void>;
  unassignFromScreens: (playlistId: string, screenIds?: string[]) => Promise<void>;
  fetchScreenAssignments: (playlistId: string) => Promise<void>;
  
  // ============================
  // Bulk Operations
  // ============================
  bulkOperation: (operation: BulkPlaylistOperation) => Promise<void>;
  selectPlaylist: (id: string, selected: boolean) => void;
  selectAllPlaylists: (selected: boolean) => void;
  clearSelection: () => void;
  
  // ============================
  // UI State Management
  // ============================
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  setFilters: (filters: Partial<PlaylistFilters>) => void;
  setSortOrder: (sortBy: PlaylistFilters['sortBy'], sortOrder?: PlaylistFilters['sortOrder']) => void;
  clearFilters: () => void;
  setSearch: (search: string) => void;
  
  // ============================
  // Drag and Drop Management
  // ============================
  setDragState: (state: Partial<DragState>) => void;
  clearDragState: () => void;
  handleDragStart: (itemId: string, itemType: 'media' | 'playlist-item') => void;
  handleDragEnd: () => void;
  handleDrop: (targetId: string, sourceId: string, sourceType: 'media' | 'playlist-item') => Promise<void>;
  
  // ============================
  // Pagination
  // ============================
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setLimit: (limit: number) => void;
  
  // ============================
  // Utility Actions
  // ============================
  clearError: () => void;
  invalidateCache: () => void;
  fetchStats: () => Promise<void>;
  calculateTotalDuration: (playlistId: string) => number;
  refreshPlaylist: (id: string) => Promise<void>;
  
  // ============================
  // Real-time Socket Integration
  // ============================
  initializeSocket: () => Promise<void>;
  subscribeToPlaylistEvents: (playlistId: string) => void;
  unsubscribeFromPlaylistEvents: (playlistId: string) => void;
  pauseRealtimeUpdates: (paused: boolean) => void;
  handleConflictResolution: (resolution: 'accept_local' | 'accept_remote' | 'merge') => void;
  clearConflict: () => void;
  
  // Real-time event handlers (internal)
  handlePlaylistUpdated: (event: PlaylistUpdateEvent) => void;
  handlePlaylistItemAdded: (event: PlaylistItemEvent) => void;
  handlePlaylistItemRemoved: (event: { playlistId: string; itemId: string; removedBy: string; timestamp: string }) => void;
  handlePlaylistItemReordered: (event: PlaylistReorderEvent) => void;
  handlePlaylistAssigned: (event: { playlistId: string; screenIds: string[]; assignedBy: string; timestamp: string }) => void;
  handlePlaylistUnassigned: (event: { playlistId: string; screenIds: string[]; unassignedBy: string; timestamp: string }) => void;
  handleUserJoinedPlaylist: (event: { userId: string; userEmail: string; playlistId: string; timestamp: string }) => void;
  handleUserLeftPlaylist: (event: { userId: string; userEmail: string; playlistId: string; timestamp: string }) => void;
}

// ============================
// Default Values
// ============================

const defaultFilters: PlaylistFilters = {
  search: '',
  sortBy: 'modified',
  sortOrder: 'desc',
};

const defaultPagination: PlaylistPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasMore: false,
  hasNext: false,
  hasPrev: false,
};

const defaultDragState: DragState = {
  isDragging: false,
};

const defaultStatistics = {
  totalPlaylists: 0,
  activePlaylists: 0,
  totalItems: 0,
  averageDuration: 0,
};

const defaultBulkOperationProgress = {
  inProgress: false,
  completed: 0,
  total: 0,
  errors: [],
};

const defaultConflictResolution = {
  hasConflict: false,
};

// Configuration
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PLAYLIST_CACHE_TIMEOUT = 2 * 60 * 1000; // 2 minutes for individual playlists

// ============================
// Store Implementation
// ============================

export const usePlaylistStore = create<PlaylistStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      playlists: [],
      currentPlaylist: null,
      playlistItems: {},
      screenAssignments: {},
      loading: false,
      error: null,
      operationLoading: {},
      filters: defaultFilters,
      pagination: defaultPagination,
      searchValue: '',
      searchDebounceTimer: null,
      dragState: defaultDragState,
      selectedPlaylists: new Set(),
      bulkOperationProgress: defaultBulkOperationProgress,
      lastFetch: 0,
      cacheTimeout: CACHE_TIMEOUT,
      playlistCache: {},
      statistics: defaultStatistics,
      activeUsers: {},
      realtimeUpdatesPaused: false,
      conflictResolution: defaultConflictResolution,
      socketInitialized: false,

      // ============================
      // Playlist CRUD Actions
      // ============================

      fetchPlaylists: async (params = {}) => {
        const state = get();
        
        // Check cache validity
        if (state.lastFetch && Date.now() - state.lastFetch < state.cacheTimeout && Object.keys(params).length === 0) {
          return;
        }

        set({ loading: true, error: null });

        try {
          const mergedParams: GetPlaylistParams = {
            ...state.filters,
            page: state.pagination.page,
            limit: state.pagination.limit,
            includeItems: true,
            ...params,
          };

          const response = await getPlaylists(mergedParams);

          set({
            playlists: response.data.playlists,
            pagination: response.data.pagination,
            filters: response.data.filters,
            loading: false,
            lastFetch: Date.now(),
          });
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to fetch playlists';
            
          set({
            loading: false,
            error: errorMessage,
          });
          
          console.error('Failed to fetch playlists:', error);
        }
      },

      fetchPlaylist: async (id, includeItems = true) => {
        const state = get();
        
        // Check individual playlist cache
        const cached = state.playlistCache[id];
        if (cached && Date.now() - cached.timestamp < PLAYLIST_CACHE_TIMEOUT) {
          set({ currentPlaylist: cached.data });
          return;
        }

        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`fetch_${id}`]: true }
        }));

        try {
          const playlist = await getPlaylist(id, includeItems);
          
          set((state) => ({
            currentPlaylist: playlist,
            playlistCache: {
              ...state.playlistCache,
              [id]: { data: playlist, timestamp: Date.now() }
            },
            operationLoading: { ...state.operationLoading, [`fetch_${id}`]: false }
          }));
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to fetch playlist';
            
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`fetch_${id}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to fetch playlist:', error);
        }
      },

      createPlaylist: async (data) => {
        set({ loading: true, error: null });

        try {
          const newPlaylist = await createPlaylistAPI(data);

          // Add to playlists list optimistically
          set((state) => ({
            playlists: [newPlaylist, ...state.playlists],
            currentPlaylist: newPlaylist,
            statistics: {
              ...state.statistics,
              totalPlaylists: state.statistics.totalPlaylists + 1,
              activePlaylists: newPlaylist.isActive 
                ? state.statistics.activePlaylists + 1 
                : state.statistics.activePlaylists,
            },
            loading: false,
          }));

          return newPlaylist;
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to create playlist';
            
          set({
            loading: false,
            error: errorMessage,
          });
          
          console.error('Failed to create playlist:', error);
          return null;
        }
      },

      updatePlaylist: async (id, data) => {
        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`update_${id}`]: true }
        }));

        try {
          const updatedPlaylist = await updatePlaylistAPI(id, data);

          // Update playlist optimistically
          set((state) => ({
            playlists: state.playlists.map((playlist) =>
              playlist.id === id ? { ...playlist, ...updatedPlaylist } : playlist
            ),
            currentPlaylist: state.currentPlaylist?.id === id 
              ? { ...state.currentPlaylist, ...updatedPlaylist }
              : state.currentPlaylist,
            playlistCache: {
              ...state.playlistCache,
              [id]: { data: updatedPlaylist, timestamp: Date.now() }
            },
            operationLoading: { ...state.operationLoading, [`update_${id}`]: false }
          }));

          // Emit socket event
          if (socketService.isConnected()) {
            socketService.emitPlaylistUpdate(id, updatedPlaylist);
          }
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to update playlist';
            
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`update_${id}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to update playlist:', error);
        }
      },

      deletePlaylist: async (id) => {
        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`delete_${id}`]: true }
        }));

        // Store the playlist for potential rollback
        const state = get();
        const playlistToDelete = state.playlists.find(p => p.id === id);
        
        if (!playlistToDelete) {
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`delete_${id}`]: false },
            error: 'Playlist not found'
          }));
          return;
        }

        try {
          // Optimistic delete
          set((state) => ({
            playlists: state.playlists.filter((playlist) => playlist.id !== id),
            currentPlaylist: state.currentPlaylist?.id === id ? null : state.currentPlaylist,
            selectedPlaylists: new Set([...state.selectedPlaylists].filter(pid => pid !== id)),
            statistics: {
              ...state.statistics,
              totalPlaylists: state.statistics.totalPlaylists - 1,
              activePlaylists: playlistToDelete.isActive 
                ? state.statistics.activePlaylists - 1 
                : state.statistics.activePlaylists,
            },
          }));

          await deletePlaylistAPI(id);
          
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`delete_${id}`]: false }
          }));
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to delete playlist';
            
          // Rollback on error
          set((state) => ({
            playlists: [...state.playlists, playlistToDelete],
            statistics: {
              ...state.statistics,
              totalPlaylists: state.statistics.totalPlaylists + 1,
              activePlaylists: playlistToDelete.isActive 
                ? state.statistics.activePlaylists + 1 
                : state.statistics.activePlaylists,
            },
            operationLoading: { ...state.operationLoading, [`delete_${id}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to delete playlist:', error);
        }
      },

      duplicatePlaylist: async (id, name) => {
        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`duplicate_${id}`]: true }
        }));

        try {
          const duplicatedPlaylist = await duplicatePlaylistAPI(id, name);

          // Add duplicated playlist to list
          set((state) => ({
            playlists: [duplicatedPlaylist, ...state.playlists],
            statistics: {
              ...state.statistics,
              totalPlaylists: state.statistics.totalPlaylists + 1,
              activePlaylists: duplicatedPlaylist.isActive 
                ? state.statistics.activePlaylists + 1 
                : state.statistics.activePlaylists,
            },
            operationLoading: { ...state.operationLoading, [`duplicate_${id}`]: false }
          }));

          return duplicatedPlaylist;
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to duplicate playlist';
            
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`duplicate_${id}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to duplicate playlist:', error);
          return null;
        }
      },

      // ============================
      // Playlist Item Management
      // ============================

      addMediaToPlaylist: async (playlistId, mediaId, position) => {
        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`add_${playlistId}_${mediaId}`]: true }
        }));

        try {
          const playlistItem = await addMediaToPlaylistAPI(playlistId, mediaId, position);

          // Update playlist items optimistically
          set((state) => {
            const currentItems = state.playlistItems[playlistId] || [];
            const updatedItems = position !== undefined 
              ? [
                  ...currentItems.slice(0, position),
                  playlistItem,
                  ...currentItems.slice(position)
                ]
              : [...currentItems, playlistItem];

            return {
              playlistItems: {
                ...state.playlistItems,
                [playlistId]: updatedItems
              },
              operationLoading: { ...state.operationLoading, [`add_${playlistId}_${mediaId}`]: false }
            };
          });

          // Update current playlist if it's the active one
          const state = get();
          if (state.currentPlaylist?.id === playlistId) {
            get().refreshPlaylist(playlistId);
          }

          // Emit socket event
          if (socketService.isConnected()) {
            socketService.emitPlaylistItemAdded(playlistId, playlistItem, position);
          }
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to add media to playlist';
            
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`add_${playlistId}_${mediaId}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to add media to playlist:', error);
        }
      },

      removeFromPlaylist: async (playlistId, itemId) => {
        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`remove_${playlistId}_${itemId}`]: true }
        }));

        // Store the item for potential rollback
        const state = get();
        const currentItems = state.playlistItems[playlistId] || [];
        const itemToRemove = currentItems.find(item => item.id === itemId);
        
        if (!itemToRemove) {
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`remove_${playlistId}_${itemId}`]: false },
            error: 'Playlist item not found'
          }));
          return;
        }

        try {
          // Optimistic removal
          set((state) => ({
            playlistItems: {
              ...state.playlistItems,
              [playlistId]: currentItems.filter(item => item.id !== itemId)
            }
          }));

          await removeMediaFromPlaylistAPI(playlistId, itemId);
          
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`remove_${playlistId}_${itemId}`]: false }
          }));

          // Update current playlist if it's the active one
          if (state.currentPlaylist?.id === playlistId) {
            get().refreshPlaylist(playlistId);
          }

          // Emit socket event
          if (socketService.isConnected()) {
            socketService.emitPlaylistItemRemoved(playlistId, itemId);
          }
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to remove item from playlist';
            
          // Rollback on error
          set((state) => ({
            playlistItems: {
              ...state.playlistItems,
              [playlistId]: currentItems
            },
            operationLoading: { ...state.operationLoading, [`remove_${playlistId}_${itemId}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to remove from playlist:', error);
        }
      },

      reorderPlaylistItems: async (playlistId, items) => {
        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`reorder_${playlistId}`]: true }
        }));

        // Store original order for rollback
        const state = get();
        const originalItems = state.playlistItems[playlistId] || [];

        try {
          // Optimistic reorder
          set((state) => ({
            playlistItems: {
              ...state.playlistItems,
              [playlistId]: items
            }
          }));

          const updatedPlaylist = await reorderPlaylistItemsAPI(playlistId, items);

          set((state) => ({
            currentPlaylist: state.currentPlaylist?.id === playlistId 
              ? updatedPlaylist 
              : state.currentPlaylist,
            operationLoading: { ...state.operationLoading, [`reorder_${playlistId}`]: false }
          }));

          // Emit socket event
          if (socketService.isConnected()) {
            socketService.emitPlaylistItemReordered(playlistId, items);
          }
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to reorder playlist items';
            
          // Rollback on error
          set((state) => ({
            playlistItems: {
              ...state.playlistItems,
              [playlistId]: originalItems
            },
            operationLoading: { ...state.operationLoading, [`reorder_${playlistId}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to reorder playlist items:', error);
        }
      },

      updatePlaylistItemSettings: async (playlistId, itemId, data) => {
        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`update_item_${itemId}`]: true }
        }));

        try {
          const updatedItem = await updatePlaylistItemAPI(playlistId, itemId, data);

          // Update playlist item optimistically
          set((state) => {
            const currentItems = state.playlistItems[playlistId] || [];
            const updatedItems = currentItems.map(item =>
              item.id === itemId ? { ...item, ...updatedItem } : item
            );

            return {
              playlistItems: {
                ...state.playlistItems,
                [playlistId]: updatedItems
              },
              operationLoading: { ...state.operationLoading, [`update_item_${itemId}`]: false }
            };
          });
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to update playlist item';
            
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`update_item_${itemId}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to update playlist item:', error);
        }
      },

      // ============================
      // Screen Assignment
      // ============================

      assignToScreens: async (playlistId, screenIds) => {
        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`assign_${playlistId}`]: true }
        }));

        try {
          await assignPlaylistToScreensAPI(playlistId, screenIds);

          // Update playlist assignment optimistically
          set((state) => ({
            playlists: state.playlists.map(playlist =>
              playlist.id === playlistId
                ? { ...playlist, assignedScreens: [...new Set([...playlist.assignedScreens, ...screenIds])] }
                : playlist
            ),
            operationLoading: { ...state.operationLoading, [`assign_${playlistId}`]: false }
          }));

          // Refresh assignments
          get().fetchScreenAssignments(playlistId);

          // Emit socket event
          if (socketService.isConnected()) {
            socketService.emitPlaylistAssignment(playlistId, screenIds);
          }
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to assign playlist to screens';
            
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`assign_${playlistId}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to assign playlist to screens:', error);
        }
      },

      unassignFromScreens: async (playlistId, screenIds) => {
        set((state) => ({ 
          operationLoading: { ...state.operationLoading, [`unassign_${playlistId}`]: true }
        }));

        try {
          await unassignPlaylistFromScreensAPI(playlistId, screenIds);

          // Update playlist assignment optimistically
          set((state) => ({
            playlists: state.playlists.map(playlist =>
              playlist.id === playlistId
                ? { 
                    ...playlist, 
                    assignedScreens: screenIds 
                      ? playlist.assignedScreens.filter(id => !screenIds.includes(id))
                      : []
                  }
                : playlist
            ),
            operationLoading: { ...state.operationLoading, [`unassign_${playlistId}`]: false }
          }));

          // Refresh assignments
          get().fetchScreenAssignments(playlistId);

          // Emit socket event
          if (socketService.isConnected()) {
            socketService.emitPlaylistUnassignment(playlistId, screenIds || []);
          }
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Failed to unassign playlist from screens';
            
          set((state) => ({
            operationLoading: { ...state.operationLoading, [`unassign_${playlistId}`]: false },
            error: errorMessage,
          }));
          
          console.error('Failed to unassign playlist from screens:', error);
        }
      },

      fetchScreenAssignments: async (playlistId) => {
        try {
          const assignments = await getPlaylistAssignmentsAPI(playlistId);
          
          set((state) => ({
            screenAssignments: {
              ...state.screenAssignments,
              [playlistId]: assignments
            }
          }));
        } catch (error) {
          console.error('Failed to fetch screen assignments:', error);
        }
      },

      // ============================
      // Bulk Operations
      // ============================

      bulkOperation: async (operation) => {
        set({
          bulkOperationProgress: {
            inProgress: true,
            operation: operation.operation,
            completed: 0,
            total: operation.playlistIds.length,
            errors: [],
          }
        });

        try {
          const response = await bulkPlaylistOperationAPI(operation);

          // Update playlists based on operation results
          set((state) => {
            let updatedPlaylists = [...state.playlists];

            if (operation.operation === 'delete') {
              updatedPlaylists = updatedPlaylists.filter(p => 
                !response.data.successful.includes(p.id)
              );
            } else if (operation.operation === 'activate' || operation.operation === 'deactivate') {
              const isActive = operation.operation === 'activate';
              updatedPlaylists = updatedPlaylists.map(playlist =>
                response.data.successful.includes(playlist.id)
                  ? { ...playlist, isActive }
                  : playlist
              );
            }

            return {
              playlists: updatedPlaylists,
              selectedPlaylists: new Set(), // Clear selection after bulk operation
              bulkOperationProgress: {
                inProgress: false,
                completed: response.data.successful.length,
                total: operation.playlistIds.length,
                errors: response.data.failed,
              }
            };
          });

          // Clear progress after delay
          setTimeout(() => {
            set({ bulkOperationProgress: defaultBulkOperationProgress });
          }, 3000);
        } catch (error) {
          const errorMessage = isPlaylistApiError(error) 
            ? getPlaylistErrorMessage(error)
            : 'Bulk operation failed';
            
          set({
            bulkOperationProgress: {
              inProgress: false,
              completed: 0,
              total: operation.playlistIds.length,
              errors: [{ id: 'bulk', error: errorMessage }],
            },
            error: errorMessage,
          });
          
          console.error('Failed to perform bulk operation:', error);
        }
      },

      selectPlaylist: (id, selected) => {
        set((state) => {
          const newSelection = new Set(state.selectedPlaylists);
          if (selected) {
            newSelection.add(id);
          } else {
            newSelection.delete(id);
          }
          return { selectedPlaylists: newSelection };
        });
      },

      selectAllPlaylists: (selected) => {
        set((state) => ({
          selectedPlaylists: selected 
            ? new Set(state.playlists.map(p => p.id))
            : new Set()
        }));
      },

      clearSelection: () => {
        set({ selectedPlaylists: new Set() });
      },

      // ============================
      // UI State Management
      // ============================

      setCurrentPlaylist: (playlist) => {
        set({ currentPlaylist: playlist });
      },

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
        get().fetchPlaylists();
      },

      setSortOrder: (sortBy, sortOrder = 'desc') => {
        set((state) => ({
          filters: { ...state.filters, sortBy, sortOrder },
          pagination: { ...state.pagination, page: 1 },
          lastFetch: 0, // Invalidate cache to force fetch
        }));
        
        get().fetchPlaylists();
      },

      clearFilters: () => {
        set({
          filters: defaultFilters,
          pagination: { ...defaultPagination },
          searchValue: '',
          lastFetch: 0, // Invalidate cache to force fetch
        });
        
        get().fetchPlaylists();
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
          
          get().fetchPlaylists();
        }, 300);
        
        set({ searchDebounceTimer: timer });
      },

      // ============================
      // Drag and Drop Management
      // ============================

      setDragState: (newState) => {
        set((state) => ({
          dragState: { ...state.dragState, ...newState }
        }));
      },

      clearDragState: () => {
        set({ dragState: defaultDragState });
      },

      handleDragStart: (itemId, itemType) => {
        set({
          dragState: {
            isDragging: true,
            draggedItemId: itemId,
            draggedItemType: itemType,
          }
        });
      },

      handleDragEnd: () => {
        set({ dragState: defaultDragState });
      },

      handleDrop: async (targetId, sourceId, sourceType) => {
        const state = get();
        
        if (sourceType === 'media' && state.currentPlaylist) {
          // Adding media to playlist
          await get().addMediaToPlaylist(state.currentPlaylist.id, sourceId);
        } else if (sourceType === 'playlist-item' && state.currentPlaylist) {
          // Reordering playlist items - this would be handled by the reorderPlaylistItems action
          // The actual reordering logic would be implemented in the component level
        }
        
        get().clearDragState();
      },

      // ============================
      // Pagination
      // ============================

      setPage: (page) => {
        set((state) => ({
          pagination: { ...state.pagination, page },
        }));
        
        get().fetchPlaylists({ page });
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

      setLimit: (limit) => {
        set((state) => ({
          pagination: { ...state.pagination, limit, page: 1 }, // Reset to first page
        }));
        
        get().fetchPlaylists({ page: 1, limit });
      },

      // ============================
      // Utility Actions
      // ============================

      clearError: () => {
        set({ error: null });
      },

      invalidateCache: () => {
        set({ lastFetch: 0, playlistCache: {} });
      },

      fetchStats: async () => {
        try {
          const response = await getPlaylistStats();
          
          set({
            statistics: {
              totalPlaylists: response.data.totalPlaylists,
              activePlaylists: response.data.activePlaylists,
              totalItems: response.data.totalItems,
              averageDuration: response.data.averageDuration,
            }
          });
        } catch (error) {
          console.error('Failed to fetch playlist statistics:', error);
        }
      },

      calculateTotalDuration: (playlistId) => {
        const state = get();
        const items = state.playlistItems[playlistId] || [];
        return calculatePlaylistDuration(items);
      },

      refreshPlaylist: async (id) => {
        // Invalidate cache and fetch fresh data
        set((state) => {
          const { [id]: removed, ...restCache } = state.playlistCache;
          return { playlistCache: restCache };
        });
        
        await get().fetchPlaylist(id);
      },

      // ============================
      // Real-time Socket Integration
      // ============================

      initializeSocket: async () => {
        const state = get();
        if (state.socketInitialized) {
          return;
        }

        try {
          await socketService.connect();
          
          // Only set up event listeners if successfully connected
          if (socketService.isConnected()) {
            // Set up event listeners
            socketService.on('playlist:updated', get().handlePlaylistUpdated);
            socketService.on('playlist:item:added', get().handlePlaylistItemAdded);
            socketService.on('playlist:item:removed', get().handlePlaylistItemRemoved);
            socketService.on('playlist:item:reordered', get().handlePlaylistItemReordered);
            socketService.on('playlist:assigned', get().handlePlaylistAssigned);
            socketService.on('playlist:unassigned', get().handlePlaylistUnassigned);
            socketService.on('user:joined:playlist', get().handleUserJoinedPlaylist);
            socketService.on('user:left:playlist', get().handleUserLeftPlaylist);
            
            console.log('Socket initialized for playlist store');
          } else {
            console.log('Socket connection skipped - no authentication token');
          }
          
          set({ socketInitialized: true });
        } catch (error) {
          console.error('Failed to initialize socket:', error);
          // Don't set error state for missing authentication - that's expected when not logged in
          if (!error.message.includes('authentication') && !error.message.includes('token')) {
            set({ error: 'Failed to connect to real-time service' });
          }
          set({ socketInitialized: true }); // Still mark as initialized to prevent retries
        }
      },

      subscribeToPlaylistEvents: (playlistId) => {
        if (socketService.isConnected()) {
          socketService.joinPlaylistRoom(playlistId);
          socketService.emitUserJoinedPlaylist(playlistId);
        }
      },

      unsubscribeFromPlaylistEvents: (playlistId) => {
        if (socketService.isConnected()) {
          socketService.emitUserLeftPlaylist(playlistId);
          socketService.leavePlaylistRoom(playlistId);
        }
      },

      pauseRealtimeUpdates: (paused) => {
        set({ realtimeUpdatesPaused: paused });
      },

      handleConflictResolution: (resolution) => {
        const state = get();
        const { conflictResolution } = state;
        
        if (!conflictResolution.hasConflict) return;

        switch (resolution) {
          case 'accept_local':
            // Keep local changes, ignore remote
            set({ conflictResolution: defaultConflictResolution });
            break;
            
          case 'accept_remote':
            // Accept remote changes
            if (conflictResolution.remoteVersion) {
              // Apply remote changes based on conflict type
              if (conflictResolution.conflictType === 'metadata' && state.currentPlaylist) {
                set({
                  currentPlaylist: { ...state.currentPlaylist, ...conflictResolution.remoteVersion },
                  conflictResolution: defaultConflictResolution
                });
              }
            }
            break;
            
          case 'merge':
            // Implement merge logic - for now, accept remote with notification
            if (conflictResolution.remoteVersion && state.currentPlaylist) {
              set({
                currentPlaylist: { ...state.currentPlaylist, ...conflictResolution.remoteVersion },
                conflictResolution: defaultConflictResolution
              });
            }
            break;
        }
      },

      clearConflict: () => {
        set({ conflictResolution: defaultConflictResolution });
      },

      // ============================
      // Real-time Event Handlers
      // ============================

      handlePlaylistUpdated: (event) => {
        const state = get();
        
        if (state.realtimeUpdatesPaused) return;

        const { playlistId, playlist, updatedBy, changeType } = event;
        
        // Check if this is the currently active playlist and we have local changes
        if (state.currentPlaylist?.id === playlistId && state.operationLoading[`update_${playlistId}`]) {
          // Potential conflict - show conflict resolution UI
          set({
            conflictResolution: {
              hasConflict: true,
              conflictingUserId: updatedBy,
              conflictingUserEmail: event.updatedByEmail || 'Unknown User',
              localVersion: state.currentPlaylist,
              remoteVersion: playlist,
              conflictType: changeType as any
            }
          });
          return;
        }

        // Apply remote update
        set((state) => {
          const updatedPlaylists = state.playlists.map(p =>
            p.id === playlistId ? { ...p, ...playlist } : p
          );
          
          return {
            playlists: updatedPlaylists,
            currentPlaylist: state.currentPlaylist?.id === playlistId 
              ? { ...state.currentPlaylist, ...playlist }
              : state.currentPlaylist,
            playlistCache: {
              ...state.playlistCache,
              [playlistId]: { 
                data: { ...(state.playlistCache[playlistId]?.data || {}), ...playlist } as Playlist, 
                timestamp: Date.now() 
              }
            }
          };
        });

        console.log(`Playlist ${playlistId} updated by ${event.updatedByEmail || updatedBy}`);
      },

      handlePlaylistItemAdded: (event) => {
        const state = get();
        
        if (state.realtimeUpdatesPaused) return;

        const { playlistId, item, position } = event;
        
        // Update playlist items
        set((state) => {
          const currentItems = state.playlistItems[playlistId] || [];
          const updatedItems = position !== undefined 
            ? [
                ...currentItems.slice(0, position),
                item,
                ...currentItems.slice(position)
              ]
            : [...currentItems, item];

          return {
            playlistItems: {
              ...state.playlistItems,
              [playlistId]: updatedItems
            }
          };
        });

        // Update current playlist if it matches
        if (state.currentPlaylist?.id === playlistId) {
          get().refreshPlaylist(playlistId);
        }

        console.log(`Item added to playlist ${playlistId} by ${event.updatedByEmail || event.updatedBy}`);
      },

      handlePlaylistItemRemoved: (event) => {
        const state = get();
        
        if (state.realtimeUpdatesPaused) return;

        const { playlistId, itemId } = event;
        
        // Update playlist items
        set((state) => {
          const currentItems = state.playlistItems[playlistId] || [];
          const updatedItems = currentItems.filter(item => item.id !== itemId);

          return {
            playlistItems: {
              ...state.playlistItems,
              [playlistId]: updatedItems
            }
          };
        });

        console.log(`Item removed from playlist ${playlistId}`);
      },

      handlePlaylistItemReordered: (event) => {
        const state = get();
        
        if (state.realtimeUpdatesPaused) return;

        const { playlistId, items } = event;
        
        // Update playlist items order
        set((state) => ({
          playlistItems: {
            ...state.playlistItems,
            [playlistId]: items
          }
        }));

        console.log(`Playlist ${playlistId} items reordered by ${event.updatedByEmail || event.updatedBy}`);
      },

      handlePlaylistAssigned: (event) => {
        const state = get();
        
        if (state.realtimeUpdatesPaused) return;

        const { playlistId, screenIds } = event;
        
        // Update playlist assignments
        set((state) => ({
          playlists: state.playlists.map(playlist =>
            playlist.id === playlistId
              ? { ...playlist, assignedScreens: [...new Set([...playlist.assignedScreens, ...screenIds])] }
              : playlist
          )
        }));

        console.log(`Playlist ${playlistId} assigned to screens by ${event.assignedByEmail || event.assignedBy}`);
      },

      handlePlaylistUnassigned: (event) => {
        const state = get();
        
        if (state.realtimeUpdatesPaused) return;

        const { playlistId, screenIds } = event;
        
        // Update playlist assignments
        set((state) => ({
          playlists: state.playlists.map(playlist =>
            playlist.id === playlistId
              ? { 
                  ...playlist, 
                  assignedScreens: playlist.assignedScreens.filter(id => !screenIds.includes(id))
                }
              : playlist
          )
        }));

        console.log(`Playlist ${playlistId} unassigned from screens`);
      },

      handleUserJoinedPlaylist: (event) => {
        const { userId, userEmail, playlistId, timestamp } = event;
        
        set((state) => {
          const currentUsers = state.activeUsers[playlistId] || [];
          const userExists = currentUsers.some(user => user.userId === userId);
          
          if (userExists) return state;
          
          return {
            activeUsers: {
              ...state.activeUsers,
              [playlistId]: [...currentUsers, { userId, userEmail, joinedAt: timestamp }]
            }
          };
        });

        console.log(`User ${userEmail} joined playlist ${playlistId}`);
      },

      handleUserLeftPlaylist: (event) => {
        const { userId, playlistId } = event;
        
        set((state) => {
          const currentUsers = state.activeUsers[playlistId] || [];
          const updatedUsers = currentUsers.filter(user => user.userId !== userId);
          
          return {
            activeUsers: {
              ...state.activeUsers,
              [playlistId]: updatedUsers
            }
          };
        });

        console.log(`User left playlist ${playlistId}`);
      },
    })),
    {
      name: 'playlist-store',
      partialize: (state: PlaylistStore) => ({
        // Persist only essential data
        filters: state.filters,
        pagination: { ...state.pagination, page: 1 }, // Reset page on reload
      }),
    }
  )
);

// ============================
// Selectors for Optimized Re-renders
// ============================

export const usePlaylists = () => usePlaylistStore((state) => state.playlists);
export const useCurrentPlaylist = () => usePlaylistStore((state) => state.currentPlaylist);
export const usePlaylistLoading = () => usePlaylistStore((state) => state.loading);
export const usePlaylistError = () => usePlaylistStore((state) => state.error);
export const usePlaylistFilters = () => usePlaylistStore((state) => state.filters);
export const usePlaylistPagination = () => usePlaylistStore((state) => state.pagination);
export const usePlaylistDragState = () => usePlaylistStore((state) => state.dragState);
export const useSelectedPlaylists = () => usePlaylistStore((state) => state.selectedPlaylists);
export const useBulkOperationProgress = () => usePlaylistStore((state) => state.bulkOperationProgress);
export const usePlaylistStatistics = () => usePlaylistStore((state) => state.statistics);

// Individual action selectors
export const useFetchPlaylists = () => usePlaylistStore((state) => state.fetchPlaylists);
export const useCreatePlaylist = () => usePlaylistStore((state) => state.createPlaylist);
export const useUpdatePlaylist = () => usePlaylistStore((state) => state.updatePlaylist);
export const useDeletePlaylist = () => usePlaylistStore((state) => state.deletePlaylist);
export const useSetCurrentPlaylist = () => usePlaylistStore((state) => state.setCurrentPlaylist);
export const useClearPlaylistError = () => usePlaylistStore((state) => state.clearError);

// Playlist item actions
export const useAddMediaToPlaylist = () => usePlaylistStore((state) => state.addMediaToPlaylist);
export const useRemoveFromPlaylist = () => usePlaylistStore((state) => state.removeFromPlaylist);
export const useReorderPlaylistItems = () => usePlaylistStore((state) => state.reorderPlaylistItems);

// Drag and drop actions
export const usePlaylistDragActions = () => usePlaylistStore((state) => ({
  setDragState: state.setDragState,
  clearDragState: state.clearDragState,
  handleDragStart: state.handleDragStart,
  handleDragEnd: state.handleDragEnd,
  handleDrop: state.handleDrop,
}));

// Combined actions hook for convenience
const STABLE_PLAYLIST_ACTIONS = {} as any;

export const usePlaylistActions = () => {
  return usePlaylistStore((state) => {
    // Only update if any action function has actually changed
    if (
      STABLE_PLAYLIST_ACTIONS.fetchPlaylists !== state.fetchPlaylists ||
      STABLE_PLAYLIST_ACTIONS.createPlaylist !== state.createPlaylist ||
      STABLE_PLAYLIST_ACTIONS.updatePlaylist !== state.updatePlaylist ||
      STABLE_PLAYLIST_ACTIONS.deletePlaylist !== state.deletePlaylist ||
      STABLE_PLAYLIST_ACTIONS.setCurrentPlaylist !== state.setCurrentPlaylist ||
      STABLE_PLAYLIST_ACTIONS.setFilters !== state.setFilters ||
      STABLE_PLAYLIST_ACTIONS.setSearch !== state.setSearch ||
      STABLE_PLAYLIST_ACTIONS.clearFilters !== state.clearFilters
    ) {
      STABLE_PLAYLIST_ACTIONS.fetchPlaylists = state.fetchPlaylists;
      STABLE_PLAYLIST_ACTIONS.createPlaylist = state.createPlaylist;
      STABLE_PLAYLIST_ACTIONS.updatePlaylist = state.updatePlaylist;
      STABLE_PLAYLIST_ACTIONS.deletePlaylist = state.deletePlaylist;
      STABLE_PLAYLIST_ACTIONS.setCurrentPlaylist = state.setCurrentPlaylist;
      STABLE_PLAYLIST_ACTIONS.setFilters = state.setFilters;
      STABLE_PLAYLIST_ACTIONS.setSearch = state.setSearch;
      STABLE_PLAYLIST_ACTIONS.clearFilters = state.clearFilters;
    }
    return STABLE_PLAYLIST_ACTIONS;
  });
};

// Combined state selectors
export const usePlaylistsWithPagination = () => {
  const playlists = usePlaylistStore((state) => state.playlists);
  const pagination = usePlaylistStore((state) => state.pagination);
  const loading = usePlaylistStore((state) => state.loading);
  
  return { playlists, pagination, loading };
};

export const usePlaylistSearchState = () => {
  const searchValue = usePlaylistStore((state) => state.searchValue);
  const filters = usePlaylistStore((state) => state.filters);
  const setSearch = usePlaylistStore((state) => state.setSearch);
  const setFilters = usePlaylistStore((state) => state.setFilters);
  const clearFilters = usePlaylistStore((state) => state.clearFilters);
  
  return { searchValue, filters, setSearch, setFilters, clearFilters };
};