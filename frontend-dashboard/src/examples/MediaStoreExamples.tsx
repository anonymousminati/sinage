/**
 * Media Store Usage Examples
 * 
 * This file demonstrates comprehensive usage patterns for the useMediaStore
 * including all major features like filtering, pagination, uploads, and real-time updates.
 * 
 * Use these patterns in your actual components.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  useMediaStore,
  useMediaItems,
  useMediaLoading,
  useMediaError,
  useMediaStatistics,
  useMediaActions,
  useSearchState,
  useUploadProgress,
  useUploading,
  type MediaItem,
  type MediaFilters,
} from '../stores';

/**
 * Example 1: Basic Media List Component
 * Shows how to display media with loading states and error handling
 */
export function MediaListExample() {
  const media = useMediaItems();
  const loading = useMediaLoading();
  const error = useMediaError();
  const { fetchMedia, clearError } = useMediaActions();

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  if (loading) {
    return <div className="p-4">Loading media...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700">Error: {error}</p>
        <button 
          onClick={clearError}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {media.map((item) => (
        <div key={item._id} className="border rounded-lg p-4">
          <img 
            src={item.secureUrl} 
            alt={item.originalName}
            className="w-full h-48 object-cover rounded"
          />
          <h3 className="mt-2 font-semibold">{item.originalName}</h3>
          <p className="text-sm text-gray-600">{item.formattedFileSize}</p>
          <p className="text-sm text-gray-600">Used {item.usageCount} times</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Example 2: Advanced Search and Filter Component
 * Demonstrates debounced search, filters, and sorting
 */
export function MediaSearchExample() {
  const { searchValue, filters, setSearch, setFilters, clearFilters } = useSearchState();
  const statistics = useMediaStatistics();

  const handleTypeFilter = (type: 'image' | 'video' | '') => {
    setFilters({ type });
  };

  const handleSortChange = (sortBy: MediaFilters['sortBy']) => {
    setFilters({ 
      sortBy,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
    });
  };

  return (
    <div className="p-4 bg-gray-50 border-b">
      {/* Statistics */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded shadow">
          <div className="text-2xl font-bold text-blue-600">{statistics.totalFiles}</div>
          <div className="text-sm text-gray-600">Total Files</div>
        </div>
        <div className="bg-white p-3 rounded shadow">
          <div className="text-2xl font-bold text-green-600">{statistics.imageCount}</div>
          <div className="text-sm text-gray-600">Images</div>
        </div>
        <div className="bg-white p-3 rounded shadow">
          <div className="text-2xl font-bold text-purple-600">{statistics.videoCount}</div>
          <div className="text-sm text-gray-600">Videos</div>
        </div>
        <div className="bg-white p-3 rounded shadow">
          <div className="text-2xl font-bold text-orange-600">{statistics.totalUsage}</div>
          <div className="text-sm text-gray-600">Total Usage</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search media..."
          value={searchValue}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => handleTypeFilter('')}
          className={`px-3 py-1 rounded ${
            filters.type === '' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => handleTypeFilter('image')}
          className={`px-3 py-1 rounded ${
            filters.type === 'image' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Images
        </button>
        <button
          onClick={() => handleTypeFilter('video')}
          className={`px-3 py-1 rounded ${
            filters.type === 'video' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Videos
        </button>
      </div>

      {/* Sort Options */}
      <div className="flex gap-2 mb-4">
        <span className="text-sm font-medium text-gray-700 py-1">Sort by:</span>
        {['date', 'name', 'size', 'usage'].map((sortKey) => (
          <button
            key={sortKey}
            onClick={() => handleSortChange(sortKey as MediaFilters['sortBy'])}
            className={`px-3 py-1 text-sm rounded ${
              filters.sortBy === sortKey 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {sortKey.charAt(0).toUpperCase() + sortKey.slice(1)}
            {filters.sortBy === sortKey && (
              <span className="ml-1">
                {filters.sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Clear Filters */}
      <button
        onClick={clearFilters}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Clear All Filters
      </button>
    </div>
  );
}

/**
 * Example 3: Upload Component with Progress Tracking
 * Shows file upload with real-time progress and error handling
 */
export function MediaUploadExample() {
  const uploading = useUploading();
  const uploadProgress = useUploadProgress();
  const { uploadMedia } = useMediaActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please select an image or video file.');
      return;
    }

    // Validate file size (10MB for images, 50MB for videos)
    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    try {
      const metadata = {
        duration: file.type.startsWith('image/') ? 15 : undefined,
        tags: 'uploaded,dashboard',
        description: `Uploaded via dashboard: ${file.name}`,
      };

      const result = await uploadMedia(file, metadata);
      if (result) {
        console.log('Upload successful:', result);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [uploadMedia]);

  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <div className="text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="media-upload"
        />
        <label
          htmlFor="media-upload"
          className={`inline-block px-6 py-3 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 ${
            uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {uploading ? 'Uploading...' : 'Select Files'}
        </label>
        <p className="mt-2 text-sm text-gray-600">
          Images: up to 10MB (JPEG, PNG, GIF, WebP)<br />
          Videos: up to 50MB (MP4, WebM)
        </p>
      </div>

      {/* Upload Progress */}
      {Object.values(uploadProgress).length > 0 && (
        <div className="mt-4 space-y-2">
          {Object.values(uploadProgress).map((progress) => (
            <div key={progress.fileId} className="bg-gray-50 p-3 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{progress.filename}</span>
                <span className="text-sm text-gray-600">{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progress.status === 'error' 
                      ? 'bg-red-500' 
                      : progress.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.error && (
                <p className="text-sm text-red-600 mt-1">{progress.error}</p>
              )}
              {progress.status === 'completed' && (
                <p className="text-sm text-green-600 mt-1">Upload completed!</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Pagination Component
 * Demonstrates pagination controls and navigation
 */
export function MediaPaginationExample() {
  const { pagination } = useMediaStore();
  const { setPage, nextPage, prevPage } = useMediaStore();

  const getPageNumbers = () => {
    const pages = [];
    const current = pagination.page;
    const total = pagination.totalPages;
    
    // Always show first page
    if (total > 0) pages.push(1);
    
    // Add ellipsis and current page area
    if (current > 3) pages.push('...');
    
    // Add current page and neighbors
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    
    // Add ellipsis and last page
    if (current < total - 2) pages.push('...');
    if (total > 1 && !pages.includes(total)) pages.push(total);
    
    return pages;
  };

  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50">
      <div className="text-sm text-gray-600">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} results
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={prevPage}
          disabled={!pagination.hasPrev}
          className="px-3 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {getPageNumbers().map((pageNum, index) => (
          <button
            key={index}
            onClick={() => typeof pageNum === 'number' ? setPage(pageNum) : null}
            disabled={pageNum === '...'}
            className={`px-3 py-1 rounded ${
              pageNum === pagination.page
                ? 'bg-blue-500 text-white'
                : pageNum === '...'
                ? 'cursor-default text-gray-400'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {pageNum}
          </button>
        ))}
        
        <button
          onClick={nextPage}
          disabled={!pagination.hasNext}
          className="px-3 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * Example 5: Media Actions Component
 * Shows edit, delete, and download operations
 */
export function MediaActionsExample({ media }: { media: MediaItem }) {
  const { updateMedia, deleteMedia, downloadMedia, setSelectedMedia } = useMediaActions();
  const [isEditing, setIsEditing] = React.useState(false);

  const handleEdit = () => {
    setSelectedMedia(media);
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${media.originalName}"?`)) {
      await deleteMedia(media._id);
    }
  };

  const handleDownload = async () => {
    const downloadUrl = await downloadMedia(media._id);
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleUpdateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const tagsValue = formData.get('tags') as string;
    const metadata = {
      duration: media.type === 'image' ? Number(formData.get('duration')) : undefined,
      tags: tagsValue?.split(',').map(tag => tag.trim()),
      description: formData.get('description') as string,
    };

    await updateMedia(media._id, metadata);
    setIsEditing(false);
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold">{media.originalName}</h3>
          <p className="text-sm text-gray-600">{media.formattedFileSize}</p>
          {media.description && (
            <p className="text-sm text-gray-700 mt-1">{media.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <form onSubmit={handleUpdateSubmit} className="mt-4 p-4 bg-gray-50 rounded">
          {media.type === 'image' && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (seconds)
              </label>
              <input
                type="number"
                name="duration"
                defaultValue={media.duration || 15}
                min="1"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              name="tags"
              defaultValue={media.tags.join(', ')}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={media.description || ''}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * Example 6: Complete Media Dashboard
 * Combines all examples into a comprehensive dashboard
 */
export function CompletMediaDashboard() {
  const { fetchStats } = useMediaActions();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Media Management Dashboard</h1>
        
        {/* Upload Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Media</h2>
          <MediaUploadExample />
        </div>
        
        {/* Search and Filter Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Search & Filter</h2>
          <MediaSearchExample />
        </div>
        
        {/* Media Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Media Library</h2>
          <MediaListExample />
        </div>
        
        {/* Pagination */}
        <MediaPaginationExample />
      </div>
    </div>
  );
}