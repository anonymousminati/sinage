# Services Documentation

This directory contains all service modules for the Sinage frontend dashboard, including API clients, real-time communication, and authentication services.

## Service Overview

### 1. Real-time Communication (`socketService.ts`)
Socket.IO-based real-time communication service for collaborative editing and live updates.

### 2. Media API Service (`mediaAPI.ts`) 
Comprehensive media management service with upload progress tracking and metadata handling.

### 3. Playlist API Service (`playlistAPI.ts`)
Playlist CRUD operations with drag-and-drop support and screen assignment management.

### 4. Authentication Service (`auth.ts`)
JWT-based authentication with automatic token refresh and session management.

### 5. Base API Client (`api.ts`)
Core HTTP client with authentication, retry logic, and file upload capabilities.

---

# Real-time Communication Services

The real-time system enables collaborative editing of playlists, live media synchronization, and instant screen status updates across multiple users and devices.

## Architecture

### Socket Service (`socketService.ts`)
The core Socket.IO client service that manages:
- Connection lifecycle (connect, disconnect, reconnect)
- Authentication with JWT tokens
- Event handling and emission
- Room-based subscriptions
- Connection status monitoring
- Event buffering during disconnections

### Store Integration
Real-time events are integrated into Zustand stores:

#### Playlist Store (`usePlaylistStore.ts`)
- **Events Listened**: `playlist:updated`, `playlist:item:added`, `playlist:item:removed`, `playlist:item:reordered`, `playlist:assigned`, `playlist:unassigned`, `user:joined:playlist`, `user:left:playlist`
- **Events Emitted**: `playlist:update`, `playlist:item:add`, `playlist:item:remove`, `playlist:item:reorder`, `playlist:assign`, `playlist:unassign`
- **Features**: 
  - Real-time playlist synchronization
  - Conflict detection and resolution
  - User presence tracking
  - Optimistic updates with rollback

#### Media Store (`useMediaStore.ts`)
- **Events Listened**: `media:uploaded`, `media:deleted`, `media:updated`
- **Events Emitted**: `media:upload`, `media:delete`, `media:update`
- **Features**:
  - Live media library updates
  - Upload notifications
  - Automatic statistics updates

## Socket Events

### Connection Events
- `connect` - Client successfully connected
- `disconnect` - Client disconnected
- `reconnect` - Client reconnected after disconnection
- `connect_error` - Connection failed
- `reconnect_error` - Reconnection failed

### Room Management
- `join:playlist` - Join a playlist room for real-time updates
- `leave:playlist` - Leave a playlist room
- `join:user` - Join user-specific room
- `joined:playlist` - Confirmation of playlist room join

### Playlist Events
- `playlist:updated` - Playlist metadata changed
- `playlist:item:added` - Media item added to playlist
- `playlist:item:removed` - Media item removed from playlist
- `playlist:item:reordered` - Playlist items reordered
- `playlist:assigned` - Playlist assigned to screens
- `playlist:unassigned` - Playlist unassigned from screens

### Media Events
- `media:uploaded` - New media file uploaded
- `media:deleted` - Media file deleted
- `media:updated` - Media metadata updated

### User Presence Events
- `user:joined:playlist` - User joined playlist editing session
- `user:left:playlist` - User left playlist editing session

### Screen Events (for future display client)
- `screen:status:changed` - Screen online/offline status
- `screen:playlist:changed` - Screen's current playlist changed
- `screen:heartbeat` - Screen heartbeat signal

## Usage

### Initializing Socket Connection

```typescript
import { socketService } from '../services/socketService';

// In a store or component
const initializeSocket = async () => {
  try {
    await socketService.connect();
    console.log('Socket connected');
  } catch (error) {
    console.error('Socket connection failed:', error);
  }
};
```

### Subscribing to Events

```typescript
// Listen for playlist updates
socketService.on('playlist:updated', (data) => {
  console.log('Playlist updated:', data);
  // Update local state
});

// Join a playlist room
socketService.joinPlaylistRoom('playlist-123');

// Leave the room when done
socketService.leavePlaylistRoom('playlist-123');
```

### Emitting Events

```typescript
// Emit a playlist update
socketService.emitPlaylistUpdate('playlist-123', {
  name: 'Updated Playlist Name',
  description: 'New description'
});

// Emit item addition
socketService.emitPlaylistItemAdded('playlist-123', newItem, 0);
```

### Connection Status Monitoring

```typescript
import { useSocketStatus } from '../hooks/useSocketStatus';

const MyComponent = () => {
  const { isConnected, isConnecting, reconnectAttempts } = useSocketStatus();
  
  return (
    <div>
      Status: {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Offline'}
      {reconnectAttempts > 0 && <span>Reconnect attempts: {reconnectAttempts}</span>}
    </div>
  );
};
```

