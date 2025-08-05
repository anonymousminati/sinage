/**
 * Socket.IO Real-time Communication Service
 * 
 * This service manages all Socket.IO client connections and real-time events for:
 * - Playlist collaborative editing and updates
 * - Media library real-time synchronization  
 * - Screen status monitoring and heartbeat
 * - User presence and activity tracking
 * - Connection management with automatic reconnection
 * 
 * Features:
 * - JWT-based authentication
 * - Room-based subscriptions for playlists and users
 * - Comprehensive error handling and reconnection logic
 * - Event buffering during disconnection
 * - Conflict resolution for concurrent edits
 * - Connection status tracking
 */

import { io, Socket } from 'socket.io-client';
import type { 
  Playlist, 
  PlaylistItem, 
  MediaItem, 
  ScreenAssignment 
} from '../types';

// ============================
// Event Types and Interfaces
// ============================

export interface PlaylistUpdateEvent {
  playlistId: string;
  playlist: Playlist;
  updatedBy: string;
  timestamp: string;
  changeType: 'metadata' | 'items' | 'assignment';
}

export interface PlaylistItemEvent {
  playlistId: string;
  item: PlaylistItem;
  position?: number;
  updatedBy: string;
  timestamp: string;
}

export interface PlaylistReorderEvent {
  playlistId: string;
  items: PlaylistItem[];
  updatedBy: string;
  timestamp: string;
}

export interface MediaEvent {
  mediaId: string;
  media?: MediaItem;
  updatedBy: string;
  timestamp: string;
  action: 'uploaded' | 'deleted' | 'updated';
}

export interface ScreenStatusEvent {
  screenId: string;
  status: 'online' | 'offline';
  timestamp: string;
  location?: string;
  resolution?: string;
  message?: string;
}

export interface UserPresenceEvent {
  userId: string;
  userEmail: string;
  action: 'joined' | 'left' | 'active';
  playlistId?: string;
  timestamp: string;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastConnected?: Date;
  error?: string;
}

// ============================
// Socket Event Handlers
// ============================

type EventHandler<T = any> = (data: T) => void;

interface SocketEventHandlers {
  // Playlist events
  'playlist:created': EventHandler<{ playlist: Playlist; createdBy: string; timestamp: string }>;
  'playlist:updated': EventHandler<PlaylistUpdateEvent>;
  'playlist:deleted': EventHandler<{ playlistId: string; deletedBy: string; timestamp: string }>;
  'playlist:duplicated': EventHandler<{ originalId: string; newPlaylist: Playlist; duplicatedBy: string; timestamp: string }>;
  
  // Playlist item events
  'playlist:item:added': EventHandler<PlaylistItemEvent>;
  'playlist:item:removed': EventHandler<{ playlistId: string; itemId: string; removedBy: string; timestamp: string }>;
  'playlist:item:updated': EventHandler<PlaylistItemEvent>;
  'playlist:item:reordered': EventHandler<PlaylistReorderEvent>;
  
  // Playlist assignment events
  'playlist:assigned': EventHandler<{ playlistId: string; screenIds: string[]; assignedBy: string; timestamp: string }>;
  'playlist:unassigned': EventHandler<{ playlistId: string; screenIds: string[]; unassignedBy: string; timestamp: string }>;
  
  // Screen events
  'screen:status:changed': EventHandler<ScreenStatusEvent>;
  'screen:playlist:changed': EventHandler<{ screenId: string; playlistId: string | null; changedBy: string; timestamp: string }>;
  'screen:heartbeat': EventHandler<{ screenId: string; timestamp: string }>;
  
  // Media events
  'media:uploaded': EventHandler<MediaEvent>;
  'media:deleted': EventHandler<MediaEvent>;
  'media:updated': EventHandler<MediaEvent>;
  
  // User presence events
  'user:presence': EventHandler<UserPresenceEvent>;
  'user:joined:playlist': EventHandler<UserPresenceEvent>;
  'user:left:playlist': EventHandler<UserPresenceEvent>;
  
  // System events
  'connection:status': EventHandler<{ status: string; message?: string }>;
  'error': EventHandler<{ message: string; code?: string; details?: any }>;
}

// ============================
// Socket Service Interface
// ============================

