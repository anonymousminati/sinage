const express = require('express');
const rateLimit = require('express-rate-limit');
const { verifyJWT, requireAuth } = require('../middleware/authMiddleware');
const {
  upload,
  uploadSingleMedia,
  uploadMultipleMedia,
  deleteMedia,
  getMediaDetails,
  createVideoThumbnail,
  handleMulterError
} = require('../controllers/mediaController');

const router = express.Router();

/**
 * Rate limiting for media uploads
 * More restrictive due to resource-intensive operations
 */
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 upload requests per windowMs
  message: {
    success: false,
    message: 'Too many upload requests. Please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful uploads to allow batch processing
  skip: (req, res) => res.statusCode < 400
});

/**
 * Apply authentication to all media routes
 */
router.use(verifyJWT);
router.use(requireAuth);

/**
 * @route   POST /api/media/upload
 * @desc    Upload single media file (image or video)
 * @access  Private
 * @body    {file} file - Media file to upload
 * @body    {string} [duration] - Display duration for images (in seconds)
 * @body    {string} [tags] - Comma-separated tags
 * @body    {string} [description] - File description
 */
router.post('/upload', 
  uploadRateLimit,
  upload.single('file'),
  uploadSingleMedia,
  handleMulterError
);

/**
 * @route   POST /api/media/upload/multiple
 * @desc    Upload multiple media files
 * @access  Private
 * @body    {file[]} files - Array of media files to upload
 * @body    {string} [tags] - Comma-separated tags for all files
 * @body    {string} [description] - Description for all files
 */
router.post('/upload/multiple',
  uploadRateLimit,
  upload.array('files', 10), // Max 10 files
  uploadMultipleMedia,
  handleMulterError
);

/**
 * @route   GET /api/media/:publicId
 * @desc    Get media file details from Cloudinary
 * @access  Private
 * @param   {string} publicId - Cloudinary public ID
 * @query   {string} [resourceType=image] - Resource type (image or video)
 */
router.get('/:publicId', getMediaDetails);

/**
 * @route   DELETE /api/media/:publicId
 * @desc    Delete media file from Cloudinary
 * @access  Private
 * @param   {string} publicId - Cloudinary public ID
 * @query   {string} [resourceType=image] - Resource type (image or video)
 */
router.delete('/:publicId', deleteMedia);

/**
 * @route   POST /api/media/:publicId/thumbnail
 * @desc    Generate thumbnail for video
 * @access  Private
 * @param   {string} publicId - Video public ID
 * @body    {number} [width=400] - Thumbnail width
 * @body    {number} [height=300] - Thumbnail height
 * @body    {string} [start_offset=0] - Time offset for thumbnail generation
 */
router.post('/:publicId/thumbnail', createVideoThumbnail);

/**
 * @route   GET /api/media/health/check
 * @desc    Health check for media service
 * @access  Private
 */
router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    message: 'Media service is healthy',
    timestamp: new Date().toISOString(),
    service: 'media-upload',
    version: '1.0.0'
  });
});

/**
 * Error handling middleware specific to media routes
 */
router.use((error, req, res, next) => {
  // Handle Cloudinary-specific errors
  if (error.name === 'CloudinaryError') {
    return res.status(400).json({
      success: false,
      message: 'Cloud storage error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Storage service unavailable'
    });
  }

  // Handle file validation errors
  if (error.message && error.message.includes('file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Pass other errors to global error handler
  next(error);
});

module.exports = router;