## Conflict Resolution

When multiple users edit the same playlist simultaneously, conflicts are detected and resolved:

1. **Detection**: When a user tries to save changes while another user has already modified the same playlist
2. **Notification**: User receives a toast notification about the conflict
3. **Resolution Dialog**: Modal appears with options:
   - Accept remote changes (recommended)
   - Keep local changes
   - Manual merge (future feature)

### Conflict Resolution Flow

```typescript
// In store
if (state.currentPlaylist?.id === playlistId && state.operationLoading[`update_${playlistId}`]) {
  // Conflict detected
  set({
    conflictResolution: {
      hasConflict: true,
      conflictingUserId: updatedBy,
      conflictingUserEmail: event.updatedByEmail,
      localVersion: state.currentPlaylist,
      remoteVersion: playlist,
      conflictType: 'metadata'
    }
  });
  return;
}
```

## Error Handling

### Connection Errors
- Automatic reconnection with exponential backoff
- Event buffering during disconnections
- Connection status indicators in UI
- Toast notifications for connection state changes

### Authentication Errors
- Automatic token refresh (if implemented)
- Logout and redirect to login on persistent auth failures
- Clear error messages for debugging

### Event Handling Errors
- Try-catch blocks around all event handlers
- Graceful degradation when real-time features fail
- Fallback to polling or manual refresh options

## Testing Real-time Features

### Manual Testing Checklist

1. **Connection Testing**
   - [ ] Open multiple browser tabs/windows
   - [ ] Verify connection status indicators
   - [ ] Test reconnection after network disruption

2. **Playlist Collaboration**
   - [ ] Create playlist in one tab, verify it appears in others
   - [ ] Add media items in one tab, verify real-time updates
   - [ ] Reorder items and check synchronization
   - [ ] Delete playlist and verify removal across clients

3. **Conflict Resolution**
   - [ ] Edit same playlist metadata simultaneously
   - [ ] Verify conflict dialog appears
   - [ ] Test all resolution options
   - [ ] Ensure data consistency after resolution

4. **Media Library Synchronization**
   - [ ] Upload media in one tab, verify it appears in others
   - [ ] Delete media and check real-time removal
   - [ ] Update media metadata and verify sync

5. **User Presence**
   - [ ] Open playlist editor in multiple tabs
   - [ ] Verify active user count updates
   - [ ] Check user join/leave notifications

6. **Screen Management** (when display client is available)
   - [ ] Screen status updates
   - [ ] Playlist assignment notifications
   - [ ] Heartbeat monitoring

### Automated Testing

```typescript
// Example test setup
describe('Socket Service', () => {
  it('should connect successfully with valid token', async () => {
    localStorage.setItem('token', 'valid-jwt-token');
    await socketService.connect();
    expect(socketService.isConnected()).toBe(true);
  });

  it('should handle playlist updates', (done) => {
    socketService.on('playlist:updated', (data) => {
      expect(data.playlistId).toBe('test-playlist');
      done();
    });
    
    // Simulate server event
    mockSocket.emit('playlist:updated', { playlistId: 'test-playlist' });
  });
});
```

## Performance Considerations

### Event Throttling
- Reorder events are debounced to prevent excessive network traffic
- Search events use debouncing (300ms delay)
- Connection status updates are throttled

### Memory Management
- Event listeners are properly cleaned up in useEffect cleanup
- Socket connections are closed on component unmount
- Event buffer has size limits to prevent memory leaks

### Network Optimization
- Events are batched where possible
- Only necessary data is sent in events
- Compression enabled for socket communication

## Security

### Authentication
- JWT tokens required for socket connection
- Tokens validated on server for each connection
- Automatic disconnection on token expiry

### Authorization
- Room-based access control
- User can only join rooms for playlists they own/have access to
- Administrative events require admin role

### Data Validation
- All incoming events validated on client and server
- Sanitization of user-generated content
- Rate limiting on server to prevent spam/abuse

## Monitoring and Debugging

### Client-side Logging
```typescript
// Enable debug mode
localStorage.setItem('socket.io.debug', '*');

// Monitor connection status
socketService.onConnectionStatusChange((status) => {
  console.log('Connection status:', status);
});
```

### Server-side Monitoring
- Connection counts and user sessions
- Event frequency and patterns
- Error rates and types
- Performance metrics

## Future Enhancements

### Planned Features
- [ ] Manual conflict merge resolution
- [ ] Real-time cursor positions for collaborative editing
- [ ] Voice/video chat integration
- [ ] Advanced presence indicators (typing, active areas)
- [ ] Offline support with sync on reconnection
- [ ] Push notifications for mobile devices

