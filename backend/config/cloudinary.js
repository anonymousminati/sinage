const cloudinary = require('cloudinary').v2;
const winston = require('winston');
const { Readable } = require('stream');

/**
 * Modern Cloudinary configuration using upload_stream()
 * Replaces outdated multer-storage-cloudinary with streaming uploads
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

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

/**
 * Upload image to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadImage = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: process.env.CLOUDINARY_IMAGE_UPLOAD_FOLDER || 'sinage/images',
      resource_type: 'image',
      format: options.format || 'auto',
      quality: options.quality || 'auto:good',
      fetch_format: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          winston.error('Image upload failed:', {
            service: 'cloudinary',
            error: error.message,
            options: defaultOptions
          });
          reject(error);
        } else {
          winston.info('Image uploaded successfully:', {
            service: 'cloudinary',
            publicId: result.public_id,
            url: result.secure_url,
            size: result.bytes
          });
          resolve({
            publicId: result.public_id,
            url: result.secure_url,
            secureUrl: result.secure_url,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
            resourceType: result.resource_type,
            createdAt: result.created_at,
            folder: result.folder
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
 * Upload video to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadVideo = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: process.env.CLOUDINARY_VIDEO_UPLOAD_FOLDER || 'sinage/videos',
      resource_type: 'video',
      quality: options.quality || 'auto:good',
      video_codec: 'auto',
      allowed_formats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
      transformation: [
        { quality: 'auto:good' },
        { video_codec: 'auto' }
      ],
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          winston.error('Video upload failed:', {
            service: 'cloudinary',
            error: error.message,
            options: defaultOptions
          });
          reject(error);
        } else {
          winston.info('Video uploaded successfully:', {
            service: 'cloudinary',
            publicId: result.public_id,
            url: result.secure_url,
            size: result.bytes,
            duration: result.duration
          });
          resolve({
            publicId: result.public_id,
            url: result.secure_url,
            secureUrl: result.secure_url,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
            duration: result.duration,
            resourceType: result.resource_type,
            createdAt: result.created_at,
            folder: result.folder
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
 * Upload any file type to Cloudinary using upload_stream
 * Automatically determines if it's image or video based on mimetype
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File mimetype
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadFile = async (buffer, mimetype, options = {}) => {
  try {
    // Validate file type
    if (!isValidFileType(mimetype)) {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }

    // Determine if image or video
    if (mimetype.startsWith('image/')) {
      return await uploadImage(buffer, options);
    } else if (mimetype.startsWith('video/')) {
      return await uploadVideo(buffer, options);
    } else {
      throw new Error(`Unsupported media type: ${mimetype}`);
    }
  } catch (error) {
    winston.error('File upload failed:', {
      service: 'cloudinary',
      mimetype,
      error: error.message
    });
    throw error;
  }
};

/**
 * Validate file type
 * @param {string} mimetype - File mimetype
 * @returns {boolean} Is valid file type
 */
const isValidFileType = (mimetype) => {
  const allowedImageTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
    'image/webp', 'image/bmp', 'image/svg+xml'
  ];
  
  const allowedVideoTypes = [
    'video/mp4', 'video/avi', 'video/quicktime', 
    'video/x-msvideo', 'video/webm', 'video/x-flv', 'video/x-matroska'
  ];

  return allowedImageTypes.includes(mimetype) || allowedVideoTypes.includes(mimetype);
};

/**
 * Generate thumbnail for video
 * @param {string} publicId - Video public ID
 * @param {Object} options - Thumbnail options
 * @returns {Promise<Object>} Thumbnail result
 */
const generateVideoThumbnail = async (publicId, options = {}) => {
  try {
    const thumbnailOptions = {
      format: 'jpg',
      quality: 'auto:good',
      width: options.width || 400,
      height: options.height || 300,
      crop: 'fill',
      gravity: 'center',
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
      thumbnailUrl
    });

    return {
      thumbnailUrl,
      options: thumbnailOptions
    };
  } catch (error) {
    winston.error('Error generating video thumbnail:', {
      service: 'cloudinary',
      publicId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Delete file from Cloudinary
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
    
    return result;
  } catch (error) {
    winston.error('Error deleting file from Cloudinary:', {
      service: 'cloudinary',
      publicId,
      resourceType,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get file details from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image or video)
 * @returns {Promise<Object>} File details
 */
const getFileDetails = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    
    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration, // For videos
      resourceType: result.resource_type,
      folder: result.folder,
      createdAt: result.created_at
    };
  } catch (error) {
    winston.error('Error getting file details from Cloudinary:', {
      service: 'cloudinary',
      publicId,
      resourceType,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get optimized URL for file
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformations - Transformation options
 * @returns {string} Optimized URL
 */
const getOptimizedUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: 'auto:good',
    fetch_format: 'auto',
    ...transformations
  };

  return cloudinary.url(publicId, defaultTransformations);
};

module.exports = {
  cloudinary,
  uploadFile,
  uploadImage,
  uploadVideo,
  generateVideoThumbnail,
  deleteFile,
  getFileDetails,
  getOptimizedUrl,
  isValidFileType,
  verifyCloudinaryConnection
};