export interface ISocketService {
  // Connection management
  socket: Socket | null;
  connectionStatus: ConnectionStatus;
  
  // Core connection methods
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  
  // Event handling
  on<K extends keyof SocketEventHandlers>(event: K, callback: SocketEventHandlers[K]): void;
  off<K extends keyof SocketEventHandlers>(event: K, callback?: SocketEventHandlers[K]): void;
  emit(event: string, data: any): void;
  
  // Room management
  joinPlaylistRoom(playlistId: string): void;
  leavePlaylistRoom(playlistId: string): void;
  joinUserRoom(userId: string): void;
  leaveUserRoom(userId: string): void;
  
  // Playlist-specific events
  emitPlaylistUpdate(playlistId: string, data: Partial<Playlist>): void;
  emitPlaylistItemAdded(playlistId: string, item: PlaylistItem, position?: number): void;
  emitPlaylistItemRemoved(playlistId: string, itemId: string): void;
  emitPlaylistItemReordered(playlistId: string, items: PlaylistItem[]): void;
  emitPlaylistAssignment(playlistId: string, screenIds: string[]): void;
  emitPlaylistUnassignment(playlistId: string, screenIds: string[]): void;
  
  // Media events
  emitMediaUploaded(media: MediaItem): void;
  emitMediaDeleted(mediaId: string): void;
  emitMediaUpdated(mediaId: string, data: Partial<MediaItem>): void;
  
  // User presence
  emitUserJoinedPlaylist(playlistId: string): void;
  emitUserLeftPlaylist(playlistId: string): void;
  
  // Utilities
  isConnected(): boolean;
  getConnectionStatus(): ConnectionStatus;
  bufferEvent(event: string, data: any): void;
  flushBufferedEvents(): void;
}

// ============================
// Socket Service Implementation
// ============================

class SocketServiceImpl implements ISocketService {
  socket: Socket | null = null;
  connectionStatus: ConnectionStatus = {
    connected: false,
    connecting: false,
    reconnecting: false,
    reconnectAttempts: 0,
  };

  private eventBuffer: Array<{ event: string; data: any }> = [];
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private statusUpdateCallbacks: Array<(status: ConnectionStatus) => void> = [];