### Performance Improvements
- [ ] Event compression for large datasets
- [ ] Selective room subscriptions
- [ ] Connection pooling for high-traffic scenarios
- [ ] CDN integration for global socket distribution

## Troubleshooting

### Common Issues

1. **Connection Fails**
   - Check JWT token validity
   - Verify server is running and accessible
   - Check network connectivity
   - Ensure CORS settings allow connection

2. **Events Not Received**
   - Verify room subscription
   - Check event name spelling
   - Ensure proper authentication
   - Check server-side event emission

3. **Performance Issues**
   - Monitor event frequency
   - Check for memory leaks
   - Verify proper cleanup of listeners
   - Consider event throttling/debouncing

4. **Conflict Resolution Not Working**
   - Check conflict detection logic
   - Verify user permissions
   - Ensure proper state synchronization
   - Check server-side conflict handling

### Debug Commands

```javascript
// In browser console
window.socketService = socketService;

// Check connection status
socketService.getConnectionStatus();

// Manual event emission
socketService.emit('test-event', { data: 'test' });

// View active listeners
console.log(socketService.socket?.listeners());
```

---

# Media API Service Layer Documentation

This document provides comprehensive guidance on using the new Media API Service Layer for all media-related operations in the frontend dashboard.

## Overview

The Media API Service Layer provides a robust, type-safe interface for all media operations with the following key features:

- **Seamless Backend Integration**: Direct integration with the backend media API
- **Progress Tracking**: Real-time upload progress monitoring
- **Error Handling**: Comprehensive error handling with retry logic
- **Type Safety**: Full TypeScript support with proper interfaces
- **Optimistic Updates**: UI updates before server confirmation
- **Cache Management**: Intelligent caching with invalidation strategies

## Key Components

### 1. Media API Service (`mediaAPI.ts`)

The core service providing all media operations:

```typescript
import { mediaAPI } from '../services/mediaAPI';

// Get media with filtering and pagination
const response = await mediaAPI.getMedia({
  type: 'image',
  search: 'advertisement',
  page: 1,
  limit: 20
});

// Upload media with progress tracking
const mediaItem = await mediaAPI.uploadMedia(
  file,
  { tags: 'advertisement', description: 'Summer campaign' },
  (progress) => {
    console.log(`Upload progress: ${progress.progress}%`);
  }
);

// Update media metadata
await mediaAPI.updateMedia(mediaId, {
  description: 'Updated description',
  tags: 'new,tags'
});

// Delete media
await mediaAPI.deleteMedia(mediaId);

// Get secure download URL
const downloadUrl = await mediaAPI.getDownloadUrl(mediaId);

// Get media statistics
const stats = await mediaAPI.getMediaStats();
```

### 2. Enhanced API Client (`api.ts`)

Provides authentication, retry logic, and file upload support:

```typescript
import { api } from '../services/api';

// Standard API calls with automatic authentication
const data = await api.get('/endpoint');
await api.post('/endpoint', { data });
await api.put('/endpoint', { data });
await api.delete('/endpoint');

// File upload with progress tracking
const result = await api.upload(
  '/media/upload',
  file,
  { duration: '15', tags: 'test' },
  (progress) => {
    console.log(`${progress.percentage}% uploaded`);
  }
);
```

### 3. Updated Zustand Store (`useMediaStore.ts`)

The media store now uses the new API service for all operations:

```typescript
import { useMediaStore } from '../stores/useMediaStore';

// In your React component
const {
  media,
  loading,
  error,
  fetchMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
  downloadMedia,
} = useMediaStore();

// Fetch media with filters
await fetchMedia({ type: 'image', search: 'ad' });

// Upload with progress tracking
const newMedia = await uploadMedia(file, {
  tags: 'advertisement',
  description: 'New ad creative'
});

// Update media
await updateMedia(mediaId, { description: 'Updated' });

// Delete media
await deleteMedia(mediaId);

// Download media
const downloadUrl = await downloadMedia(mediaId);
```

### 4. Integration Testing (`tests/mediaAPI.test.ts`)

Comprehensive testing utilities for development and debugging:

```typescript
import { MockAPIServer, runMediaAPIIntegrationTests } from '../tests/mediaAPI.test';

// Run integration tests
await runMediaAPIIntegrationTests();

// Setup mock server for development
MockAPIServer.start();
MockAPIServer.setupMediaAPIMocks();

// Create mock files for testing
const mockFile = createMockFile('test.jpg', 1024, 'image/jpeg');

// Simulate upload progress
await simulateUploadProgress(callback, 'test.jpg');
```

## Type Safety

All operations are fully typed with comprehensive interfaces:

