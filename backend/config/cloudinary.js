const cloudinary = require('cloudinary').v2;
const winston = require('winston');
const { Readable } = require('stream');

/**
 * Enhanced Cloudinary configuration with Media model integration
 * Supports user-specific folders, comprehensive file validation, metadata extraction,
 * and seamless integration with the Media model structure
 */

// Configure Cloudinary with environment validation
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Validate required environment variables
const validateEnvironmentConfig = () => {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Cloudinary environment variables: ${missing.join(', ')}`);
  }
  
  winston.info('Cloudinary environment configuration validated successfully', {
    service: 'cloudinary',
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
  });
};

// Initialize environment validation
validateEnvironmentConfig();

/**
 * Verify Cloudinary connection
 */
const verifyCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    winston.info('Cloudinary connection verified successfully', {
      service: 'cloudinary',
      status: result.status
    });
    return true;
  } catch (error) {
    winston.error('Cloudinary connection failed:', {
      service: 'cloudinary',
      error: error.message
    });
    return false;
  }
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB for images
  video: 50 * 1024 * 1024  // 50MB for videos
};

// Allowed file formats
const ALLOWED_FORMATS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
  video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']
};

// MIME type mappings
const MIME_TYPE_MAPPINGS = {
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/bmp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/avi': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'video/webm': 'video',
  'video/x-flv': 'video',
  'video/x-matroska': 'video'
};

/**
 * Generate user-specific folder path
 * @param {string} userId - User ID
 * @param {string} type - Media type (image/video)
 * @returns {string} Folder path
 */
const generateUserFolder = (userId, type) => {
  const baseFolder = process.env.CLOUDINARY_BASE_FOLDER || 'advertisements';
  return `${baseFolder}/${userId}/${type}s`;
};

/**
 * Validate file before upload
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @param {string} originalName - Original filename
 * @returns {Object} Validation result
 */
const validateFileForUpload = (buffer, mimetype, originalName) => {
  // Check if MIME type is supported
  const mediaType = MIME_TYPE_MAPPINGS[mimetype];
  if (!mediaType) {
    return {
      isValid: false,
      error: `Unsupported file type: ${mimetype}. Allowed types: ${Object.keys(MIME_TYPE_MAPPINGS).join(', ')}`
    };
  }

  // Check file size
  const fileSize = buffer.length;
  const sizeLimit = FILE_SIZE_LIMITS[mediaType];
  if (fileSize > sizeLimit) {
    const limitMB = Math.round(sizeLimit / (1024 * 1024));
    return {
      isValid: false,
      error: `File size (${Math.round(fileSize / (1024 * 1024))}MB) exceeds ${limitMB}MB limit for ${mediaType} files`
    };
  }

  // Check filename
  if (!originalName || originalName.trim().length === 0) {
    return {
      isValid: false,
      error: 'Original filename is required'
    };
  }

  return {
    isValid: true,
    mediaType,
    fileSize
  };
};

/**
 * Upload image to Cloudinary with enhanced options and Media model integration
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with Media model compatible data
 */
const uploadImage = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Generate user-specific folder
    const folder = options.userId 
      ? generateUserFolder(options.userId, 'image')
      : process.env.CLOUDINARY_IMAGE_UPLOAD_FOLDER || 'sinage/images';

    const defaultOptions = {
      folder,
      resource_type: 'image',
      format: options.format || 'auto',
      quality: options.quality || 'auto:good',
      fetch_format: 'auto',
      allowed_formats: ALLOWED_FORMATS.image,
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      colors: true, // Extract dominant colors
      phash: true,  // Generate perceptual hash
      faces: true,  // Detect faces
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          winston.error('Image upload failed:', {
            service: 'cloudinary',
            error: error.message,
            userId: options.userId,
            folder,
            options: defaultOptions
          });
          reject(new Error(`Image upload failed: ${error.message}`));
        } else {
          winston.info('Image uploaded successfully:', {
            service: 'cloudinary',
            publicId: result.public_id,
            url: result.secure_url,
            size: result.bytes,
            userId: options.userId,
            folder: result.folder
          });
          
          // Format response for Media model compatibility
          resolve({
            cloudinaryId: result.public_id,
            publicId: result.public_id, // Backward compatibility
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            fileSize: result.bytes,
            size: result.bytes, // Backward compatibility
            width: result.width,
            height: result.height,
            resourceType: result.resource_type,
            type: 'image',
            createdAt: result.created_at,
            folder: result.folder,
            cloudinaryMetadata: {
              bytes: result.bytes,
              etag: result.etag,
              placeholder: result.placeholder || false,
              colors: result.colors || [],
              predominant: {
                background: result.predominant?.background,
                foreground: result.predominant?.foreground
              },
              phash: result.phash,
              faces: result.faces || []
            }
          });
        }
      }
    );

    // Create readable stream and pipe to Cloudinary
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Upload video to Cloudinary with enhanced options and Media model integration
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with Media model compatible data
 */
const uploadVideo = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Generate user-specific folder
    const folder = options.userId 
      ? generateUserFolder(options.userId, 'video')
      : process.env.CLOUDINARY_VIDEO_UPLOAD_FOLDER || 'sinage/videos';

    const defaultOptions = {
      folder,
      resource_type: 'video',
      quality: options.quality || 'auto:good',
      video_codec: 'auto',
      allowed_formats: ALLOWED_FORMATS.video,
      transformation: [
        { quality: 'auto:good' },
        { video_codec: 'auto' }
      ],
      eager: [
        // Generate thumbnail automatically
        { 
          width: 400, 
          height: 300, 
          crop: 'fill', 
          gravity: 'center', 
          format: 'jpg',
          start_offset: '0'
        }
      ],
      eager_async: true,
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          winston.error('Video upload failed:', {
            service: 'cloudinary',
            error: error.message,
            userId: options.userId,
            folder,
            options: defaultOptions
          });
          reject(new Error(`Video upload failed: ${error.message}`));
        } else {
          winston.info('Video uploaded successfully:', {
            service: 'cloudinary',
            publicId: result.public_id,
            url: result.secure_url,
            size: result.bytes,
            duration: result.duration,
            userId: options.userId,
            folder: result.folder
          });
          
          // Format response for Media model compatibility
          resolve({
            cloudinaryId: result.public_id,
            publicId: result.public_id, // Backward compatibility
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            fileSize: result.bytes,
            size: result.bytes, // Backward compatibility
            width: result.width,
            height: result.height,
            videoDuration: result.duration,
            duration: result.duration, // Backward compatibility
            resourceType: result.resource_type,
            type: 'video',
            createdAt: result.created_at,
            folder: result.folder,
            cloudinaryMetadata: {
              bytes: result.bytes,
              etag: result.etag,
              placeholder: result.placeholder || false,
              colors: result.colors || [],
              predominant: {
                background: result.predominant?.background,
                foreground: result.predominant?.foreground
              },
              eager: result.eager || [],
              bit_rate: result.bit_rate,
              frame_rate: result.frame_rate
            }
          });
        }
      }
    );

    // Create readable stream and pipe to Cloudinary
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Upload any file type to Cloudinary with comprehensive validation and Media model integration
 * Automatically determines if it's image or video based on mimetype
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @param {string} originalName - Original filename
 * @param {Object} options - Upload options including userId
 * @returns {Promise<Object>} Upload result compatible with Media model
 */
const uploadFile = async (buffer, mimetype, originalName, options = {}) => {
  try {
    // Validate file before upload
    const validation = validateFileForUpload(buffer, mimetype, originalName);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    winston.info('Starting file upload:', {
      service: 'cloudinary',
      mimetype,
      originalName,
      fileSize: validation.fileSize,
      mediaType: validation.mediaType,
      userId: options.userId
    });

    // Add original filename to options for metadata
    const uploadOptions = {
      ...options,
      context: {
        original_filename: originalName,
        upload_timestamp: new Date().toISOString(),
        ...options.context
      }
    };

    // Determine upload method based on media type
    let result;
    if (validation.mediaType === 'image') {
      result = await uploadImage(buffer, uploadOptions);
    } else if (validation.mediaType === 'video') {
      result = await uploadVideo(buffer, uploadOptions);
    } else {
      throw new Error(`Unsupported media type: ${validation.mediaType}`);
    }

    winston.info('File upload completed successfully:', {
      service: 'cloudinary',
      cloudinaryId: result.cloudinaryId,
      mediaType: validation.mediaType,
      fileSize: result.fileSize,
      userId: options.userId
    });

    return result;
  } catch (error) {
    winston.error('File upload failed:', {
      service: 'cloudinary',
      mimetype,
      originalName,
      userId: options.userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Validate file type - Enhanced version using MIME_TYPE_MAPPINGS
 * @param {string} mimetype - File mimetype
 * @returns {boolean} Is valid file type
 */
const isValidFileType = (mimetype) => {
  return Object.keys(MIME_TYPE_MAPPINGS).includes(mimetype);
};

/**
 * Get resource type from MIME type
 * @param {string} mimetype - File MIME type
 * @returns {string|null} Resource type (image/video) or null if invalid
 */
const getResourceTypeFromMime = (mimetype) => {
  return MIME_TYPE_MAPPINGS[mimetype] || null;
};

/**
 * Create Media model data from Cloudinary result
 * @param {Object} cloudinaryResult - Cloudinary upload result
 * @param {string} originalName - Original filename
 * @param {string} userId - User ID
 * @param {Object} additionalData - Additional data for Media model
 * @returns {Object} Media model compatible data
 */
const createMediaModelData = (cloudinaryResult, originalName, userId, additionalData = {}) => {
  const mediaType = cloudinaryResult.type || getResourceTypeFromMime(additionalData.mimetype);
  
  const baseData = {
    originalName,
    filename: cloudinaryResult.cloudinaryId, // Will be updated by pre-save hook if needed
    cloudinaryId: cloudinaryResult.cloudinaryId,
    url: cloudinaryResult.url,
    secureUrl: cloudinaryResult.secureUrl,
    type: mediaType,
    format: cloudinaryResult.format,
    width: cloudinaryResult.width,
    height: cloudinaryResult.height,
    fileSize: cloudinaryResult.fileSize,
    owner: userId,
    cloudinaryMetadata: cloudinaryResult.cloudinaryMetadata || {}
  };

  // Add type-specific duration fields
  if (mediaType === 'image') {
    baseData.duration = additionalData.duration || 10; // Default 10 seconds for images
  } else if (mediaType === 'video') {
    baseData.videoDuration = cloudinaryResult.videoDuration || cloudinaryResult.duration;
  }

  // Add optional fields
  if (additionalData.tags) {
    baseData.tags = additionalData.tags;
  }
  
  if (additionalData.description) {
    baseData.description = additionalData.description;
  }

  if (additionalData.quality) {
    baseData.quality = additionalData.quality;
  }

  return baseData;
};

/**
 * Generate thumbnail for video with enhanced options
 * @param {string} publicId - Video public ID
 * @param {Object} options - Thumbnail options
 * @returns {Promise<Object>} Thumbnail result
 */
const generateVideoThumbnail = async (publicId, options = {}) => {
  try {
    const thumbnailOptions = {
      format: options.format || 'jpg',
      quality: options.quality || 'auto:good',
      width: options.width || 400,
      height: options.height || 300,
      crop: options.crop || 'fill',
      gravity: options.gravity || 'center',
      start_offset: options.start_offset || '0',
      ...options
    };

    const thumbnailUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      ...thumbnailOptions
    });

    winston.info('Video thumbnail generated:', {
      service: 'cloudinary',
      publicId,
      thumbnailUrl,
      options: thumbnailOptions
    });

    return {
      thumbnailUrl,
      publicId,
      options: thumbnailOptions,
      format: thumbnailOptions.format,
      width: thumbnailOptions.width,
      height: thumbnailOptions.height
    };
  } catch (error) {
    winston.error('Error generating video thumbnail:', {
      service: 'cloudinary',
      publicId,
      error: error.message
    });
    throw new Error(`Failed to generate video thumbnail: ${error.message}`);
  }
};

/**
 * Upload file and create Media model entry in a single operation
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @param {string} originalName - Original filename
 * @param {string} userId - User ID
 * @param {Object} mediaData - Additional Media model data
 * @returns {Promise<Object>} Media model compatible data ready for database
 */
const uploadFileForMediaModel = async (buffer, mimetype, originalName, userId, mediaData = {}) => {
  try {
    // Upload to Cloudinary
    const cloudinaryResult = await uploadFile(buffer, mimetype, originalName, { 
      userId,
      ...mediaData.uploadOptions 
    });

    // Create Media model data
    const mediaModelData = createMediaModelData(
      cloudinaryResult, 
      originalName, 
      userId,
      { mimetype, ...mediaData }
    );

    winston.info('File uploaded and Media model data created:', {
      service: 'cloudinary',
      cloudinaryId: cloudinaryResult.cloudinaryId,
      userId,
      originalName
    });

    return mediaModelData;
  } catch (error) {
    winston.error('Upload for Media model failed:', {
      service: 'cloudinary',
      userId,
      originalName,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get multiple file details from Cloudinary
 * @param {Array} publicIds - Array of Cloudinary public IDs
 * @param {string} resourceType - Resource type (image/video)
 * @returns {Promise<Array>} Array of file details
 */
const getMultipleFileDetails = async (publicIds, resourceType = 'auto') => {
  try {
    const promises = publicIds.map(publicId => {
      const type = resourceType === 'auto' 
        ? (publicId.includes('/video/') ? 'video' : 'image')
        : resourceType;
      return getFileDetails(publicId, type);
    });

    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      publicId: publicIds[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  } catch (error) {
    winston.error('Error getting multiple file details:', {
      service: 'cloudinary',
      publicIds,
      error: error.message
    });
    throw error;
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array} publicIds - Array of public IDs to delete
 * @param {string} resourceType - Resource type (image/video/auto)
 * @returns {Promise<Array>} Array of deletion results
 */
const deleteMultipleFiles = async (publicIds, resourceType = 'auto') => {
  try {
    const promises = publicIds.map(publicId => {
      const type = resourceType === 'auto' 
        ? (publicId.includes('/video/') ? 'video' : 'image')
        : resourceType;
      return deleteFile(publicId, type);
    });

    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      publicId: publicIds[index],
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  } catch (error) {
    winston.error('Error deleting multiple files:', {
      service: 'cloudinary',
      publicIds,
      error: error.message
    });
    throw error;
  }
};

/**
 * Delete file from Cloudinary with enhanced error handling
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image or video)
 * @returns {Promise<Object>} Deletion result
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    winston.info('File deleted from Cloudinary:', {
      service: 'cloudinary',
      publicId,
      resourceType,
      result: result.result
    });
    
    return {
      publicId,
      resourceType,
      result: result.result,
      success: result.result === 'ok'
    };
  } catch (error) {
    winston.error('Error deleting file from Cloudinary:', {
      service: 'cloudinary',
      publicId,
      resourceType,
      error: error.message
    });
    throw new Error(`Failed to delete file ${publicId}: ${error.message}`);
  }
};

/**
 * Get file details from Cloudinary with enhanced metadata
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image or video)
 * @returns {Promise<Object>} File details compatible with Media model
 */
const getFileDetails = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      colors: true,
      faces: true,
      phash: true
    });
    
    return {
      cloudinaryId: result.public_id,
      publicId: result.public_id, // Backward compatibility
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      fileSize: result.bytes,
      size: result.bytes, // Backward compatibility
      width: result.width,
      height: result.height,
      duration: result.duration, // For videos
      resourceType: result.resource_type,
      type: result.resource_type, // For Media model compatibility
      folder: result.folder,
      createdAt: result.created_at,
      cloudinaryMetadata: {
        bytes: result.bytes,
        etag: result.etag,
        placeholder: result.placeholder || false,
        colors: result.colors || [],
        predominant: {
          background: result.predominant?.background,
          foreground: result.predominant?.foreground
        },
        phash: result.phash,
        faces: result.faces || [],
        context: result.context || {}
      }
    };
  } catch (error) {
    winston.error('Error getting file details from Cloudinary:', {
      service: 'cloudinary',
      publicId,
      resourceType,
      error: error.message
    });
    throw new Error(`Failed to get file details for ${publicId}: ${error.message}`);
  }
};

/**
 * Get optimized URL for file with enhanced transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformations - Transformation options
 * @param {string} resourceType - Resource type (auto detection if not provided)
 * @returns {string} Optimized URL
 */
const getOptimizedUrl = (publicId, transformations = {}, resourceType = 'auto') => {
  const defaultTransformations = {
    quality: 'auto:good',
    fetch_format: 'auto',
    ...transformations
  };

  // Auto-detect resource type if not specified
  if (resourceType === 'auto') {
    resourceType = publicId.includes('/video/') ? 'video' : 'image';
  }

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    ...defaultTransformations
  });
};

/**
 * Get user's storage usage statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Storage usage statistics
 */
const getUserStorageStats = async (userId) => {
  try {
    const userFolder = generateUserFolder(userId, '*').replace('/images', '').replace('/videos', '');
    
    // Get usage for images
    const imageStats = await cloudinary.api.usage({
      folder: generateUserFolder(userId, 'image')
    });
    
    // Get usage for videos
    const videoStats = await cloudinary.api.usage({
      folder: generateUserFolder(userId, 'video')
    });

    const totalStats = {
      userId,
      images: {
        count: imageStats.resources || 0,
        bytes: imageStats.bytes || 0,
        credits: imageStats.credits || 0
      },
      videos: {
        count: videoStats.resources || 0,
        bytes: videoStats.bytes || 0,
        credits: videoStats.credits || 0
      },
      total: {
        count: (imageStats.resources || 0) + (videoStats.resources || 0),
        bytes: (imageStats.bytes || 0) + (videoStats.bytes || 0),
        credits: (imageStats.credits || 0) + (videoStats.credits || 0)
      }
    };

    winston.info('User storage stats retrieved:', {
      service: 'cloudinary',
      userId,
      totalFiles: totalStats.total.count,
      totalBytes: totalStats.total.bytes
    });

    return totalStats;
  } catch (error) {
    winston.error('Error getting user storage stats:', {
      service: 'cloudinary',
      userId,
      error: error.message
    });
    throw new Error(`Failed to get storage stats for user ${userId}: ${error.message}`);
  }
};

/**
 * Clean up orphaned files for a user (files not in database)
 * @param {string} userId - User ID
 * @param {Array} existingCloudinaryIds - Array of Cloudinary IDs that should exist
 * @returns {Promise<Object>} Cleanup results
 */
const cleanupOrphanedFiles = async (userId, existingCloudinaryIds) => {
  try {
    const userImageFolder = generateUserFolder(userId, 'image');
    const userVideoFolder = generateUserFolder(userId, 'video');
    
    // Get all files in user folders
    const [imageFiles, videoFiles] = await Promise.all([
      cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        folder: userImageFolder,
        max_results: 500
      }),
      cloudinary.api.resources({
        type: 'upload',
        resource_type: 'video',
        folder: userVideoFolder,
        max_results: 500
      })
    ]);

    const allCloudinaryFiles = [
      ...imageFiles.resources.map(r => ({ ...r, resource_type: 'image' })),
      ...videoFiles.resources.map(r => ({ ...r, resource_type: 'video' }))
    ];

    // Find orphaned files
    const orphanedFiles = allCloudinaryFiles.filter(file => 
      !existingCloudinaryIds.includes(file.public_id)
    );

    // Delete orphaned files
    const deletionResults = await Promise.allSettled(
      orphanedFiles.map(file => deleteFile(file.public_id, file.resource_type))
    );

    const successfulDeletions = deletionResults.filter(r => r.status === 'fulfilled').length;
    const failedDeletions = deletionResults.filter(r => r.status === 'rejected').length;

    winston.info('Orphaned files cleanup completed:', {
      service: 'cloudinary',
      userId,
      totalOrphaned: orphanedFiles.length,
      successfulDeletions,
      failedDeletions
    });

    return {
      userId,
      totalFiles: allCloudinaryFiles.length,
      orphanedFiles: orphanedFiles.length,
      successfulDeletions,
      failedDeletions,
      orphanedFileIds: orphanedFiles.map(f => f.public_id)
    };
  } catch (error) {
    winston.error('Error during orphaned files cleanup:', {
      service: 'cloudinary',
      userId,
      error: error.message
    });
    throw new Error(`Failed to cleanup orphaned files for user ${userId}: ${error.message}`);
  }
};

module.exports = {
  // Core Cloudinary instance
  cloudinary,
  
  // Environment and connection
  validateEnvironmentConfig,
  verifyCloudinaryConnection,
  
  // File upload functions
  uploadFile,
  uploadImage,
  uploadVideo,
  uploadFileForMediaModel,
  
  // File management
  deleteFile,
  deleteMultipleFiles,
  getFileDetails,
  getMultipleFileDetails,
  
  // URL and optimization
  getOptimizedUrl,
  generateVideoThumbnail,
  
  // Validation and utilities
  isValidFileType,
  validateFileForUpload,
  getResourceTypeFromMime,
  
  // User-specific functions
  generateUserFolder,
  getUserStorageStats,
  cleanupOrphanedFiles,
  
  // Media model integration
  createMediaModelData,
  
  // Constants for external use
  FILE_SIZE_LIMITS,
  ALLOWED_FORMATS,
  MIME_TYPE_MAPPINGS
};