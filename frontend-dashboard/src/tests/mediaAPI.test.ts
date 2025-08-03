/**
 * Media API Integration Tests
 * 
 * Comprehensive test suite for the media API service layer including:
 * - Mock API responses for development environment
 * - Error handling test scenarios
 * - Upload progress simulation
 * - Integration testing utilities
 */

import {
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
  type MediaItem,
  type MediaResponse,
  type MediaStatsResponse,
  type UploadProgress,
  type GetMediaParams,
} from '../services/mediaAPI';

import { AuthApiError } from '../services/auth';

// ============================
// Mock Data
// ============================

const mockMediaItem: MediaItem = {
  _id: '64f8a1b2c3d4e5f6a7b8c9d0',
  originalName: 'test-image.jpg',
  filename: '64f8a1b2c3d4e5f6a7b8c9d0_1694123456789_a1b2c3d4_test-image.jpg',
  cloudinaryId: 'advertisements/64f8a1b2c3d4e5f6a7b8c9d0/images/1694123456789_test-image',
  url: 'http://res.cloudinary.com/test/image/upload/v1694123456/test-image.jpg',
  secureUrl: 'https://res.cloudinary.com/test/image/upload/v1694123456/test-image.jpg',
  type: 'image',
  format: 'jpg',
  width: 1920,
  height: 1080,
  fileSize: 245760,
  duration: 15,
  tags: ['test', 'advertisement'],
  description: 'Test image for advertisement',
  owner: '64f8a1b2c3d4e5f6a7b8c9d0',
  usageCount: 3,
  isActive: true,
  createdAt: '2023-09-08T10:30:45.123Z',
  updatedAt: '2023-09-08T10:30:45.123Z',
  aspectRatio: '1.78',
  isLandscape: true,
  formattedFileSize: '240.00 KB',
  formattedDuration: '15s',
};

const mockMediaResponse: MediaResponse = {
  success: true,
  message: 'Media retrieved successfully',
  data: {
    media: [mockMediaItem],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasMore: false,
      hasNext: false,
      hasPrev: false,
    },
    statistics: {
      totalFiles: 1,
      totalSize: 245760,
      imageCount: 1,
      videoCount: 0,
      totalUsage: 3,
      avgFileSize: 245760,
      recentCount: 1,
    },
    filters: {
      search: '',
      sortBy: 'date',
      sortOrder: 'desc',
    },
  },
};

const mockStatsResponse: MediaStatsResponse = {
  success: true,
  message: 'Media statistics retrieved successfully',
  data: {
    database: {
      totalFiles: 25,
      totalSize: 15728640,
      imageCount: 20,
      videoCount: 5,
      totalUsage: 47,
      avgFileSize: 629145.6,
      recentCount: 5,
    },
    recent: [mockMediaItem],
    popular: [mockMediaItem],
    storage: {
      userId: '64f8a1b2c3d4e5f6a7b8c9d0',
      images: { count: 20, bytes: 12582912, credits: 125 },
      videos: { count: 5, bytes: 3145728, credits: 31 },
      total: { count: 25, bytes: 15728640, credits: 156 },
    },
    limits: {
      maxFileSize: { image: 10485760, video: 52428800 },
      maxFiles: 1000,
    },
  },
};

// ============================
// Mock Setup Utilities
// ============================

export class MockAPIServer {
  private static originalFetch: typeof global.fetch;
  private static isActive = false;
  
  static responses: Map<string, any> = new Map();
  static delays: Map<string, number> = new Map();
  static errors: Map<string, { status: number; message: string }> = new Map();

  /**
   * Start mocking fetch requests
   */
  static start(): void {
    if (this.isActive) return;
    
    this.originalFetch = global.fetch;
    this.isActive = true;

    global.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      const method = options?.method || 'GET';
      const key = `${method} ${urlStr}`;
      
      // Simulate network delay
      const delay = this.delays.get(key) || 100;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Check for error scenarios
      if (this.errors.has(key)) {
        const error = this.errors.get(key)!;
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { status: error.status }
        );
      }
      
