const multer = require('multer');
const Joi = require('joi');
const { 
  uploadFileForMediaModel, 
  deleteFile, 
  getFileDetails, 
  generateVideoThumbnail,
  isValidFileType,
  getOptimizedUrl,
  getUserStorageStats,
  FILE_SIZE_LIMITS
} = require('../config/cloudinary');
const Media = require('../models/mediaModel');
const winston = require('winston');
const mongoose = require('mongoose');

/**
 * Enhanced Media Controller with comprehensive endpoints
 * Integrates with Media model for complete file lifecycle management
 */

// Configure multer for memory storage (we'll stream to Cloudinary)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check if file type is valid
  if (isValidFileType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images and videos are allowed.`), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Max 10 files per request
  }
});

// Validation schemas
const uploadSchema = Joi.object({
  duration: Joi.number().min(1).max(300).optional(),
  tags: Joi.string().optional(),
  description: Joi.string().max(500).optional()
});

const updateMediaSchema = Joi.object({
  duration: Joi.number().min(1).max(300).optional(),
  tags: Joi.string().optional(),
  description: Joi.string().max(500).optional()
});

const mediaQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  type: Joi.string().valid('image', 'video').optional(),
  search: Joi.string().max(100).optional(),
  sort: Joi.string().valid('date', 'name', 'size', 'usage').default('date'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  tags: Joi.string().optional()
});

/**
 * Upload single media file with metadata handling
 * @route POST /api/media/upload
 * @access Private
 */
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    // Validate request body
    const { error, value } = uploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { buffer, mimetype, originalname, size } = req.file;
    const { duration, tags, description } = value;

    winston.info('Starting media upload:', {
      service: 'media',
      filename: originalname,
      mimetype,
      size,
      userId: req.user.id
    });

    // Determine file type
    const isImage = mimetype.startsWith('image/');
    const isVideo = mimetype.startsWith('video/');
    
    // Prepare media data for upload
    const mediaData = {
      tags: tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : [],
      description: description || ''
    };
    
    // Add duration based on file type
    if (isImage) {
      mediaData.duration = duration || 10; // Default 10 seconds for images
    } else if (isVideo) {
      // For videos, duration will come from Cloudinary metadata
      // We don't set it here as it will be extracted from the video file
    }

    // Upload to Cloudinary and prepare for Media model
    const uploadResult = await uploadFileForMediaModel(
      buffer, 
      mimetype, 
      originalname, 
      req.user.id,
      mediaData
    );

    // Create Media document
    winston.info('Creating Media document with data:', {
      service: 'media',
      uploadResultType: uploadResult.type,
      uploadResultDuration: uploadResult.duration,
      uploadResultVideoDuration: uploadResult.videoDuration,
      userId: req.user.id
    });
    
    const media = new Media(uploadResult);
    await media.save();

    winston.info('Media uploaded and saved successfully:', {
      service: 'media',
      mediaId: media._id,
      cloudinaryId: media.cloudinaryId,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: media
    });

  } catch (error) {
    winston.error('Media upload failed:', {
      service: 'media',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    // Clean up Cloudinary upload if database save failed
    if (error.cloudinaryId) {
      try {
        await deleteFile(error.cloudinaryId, error.type || 'image');
        winston.info('Cleaned up Cloudinary file after database error', {
          service: 'media',
          cloudinaryId: error.cloudinaryId
        });
      } catch (cleanupError) {
        winston.error('Failed to cleanup Cloudinary file:', {
          service: 'media',
          cloudinaryId: error.cloudinaryId,
          error: cleanupError.message
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get user's media with advanced features
 * @route GET /api/media
 * @access Private
 */
const getMedia = async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = mediaQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { page, limit, type, search, sort, order, tags } = value;
    const skip = (page - 1) * limit;

    // Build query
    const query = { owner: req.user.id, isActive: true };
    
    // Add filters
    if (type) {
      query.type = type;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tagArray };
    }

    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sortField = {
      date: 'createdAt',
      name: 'originalName',
      size: 'fileSize',
      usage: 'usageCount'
    }[sort];
    
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    // Execute queries in parallel
    const [media, totalCount, stats] = await Promise.all([
      Media.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email'),
      Media.countDocuments(query),
      Media.getUserMediaStats(req.user.id)
    ]);

    winston.info('Media retrieved successfully:', {
      service: 'media',
      userId: req.user.id,
      count: media.length,
      totalCount,
      filters: { type, search, tags }
    });

    res.json({
      success: true,
      message: 'Media retrieved successfully',
      data: {
        media,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        },
        statistics: stats,
        filters: {
          type,
          search,
          tags,
          sort,
          order
        }
      }
    });

  } catch (error) {
    winston.error('Failed to retrieve media:', {
      service: 'media',
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve media',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Update media metadata
 * @route PUT /api/media/:id
 * @access Private
 */
const updateMedia = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media ID'
      });
    }

    // Validate request body
    const { error, value } = updateMediaSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { duration, tags, description } = value;

    // Find media and verify ownership
    const media = await Media.findOne({ _id: id, owner: req.user.id, isActive: true });
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found or access denied'
      });
    }

    // Update fields
    const updateData = {};
    
    if (duration !== undefined) {
      if (media.type !== 'image') {
        return res.status(400).json({
          success: false,
          message: 'Duration can only be set for images'
        });
      }
      updateData.duration = duration;
    }

    if (tags !== undefined) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
      updateData.tags = tagArray;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    // Update media
    const updatedMedia = await Media.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'name email');

    winston.info('Media updated successfully:', {
      service: 'media',
      mediaId: id,
      userId: req.user.id,
      updates: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'Media updated successfully',
      data: updatedMedia
    });

  } catch (error) {
    winston.error('Media update failed:', {
      service: 'media',
      mediaId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete media
 * @route DELETE /api/media/:id
 * @access Private
 */
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media ID'
      });
    }

    // Find media and verify ownership
    const media = await Media.findOne({ _id: id, owner: req.user.id, isActive: true });
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found or access denied'
      });
    }

    winston.info('Deleting media:', {
      service: 'media',
      mediaId: id,
      cloudinaryId: media.cloudinaryId,
      type: media.type,
      userId: req.user.id
    });

    try {
      // Delete from Cloudinary first
      await deleteFile(media.cloudinaryId, media.type);
      
      // Delete from database
      await Media.findByIdAndUpdate(id, { isActive: false });

      winston.info('Media deleted successfully:', {
        service: 'media',
        mediaId: id,
        cloudinaryId: media.cloudinaryId,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Media deleted successfully',
        data: { id, cloudinaryId: media.cloudinaryId }
      });

    } catch (deleteError) {
      // If Cloudinary deletion fails, log but still mark as inactive
      winston.error('Cloudinary deletion failed, marking as inactive:', {
        service: 'media',
        mediaId: id,
        cloudinaryId: media.cloudinaryId,
        error: deleteError.message
      });

      await Media.findByIdAndUpdate(id, { isActive: false });

      res.json({
        success: true,
        message: 'Media marked as deleted (cleanup may be needed)',
        data: { id, cloudinaryId: media.cloudinaryId },
        warning: 'Cloud storage cleanup may be required'
      });
    }

  } catch (error) {
    winston.error('Media deletion failed:', {
      service: 'media',
      mediaId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Deletion failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Generate secure download URLs
 * @route GET /api/media/:id/download
 * @access Private
 */
const generateDownloadUrl = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media ID'
      });
    }

    // Find media and verify ownership
    const media = await Media.findOne({ _id: id, owner: req.user.id, isActive: true });
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found or access denied'
      });
    }

    // Generate time-limited download URL (1 hour expiry)
    const downloadUrl = getOptimizedUrl(media.cloudinaryId, {
      flags: 'attachment',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    }, media.type);

    // Increment usage counter
    await media.incrementUsage();

    winston.info('Download URL generated:', {
      service: 'media',
      mediaId: id,
      cloudinaryId: media.cloudinaryId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Download URL generated successfully',
      data: {
        downloadUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        filename: media.originalName,
        fileSize: media.fileSize,
        type: media.type
      }
    });

  } catch (error) {
    winston.error('Failed to generate download URL:', {
      service: 'media',
      mediaId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate download URL',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get user media statistics
 * @route GET /api/media/stats
 * @access Private
 */
const getMediaStats = async (req, res) => {
  try {
    // Get database statistics
    const [stats, recentMedia, popularMedia, storageStats] = await Promise.all([
      Media.getUserMediaStats(req.user.id),
      Media.findRecentMedia(req.user.id, 5),
      Media.findPopularMedia(req.user.id, 5),
      getUserStorageStats(req.user.id).catch(() => null) // Don't fail if Cloudinary stats unavailable
    ]);

    const responseData = {
      database: stats,
      recent: recentMedia,
      popular: popularMedia,
      storage: storageStats,
      limits: {
        maxFileSize: {
          image: FILE_SIZE_LIMITS.image,
          video: FILE_SIZE_LIMITS.video
        },
        maxFiles: 1000 // Example limit
      }
    };

    winston.info('Media statistics retrieved:', {
      service: 'media',
      userId: req.user.id,
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize
    });

    res.json({
      success: true,
      message: 'Media statistics retrieved successfully',
      data: responseData
    });

  } catch (error) {
    winston.error('Failed to get media statistics:', {
      service: 'media',
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Generate video thumbnail
 * @route POST /api/media/:id/thumbnail
 * @access Private
 */
const createVideoThumbnail = async (req, res) => {
  try {
    const { id } = req.params;
    const { width, height, start_offset } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media ID'
      });
    }

    // Find media and verify ownership
    const media = await Media.findOne({ _id: id, owner: req.user.id, isActive: true, type: 'video' });
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or access denied'
      });
    }

    winston.info('Generating video thumbnail:', {
      service: 'media',
      mediaId: id,
      cloudinaryId: media.cloudinaryId,
      width,
      height,
      start_offset,
      userId: req.user.id
    });

    const thumbnail = await generateVideoThumbnail(media.cloudinaryId, {
      width: width ? parseInt(width) : 400,
      height: height ? parseInt(height) : 300,
      start_offset: start_offset || '0'
    });

    res.json({
      success: true,
      message: 'Thumbnail generated successfully',
      data: {
        ...thumbnail,
        mediaId: id,
        originalVideo: {
          id: media._id,
          originalName: media.originalName,
          cloudinaryId: media.cloudinaryId
        }
      }
    });

  } catch (error) {
    winston.error('Thumbnail generation failed:', {
      service: 'media',
      mediaId: req.params.id,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Thumbnail generation failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Middleware to handle multer errors
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 100MB';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum is 10 files per request';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = error.message;
    }

    return res.status(400).json({
      success: false,
      message,
      error: error.code
    });
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

module.exports = {
  upload,
  uploadMedia,
  getMedia,
  updateMedia,
  deleteMedia,
  generateDownloadUrl,
  getMediaStats,
  createVideoThumbnail,
  handleMulterError
};