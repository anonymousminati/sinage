# Media Store Documentation

This directory contains Zustand stores for state management in the frontend dashboard. The primary store is `useMediaStore` which provides comprehensive media management functionality.

## Overview

The Media Store (`useMediaStore`) is a comprehensive Zustand store that manages all media-related operations including:

- **Media Management**: CRUD operations for media items
- **File Uploads**: Progress tracking and error handling
- **Filtering & Search**: Advanced filtering with debounced search
- **Pagination**: Efficient pagination for large datasets
- **Statistics**: Real-time media analytics
- **Caching**: Smart caching with invalidation
- **Optimistic Updates**: Immediate UI feedback

## Installation

The store is already configured and ready to use. Zustand is installed as a dependency.

## Basic Usage

### Import the Store

```typescript
import { useMediaStore, useMediaActions, useMediaItems } from '../stores';
```

### Fetch Media

```typescript
function MediaList() {
  const media = useMediaItems();
  const loading = useMediaLoading();
  const { fetchMedia } = useMediaActions();

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {media.map(item => (
        <div key={item._id}>{item.originalName}</div>
      ))}
    </div>
  );
}
```

## Store Structure

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `media` | `MediaItem[]` | Array of media items |
| `statistics` | `MediaStatistics` | Media analytics and stats |
| `loading` | `boolean` | General loading state |
| `uploading` | `boolean` | Upload operation state |
| `uploadProgress` | `Record<string, UploadProgress>` | Upload progress tracking |
| `error` | `string \| null` | Error messages |
| `filters` | `MediaFilters` | Current filter settings |
| `pagination` | `MediaPagination` | Pagination information |
| `selectedMedia` | `MediaItem \| null` | Currently selected media |

### Actions

#### API Integration

- `fetchMedia(params?)` - Fetch media with optional filters
- `uploadMedia(file, metadata?)` - Upload media with progress tracking
- `updateMedia(id, metadata)` - Update media metadata
- `deleteMedia(id)` - Delete media with optimistic updates
- `downloadMedia(id)` - Generate secure download URL
- `fetchStats()` - Fetch media statistics

#### UI State Management

- `setFilters(filters)` - Update filter settings
- `setSortOrder(sortBy, sortOrder?)` - Update sorting
- `clearFilters()` - Reset all filters
- `setSearch(query)` - Debounced search
- `setSelectedMedia(media)` - Set selected media
- `clearError()` - Clear error state

#### Pagination

- `setPage(page)` - Navigate to specific page
- `nextPage()` - Go to next page
- `prevPage()` - Go to previous page

## Optimized Selectors

Use these selectors to prevent unnecessary re-renders:

```typescript
// Individual selectors
const media = useMediaItems();
const loading = useMediaLoading();
const error = useMediaError();
const statistics = useMediaStatistics();
const filters = useMediaFilters();
const pagination = useMediaPagination();

// Combined selectors
const { media, pagination, loading } = useMediaWithPagination();
const { searchValue, filters, setSearch } = useSearchState();
const actions = useMediaActions();
```

## Advanced Features

### File Upload with Progress

```typescript
function UploadComponent() {
  const uploading = useUploading();
  const uploadProgress = useUploadProgress();
  const { uploadMedia } = useMediaActions();

  const handleUpload = async (file: File) => {
    const metadata = {
      duration: 15,
      tags: 'uploaded,dashboard',
      description: 'Uploaded via dashboard'
    };

    try {
      const result = await uploadMedia(file, metadata);
      console.log('Upload successful:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      {/* Upload progress display */}
      {Object.values(uploadProgress).map(progress => (
        <div key={progress.fileId}>
          <div>{progress.filename}: {progress.progress}%</div>
          <div className="progress-bar" style={{ width: `${progress.progress}%` }} />
        </div>
      ))}
    </div>
  );
}
```

### Advanced Filtering

```typescript
function FilterComponent() {
  const { setFilters, clearFilters } = useMediaActions();
  const filters = useMediaFilters();

  const handleFilter = (type: 'image' | 'video') => {
    setFilters({ type });
  };

  const handleSort = (sortBy: 'date' | 'name' | 'size' | 'usage') => {
    setFilters({ 
      sortBy, 
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
    });
  };

  return (
    <div>
      <button onClick={() => handleFilter('image')}>Images</button>
      <button onClick={() => handleFilter('video')}>Videos</button>
      <button onClick={() => handleSort('date')}>Sort by Date</button>
      <button onClick={clearFilters}>Clear Filters</button>
    </div>
  );
}
```