      // Return mock response
      if (this.responses.has(key)) {
        const response = this.responses.get(key);
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Default 404 response
      return new Response(
        JSON.stringify({ success: false, message: 'Not found' }),
        { status: 404 }
      );
    });
  }

  /**
   * Stop mocking and restore original fetch
   */
  static stop(): void {
    if (!this.isActive) return;
    
    global.fetch = this.originalFetch;
    this.isActive = false;
    this.responses.clear();
    this.delays.clear();
    this.errors.clear();
  }

  /**
   * Set mock response for a specific endpoint
   */
  static mockResponse(method: string, url: string, response: any): void {
    this.responses.set(`${method} ${url}`, response);
  }

  /**
   * Set network delay for a specific endpoint
   */
  static setDelay(method: string, url: string, delay: number): void {
    this.delays.set(`${method} ${url}`, delay);
  }

  /**
   * Set error response for a specific endpoint
   */
  static mockError(method: string, url: string, status: number, message: string): void {
    this.errors.set(`${method} ${url}`, { status, message });
  }

  /**
   * Setup common media API responses
   */
  static setupMediaAPIMocks(): void {
    // Mock token storage
    Object.defineProperty(Storage.prototype, 'getItem', {
      value: jest.fn((key: string) => {
        if (key === 'auth_token') return 'mock-token';
        return null;
      }),
    });

    // GET /api/media
    this.mockResponse('GET', 'http://localhost:5000/api/media', mockMediaResponse);
    this.mockResponse('GET', 'http://localhost:5000/api/media?type=image', {
      ...mockMediaResponse,
      data: {
        ...mockMediaResponse.data,
        filters: { ...mockMediaResponse.data.filters, type: 'image' },
      },
    });

    // POST /api/media/upload
    this.mockResponse('POST', 'http://localhost:5000/api/media/upload', {
      success: true,
      message: 'Media uploaded successfully',
      data: mockMediaItem,
    });

    // PUT /api/media/:id
    this.mockResponse('PUT', `http://localhost:5000/api/media/${mockMediaItem._id}`, {
      success: true,
      message: 'Media updated successfully',
      data: { ...mockMediaItem, description: 'Updated description' },
    });

    // DELETE /api/media/:id
    this.mockResponse('DELETE', `http://localhost:5000/api/media/${mockMediaItem._id}`, {
      success: true,
      message: 'Media deleted successfully',
      data: {
        id: mockMediaItem._id,
        cloudinaryId: mockMediaItem.cloudinaryId,
      },
    });

    // GET /api/media/:id/download
    this.mockResponse('GET', `http://localhost:5000/api/media/${mockMediaItem._id}/download`, {
      success: true,
      message: 'Download URL generated successfully',
      data: {
        downloadUrl: 'https://res.cloudinary.com/test/image/upload/v1694123456/test-image.jpg?sign=abc123',
        expiresAt: '2023-09-08T12:30:45.123Z',
        filename: 'test-image.jpg',
        fileSize: 245760,
        type: 'image',
      },
    });

    // GET /api/media/stats
    this.mockResponse('GET', 'http://localhost:5000/api/media/stats', mockStatsResponse);
  }
}

// ============================
// Test Utilities
// ============================

/**
 * Create a mock file for testing uploads
 */
