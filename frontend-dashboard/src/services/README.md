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