```typescript
import type {
  MediaItem,
  MediaResponse,
  UploadProgress,
  MediaFilters,
  GetMediaParams,
  UploadMetadata,
  UpdateMediaMetadata
} from '../services/mediaAPI';

// Type-safe media operations
const params: GetMediaParams = {
  type: 'image',
  search: 'advertisement',
  page: 1,
  limit: 20,
  sortBy: 'date',
  sortOrder: 'desc'
};

const metadata: UploadMetadata = {
  duration: 15,
  tags: 'advertisement,outdoor',
  description: 'Summer campaign creative'
};
```

## Error Handling

Comprehensive error handling with proper error types:

```typescript
import { 
  isMediaApiError, 
  getMediaErrorMessage, 
  getMediaValidationErrors 
} from '../services/mediaAPI';

try {
  await mediaAPI.uploadMedia(file);
} catch (error) {
  if (isMediaApiError(error)) {
    const message = getMediaErrorMessage(error);
    const validationErrors = getMediaValidationErrors(error);
    
    console.error('API Error:', message);
    if (validationErrors) {
      console.error('Validation Errors:', validationErrors);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Progress Tracking

Real-time upload progress monitoring:

```typescript
const progressCallback = (progress: UploadProgress) => {
  console.log(`File: ${progress.filename}`);
  console.log(`Progress: ${progress.progress}%`);
  console.log(`Status: ${progress.status}`);
  
  if (progress.error) {
    console.error(`Error: ${progress.error}`);
  }
};

await mediaAPI.uploadMedia(file, metadata, progressCallback);
```

## Caching and Performance

The service layer includes intelligent caching:

```typescript
// Check if data is stale
if (useMediaStore.getState().isDataStale()) {
  await fetchMedia();
}

// Invalidate cache when needed
useMediaStore.getState().invalidateCache();

// Force refresh
await fetchMedia({ forceRefresh: true });
```

## Authentication Integration

Seamless integration with the authentication system:

- Automatic token retrieval from localStorage
- Token refresh handling
- Proper error handling for auth failures
- Logout on token expiration

## Network Resilience

Built-in retry logic and error recovery:

- Automatic retry for network failures (up to 3 attempts)
- Exponential backoff for retry delays
- Request timeout handling
- Offline detection and graceful degradation

## Best Practices

### 1. Always Handle Errors

```typescript
try {
  const media = await mediaAPI.getMedia();
  // Handle success
} catch (error) {
  // Always handle errors appropriately
  const message = getMediaErrorMessage(error);
  showToast('Error', message, 'error');
}
```

### 2. Use Progress Callbacks for Uploads

```typescript
const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

await mediaAPI.uploadMedia(file, metadata, setUploadProgress);
```

### 3. Leverage TypeScript

```typescript
// Use proper types for better developer experience
const params: GetMediaParams = {
  type: 'image', // TypeScript will validate this
  sortBy: 'date', // Auto-completion available
};
```

### 4. Optimize API Calls

```typescript
// Use debounced search
const debouncedSearch = useCallback(
  debounce((search: string) => {
    useMediaStore.getState().setSearch(search);
  }, 300),
  []
);
```

### 5. Handle Loading States

```typescript
const { loading, uploading, error } = useMediaStore();

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
```

## Migration Guide

### From Old Implementation

The old media store implementation has been updated to use the new API service. Existing components should continue to work without changes, but you can now take advantage of enhanced features:

1. **Better Error Handling**: More specific error messages and types
2. **Progress Tracking**: Real-time upload progress
3. **Type Safety**: Full TypeScript support
4. **Network Resilience**: Automatic retry and error recovery

### Breaking Changes

- Progress callback signature has changed for better type safety
- Error types are now more specific (AuthApiError vs generic Error)
- Some internal store methods have been updated (but public API remains the same)

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure the user is logged in and token is valid
2. **Network Errors**: Check network connectivity and API server status
3. **Upload Failures**: Verify file size and type constraints
4. **Type Errors**: Ensure you're using the correct TypeScript interfaces

### Debug Mode

Enable debug mode for detailed logging:

```typescript
import { serviceEvents } from '../services';

// Subscribe to service events for debugging
serviceEvents.subscribe((event) => {
  console.log('Service Event:', event);
});
```

### Health Check

Verify service health:

```typescript
import { performHealthCheck } from '../services';

const health = await performHealthCheck();
console.log('Service Health:', health);
```

## Examples

See `src/examples/MediaStoreExamples.tsx` for complete usage examples and the `src/tests/mediaAPI.test.ts` file for comprehensive test cases demonstrating all functionality.

## Support

For issues or questions about the Media API Service Layer:

1. Check the TypeScript definitions for detailed interface documentation
2. Review the test files for usage examples
3. Enable debug mode for detailed request/response logging
4. Use the health check function to verify service connectivity