  // ============================
  // Connection Management
  // ============================

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('No authentication token found. Skipping socket connection.');
      this.updateConnectionStatus({ 
        connected: false, 
        connecting: false, 
        error: 'No authentication token available' 
      });
      return;
    }

    this.updateConnectionStatus({ connecting: true, error: undefined });

    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      this.socket = io(baseURL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 20000,
      });

      this.setupEventHandlers();
      
      // Wait for connection
      await this.waitForConnection();
      
    } catch (error) {
      this.updateConnectionStatus({ 
        connecting: false, 
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed' 
      });
      throw error;
    }
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateConnectionStatus({
      connected: false,
      connecting: false,
      reconnecting: false,
      reconnectAttempts: 0,
    });
  }

  async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 20000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      
      this.updateConnectionStatus({
        connected: true,
        connecting: false,
        reconnecting: false,
        reconnectAttempts: 0,
        lastConnected: new Date(),
        error: undefined,
      });

      // Flush any buffered events
      this.flushBufferedEvents();
      
      // Start heartbeat
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        reconnecting: reason === 'io server disconnect' ? false : true,
      });

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      
      this.connectionStatus.reconnectAttempts++;
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        reconnecting: this.connectionStatus.reconnectAttempts < this.maxReconnectAttempts,
        error: error.message,
      });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      
      this.updateConnectionStatus({
        connected: true,
        connecting: false,
        reconnecting: false,
        reconnectAttempts: 0,
        lastConnected: new Date(),
        error: undefined,
      });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      
      this.updateConnectionStatus({
        reconnecting: this.connectionStatus.reconnectAttempts < this.maxReconnectAttempts,
        error: error.message,
      });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after maximum attempts');
      
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        reconnecting: false,
        error: 'Reconnection failed after maximum attempts',
      });
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', { timestamp: new Date().toISOString() });
      }
    }, 30000); // Every 30 seconds
  }

  private updateConnectionStatus(update: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...update };
    
    // Notify all status update callbacks
    this.statusUpdateCallbacks.forEach(callback => {
      try {
        callback(this.connectionStatus);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  // ============================
  // Event Handling
  // ============================

  on<K extends keyof SocketEventHandlers>(event: K, callback: SocketEventHandlers[K]): void {
    if (this.socket) {
      this.socket.on(event as string, callback);
    }
  }

  off<K extends keyof SocketEventHandlers>(event: K, callback?: SocketEventHandlers[K]): void {
    if (this.socket) {
      this.socket.off(event as string, callback);
    }
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Buffer event if not connected
      this.bufferEvent(event, data);
    }
  }

  // ============================
  // Room Management
  // ============================

  joinPlaylistRoom(playlistId: string): void {
    this.emit('join:playlist', { playlistId });
    console.log('Joined playlist room:', playlistId);
  }

  leavePlaylistRoom(playlistId: string): void {
    this.emit('leave:playlist', { playlistId });
    console.log('Left playlist room:', playlistId);
  }

  joinUserRoom(userId: string): void {
    this.emit('join:user', { userId });
    console.log('Joined user room:', userId);
  }

  leaveUserRoom(userId: string): void {
    this.emit('leave:user', { userId });
    console.log('Left user room:', userId);
  }

  // ============================
  // Playlist Events
  // ============================

  emitPlaylistUpdate(playlistId: string, data: Partial<Playlist>): void {
    this.emit('playlist:update', {
      playlistId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  emitPlaylistItemAdded(playlistId: string, item: PlaylistItem, position?: number): void {
    this.emit('playlist:item:add', {
      playlistId,
      item,
      position,
      timestamp: new Date().toISOString(),
    });
  }

  emitPlaylistItemRemoved(playlistId: string, itemId: string): void {
    this.emit('playlist:item:remove', {
      playlistId,
      itemId,
      timestamp: new Date().toISOString(),
    });
  }

  emitPlaylistItemReordered(playlistId: string, items: PlaylistItem[]): void {
    this.emit('playlist:item:reorder', {
      playlistId,
      items,
      timestamp: new Date().toISOString(),
    });
  }

  emitPlaylistAssignment(playlistId: string, screenIds: string[]): void {
    this.emit('playlist:assign', {
      playlistId,
      screenIds,
      timestamp: new Date().toISOString(),
    });
  }

  emitPlaylistUnassignment(playlistId: string, screenIds: string[]): void {
    this.emit('playlist:unassign', {
      playlistId,
      screenIds,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================
  // Media Events
  // ============================

  emitMediaUploaded(media: MediaItem): void {
    this.emit('media:upload', {
      media,
      timestamp: new Date().toISOString(),
    });
  }

  emitMediaDeleted(mediaId: string): void {
    this.emit('media:delete', {
      mediaId,
      timestamp: new Date().toISOString(),
    });
  }

  emitMediaUpdated(mediaId: string, data: Partial<MediaItem>): void {
    this.emit('media:update', {
      mediaId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================
  // User Presence
  // ============================

  emitUserJoinedPlaylist(playlistId: string): void {
    this.emit('user:join:playlist', {
      playlistId,
      timestamp: new Date().toISOString(),
    });
  }

  emitUserLeftPlaylist(playlistId: string): void {
    this.emit('user:leave:playlist', {
      playlistId,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================
  // Utilities
  // ============================

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  bufferEvent(event: string, data: any): void {
    this.eventBuffer.push({ event, data });
    
    // Limit buffer size to prevent memory issues
    if (this.eventBuffer.length > 100) {
      this.eventBuffer.shift();
    }
  }

  flushBufferedEvents(): void {
    if (!this.socket?.connected || this.eventBuffer.length === 0) {
      return;
    }

    console.log('Flushing', this.eventBuffer.length, 'buffered events');
    
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    
    events.forEach(({ event, data }) => {
      this.socket?.emit(event, data);
    });
  }

  // ============================
  // Connection Status Subscription
  // ============================

  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusUpdateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusUpdateCallbacks.splice(index, 1);
      }
    };
  }
}

// ============================
// Singleton Instance
// ============================

export const socketService = new SocketServiceImpl();

// ============================
// React Hook for Socket Status
// ============================

export { socketService as default };