export function createMockFile(
  name = 'test-image.jpg',
  size = 245760,
  type = 'image/jpeg'
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

/**
 * Create a mock progress callback that captures progress updates
 */
export function createMockProgressCallback(): {
  callback: (progress: UploadProgress) => void;
  progressUpdates: UploadProgress[];
} {
  const progressUpdates: UploadProgress[] = [];
  
  const callback = (progress: UploadProgress) => {
    progressUpdates.push({ ...progress });
  };
  
  return { callback, progressUpdates };
}

/**
 * Simulate upload progress for testing
 */
export function simulateUploadProgress(
  callback: (progress: UploadProgress) => void,
  filename: string,
  fileId?: string
): Promise<void> {
  return new Promise((resolve) => {
    const id = fileId || `${Date.now()}_${filename}`;
    let progress = 0;
    
    const interval = setInterval(() => {
      progress += 20;
      
      callback({
        fileId: id,
        filename,
        progress: Math.min(progress, 100),
        status: progress >= 100 ? 'completed' : 'uploading',
      });
      
      if (progress >= 100) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

// ============================
// Integration Test Functions
// ============================

/**
 * Test the complete media API integration
 */
export async function runMediaAPIIntegrationTests(): Promise<void> {
  console.log('🧪 Starting Media API Integration Tests...');
  
  try {
    // Setup mocks
    MockAPIServer.start();
    MockAPIServer.setupMediaAPIMocks();
    
    await testGetMedia();
    await testUploadMedia();
    await testUpdateMedia();
    await testDeleteMedia();
    await testDownloadMedia();
    await testMediaStats();
    await testErrorHandling();
    await testUtilityFunctions();
    
    console.log('✅ All Media API integration tests passed!');
  } catch (error) {
    console.error('❌ Media API integration tests failed:', error);
    throw error;
  } finally {
    MockAPIServer.stop();
  }
}

/**
 * Test media retrieval with different parameters
 */
async function testGetMedia(): Promise<void> {
  console.log('Testing getMedia...');
  
  // Test basic retrieval
  const response1 = await getMedia();
  if (!response1.success || response1.data.media.length === 0) {
    throw new Error('Failed to retrieve media');
  }
  
  // Test with filters
  const response2 = await getMedia({ type: 'image', page: 1, limit: 10 });
  if (!response2.success || response2.data.filters.type !== 'image') {
    throw new Error('Failed to apply filters');
  }
  
  console.log('✓ getMedia tests passed');
}

/**
 * Test media upload with progress tracking
 */
async function testUploadMedia(): Promise<void> {
  console.log('Testing uploadMedia...');
  
  const file = createMockFile();
  const { callback, progressUpdates } = createMockProgressCallback();
  
  // Simulate XMLHttpRequest for upload
  const originalXMLHttpRequest = global.XMLHttpRequest;
  
  global.XMLHttpRequest = jest.fn(() => ({
    upload: {},
    open: jest.fn(),
    setRequestHeader: jest.fn(),
    send: jest.fn(function() {
      // Simulate progress events
      setTimeout(() => {
        if (this.upload.onprogress) {
          this.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
          this.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 });
        }
        
        // Simulate completion
        this.status = 200;
        this.responseText = JSON.stringify({
          success: true,
          data: mockMediaItem,
        });
        
        if (this.onload) this.onload();
      }, 100);
    }),
    timeout: 0,
  })) as any;
  
  try {
    const result = await uploadMedia(file, { tags: 'test', description: 'Test upload' }, callback);
    
    if (!result || result._id !== mockMediaItem._id) {
      throw new Error('Upload failed to return expected result');
    }
    
    console.log('✓ uploadMedia tests passed');
  } finally {
    global.XMLHttpRequest = originalXMLHttpRequest;
  }
}

/**
 * Test media metadata updates
 */
async function testUpdateMedia(): Promise<void> {
  console.log('Testing updateMedia...');
  
  const result = await updateMedia(mockMediaItem._id, {
    description: 'Updated description',
    tags: 'updated,test',
  });
  
  if (!result || result._id !== mockMediaItem._id) {
    throw new Error('Update failed to return expected result');
  }
  
  console.log('✓ updateMedia tests passed');
}

/**
 * Test media deletion
 */
async function testDeleteMedia(): Promise<void> {
  console.log('Testing deleteMedia...');
  
  const result = await deleteMedia(mockMediaItem._id);
  
  if (!result.success || result.data.id !== mockMediaItem._id) {
    throw new Error('Delete failed to return expected result');
  }
  
  console.log('✓ deleteMedia tests passed');
}

/**
 * Test download URL generation
 */
async function testDownloadMedia(): Promise<void> {
  console.log('Testing getDownloadUrl...');
  
  const downloadUrl = await getDownloadUrl(mockMediaItem._id);
  
  if (!downloadUrl || !downloadUrl.startsWith('https://')) {
    throw new Error('Download URL generation failed');
  }
  
  console.log('✓ getDownloadUrl tests passed');
}

/**
 * Test media statistics retrieval
 */
async function testMediaStats(): Promise<void> {
  console.log('Testing getMediaStats...');
  
  const stats = await getMediaStats();
  
  if (!stats.success || !stats.data.database) {
    throw new Error('Stats retrieval failed');
  }
  
  console.log('✓ getMediaStats tests passed');
}

/**
 * Test error handling scenarios
 */
async function testErrorHandling(): Promise<void> {
  console.log('Testing error handling...');
  
  // Test 401 error
  MockAPIServer.mockError('GET', 'http://localhost:5000/api/media', 401, 'Unauthorized');
  
  try {
    await getMedia();
    throw new Error('Should have thrown 401 error');
  } catch (error) {
    if (!isMediaApiError(error) || error.status !== 401) {
      throw new Error('Expected 401 AuthApiError');
    }
  }
  
  // Test 404 error
  MockAPIServer.mockError('GET', `http://localhost:5000/api/media/nonexistent`, 404, 'Not found');
  
  try {
    await getDownloadUrl('nonexistent');
    throw new Error('Should have thrown 404 error');
  } catch (error) {
    if (!isMediaApiError(error) || error.status !== 404) {
      throw new Error('Expected 404 AuthApiError');
    }
  }
  
  // Reset mocks
  MockAPIServer.setupMediaAPIMocks();
  
  console.log('✓ Error handling tests passed');
}

/**
 * Test utility functions
 */
async function testUtilityFunctions(): Promise<void> {
  console.log('Testing utility functions...');
  
  // Test file size formatting
  if (formatFileSize(1024) !== '1 KB') {
    throw new Error('File size formatting failed');
  }
  
  if (formatFileSize(1048576) !== '1 MB') {
    throw new Error('File size formatting failed');
  }
  
  // Test duration formatting
  if (formatDuration(30) !== '30s') {
    throw new Error('Duration formatting failed');
  }
  
  if (formatDuration(90) !== '1m 30s') {
    throw new Error('Duration formatting failed');
  }
  
  // Test error utilities
  const testError = new AuthApiError('Test error', 422, { field: 'Test validation error' });
  
  if (getMediaErrorMessage(testError) !== 'Test error') {
    throw new Error('Error message extraction failed');
  }
  
  const validationErrors = getMediaValidationErrors(testError);
  if (!validationErrors || validationErrors.field !== 'Test validation error') {
    throw new Error('Validation error extraction failed');
  }
  
  console.log('✓ Utility function tests passed');
}

// ============================
// Export test utilities for external use
// ============================

export {
  MockAPIServer,
  mockMediaItem,
  mockMediaResponse,
  mockStatsResponse,
};

// ============================
// Browser environment detection
// ============================

if (typeof window !== 'undefined') {
  // In browser environment, expose utilities globally for debugging
  (window as any).MediaAPITests = {
    runMediaAPIIntegrationTests,
    MockAPIServer,
    createMockFile,
    simulateUploadProgress,
  };
}

export default {
  runMediaAPIIntegrationTests,
  MockAPIServer,
  createMockFile,
  createMockProgressCallback,
  simulateUploadProgress,
};