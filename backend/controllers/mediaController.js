const multer = require('multer');
const { 
  uploadFile, 
  deleteFile, 
  getFileDetails, 
  generateVideoThumbnail,
  isValidFileType
} = require('../config/cloudinary');
const winston = require('winston');

/**
 * Media Controller using modern Cloudinary upload_stream
 * Handles file uploads without multer-storage-cloudinary
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
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 10 // Max 10 files per request
  }
});

/**
 * Upload single media file
 * @route POST /api/media/upload
 * @access Private
 */
const uploadSingleMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const { buffer, mimetype, originalname, size } = req.file;
    const { duration, tags, description } = req.body;

    winston.info('Starting file upload:', {
      service: 'media',
      filename: originalname,
      mimetype,
      size,
      userId: req.user.id
    });

    // Upload to Cloudinary
    const uploadResult = await uploadFile(buffer, mimetype, {
      public_id: `${Date.now()}_${originalname.split('.')[0]}`,
      tags: tags ? tags.split(',') : []
    });

    // Generate thumbnail for videos
    let thumbnailUrl = uploadResult.url;
    if (mimetype.startsWith('video/')) {
      try {
        const thumbnail = await generateVideoThumbnail(uploadResult.publicId);
        thumbnailUrl = thumbnail.thumbnailUrl;
      } catch (thumbnailError) {
        winston.warn('Failed to generate video thumbnail:', {
          service: 'media',
          publicId: uploadResult.publicId,
          error: thumbnailError.message
        });
      }
    }

    // Create media record (you'll need to create Media model)
    const mediaData = {
      userId: req.user.id,
      originalName: originalname,
      publicId: uploadResult.publicId,
      url: uploadResult.url,
      secureUrl: uploadResult.secureUrl,
      thumbnailUrl,
      format: uploadResult.format,
      resourceType: uploadResult.resourceType,
      size: uploadResult.size,
      width: uploadResult.width,
      height: uploadResult.height,
      duration: uploadResult.duration || (duration ? parseInt(duration) : null),
      folder: uploadResult.folder,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      description: description || '',
      uploadedAt: new Date()
    };

    winston.info('File uploaded successfully:', {
      service: 'media',
      publicId: uploadResult.publicId,
      url: uploadResult.url,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: mediaData
    });

  } catch (error) {
    winston.error('File upload failed:', {
      service: 'media',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Upload multiple media files
 * @route POST /api/media/upload/multiple
 * @access Private
 */
const uploadMultipleMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    const { tags, description } = req.body;
    const uploadResults = [];
    const errors = [];

    winston.info('Starting multiple file upload:', {
      service: 'media',
      fileCount: req.files.length,
      userId: req.user.id
    });

    // Process each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const { buffer, mimetype, originalname, size } = file;

      try {
        // Upload to Cloudinary
        const uploadResult = await uploadFile(buffer, mimetype, {
          public_id: `${Date.now()}_${i}_${originalname.split('.')[0]}`,
          tags: tags ? tags.split(',') : []
        });

        // Generate thumbnail for videos
        let thumbnailUrl = uploadResult.url;
        if (mimetype.startsWith('video/')) {
          try {
            const thumbnail = await generateVideoThumbnail(uploadResult.publicId);
            thumbnailUrl = thumbnail.thumbnailUrl;
          } catch (thumbnailError) {
            winston.warn('Failed to generate video thumbnail:', {
              service: 'media',
              publicId: uploadResult.publicId,
              error: thumbnailError.message
            });
          }
        }

        const mediaData = {
          userId: req.user.id,
          originalName: originalname,
          publicId: uploadResult.publicId,
          url: uploadResult.url,
          secureUrl: uploadResult.secureUrl,
          thumbnailUrl,
          format: uploadResult.format,
          resourceType: uploadResult.resourceType,
          size: uploadResult.size,
          width: uploadResult.width,
          height: uploadResult.height,
          duration: uploadResult.duration,
          folder: uploadResult.folder,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          description: description || '',
          uploadedAt: new Date()
        };

        uploadResults.push(mediaData);

      } catch (fileError) {
        winston.error('Individual file upload failed:', {
          service: 'media',
          filename: originalname,
          error: fileError.message,
          userId: req.user.id
        });

        errors.push({
          filename: originalname,
          error: fileError.message
        });
      }
    }

    winston.info('Multiple file upload completed:', {
      service: 'media',
      successful: uploadResults.length,
      failed: errors.length,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: `Uploaded ${uploadResults.length} files successfully`,
      data: uploadResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    winston.error('Multiple file upload failed:', {
      service: 'media',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete media file
 * @route DELETE /api/media/:publicId
 * @access Private
 */
const deleteMedia = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    winston.info('Deleting media file:', {
      service: 'media',
      publicId,
      resourceType,
      userId: req.user.id
    });

    // Delete from Cloudinary
    const deleteResult = await deleteFile(publicId, resourceType);

    // TODO: Also delete from your database
    // await Media.findOneAndDelete({ publicId, userId: req.user.id });

    winston.info('Media file deleted successfully:', {
      service: 'media',
      publicId,
      result: deleteResult.result,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'File deleted successfully',
      data: deleteResult
    });

  } catch (error) {
    winston.error('Media deletion failed:', {
      service: 'media',
      publicId: req.params.publicId,
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
 * Get media file details
 * @route GET /api/media/:publicId
 * @access Private
 */
const getMediaDetails = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    winston.info('Getting media file details:', {
      service: 'media',
      publicId,
      resourceType,
      userId: req.user.id
    });

    // Get details from Cloudinary
    const fileDetails = await getFileDetails(publicId, resourceType);

    res.json({
      success: true,
      message: 'File details retrieved successfully',
      data: fileDetails
    });

  } catch (error) {
    winston.error('Failed to get media details:', {
      service: 'media',
      publicId: req.params.publicId,
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get file details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Generate video thumbnail
 * @route POST /api/media/:publicId/thumbnail
 * @access Private
 */
const createVideoThumbnail = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { width, height, start_offset } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    winston.info('Generating video thumbnail:', {
      service: 'media',
      publicId,
      width,
      height,
      start_offset,
      userId: req.user.id
    });

    const thumbnail = await generateVideoThumbnail(publicId, {
      width: width ? parseInt(width) : 400,
      height: height ? parseInt(height) : 300,
      start_offset: start_offset || '0'
    });

    res.json({
      success: true,
      message: 'Thumbnail generated successfully',
      data: thumbnail
    });

  } catch (error) {
    winston.error('Thumbnail generation failed:', {
      service: 'media',
      publicId: req.params.publicId,
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
  uploadSingleMedia,
  uploadMultipleMedia,
  deleteMedia,
  getMediaDetails,
  createVideoThumbnail,
  handleMulterError
};