### Debounced Search

```typescript
function SearchComponent() {
  const { searchValue, setSearch } = useSearchState();

  return (
    <input
      type="text"
      value={searchValue}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search media..."
    />
  );
}
```

### Optimistic Updates

The store implements optimistic updates for better UX:

- **Upload**: Media appears in list immediately
- **Delete**: Media is removed immediately, rolled back on error
- **Update**: Changes are reflected immediately
- **Download**: Usage count increments immediately

### Error Handling

```typescript
function ErrorHandler() {
  const error = useMediaError();
  const { clearError } = useMediaActions();

  if (!error) return null;

  return (
    <div className="error-banner">
      <span>{error}</span>
      <button onClick={clearError}>Dismiss</button>
    </div>
  );
}
```

### Pagination

```typescript
function PaginationComponent() {
  const pagination = useMediaPagination();
  const { setPage, nextPage, prevPage } = useMediaActions();

  return (
    <div>
      <button 
        onClick={prevPage} 
        disabled={!pagination.hasPrev}
      >
        Previous
      </button>
      
      <span>
        Page {pagination.page} of {pagination.totalPages}
      </span>
      
      <button 
        onClick={nextPage} 
        disabled={!pagination.hasNext}
      >
        Next
      </button>
    </div>
  );
}
```

## Cache Management

The store includes intelligent caching:

```typescript
const { invalidateCache, isDataStale } = useMediaActions();

// Force refresh
invalidateCache();
fetchMedia();

// Check if data needs refresh
if (isDataStale()) {
  fetchMedia();
}
```

## Type Definitions

### MediaItem

```typescript
interface MediaItem {
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
```

### MediaFilters

```typescript
interface MediaFilters {
  type?: 'image' | 'video' | '';
  search: string;
  sortBy: 'date' | 'name' | 'size' | 'usage';
  sortOrder: 'asc' | 'desc';
  tags?: string;
}
```

### UploadProgress

```typescript
interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}
```

## Best Practices

### 1. Use Appropriate Selectors

```typescript
// ✅ Good - Only re-renders when media changes
const media = useMediaItems();

// ❌ Avoid - Re-renders on any store change
const { media } = useMediaStore();
```

### 2. Handle Loading States

```typescript
function MediaComponent() {
  const media = useMediaItems();
  const loading = useMediaLoading();
  const error = useMediaError();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <MediaGrid media={media} />;
}
```

### 3. Debounce Heavy Operations

The store automatically debounces search, but for custom operations:

```typescript
const debouncedFetch = useCallback(
  debounce(() => fetchMedia(), 300),
  [fetchMedia]
);
```

### 4. Clean Up Effects

```typescript
useEffect(() => {
  const { searchDebounceTimer } = useMediaStore.getState();
  
  return () => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
  };
}, []);
```

## Integration with Backend

The store integrates with the backend API endpoints:

- `POST /api/media/upload` - File upload
- `GET /api/media` - Fetch media with filters
- `PUT /api/media/:id` - Update metadata
- `DELETE /api/media/:id` - Delete media
- `GET /api/media/:id/download` - Download URL
- `GET /api/media/stats` - Statistics

Authentication is handled automatically using the token from localStorage.

## Performance Optimizations

1. **Selective Re-renders**: Use specific selectors
2. **Debounced Search**: 300ms debounce on search
3. **Caching**: 5-minute cache for repeated requests
4. **Optimistic Updates**: Immediate UI feedback
5. **Pagination**: Efficient handling of large datasets
6. **Progress Tracking**: Real-time upload progress

## Troubleshooting

### Common Issues

1. **Token Mismatch**: Ensure AuthContext and api.ts use same storage
2. **Stale Data**: Use `invalidateCache()` after external changes
3. **Memory Leaks**: Clean up timers in component unmount
4. **Upload Errors**: Check file size and type constraints

### Debug Tools

The store includes Zustand DevTools support for debugging:

```typescript
// View store state in Redux DevTools
const store = useMediaStore.getState();
console.log(store);
```

## Examples

See `src/examples/MediaStoreExamples.tsx` for comprehensive usage examples including:

- Basic media list
- Advanced search and filtering
- File upload with progress
- Pagination
- Media actions (edit, delete, download)
- Complete dashboard integration